require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// allow cross-origin requests for react frontend
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// setup upload directory if missing
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOAD_DIR));

// multer config - restrict uploads to image mimetypes
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ 
  storage, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      const err = new Error('Only image files are allowed');
      err.status = 400; // send 400 bad request if user uploads pdf/docs
      cb(err, false);
    }
  }
});

// sqlite db initialization
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'inspection.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('db connection error:', err.message);
  else console.log('connected to sqlite db at', DB_PATH);
});

// ensure tables exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // added severity column to log geometric risk
  db.run(`
    CREATE TABLE IF NOT EXISTS InspectionLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_path TEXT NOT NULL,
      damage_type TEXT,
      confidence REAL,
      risk_score REAL,
      severity TEXT,
      recommendation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// calls both Roboflow models (crack + corrosion) with the uploaded image
async function detectDamage(imagePath) {
  const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
  const apiKey = process.env.ROBOFLOW_API_KEY;

  const callModel = (modelPath) =>
    axios.post(
      `https://serverless.roboflow.com/${modelPath}?api_key=${apiKey}`,
      imageBase64,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

  // run both models in parallel; if one fails, don't let it kill the other
  const [crackResult, rustResult] = await Promise.allSettled([
    callModel('crack-and-crack/2'),
    callModel('corrosion-yolov8/4'),
  ]);

  // DEBUG: log exactly what Roboflow sent back so we can see real errors
  if (crackResult.status === 'fulfilled') {
    console.log('CRACK MODEL RAW RESPONSE:', JSON.stringify(crackResult.value.data));
  } else {
    console.log('CRACK MODEL FAILED:', crackResult.reason?.response?.status, JSON.stringify(crackResult.reason?.response?.data || crackResult.reason.message));
  }
  if (rustResult.status === 'fulfilled') {
    console.log('RUST MODEL RAW RESPONSE:', JSON.stringify(rustResult.value.data));
  } else {
    console.log('RUST MODEL FAILED:', rustResult.reason?.response?.status, JSON.stringify(rustResult.reason?.response?.data || rustResult.reason.message));
  }

  const crack_data = crackResult.status === 'fulfilled' ? crackResult.value.data : { predictions: [] };
  const rust_data = rustResult.status === 'fulfilled' ? rustResult.value.data : { predictions: [] };

  if (crackResult.status === 'rejected') console.error('Crack model error:', crackResult.reason.message);
  if (rustResult.status === 'rejected') console.error('Rust model error:', rustResult.reason.message);

  return { crack_data, rust_data };
}

// helper to calculate severity based on bbox area vs total img area
function getGeometricSeverity(imgW, imgH, bboxW, bboxH) {
  const w = parseFloat(imgW) || 0;
  const h = parseFloat(imgH) || 0;
  const bw = parseFloat(bboxW) || 0;
  const bh = parseFloat(bboxH) || 0;

  const imgArea = w * h;
  if (imgArea === 0) return 'Low';

  const damageArea = bw * bh;
  const pct = (damageArea / imgArea) * 100;

  // rule: >25% critical, 10-25% medium, rest low
  if (pct > 25) return 'Critical';
  if (pct >= 10 && pct <= 25) return 'Medium';
  return 'Low';
}

// combines crack + rust predictions into damage_type, severity, confidence, risk_score, recommendation
function buildInspectionSummary(crack_data, rust_data) {
  const crackPreds = crack_data?.predictions || [];
  const rustPreds = rust_data?.predictions || [];
  const allPreds = [...crackPreds, ...rustPreds];

  // damage type
  let damage_type;
  if (crackPreds.length && rustPreds.length) damage_type = 'Corrosion & Crack';
  else if (crackPreds.length) damage_type = 'Crack';
  else if (rustPreds.length) damage_type = 'Corrosion';
  else damage_type = 'Healthy';

  // highest confidence among all detections (as a fraction, e.g. 0.87)
  const confidence = allPreds.length
    ? Math.max(...allPreds.map((p) => p.confidence || 0))
    : null;

  // image dims come back from Roboflow on each response (image_data.width/height)
  const imgW = crack_data?.image?.width || rust_data?.image?.width || 0;
  const imgH = crack_data?.image?.height || rust_data?.image?.height || 0;
  const imgArea = imgW * imgH;

  let severity = 'None';
  let riskPct = 0;

  if (imgArea > 0 && allPreds.length) {
    const totalDamageArea = allPreds.reduce((sum, p) => sum + (p.width || 0) * (p.height || 0), 0);
    riskPct = (totalDamageArea / imgArea) * 100;
    if (riskPct > 25) severity = 'Critical';
    else if (riskPct >= 10) severity = 'Medium';
    else severity = 'Low';
  }

  const recommendationMap = {
    Critical: 'Immediate repair required.',
    Medium: 'Schedule inspection and repair soon.',
    Low: 'Monitor periodically, no urgent action needed.',
    None: 'No damage detected.',
  };

  return {
    damage_type,
    confidence,
    severity,
    risk_score: Number(riskPct.toFixed(2)),
    recommendation: recommendationMap[severity],
  };
}

// routes
app.get('/api/health', (req, res) => res.send('Inspection backend is running.'));

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const sql = `INSERT INTO Users (username, password) VALUES (?, ?)`;
  db.run(sql, [username, password], function (err) {
    if (err) return res.status(400).json({ error: 'Username already exists or invalid data.' });
    res.status(201).json({ message: 'User registered successfully.', userId: this.lastID });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const sql = `SELECT id, username FROM Users WHERE username = ? AND password = ?`;
  db.get(sql, [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!row) return res.status(401).json({ error: 'Invalid username or password.' });
    res.json({ message: 'Login successful.', user: row });
  });
});

// handles image upload -> runs Roboflow detection -> saves calculated damage severity
app.post('/api/upload-inspection', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

  const imagePath = `/uploads/${req.file.filename}`;
  const absolutePath = path.join(UPLOAD_DIR, req.file.filename);

  let crack_data, rust_data;
  try {
    ({ crack_data, rust_data } = await detectDamage(absolutePath));
  } catch (err) {
    return res.status(502).json({ error: 'AI detection failed.', details: err.message });
  }

  const { damage_type, confidence, severity, risk_score, recommendation } =
    buildInspectionSummary(crack_data, rust_data);

  const insertSQL = `
    INSERT INTO InspectionLogs (image_path, damage_type, confidence, risk_score, severity, recommendation)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [imagePath, damage_type, confidence, risk_score, severity, recommendation];

  db.run(insertSQL, params, function (err) {
    if (err) return res.status(500).json({ error: 'Failed to save inspection record.' });
    res.status(201).json({
      message: 'Inspection uploaded successfully.',
      id: this.lastID,
      image_path: imagePath,
      damage_type,
      confidence,
      risk_score,
      severity,
      recommendation,
      detections: { cracks: crack_data, rust: rust_data },
    });
  });
});

// fetch inspection logs with optional query filters (severity & type)
app.get('/api/history', (req, res) => {
  const { severity, type } = req.query;
  let sql = `SELECT * FROM InspectionLogs WHERE 1=1`;
  const params = [];

  if (severity) {
    sql += ` AND LOWER(severity) = LOWER(?)`;
    params.push(severity);
  }

  if (type) {
    sql += ` AND LOWER(damage_type) = LOWER(?)`;
    params.push(type);
  }

  sql += ` ORDER BY created_at DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch history.' });
    res.json(rows);
  });
});

app.get('/api/reports', (req, res) => {
  const reportSQL = `
    SELECT
      COUNT(*) AS total_inspections,
      AVG(risk_score) AS average_risk_score
    FROM InspectionLogs
  `;
  db.get(reportSQL, [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to generate report.' });
    res.json({
      total_inspections: row.total_inspections || 0,
      average_risk_score: row.average_risk_score ? Number(row.average_risk_score.toFixed(2)) : 0,
    });
  });
});

// serve the built React app (run `npm run build` in /frontend first)
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // any route that isn't /api or /uploads falls back to index.html (React handles routing)
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// global error catch middleware (handles multer pdf rejection gracefully)
app.use((err, req, res, next) => {
  const status = err.status || 400;
  res.status(status).json({ error: err.message || 'Something went wrong.' });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));