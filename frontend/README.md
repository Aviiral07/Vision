# Frontend - AI Damage Inspector

Clean, simple React + Vite interface for the Node.js/Express AI damage detection server (`backend/server.js`).

## Features
- Server health status indicator.
- Upload infrastructure images (JPG, PNG, WEBP).
- Send image to `/api/upload-inspection` endpoint.
- Canvas detection visualizer for Cracks & Corrosion/Rust bounding boxes.
- Summary counts & raw JSON output.

## Running Locally

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.
