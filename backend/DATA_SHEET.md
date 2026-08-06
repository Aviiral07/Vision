# Backend Data Sheet & API Specification

## 1. Database Schema (SQLite: `inspection.db`)

### Table 1: `Users`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user ID |
| `username` | TEXT | UNIQUE, NOT NULL | Account username |
| `password` | TEXT | NOT NULL | Account password |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |

### Table 2: `InspectionLogs`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique log ID |
| `image_path` | TEXT | NOT NULL | Path to image in `/uploads` |
| `damage_type` | TEXT | NULLABLE | Type of damage detected |
| `confidence` | REAL | NULLABLE | AI model confidence score |
| `risk_score` | REAL | NULLABLE | Calculated risk rating |
| `recommendation` | TEXT | NULLABLE | Actionable recommendation |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Inspection timestamp |

---

## 2. API Endpoints

### Auth Routes
- `POST /api/register`
  - **Body:** `{ "username": "admin", "password": "password123" }`
  - **Response:** `{ "message": "User registered successfully." }`

- `POST /api/login`
  - **Body:** `{ "username": "admin", "password": "password123" }`
  - **Response:** `{ "message": "Login successful.", "user": { "id": 1, "username": "admin" } }`

### Inspection Routes
- `POST /api/upload-inspection`
  - **Form-Data:** `image` (File), `damage_type`, `confidence`, `risk_score`, `recommendation`
  - **Response:** `{ "message": "Inspection uploaded successfully.", "id": 1, "image_path": "..." }`

- `GET /api/history`
  - **Response:** Array of all inspection logs (newest first).

- `GET /api/reports`
  - **Response:** `{ "total_inspections": 12, "average_risk_score": 4.25 }`