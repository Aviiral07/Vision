require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
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

// Email Transporter (For Automated Alerts)
// NOTE: pull these from .env instead of hardcoding — see backend/.env
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
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.endsWith('.vercel.app') || origin === 'http://localhost:5173' || origin === 'http://localhost:3000') {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
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

// Uploaded evidence is private inspection data and requires authentication.
app.get('/uploads/:filename', verifyToken, (req, res, next) => {
  const filename = path.basename(req.params.filename);
  if (filename !== req.params.filename) return res.status(400).json({ error: 'Invalid file name.' });
  res.sendFile(filename, { root: UPLOAD_DIR }, (err) => {
    if (err && !res.headersSent) next(err);
  });
});

// Database Setup
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'inspection.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('Database connection error:', err.message);
  else console.log('Connected to SQLite database at', DB_PATH);
});

// Table Initializations
db.serialize(() => {
  // Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inspection Logs Table — FIXED: columns now match what the insert
  // statement below actually writes (hostel_id, inspector_id, image_url,
  // gps_lat, gps_long, damage_score, hygiene_status, risk_level,
  // inspection_time). The old version of this file declared a different
  // set of columns than it inserted into, which crashes every upload.
  db.run(`
    CREATE TABLE IF NOT EXISTS InspectionLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hostel_id TEXT,
      inspector_id TEXT,
      image_url TEXT NOT NULL,
      gps_lat REAL,
      gps_long REAL,
      damage_score REAL,
      hygiene_status TEXT,
      risk_level TEXT,
      inspection_time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// ---------------------------------------------------------------------------
// AI Inference (Groq VLM) — Sanchi's prompt-based pipeline, no training needed
// ---------------------------------------------------------------------------

const Groq = require('groq-sdk');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const hasUsableGroqKey = GROQ_API_KEY && !/^your_.*_here$/i.test(GROQ_API_KEY);
// NOTE: llama-3.2-11b-vision-preview is deprecated on Groq. As of Aug 2026 the
// only vision-capable model on GroqCloud is qwen/qwen3.6-27b. Check
// https://console.groq.com/docs/vision before changing this.
const VISION_MODEL_ID = 'llama-3.2-11b-vision-preview';

const groqClient = hasUsableGroqKey ? new Groq({ apiKey: GROQ_API_KEY }) : null;

const INSPECTION_SYSTEM_PROMPT = `You are an expert infrastructure inspector for MoSJE. Analyze the provided image of a government hostel/facility. Respond ONLY in strict JSON format with exactly these keys: 'damage_score' (number 0-100), 'hygiene_status' (string: 'Clean', 'Dirty', or 'Garbage Detected'), 'broken_assets' (boolean: true/false), and 'severity' (string: 'LOW', 'MEDIUM', 'CRITICAL'). Do not add any extra text or markdown formatting.`;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Calls Groq's vision model with the "magic prompt" and returns the parsed
// { damage_score, hygiene_status, broken_assets, severity } object, or null
// if the key is missing / the call fails / the model didn't return valid JSON.
async function queryGroqVision(imageAbsPath, timeoutMs = 60000) {
  if (!groqClient) {
    console.error('GROQ_API_KEY is missing or still a placeholder — add an active key to backend/.env');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const base64Image = fs.readFileSync(imageAbsPath).toString('base64');

    const chatCompletion = await groqClient.chat.completions.create(
      {
        model: VISION_MODEL_ID,
        temperature: 0, // strict and deterministic
        response_format: { type: 'json_object' },
        // qwen3.6-27b defaults to "thinking mode", which can burn its token
        // budget on reasoning and return an empty/invalid JSON body. Turn
        // thinking off and hide any reasoning field so we always get a
        // clean final JSON answer. See console.groq.com/docs/reasoning
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
    if (err.name === 'AbortError') {
      console.error(`Groq vision request timed out after ${timeoutMs}ms`);
    } else {
      console.error('Groq vision error:', err.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Maps the raw VLM output to a flat result object used by the upload route.
function mapGroqResultToInspection(vlm) {
  if (!vlm) {
    return {
      damage_score: 0,
      hygiene_status: 'Error',
      broken_assets: false,
      severity: 'LOW',
      recommendation: 'AI analysis failed — please retry the upload.',
    };
  }

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
    risk_score: damageScore, // kept for any code still reading risk_score
    hygiene_status: hygieneStatus,
    broken_assets: brokenAssets,
    severity: severityRaw,
    recommendation: recommendationMap[severityRaw] || 'Monitor Asset',
  };
}

async function runInspectionPipeline(imageAbsPath) {
  const vlmResult = await queryGroqVision(imageAbsPath);
  return mapGroqResultToInspection(vlmResult);
}

// Routes

// Health Check
app.get('/', (req, res) => res.send('Inspection backend is running.'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', message: 'Inspection backend is running.' }));

// 1. SIGNUP ROUTE — hashes the password before storing it. Without this,
// users end up inserted with a plain-text password (e.g. via DB Browser),
// which then always fails bcrypt.compare() in /api/login.
app.post('/api/signup', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Use a username up to 100 characters and a password between 8 and 128 characters.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO Users (username, password) VALUES (?, ?)';
    db.run(sql, [username, hashedPassword], function (err) {
      if (err) return res.status(500).json({ error: 'Username may already exist.' });
      res.status(201).json({ message: 'User registered successfully.', id: this.lastID });
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// 2. LOGIN ROUTE (Generates JWT)
app.post('/api/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const sql = 'SELECT id, username, password FROM Users WHERE username = ?';
  db.get(sql, [username], async (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!row) return res.status(401).json({ error: 'Invalid username or password.' });

    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password.' });

    const token = jwt.sign({ id: row.id, username: row.username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login successful.', token, user: { id: row.id, username: row.username } });
  });
});

// 3. UPLOAD ROUTE (Groq AI pipeline + DB insert + email alert on critical)
app.post('/api/upload-inspection', verifyToken, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

  // FIXED: was using single quotes, so `${req.file.filename}` never got
  // interpolated — every row stored the literal string
  // "/uploads/${req.file.filename}". Must use backticks.
  const imagePath = `/uploads/${req.file.filename}`;
  const imageAbsPath = path.join(UPLOAD_DIR, req.file.filename);

  const hostel_id = req.body.hostel_id || 'UNKNOWN_HOSTEL';
  const inspector_id = req.username || 'UNKNOWN_INSPECTOR';
  const inspection_time = req.body.inspection_time || new Date().toISOString();

  // EXIF GPS Logic (placeholder until real GPS extraction is wired in)
  const gps_lat = req.body.gps_lat || 28.6139;
  const gps_long = req.body.gps_long || 77.209;

  try {
    const result = await runInspectionPipeline(imageAbsPath);

    const insertSQL = `
      INSERT INTO InspectionLogs (hostel_id, inspector_id, image_url, gps_lat, gps_long, damage_score, hygiene_status, risk_level, inspection_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    db.run(insertSQL, params, async function (err) {
      if (err) {
        console.error('DB Insert Error:', err);
        return res.status(500).json({ error: 'Failed to save inspection record.' });
      }

      // Automated Escalation Alert
      if (result.severity === 'CRITICAL' || result.hygiene_status === 'Garbage Detected') {
        if (process.env.ALERT_EMAIL_USER && process.env.ALERT_EMAIL_PASS) {
          try {
            await transporter.sendMail({
              from: process.env.ALERT_EMAIL_USER,
              to: process.env.ALERT_EMAIL_TO || 'nodalofficer@gov.in',
              // FIXED: was using single quotes, so hostel_id never got
              // interpolated into the subject/body. Must use backticks.
              subject: `🚨 URGENT: Critical Risk at ${hostel_id}`,
              text: `Critical issue detected!\n\nHostel: ${hostel_id}\nInspector: ${inspector_id}\nRisk Level: ${result.severity}\nHygiene Status: ${result.hygiene_status}\nTime: ${inspection_time}`,
            });
            console.log('Alert Email Sent successfully!');
          } catch (emailErr) {
            console.error('Email send failed. Check credentials.', emailErr.message);
          }
        } else {
          console.warn('ALERT_EMAIL_USER/ALERT_EMAIL_PASS not set — skipping email alert.');
        }
      }

      res.status(201).json({
        message: 'Inspection uploaded successfully.',
        id: this.lastID,
        image_url: imagePath,
        ...result,
      });
    });
  } catch (err) {
    console.error('Inspection pipeline failed:', err);
    res.status(500).json({ error: 'AI inference failed. Please retry the inspection.' });
  }
});


// 4. HISTORY ROUTE — returns all past inspections, newest first
app.get('/api/history', verifyToken, (req, res) => {
  const sql = 'SELECT * FROM InspectionLogs ORDER BY created_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch history.' });
    res.json(rows);
  });
});


// 5. REPORTS ROUTE — basic aggregate stats
app.get('/api/reports', verifyToken, (req, res) => {
  const sql = `
    SELECT
      COUNT(*) as total_inspections,
      AVG(damage_score) as avg_damage_score,
      SUM(CASE WHEN risk_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count
    FROM InspectionLogs
  `;
  db.get(sql, [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch reports.' });
    res.json(row);
  });
});

// Enhanced Error Handling Middleware (Handles 10MB limit with HTTP 413)
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File size exceeds 10MB limit.' });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Something went wrong.' });
});

// Start Server with Host Binding for Render/Docker
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server successfully running on port ${PORT}`);
});
