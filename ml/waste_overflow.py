from pathlib import Path
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score

NUMERIC = ["fill_level_pct", "fill_rate_pct_per_hour", "occupancy_estimate", "hour", "day_of_week", "temperature_c"]
CATEGORICAL = ["zone", "waste_type", "sensor_quality"]
FEATURES = NUMERIC + CATEGORICAL

def train_waste_model(csv_path: str | Path):
    df = pd.read_csv(csv_path, parse_dates=["timestamp"]).sort_values("timestamp")
    cutoff = df["timestamp"].quantile(0.8)
    train, test = df[df.timestamp < cutoff].copy(), df[df.timestamp >= cutoff].copy()
    prep = ColumnTransformer([
        ("num", Pipeline([("imputer", SimpleImputer(strategy="median"))]), NUMERIC),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore"))
        ]), CATEGORICAL)
    ])
    model = Pipeline([
        ("prep", prep),
        ("rf", RandomForestClassifier(n_estimators=120, max_depth=12, class_weight="balanced", random_state=44, n_jobs=-1))
    ])
    model.fit(train[FEATURES], train["overflow_in_2h"].astype(int))
    pred = model.predict(test[FEATURES])
    metrics = {
        "precision": float(precision_score(test["overflow_in_2h"], pred, zero_division=0)),
        "recall": float(recall_score(test["overflow_in_2h"], pred, zero_division=0)),
        "f1": float(f1_score(test["overflow_in_2h"], pred, zero_division=0)),
        "accuracy": float(accuracy_score(test["overflow_in_2h"], pred)),
        "test_rows": int(len(test))
    }
    return model, metrics
