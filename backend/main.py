
import sys
import os
import shutil
from pathlib import Path
from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles

# Add project root directory to path so main.py can locate ai_engine
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Import your real Roboflow prediction function from ai_engine
from ai_engine.scripts.inference import predict_image
from database import save_inspection

app = FastAPI(title="InfraMind AI Backend")

# Setup uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.post("/api/inspect")
async def run_inspection(file: UploadFile = File(...)):
    # 1. Save uploaded file to /uploads directory
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Call Real Roboflow Models
    ai_results = predict_image(file_path)
    rust_data = ai_results.get("rust_data", {"predictions": []})
    crack_data = ai_results.get("crack_data", {"predictions": []})

    # 3. Store in SQLite database
    log_id = save_inspection(
        image_path=file_path,
        crack_data=crack_data,
        rust_data=rust_data
    )

    # 4. Return complete API response
    return {
        "status": "success",
        "inspection_id": log_id,
        "image_url": f"/uploads/{file.filename}",
        "rust_data": rust_data,
        "crack_data": crack_data
    }