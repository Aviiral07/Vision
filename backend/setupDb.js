const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Correct path setting: 'db' folder ke andar 'inspection.db' banega
const dbPath = path.resolve(__dirname, 'db', 'inspection.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Database update start ho raha hai...");

    // 1. Purani tables ko Drop karna
    db.run("DROP TABLE IF EXISTS InspectionLogs");
    db.run("DROP TABLE IF EXISTS HostelMaster");
    db.run("DROP TABLE IF EXISTS inspections");
    console.log("✓ Purani saari inspection tables delete ho gayi hain.");

    // 2. Naya InspectionLogs Table
    db.run(`
        CREATE TABLE InspectionLogs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hostel_id TEXT NOT NULL,
            inspector_id TEXT NOT NULL,
            image_url TEXT NOT NULL,
            gps_lat REAL,
            gps_long REAL,
            damage_score REAL,
            hygiene_status TEXT,
            risk_level TEXT,
            inspection_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `, (err) => {
        if (!err) console.log("✓ Naya InspectionLogs table ban gaya hai.");
    });

    // 3. HostelMaster Table
    db.run(`
        CREATE TABLE HostelMaster (
            hostel_id TEXT PRIMARY KEY,
            hostel_name TEXT NOT NULL,
            city TEXT NOT NULL,
            target_lat REAL NOT NULL,
            target_long REAL NOT NULL
        );
    `, (err) => {
        if (!err) console.log("✓ HostelMaster table ban gaya hai.");
    });

    // 4. Master Data Insert
    const insertHostel = db.prepare(`
        INSERT INTO HostelMaster (hostel_id, hostel_name, city, target_lat, target_long)
        VALUES (?, ?, ?, ?, ?)
    `);

    insertHostel.run("HOSTEL_A", "Delhi Boys Hostel", "Delhi", 28.6139, 77.2090);
    insertHostel.run("HOSTEL_B", "Mumbai Girls Hostel", "Mumbai", 19.0760, 72.8777);
    insertHostel.run("HOSTEL_C", "Bangalore Tech Hostel", "Bangalore", 12.9716, 77.5946);
    insertHostel.run("HOSTEL_D", "Kolkata Central Hostel", "Kolkata", 22.5726, 88.3639);

    insertHostel.finalize();
    console.log("✓ Dummy Hostels ka Master Data save ho gaya hai.");
});

db.close();