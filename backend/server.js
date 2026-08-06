// ============================================================
// server.js
// A beginner-friendly Express backend for handling image-based
// "inspection" uploads, storing metadata in SQLite, and serving
// history + summary report routes.
// ============================================================

// ---------- 1. Import dependencies ----------
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ---------- 2. Basic app setup ----------
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- 3. Make sure the uploads folder exists ----------
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Serve uploaded images statically so they can be viewed via a URL
// e.g. http://localhost:5000/uploads/<filename>
app.use('/uploads', express.static(UPLOAD_DIR));

// ---------- 4. Multer configuration (where & how to store uploaded files) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Prefix with timestamp to avoid filename collisions
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Only accept image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });

// ---------- 5. SQLite database setup ----------
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.join(DB_DIR, 'inspection.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', DB_PATH);
  }
});

// Create the InspectionLogs table if it doesn't already exist
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS InspectionLogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_path TEXT NOT NULL,
  damage_type TEXT,
  confidence REAL,
  risk_score REAL,
  recommendation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;

db.run(CREATE_TABLE_SQL, (err) => {
  if (err) {
    console.error('Failed to create InspectionLogs table:', err.message);
  } else {
    console.log('InspectionLogs table is ready.');
  }
});

// ---------- 6. Routes ----------

// Health check root route
app.get('/', (req, res) => {
  res.send('Inspection backend is running.');
});

// ---- POST /api/upload-inspection ----
// Accepts a single image file (field name: "image") plus form fields:
// damage_type, confidence, risk_score, recommendation
// Saves the file to /uploads and a metadata row to InspectionLogs
app.post('/api/upload-inspection', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded. Use field name "image".' });
  }

  const { damage_type, confidence, risk_score, recommendation } = req.body;

  // Store a relative path so it can be reused with the /uploads static route
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
    if (err) {
      console.error('Insert error:', err.message);
      return res.status(500).json({ error: 'Failed to save inspection record.' });
    }

    // \`this.lastID\` gives the id of the row we just inserted
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

// ---- GET /api/history ----
// Returns all inspection logs, newest first
app.get('/api/history', (req, res) => {
  const selectSQL = `SELECT * FROM InspectionLogs ORDER BY created_at DESC`;

  db.all(selectSQL, [], (err, rows) => {
    if (err) {
      console.error('Fetch history error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch inspection history.' });
    }
    res.json(rows);
  });
});

// ---- GET /api/reports ----
// Returns summary stats: total inspection count and average risk score
app.get('/api/reports', (req, res) => {
  const reportSQL = `
    SELECT
      COUNT(*) AS total_inspections,
      AVG(risk_score) AS average_risk_score
    FROM InspectionLogs
  `;

  db.get(reportSQL, [], (err, row) => {
    if (err) {
      console.error('Report generation error:', err.message);
      return res.status(500).json({ error: 'Failed to generate report.' });
    }

    res.json({
      total_inspections: row.total_inspections || 0,
      average_risk_score: row.average_risk_score
        ? Number(row.average_risk_score.toFixed(2))
        : 0,
    });
  });
});

// ---------- 7. Basic error handler (e.g. for Multer file-type errors) ----------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong.' });
});

// ---------- 8. Start the server ----------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});