const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'db', 'inspection.db');
const db = new sqlite3.Database(dbPath);

console.log("Testing Data Insertion and Fetching...");

// 1. Ek dummy offline inspection record insert karo
const insertLog = db.prepare(`
    INSERT INTO InspectionLogs (
        hostel_id, inspector_id, image_url, gps_lat, gps_long, 
        damage_score, hygiene_status, risk_level, inspection_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertLog.run(
    'HOSTEL_A', 
    'INSP_101', 
    'uploads/inspection_01.jpg', 
    28.6139, 
    77.2090, 
    85.5, 
    'Garbage Detected', 
    'CRITICAL', 
    '2026-03-30 09:00:00'
);
insertLog.finalize();

// 2. Data retrieve karke join relation check karo
db.get(`
    SELECT 
        i.id, i.hostel_id, h.city, i.gps_lat, h.target_lat, 
        i.hygiene_status, i.risk_level, i.inspection_time, i.created_at
    FROM InspectionLogs i
    JOIN HostelMaster h ON i.hostel_id = h.hostel_id
`, (err, row) => {
    if (err) {
        console.error("❌ Test Failed Error:", err.message);
    } else if (row) {
        console.log("\n-------------------------------------------");
        console.log("✅ TEST PASSED: Database working perfectly!");
        console.log("-------------------------------------------");
        console.log(`Log ID       : ${row.id}`);
        console.log(`Hostel       : ${row.hostel_id} (${row.city})`);
        console.log(`User GPS     : ${row.gps_lat} | Master GPS: ${row.target_lat}`);
        console.log(`Hygiene      : ${row.hygiene_status}`);
        console.log(`Risk Level   : ${row.risk_level}`);
        console.log(`Offline Time : ${row.inspection_time}`);
        console.log(`Created At   : ${row.created_at}`);
        console.log("-------------------------------------------\n");
    } else {
        console.log("❌ No data found.");
    }
});

db.close();