# EcoPulse AI — Full-stack hardware-free prototype

**Status:** Starter MVP for local development. All readings are synthetic; no real campus sensors are connected.

## ppt
https://drive.google.com/file/d/1AbA9Qok4yQs7ZsRPnlde0RnOhHZqq3Du/view?usp=sharing

## Live Dashboard
https://ecopulse-ai-w0pl.onrender.com/

## API Documentation
https://ecopulse-ai-api.onrender.com/docs

## Included
- React + Vite + Tailwind CSS dashboard
- FastAPI REST backend with Swagger docs
- Three synthetic datasets (water, energy, waste)
- Three Random Forest classification modules
- Chronological 80/20 holdout evaluation for each resource
- Recharts visualizations, zone filter, alert centre and action log
- Water-leak and electricity-anomaly demo triggers
- PostgreSQL/Supabase-ready action persistence (optional; app runs without DB)
- ESP32 integration intentionally deferred

<img width="1364" height="678" alt="Screenshot 2026-10-10 064647" src="https://github.com/user-attachments/assets/9b48528e-0ec9-41bc-9d46-07ef5702d292" />
<img width="1365" height="679" alt="Screenshot 2026-10-10 065241" src="https://github.com/user-attachments/assets/f8d3e404-5e52-4d5e-8eee-bde3ed59f066" />
<img width="1350" height="675" alt="Screenshot 2026-10-10 065842" src="https://github.com/user-attachments/assets/e1e3106f-6a37-42f5-a320-89ebbb7fc65d" />
<img width="1356" height="680" alt="Screenshot 2026-10-10 065906" src="https://github.com/user-attachments/assets/f0b9f858-40da-4d98-9afe-fe45bb38eaaf" />
<img width="1365" height="674" alt="Screenshot 2026-10-10 065948" src="https://github.com/user-attachments/assets/4595b8a2-b07a-42c4-9f56-81dc2efa29b4" />
<img width="1365" height="679" alt="Screenshot 2026-10-10 070013" src="https://github.com/user-attachments/assets/6bac0ea8-f55e-4cfe-a478-8719f8dd5577" />
<img width="1365" height="671" alt="Screenshot 2026-10-10 070352" src="https://github.com/user-attachments/assets/edaa4054-6298-4511-bc59-2dc673e1dbb0" />
<img width="1365" height="670" alt="Screenshot 2026-10-10 070537" src="https://github.com/user-attachments/assets/0a0c7620-dc59-4971-8213-38429fa11de7" />


## Project layout
```text
ecopulse-ai/
├── frontend/       # React + Vite + Tailwind + Recharts
├── backend/        # FastAPI API and optional DB persistence
├── ml/             # Water, energy and waste ML modules
├── data/           # Synthetic time-series CSV datasets
├── scripts/
├── requirements.txt
└── README.md
```

## Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 20+ and npm
- VS Code recommended
- Internet access for installing packages

## Run backend (Terminal 1)
From the project root:
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
If PowerShell blocks activation, use Command Prompt and run:
```bat
.venv\Scripts\activate.bat
```
Open `http://127.0.0.1:8000/docs` to inspect and test the API.
The first startup trains three models and can take a little while.

## Run frontend (Terminal 2)
Open a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open `http://127.0.0.1:5173`.

If you host the API somewhere other than localhost:8000, create `frontend/.env`:
```text
VITE_API_URL=http://127.0.0.1:8000
```
Restart Vite after changing environment variables.

## Optional PostgreSQL / Supabase
1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a PostgreSQL connection string, for example:
   `postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres`
3. Restart the backend.
4. The backend creates `ecopulse_actions` and saves corrective actions there.

The dashboard and CSV-backed predictions work without a database. With no `DATABASE_URL`, actions are held in backend memory and disappear when the server restarts. Keep database credentials private; never commit `.env`.

## Datasets
- `data/ecopulse_water_readings.csv`: 5 zones, 30 days, 15-minute samples, synthetic flow/pressure/occupancy and simulated anomaly labels.
- `data/ecopulse_energy_readings.csv`: 5 zones, 30 days, 15-minute samples, synthetic electricity load/voltage/occupancy and simulated anomaly labels.
- `data/ecopulse_smart_bin_readings.csv`: 10 bins, 30 days, 15-minute samples, synthetic fill level, fill rate, sensor-quality flags and a two-hour overflow label.

## ML and validation
Run from the project root:
```powershell
python -m ml.evaluate
```
The models use a chronological split. Features include sensor/context values and exclude target labels. Reported metrics are for synthetic holdout data only; they are not proof of real-world accuracy. For actual deployment, collect calibrated readings, label confirmed incidents, and validate on separate real time periods.

## Demo flow
1. Open Overview.
2. Select Water → click **Simulate possible leak** → see alerts.
3. Select Energy → click **Simulate load anomaly** → see alerts.
4. Select Waste → inspect bin fill and model risk.
5. Open Alerts & Actions → save a corrective action.
6. Open Model Validation → explain synthetic holdout metrics.
7. Reset the demo if required.

## Known MVP limitations
- Water and energy demo buttons add an illustrative anomaly scenario; they do not change real hardware.
- Historical charts and latest rows come from synthetic CSV files; the demo controls are not a live streaming sensor simulator.
- Database persistence currently covers corrective-action records, not every sensor reading.
- No authentication/roles, MQTT broker, email/SMS notifications, or physical IoT support is configured.
- Risk scores must be validated before operational use.
