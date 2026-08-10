import os
import base64
import requests

# Use environment variable if set, otherwise fallback to your teammate's key
API_KEY = os.environ.get("ROBOFLOW_API_KEY", "M0IpDI0F7zxTm5UeEK2e")

def query_roboflow(image_path: str, model_id: str, timeout: int = 15) -> dict:
    """Helper function to send base64 image to Roboflow REST API."""
    if not API_KEY:
        print("Error: ROBOFLOW_API_KEY environment variable not set.")
        return {}

    try:
        with open(image_path, "rb") as image_file:
            encoded_image = base64.b64encode(image_file.read()).decode("utf-8")

        url = f"https://serverless.roboflow.com/{model_id}?api_key={API_KEY}"

        response = requests.post(
            url,
            data=encoded_image,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=timeout  # prevents indefinite hanging
        )

        if response.status_code != 200:
            print(f"Roboflow error {response.status_code} for model {model_id}: {response.text}")
            return {}

        return response.json()

    except FileNotFoundError:
        print(f"Error: image file not found at {image_path}")
        return {}
    except requests.exceptions.Timeout:
        print(f"Error: request to Roboflow model {model_id} timed out after {timeout}s")
        return {}
    except requests.exceptions.RequestException as e:
        print(f"Error querying Roboflow model {model_id}: {e}")
        return {}
    except ValueError as e:
        # response.json() failed to parse
        print(f"Error parsing Roboflow response for {model_id}: {e}")
        return {}


def predict_image(image_path: str) -> dict:
    # 1. Run Crack Detection Model
    crack_res = query_roboflow(image_path, "crack-and-crack/2")
    raw_cracks = crack_res.get("predictions", [])
    crack_preds = [
        {"confidence": round(float(p.get("confidence", 0)), 2), "class": "crack"}
        for p in raw_cracks
    ]

    # 2. Run Corrosion/Rust Detection Model
    corrosion_res = query_roboflow(image_path, "corrosion-yolov8/4")
    raw_corrosion = corrosion_res.get("predictions", [])
    rust_preds = [
        {"confidence": round(float(p.get("confidence", 0)), 2), "class": "rust"}
        for p in raw_corrosion
    ]

    return {
        "rust_data": {"predictions": rust_preds},
        "crack_data": {"predictions": crack_preds}
    }