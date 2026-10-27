"""Backend configuration derived from the repository layout and environment."""

from pathlib import Path
import os

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[3]
PROJECT_ROOT = BACKEND_ROOT.parent
load_dotenv(BACKEND_ROOT / ".env")


class Config:
    """Base configuration; database use is intentionally not activated yet."""

    SECRET_KEY = os.getenv("SECRET_KEY", "fraudlens-development-only")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///fraudlens-development.sqlite3")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ARTIFACT_ROOT = BACKEND_ROOT / "ml"
    MODEL_PATH = ARTIFACT_ROOT / "models" / "20F_smote_lightgbm.txt"
    CALIBRATOR_PATH = ARTIFACT_ROOT / "models" / "20H_platt_calibrator.joblib"
    FEATURE_METADATA_PATH = ARTIFACT_ROOT / "metadata" / "credit_card_feature_metadata.json"
    CALIBRATION_METADATA_PATH = ARTIFACT_ROOT / "metadata" / "20H_calibration_metadata.json"
