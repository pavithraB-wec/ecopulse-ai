from pathlib import Path
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score

FEATURES = ["flow_lph", "expected_flow_lph", "pressure_kpa", "occupancy_estimate", "hour", "day_of_week"]
def train_water_model(csv_path: str | Path):
    df = pd.read_csv(csv_path, parse_dates=["timestamp"]).sort_values("timestamp")
    cutoff = df["timestamp"].quantile(0.8)
    train, test = df[df.timestamp < cutoff], df[df.timestamp >= cutoff]
    model = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("rf", RandomForestClassifier(n_estimators=120, max_depth=10, class_weight="balanced", random_state=42))
    ])
    model.fit(train[FEATURES], train["is_anomaly"].astype(int))
    pred = model.predict(test[FEATURES])
    metrics = {
        "precision": float(precision_score(test["is_anomaly"], pred, zero_division=0)),
        "recall": float(recall_score(test["is_anomaly"], pred, zero_division=0)),
        "f1": float(f1_score(test["is_anomaly"], pred, zero_division=0)),
        "accuracy": float(accuracy_score(test["is_anomaly"], pred)),
        "test_rows": int(len(test))
    }
    return model, metrics
