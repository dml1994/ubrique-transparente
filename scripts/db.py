"""Database connection helper for Python scrapers."""
import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env.local"))


def get_conn():
    """Return a psycopg2 connection to Neon."""
    url = os.environ.get("DATABASE_URL", "")
    if not url or not url.startswith("postgresql"):
        raise RuntimeError(
            "DATABASE_URL no está configurada. "
            "En GitHub Actions: Settings → Secrets → DATABASE_URL. "
            "En local: añádela a scripts/../.env.local"
        )
    return psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)
