<<<<<<< HEAD

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# 1. Database Connection Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./db/inspection.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. Model matching your DATA_SHEET.md schema
class InspectionLog(Base):
    __tablename__ = "InspectionLogs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    image_path = Column(String, nullable=False)
    damage_type = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=True)
    recommendation = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# 3. Logic to process AI predictions and write to SQLite database
=======
def calculate_geometric_severity(image_data, predictions):
    if not predictions:
        return "None", 0.0

    img_width = image_data.get("width", 1000)
    img_height = image_data.get("height", 1000)
    total_image_area = img_width * img_height

    total_damage_area = 0
    for pred in predictions:
        box_area = pred.get("width", 0) * pred.get("height", 0)
        total_damage_area += box_area

    damage_ratio = total_damage_area / total_image_area

    if damage_ratio > 0.25:
        return "Critical", damage_ratio
    elif damage_ratio > 0.10:
        return "Medium", damage_ratio
    else:
        return "Low", damage_ratio

>>>>>>> dev-finisher-logic
def save_inspection(image_path: str, crack_data: dict, rust_data: dict):
    db = SessionLocal()
    
    rust_preds = rust_data.get("predictions", [])
    crack_preds = crack_data.get("predictions", [])
    
<<<<<<< HEAD
    damage_type = "Healthy"
    confidence = 0.0

    if rust_preds or crack_preds:
        if rust_preds and crack_preds:
            damage_type = "Corrosion & Crack"
            confidence = max([p["confidence"] for p in rust_preds] + [p["confidence"] for p in crack_preds])
        elif rust_preds:
            damage_type = "Corrosion"
            confidence = max([p["confidence"] for p in rust_preds])
        elif crack_preds:
            damage_type = "Crack"
            confidence = max([p["confidence"] for p in crack_preds])

    risk_score = round(confidence * 100, 2)
    if risk_score > 75:
        recommendation = "Immediate Repair Required"
    elif risk_score > 40:
        recommendation = "Schedule Maintenance"
    else:
        recommendation = "Monitor Asset"
=======
    image_info = rust_data.get("image", {}) if rust_preds else crack_data.get("image", {})
    all_predictions = rust_preds + crack_preds
    
    severity, damage_ratio = calculate_geometric_severity(image_info, all_predictions)
    
    if rust_preds and crack_preds:
        damage_type = "Corrosion & Crack"
    elif rust_preds:
        damage_type = "Corrosion"
    elif crack_preds:
        damage_type = "Crack"
    else:
        damage_type = "Healthy"
>>>>>>> dev-finisher-logic

    new_log = InspectionLog(
        image_path=image_path,
        damage_type=damage_type,
<<<<<<< HEAD
        confidence=confidence,
        risk_score=risk_score,
        recommendation=recommendation
=======
        severity=severity,
        confidence_score=round(damage_ratio * 100, 2)
>>>>>>> dev-finisher-logic
    )
    
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    db.close()
    
    return new_log.id