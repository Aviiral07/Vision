# InfraMind — Infrastructure Inspection App

A full-stack app that uses AI (Roboflow) to detect cracks and corrosion/rust in
uploaded infrastructure images, calculates a severity score, and logs results.

## Project Structure

```
├── .github/
│   └── CODEOWNERS      # Code ownership configuration
├── frontend/            # React + Vite UI
├── backend/              # Node.js + Express API (Roboflow integration, SQLite DB)
└── README.md
```

## Tech Stack

- **Frontend**: React, Vite
- **Backend**: Node.js, Express, SQLite (via `sqlite3`)
- **AI Detection**: [Roboflow](https://roboflow.com) hosted inference API
  (crack + corrosion models called directly over HTTP from `server.js` — pure
  Node.js, no Python service involved)

## Setup & Run

### 1. Backend
```bash
cd backend
npm install
node server.js
```
Runs on `http://localhost:5000`. Requires a `.env` file (see `backend/.env`) with:
```
ROBOFLOW_API_KEY=your_key_here
PORT=5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` by default.

## Modules

- **[Frontend](frontend/README.md)**: React code, components, and UI.
- **[Backend](backend/README.md)**: Express API routes, SQLite schema, Roboflow integration.
- **[Data Sheet](backend/DATA_SHEET.md)**: Full API + database schema reference.
- **[CODEOWNERS](.github/CODEOWNERS)**: GitHub code ownership and review rules.
