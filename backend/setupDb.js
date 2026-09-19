require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log("Database update start ho raha hai...");

    // 1. Purani tables ko Drop karna
    await client.query("DROP TABLE IF EXISTS InspectionLogs;");
    await client.query("DROP TABLE IF EXISTS HostelMaster;");
    await client.query("DROP TABLE IF EXISTS inspections;");
    console.log("✓ Purani saari inspection tables delete ho gayi hain.");

    // 2. Naya InspectionLogs Table
    await client.query(`
      CREATE TABLE InspectionLogs (
        id SERIAL PRIMARY KEY,
        hostel_id TEXT NOT NULL,
        inspector_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        gps_lat REAL,
        gps_long REAL,
        damage_score REAL,
        hygiene_status TEXT,
        risk_level TEXT,
        inspection_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ Naya InspectionLogs table ban gaya hai.");

    // 3. HostelMaster Table
    await client.query(`
      CREATE TABLE HostelMaster (
        hostel_id TEXT PRIMARY KEY,
        hostel_name TEXT NOT NULL,
        city TEXT NOT NULL,
        target_lat REAL NOT NULL,
        target_long REAL NOT NULL
      );
    `);
    console.log("✓ HostelMaster table ban gaya hai.");

    // 4. Master Data Insert
    const insertQuery = `
      INSERT INTO HostelMaster (hostel_id, hostel_name, city, target_lat, target_long)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (hostel_id) DO NOTHING;
    `;

    const hostels = [
      ["HOSTEL_A", "Delhi Boys Hostel", "Delhi", 28.6139, 77.2090],
      ["HOSTEL_B", "Mumbai Girls Hostel", "Mumbai", 19.0760, 72.8777],
      ["HOSTEL_C", "Bangalore Tech Hostel", "Bangalore", 12.9716, 77.5946],
      ["HOSTEL_D", "Kolkata Central Hostel", "Kolkata", 22.5726, 88.3639],
    ];

    for (const hostel of hostels) {
      await client.query(insertQuery, hostel);
    }
    console.log("✓ Dummy Hostels ka Master Data save ho gaya hai.");

  } catch (err) {
    console.error("Database setup error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();