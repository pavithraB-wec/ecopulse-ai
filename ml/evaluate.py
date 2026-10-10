import json
from pathlib import Path
from ml.water_anomaly import train_water_model
from ml.energy_anomaly import train_energy_model
from ml.waste_overflow import train_waste_model

ROOT = Path(__file__).resolve().parents[1]
def main():
    reports = {
        "water": train_water_model(ROOT / "data/ecopulse_water_readings.csv")[1],
        "energy": train_energy_model(ROOT / "data/ecopulse_energy_readings.csv")[1],
        "waste": train_waste_model(ROOT / "data/ecopulse_smart_bin_readings.csv")[1],
    }
    print(json.dumps(reports, indent=2))
    print("\\nReminder: these are results on synthetic holdout data, not real-world performance.")
if __name__ == "__main__":
    main()
