require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Folders Setup
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      const err = new Error('Only image files are allowed');
      err.status = 400;
      cb(err, false);
    }
  }
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

  // Inspection Logs Table
  db.run(`
    CREATE TABLE IF NOT EXISTS InspectionLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_path TEXT NOT NULL,
      damage_type TEXT,
      confidence REAL,
      risk_score REAL,
      recommendation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Routes

// Health Check
app.get('/', (req, res) => res.send('Inspection backend is running.'));

// User Registration (Hashed Password)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO Users (username, password) VALUES (?, ?)`;
    db.run(sql, [username, hashedPassword], function (err) {
      if (err) return res.status(400).json({ error: 'Username already exists or invalid data.' });
      res.status(201).json({ message: 'User registered successfully.', userId: this.lastID });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to hash password.' });
  }
});

// User Login (Bcrypt Compare)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const sql = `SELECT id, username, password FROM Users WHERE username = ?`;
  db.get(sql, [username], async (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!row) return res.status(401).json({ error: 'Invalid username or password.' });

    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password.' });

    res.json({ message: 'Login successful.', user: { id: row.id, username: row.username } });
  });
});

// Upload Inspection
app.post('/api/upload-inspection', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

  const { damage_type, confidence, risk_score, recommendation } = req.body;
  const imagePath = `/uploads/${req.file.filename}`;

  const insertSQL = `
    INSERT INTO InspectionLogs (image_path, damage_type, confidence, risk_score, recommendation)
    VALUES (?, ?, ?, ?, ?)
  `;

  const params = [
    imagePath,
    damage_type || null,
    confidence !== undefined ? parseFloat(confidence) : null,
    risk_score !== undefined ? parseFloat(risk_score) : null,
    recommendation || null,
  ];

  db.run(insertSQL, params, function (err) {
    if (err) return res.status(500).json({ error: 'Failed to save inspection record.' });
    res.status(201).json({
      message: 'Inspection uploaded successfully.',
      id: this.lastID,
      image_path: imagePath,
      damage_type,
      confidence,
      risk_score,
      recommendation,
    });
  });
});

// Inspection History
app.get('/api/history', (req, res) => {
  db.all(`SELECT * FROM InspectionLogs ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch history.' });
    res.json(rows);
  });
});

// Summary Reports
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

// Error Handling Middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message || 'Something went wrong.' });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));