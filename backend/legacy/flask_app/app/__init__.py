"""FraudLens backend application factory."""

from flask import Flask

from .config import Config
from .extensions import db, migrate
from .routes.health import health_bp
from .routes.predict import predict_bp


def create_app(config_class: type[Config] = Config) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(predict_bp, url_prefix="/api")

    return app
