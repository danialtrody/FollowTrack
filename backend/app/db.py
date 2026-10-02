import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Local development: read backend/.env (git-ignored). In production the env vars come from Render.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set — point it at your Postgres (e.g. Neon) connection string")
    # Neon / Render hand out postgres:// or postgresql:// — use the psycopg 3 driver
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


class Base(DeclarativeBase):
    pass


_url = database_url()
engine = create_engine(
    _url,
    pool_pre_ping=True,  # Neon suspends idle compute; drop dead connections
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
