from legacy.flask_app.app import create_app
from legacy.flask_app.app.services.model_loader import ModelLoader


def test_health_reports_frozen_artifact_readiness() -> None:
    client = create_app().test_client()

    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "ok"
    assert payload["prediction_api"] == "not implemented"
    assert payload["artifacts"]["ready"] is True


def test_model_loader_loads_the_frozen_artifacts() -> None:
    loaded = ModelLoader().load()

    assert loaded.model.num_feature() == 37
    assert loaded.model.num_trees() == 131
    assert loaded.calibration_metadata["selected_method"] == "Platt"
    assert callable(loaded.calibrator.predict)
