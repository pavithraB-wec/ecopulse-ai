from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"

def load_csv(name: str) -> pd.DataFrame:
    path = DATA / name
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    df = pd.read_csv(path, parse_dates=["timestamp"])
    return df.sort_values("timestamp")

def latest_rows(df: pd.DataFrame, group_col: str):
    return df.sort_values("timestamp").groupby(group_col, as_index=False).tail(1).copy()
