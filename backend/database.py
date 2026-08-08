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

def save_inspection(image_path: str, crack_data: dict, rust_data: dict):
    db = SessionLocal()
    
    rust_preds = rust_data.get("predictions", [])
    crack_preds = crack_data.get("predictions", [])
    
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

    new_log = InspectionLog(
        image_path=image_path,
        damage_type=damage_type,
        severity=severity,
        confidence_score=round(damage_ratio * 100, 2)
    )
    
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    db.close()
    
    return new_log.id