# Frontend - AI Damage Inspector

Clean, simple React + Vite interface to test the FastAPI AI damage detection server (`backend/main.py`).

## Features
- Server health status indicator.
- Upload infrastructure images (JPG, PNG, WEBP).
- Send image to `/analyze-infrastructure` endpoint.
- Canvas detection visualizer for Cracks & Corrosion/Rust bounding boxes.
- Summary counts & raw JSON output.

## Running Locally

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.
