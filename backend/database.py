
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
def save_inspection(image_path: str, crack_data: dict, rust_data: dict):
    db = SessionLocal()
    
    rust_preds = rust_data.get("predictions", [])
    crack_preds = crack_data.get("predictions", [])
    
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

    new_log = InspectionLog(
        image_path=image_path,
        damage_type=damage_type,
        confidence=confidence,
        risk_score=risk_score,
        recommendation=recommendation
    )
    
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    db.close()
    
    return new_log.id