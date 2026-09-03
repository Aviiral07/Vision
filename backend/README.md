# Backend

Node.js + Express API server for the InfraMind inspection app.

## What it does
- Handles user registration/login
- Accepts image uploads
- Sends images to Roboflow (crack + corrosion detection models)
- Calculates severity based on detected damage area vs. image area
- Saves inspection results to a local SQLite database (`db/inspection.db`)
- Serves inspection history and summary reports

## Files
- `server.js` — main Express app (all routes + Roboflow integration)
- `db/inspection.db` — SQLite database (auto-created on first run)
- `uploads/` — stores uploaded images (auto-created on first run)
- `.env` — environment variables (`ROBOFLOW_API_KEY`, `PORT`) — not committed to git

## Run
```bash
npm install
node server.js
```

See [DATA_SHEET.md](./DATA_SHEET.md) for full API and database documentation.
