"""AdmitPath Configuration Module."""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

def load_dotenv_file(filepath=None):
    """Simple .env reader without third-party dependencies."""
    if filepath is None:
        filepath = BASE_DIR / ".env"
    if not os.path.exists(filepath):
        return
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key not in os.environ:
                        os.environ[key] = val
    except Exception:
        pass

load_dotenv_file()

# Server Settings
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "3000"))
DB_PATH = os.environ.get("DB_PATH", str(BASE_DIR / "admitpath.db"))
APP_SECRET = os.environ.get("APP_SECRET", "admitpath-super-secret-key-change-in-production")
DATA_ENCRYPTION_KEY = os.environ.get("DATA_ENCRYPTION_KEY", "admitpath-32-byte-encryption-token-demo")

# Deliverability & Rate Limits
DAILY_CAP_DEFAULT = int(os.environ.get("DAILY_CAP_DEFAULT", "40"))
RAMP_SCHEDULE = [int(x.strip()) for x in os.environ.get("RAMP_SCHEDULE", "20,30,40").split(",") if x.strip()]
MIN_SEND_GAP_SEC = int(os.environ.get("MIN_SEND_GAP_SEC", "60"))
MAX_SEND_GAP_SEC = int(os.environ.get("MAX_SEND_GAP_SEC", "240"))
TZ_WINDOW_START_HOUR = int(os.environ.get("TZ_WINDOW_START_HOUR", "8"))
TZ_WINDOW_END_HOUR = int(os.environ.get("TZ_WINDOW_END_HOUR", "17"))
MAX_BOUNCE_RATE_PERCENT = float(os.environ.get("MAX_BOUNCE_RATE_PERCENT", "5.0"))
FOLLOW_UP_MIN_DAYS = int(os.environ.get("FOLLOW_UP_MIN_DAYS", "7"))

# Google OAuth
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")

# Crawler settings
CRAWLER_USER_AGENT = "AdmitPath-ScholarBot/1.0 (+https://admitpath.app/bot; legitimate admissions discovery)"
CRAWLER_CONCURRENCY = 2
CRAWLER_DELAY_SEC = 1.5
