import os
import shutil
from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
from database import save_inspection

app = FastAPI(title="InfraMind AI Backend")

# Setup uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.post("/api/inspect")
async def run_inspection(file: UploadFile = File(...)):
    # 1. Save uploaded file to /uploads
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Mock AI payload (Replace with actual model calls)
    mock_rust_data = {"predictions": [{"confidence": 0.85, "class": "rust"}]}
    mock_crack_data = {"predictions": []}

    # 3. Store in SQLite database
    log_id = save_inspection(
        image_path=file_path,
        crack_data=mock_crack_data,
        rust_data=mock_rust_data
    )

    return {
        "status": "success",
        "inspection_id": log_id,
        "image_url": f"/uploads/{file.filename}",
        "damage_type": "Corrosion",
        "confidence": 0.85,
        "risk_score": 85.0,
        "recommendation": "Immediate Repair Required"
    }
