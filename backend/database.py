import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
from typing import Optional

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
engine = None
if DATABASE_URL:
    from sqlalchemy import create_engine, text
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def init_db():
    if engine is None:
        return False
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ecopulse_actions (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                zone VARCHAR(100) NOT NULL,
                action VARCHAR(200) NOT NULL,
                notes TEXT
            )
        """))
    return True

def save_action(zone: str, action: str, notes: Optional[str] = None):
    if engine is None:
        return None
    from sqlalchemy import text
    with engine.begin() as conn:
        result = conn.execute(text("""
            INSERT INTO ecopulse_actions (zone, action, notes)
            VALUES (:zone, :action, :notes)
            RETURNING id, created_at, zone, action, notes
        """), {"zone": zone, "action": action, "notes": notes})
        row = result.mappings().first()
        return dict(row) if row else None

def get_actions(limit: int = 50):
    if engine is None:
        return None
    from sqlalchemy import text
    with engine.begin() as conn:
        rows = conn.execute(text("""
            SELECT id, created_at, zone, action, notes
            FROM ecopulse_actions ORDER BY created_at DESC LIMIT :limit
        """), {"limit": limit}).mappings().all()
        return [dict(r) for r in rows]
