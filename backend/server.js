require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or too short. Use at least 32 characters in backend/.env.');
  process.exit(1);
}

// PostgreSQL (Neon) Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) console.error('Database connection error:', err.stack);
  else console.log('Successfully connected to Neon PostgreSQL Cloud Database!');
  if (release) release();
});

// Database Table Initialization
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS InspectionLogs (
        id SERIAL PRIMARY KEY,
        hostel_id TEXT,
        inspector_id TEXT,
        image_url TEXT NOT NULL,
        gps_lat REAL,
        gps_long REAL,
        damage_score REAL,
        hygiene_status TEXT,
        risk_level TEXT,
        inspection_time TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables verified/created successfully.');
  } catch (err) {
    console.error('Error creating database tables:', err);
  }
};
initDb();

// Email Transporter (For Automated Alerts)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS,
  },
});

// Security Middleware: Protects routes from unauthorized access
function verifyToken(req, res, next) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return res.status(401).json({ error: 'Authentication required.' });

  jwt.verify(match[1], JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized token.' });
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  });
}

const app = express();
const PORT = process.env.PORT || 5000;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Folders Setup
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
    cb(null, `${crypto.randomUUID()}${extensions[file.mimetype] || '.img'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max limit
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('Only image files are allowed');
      err.status = 400;
      cb(err, false);
    }
  },
});

app.get('/uploads/:filename', verifyToken, (req, res, next) => {
  const filename = path.basename(req.params.filename);
  if (filename !== req.params.filename) return res.status(400).json({ error: 'Invalid file name.' });
  res.sendFile(filename, { root: UPLOAD_DIR }, (err) => {
    if (err && !res.headersSent) next(err);
  });
});

// AI Inference Setup (Groq VLM)
const Groq = require('groq-sdk');
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const hasUsableGroqKey = GROQ_API_KEY && !/^your_.*_here$/i.test(GROQ_API_KEY);
const VISION_MODEL_ID = 'qwen/qwen3.8-27b';
const groqClient = hasUsableGroqKey ? new Groq({ apiKey: GROQ_API_KEY }) : null;
const INSPECTION_SYSTEM_PROMPT = `You are an expert infrastructure inspector for MoSJE. Analyze the provided image of a government hostel/facility. Respond ONLY in strict JSON format with exactly these keys: 'damage_score' (number 0-100), 'hygiene_status' (string: 'Clean', 'Dirty', or 'Garbage Detected'), 'broken_assets' (boolean: true/false), and 'severity' (string: 'LOW', 'MEDIUM', 'CRITICAL'). Do not add any extra text or markdown formatting.`;

async function queryGroqVision(imageAbsPath, timeoutMs = 60000) {
  if (!groqClient) {
    console.error('GROQ_API_KEY is missing or invalid in backend/.env');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const base64Image = fs.readFileSync(imageAbsPath).toString('base64');
    const chatCompletion = await groqClient.chat.completions.create(
      {
        model: VISION_MODEL_ID,
        temperature: 0,
        response_format: { type: 'json_object' },
        reasoning_effort: 'none',
        reasoning_format: 'hidden',
        max_completion_tokens: 512,
        messages: [
          { role: 'system', content: INSPECTION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this facility image and return the JSON.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            ],
          },
        ],
      },
      { signal: controller.signal }
    );

    const raw = chatCompletion.choices[0].message.content;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Groq vision error:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function mapGroqResultToInspection(vlm) {
  const damageScore = Math.max(0, Math.min(100, Number(vlm.damage_score) || 0));
  const hygieneStatus = vlm.hygiene_status || 'Clean';
  const brokenAssets = !!vlm.broken_assets;
  const severityRaw = String(vlm.severity || 'LOW').toUpperCase();

  const recommendationMap = {
    CRITICAL: 'Immediate Repair Required',
    MEDIUM: 'Schedule Maintenance',
    LOW: 'Monitor Asset',
  };

  return {
    damage_score: damageScore,
    risk_score: damageScore,
    hygiene_status: hygieneStatus,
    broken_assets: brokenAssets,
    severity: severityRaw,
    recommendation: recommendationMap[severityRaw] || 'Monitor Asset',
  };
}

async function runInspectionPipeline(imageAbsPath) {
  const vlmResult = await queryGroqVision(imageAbsPath);
  if (!vlmResult) throw new Error('AI vision analysis did not return a valid result.');
  return mapGroqResultToInspection(vlmResult);
}

// Routes
app.get('/', (req, res) => res.send('Inspection backend is running.'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', message: 'Inspection backend is running.' }));

// 1. SIGNUP ROUTE
app.post('/api/signup', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO Users (username, password) VALUES ($1, $2) RETURNING id';
    const result = await pool.query(sql, [username, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully.', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Username may already exist or DB error.' });
  }
});

// 2. LOGIN ROUTE
app.post('/api/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  try {
    const sql = 'SELECT id, username, password FROM Users WHERE username = $1';
    const result = await pool.query(sql, [username]);
    
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });
    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password.' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login successful.', token, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: 'Database error.' });
  }
});

// 3. UPLOAD ROUTE
app.post('/api/upload-inspection', verifyToken, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

  const imagePath = `/uploads/${req.file.filename}`;
  const imageAbsPath = path.join(UPLOAD_DIR, req.file.filename);

  const hostel_id = req.body.hostel_id || 'UNKNOWN_HOSTEL';
  const inspector_id = req.username || 'UNKNOWN_INSPECTOR';
  const inspection_time = req.body.inspection_time || new Date().toISOString();
  const gps_lat = req.body.gps_lat || 28.6139;
  const gps_long = req.body.gps_long || 77.209;

  try {
    const result = await runInspectionPipeline(imageAbsPath);

    const insertSQL = `
      INSERT INTO InspectionLogs (hostel_id, inspector_id, image_url, gps_lat, gps_long, damage_score, hygiene_status, risk_level, inspection_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `;

    const params = [
      hostel_id,
      inspector_id,
      imagePath,
      gps_lat,
      gps_long,
      result.damage_score || 0,
      result.hygiene_status || 'Clean',
      result.severity || 'LOW',
      inspection_time,
    ];

    const dbRes = await pool.query(insertSQL, params);

    if (result.severity === 'CRITICAL' || result.hygiene_status === 'Garbage Detected') {
      if (process.env.ALERT_EMAIL_USER && process.env.ALERT_EMAIL_PASS) {
        try {
          await transporter.sendMail({
            from: process.env.ALERT_EMAIL_USER,
            to: process.env.ALERT_EMAIL_TO || 'nodalofficer@gov.in',
            subject: `🚨 URGENT: Critical Risk at ${hostel_id}`,
            text: `Critical issue detected!\n\nHostel: ${hostel_id}\nInspector: ${inspector_id}\nRisk Level: ${result.severity}\nHygiene Status: ${result.hygiene_status}\nTime: ${inspection_time}`,
          });
        } catch (emailErr) {
          console.error('Email send failed:', emailErr.message);
        }
      }
    }

    res.status(201).json({
      message: 'Inspection uploaded successfully.',
      id: dbRes.rows[0].id,
      image_url: imagePath,
      ...result,
    });
  } catch (err) {
    console.error('Inspection pipeline failed:', err);
    fs.unlink(imageAbsPath, () => {});
    res.status(502).json({ error: 'AI inference failed. Please retry the inspection.' });
  }
});

// 4. HISTORY ROUTE
app.get('/api/history', verifyToken, async (req, res) => {
  try {
    const sql = 'SELECT * FROM InspectionLogs ORDER BY created_at DESC';
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// 5. REPORTS ROUTE
app.get('/api/reports', verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT
        COUNT(*) as total_inspections,
        AVG(damage_score) as avg_damage_score,
        SUM(CASE WHEN risk_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count
      FROM InspectionLogs
    `;
    const result = await pool.query(sql);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File size exceeds 10MB limit.' });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Something went wrong.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server successfully running on port ${PORT}`);
});