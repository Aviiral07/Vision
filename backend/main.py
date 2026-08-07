from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from inference_sdk import InferenceHTTPClient
import shutil
import os

app = FastAPI()

# Frontend (React) ko connect karne ke liye CORS zaroori hai
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tumhari Roboflow API Key
CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="M0IpDI0F7zxTm5UeEK2e"
)

# Temporary folder banayega images receive karne ke liye
os.makedirs("temp_uploads", exist_ok=True)

# Main AI Endpoint
@app.post("/analyze-infrastructure")
async def analyze_image(file: UploadFile = File(...)):
    # 1. Image ko temp folder mein save karo
    file_path = f"temp_uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # 2. Dono Models (Crack & Rust) se pass karo
        crack_result = CLIENT.infer(file_path, model_id="crack-and-crack/2")
        rust_result = CLIENT.infer(file_path, model_id="corrosion-yolov8/4")
        
        # 3. Memory free karne ke liye image delete kardo
        os.remove(file_path)
        
        # 4. JSON format mein dono ka result bhej do
        return {
            "status": "success",
            "filename": file.filename,
            "detections": {
                "cracks": crack_result,
                "rust": rust_result
            }
        }
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        return {"status": "error", "message": str(e)}

# Test check karne ke liye base route
@app.get("/")
def read_root():
    return {"message": "InfraMind AI Engine is Running Successfully! 🚀"}
