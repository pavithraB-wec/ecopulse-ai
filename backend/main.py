from pathlib import Path
import sys
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services.data_service import load_csv, latest_rows
from backend.database import init_db, save_action, get_actions, engine
from ml.water_anomaly import train_water_model, FEATURES as WATER_FEATURES
from ml.energy_anomaly import train_energy_model, FEATURES as ENERGY_FEATURES
from ml.waste_overflow import train_waste_model, FEATURES as WASTE_FEATURES

app = FastAPI(title="EcoPulse AI API", version="0.1.0",
              description="Hardware-free synthetic prototype for water, energy and waste monitoring.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

DATASETS = {
    "water": "ecopulse_water_readings.csv",
    "energy": "ecopulse_energy_readings.csv",
    "waste": "ecopulse_smart_bin_readings.csv"
}
water_df = energy_df = waste_df = None
water_model = energy_model = waste_model = None
metrics = {}
demo_water_leak = False
demo_energy_anomaly = False
memory_actions = []

class DemoAction(BaseModel):
    zone: str = Field(default="Canteen", max_length=100)
    action: str = Field(min_length=2, max_length=200)
    notes: Optional[str] = Field(default=None, max_length=1000)

@app.on_event("startup")
def startup():
    global water_df, energy_df, waste_df, water_model, energy_model, waste_model, metrics
    water_df = load_csv(DATASETS["water"])
    energy_df = load_csv(DATASETS["energy"])
    waste_df = load_csv(DATASETS["waste"])
    water_model, metrics["water"] = train_water_model(ROOT / "data" / DATASETS["water"])
    energy_model, metrics["energy"] = train_energy_model(ROOT / "data" / DATASETS["energy"])
    waste_model, metrics["waste"] = train_waste_model(ROOT / "data" / DATASETS["waste"])
    try:
        init_db()
    except Exception as exc:
        print(f"Database not available; continuing in CSV/demo mode: {exc}")

@app.get("/")
def root():
    return {"name": "EcoPulse AI API", "status": "running", "docs": "/docs", "data_mode": "synthetic"}

@app.get("/api/health")
def health():
    return {"status": "ok", "database": "connected" if engine is not None else "not_configured",
            "resources": ["water", "energy", "waste"], "hardware": "not_connected"}

@app.get("/api/zones")
def zones():
    return sorted(water_df["zone"].unique().tolist())

@app.get("/api/dashboard")
def dashboard():
    water_latest = latest_rows(water_df, "zone")
    energy_latest = latest_rows(energy_df, "zone")
    waste_latest = latest_rows(waste_df, "bin_id")
    water_latest["predicted_anomaly"] = water_model.predict(water_latest[WATER_FEATURES]).astype(int)
    energy_latest["predicted_anomaly"] = energy_model.predict(energy_latest[ENERGY_FEATURES]).astype(int)
    waste_latest["overflow_risk_pct"] = (waste_model.predict_proba(waste_latest[WASTE_FEATURES])[:, 1] * 100).round().astype(int)
    if demo_water_leak:
        water_latest["flow_lph"] = (water_latest["flow_lph"] * 2.4).round(2)
        water_latest["predicted_anomaly"] = 1
    if demo_energy_anomaly:
        energy_latest["load_kw"] = (energy_latest["load_kw"] * 1.9).round(3)
        energy_latest["predicted_anomaly"] = 1
    water_latest["demo_anomaly"] = int(demo_water_leak)
    energy_latest["demo_anomaly"] = int(demo_energy_anomaly)
    return {
        "water": {
            "current_flow_lph": round(float(water_latest["flow_lph"].mean() * (2.4 if demo_water_leak else 1)), 2),
            "anomaly_zones": int(water_latest["predicted_anomaly"].sum()) + int(demo_water_leak),
            "latest": water_latest[["timestamp","zone","flow_lph","expected_flow_lph","pressure_kpa","predicted_anomaly"]].to_dict("records")
        },
        "energy": {
            "current_load_kw": round(float(energy_latest["load_kw"].sum() * (1.9 if demo_energy_anomaly else 1)), 2),
            "anomaly_zones": int(energy_latest["predicted_anomaly"].sum()) + int(demo_energy_anomaly),
            "latest": energy_latest[["timestamp","zone","load_kw","expected_load_kw","voltage_v","predicted_anomaly"]].to_dict("records")
        },
        "waste": {
            "average_fill_pct": round(float(waste_latest["fill_level_pct"].mean()), 2),
            "high_priority_bins": int(((waste_latest["fill_level_pct"] >= 85) | (waste_latest["overflow_risk_pct"] >= 70)).sum()),
            "latest": waste_latest[["timestamp","bin_id","zone","waste_type","fill_level_pct","fill_rate_pct_per_hour","overflow_risk_pct","sensor_quality"]].fillna(value={"fill_level_pct": 0, "fill_rate_pct_per_hour": 0}).to_dict("records")
        },
        "synthetic_data": True
    }

@app.get("/api/readings/{resource}")
def readings(resource: str, zone: Optional[str] = None, limit: int = 300):
    if resource not in DATASETS:
        raise HTTPException(404, "Resource must be water, energy, or waste.")
    df = {"water": water_df, "energy": energy_df, "waste": waste_df}[resource]
    if zone:
        df = df[df["zone"] == zone]
    return df.tail(max(1, min(limit, 2000))).fillna(value="").to_dict("records")

@app.get("/api/alerts")
def alerts():
    out = []
    water_latest = latest_rows(water_df, "zone")
    for _, row in water_latest.iterrows():
        pred = int(water_model.predict(pd_frame(row, WATER_FEATURES))[0])
        if pred or demo_water_leak:
            out.append({"id": f"water-{row['zone']}", "resource": "Water", "zone": row["zone"],
                        "severity": "High" if demo_water_leak else "Medium",
                        "title": "Possible abnormal water flow",
                        "reason": "Simulated demo flow is elevated" if demo_water_leak else "Model flagged a possible anomaly",
                        "recommended_action": "Inspect the meter and pipe; confirm manually."})
    energy_latest = latest_rows(energy_df, "zone")
    for _, row in energy_latest.iterrows():
        pred = int(energy_model.predict(pd_frame(row, ENERGY_FEATURES))[0])
        if pred or demo_energy_anomaly:
            out.append({"id": f"energy-{row['zone']}", "resource": "Energy", "zone": row["zone"],
                        "severity": "High" if demo_energy_anomaly else "Medium",
                        "title": "Possible abnormal electricity load",
                        "reason": "Simulated load is elevated" if demo_energy_anomaly else "Model flagged a possible anomaly",
                        "recommended_action": "Check equipment schedule and meter readings."})
    waste_latest = latest_rows(waste_df, "bin_id")
    risks = waste_model.predict_proba(waste_latest[WASTE_FEATURES])[:,1]
    for (_, row), risk in zip(waste_latest.iterrows(), risks):
        if (pd.notna(row["fill_level_pct"]) and row["fill_level_pct"] >= 85) or risk >= 0.7:
            out.append({"id": f"waste-{row['bin_id']}", "resource": "Waste", "zone": row["zone"],
                        "severity": "High", "title": f"{row['bin_id']} may need collection",
                        "reason": f"Fill {row['fill_level_pct']:.1f}% / model overflow risk {risk:.0%}",
                        "recommended_action": "Prioritize collection and verify fill after emptying."})
    return out

def pd_frame(row, features):
    import pandas as pd
    return pd.DataFrame([{f: row[f] for f in features}])

@app.get("/api/metrics")
def model_metrics():
    return {"synthetic_holdout_metrics": metrics, "warning": "Metrics are evaluated on synthetic data and do not prove real-world accuracy."}

@app.post("/api/demo/water-leak")
def trigger_water_leak():
    global demo_water_leak
    demo_water_leak = True
    return {"active": True, "message": "Simulated possible water leak activated."}

@app.post("/api/demo/energy-anomaly")
def trigger_energy_anomaly():
    global demo_energy_anomaly
    demo_energy_anomaly = True
    return {"active": True, "message": "Simulated abnormal electricity load activated."}

@app.post("/api/demo/reset")
def reset_demo():
    global demo_water_leak, demo_energy_anomaly
    demo_water_leak = False
    demo_energy_anomaly = False
    return {"active": False, "message": "Demo anomalies reset."}

@app.post("/api/actions")
def create_action(item: DemoAction):
    record = {"created_at": datetime.now().isoformat(timespec="seconds"), "zone": item.zone,
              "action": item.action, "notes": item.notes or ""}
    try:
        saved = save_action(item.zone, item.action, item.notes)
        if saved:
            return {"stored_in": "database", "action": saved}
    except Exception as exc:
        print(f"Could not persist action: {exc}")
    memory_actions.append(record)
    return {"stored_in": "memory", "action": record}

@app.get("/api/actions")
def list_actions():
    try:
        saved = get_actions()
        if saved is not None:
            return saved
    except Exception as exc:
        print(f"Could not read actions: {exc}")
    return memory_actions[::-1]

@app.get("/api/overview/trends")
def trends():
    # Hourly aggregates from synthetic CSV, capped for chart readability.
    w = water_df.groupby(["timestamp"], as_index=False)["flow_lph"].mean().tail(96)
    e = energy_df.groupby(["timestamp"], as_index=False)["load_kw"].sum().tail(96)
    b = waste_df.groupby(["timestamp"], as_index=False)["fill_level_pct"].mean().tail(96)
    result = []
    for i in range(min(len(w), len(e), len(b))):
        result.append({
            "timestamp": str(w.iloc[i]["timestamp"]),
            "water_lph": round(float(w.iloc[i]["flow_lph"]), 2),
            "energy_kw": round(float(e.iloc[i]["load_kw"]), 2),
            "waste_fill_pct": round(float(b.iloc[i]["fill_level_pct"]), 2) if pd.notna(b.iloc[i]["fill_level_pct"]) else None
        })
    return result
