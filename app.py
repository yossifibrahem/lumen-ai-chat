"""
Lumen Chatbot — Flask entry point.

Wires together the app factory, CORS, and the single Blueprint
that owns all routes.  On startup, stale Docker containers from
previous runs are cleaned up.
"""
import logging

from flask import Flask
from flask_cors import CORS

from routes import blueprint

log = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(blueprint)
    _cleanup_stale_containers()
    return app


def _cleanup_stale_containers() -> None:
    """Remove lumen-chat-* Docker containers whose conversation no longer exists."""
    try:
        import store
        import container_service
        known_ids = [c["id"] for c in store.list_all()]
        removed = container_service.cleanup_stale(known_ids)
        if removed:
            log.info("[startup] removed %d stale container(s): %s", len(removed), removed)
    except Exception as exc:
        # Non-fatal: if Docker is unavailable we still start normally.
        log.warning("[startup] stale container cleanup skipped: %s", exc)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    create_app().run(debug=True, host="0.0.0.0", port=8080, threaded=True)
