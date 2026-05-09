"""
Shared pytest fixtures for the Lumen test suite.

Key concerns addressed:
- Storage dirs (conversations, images, containers) are redirected to
  per-test tmp_path so tests never touch ~/.lumen/.
- mcp_service.MCP_CONFIG_FILE is redirected to a tmp file.
- Docker is never called; container_service functions that shell out
  are patched per-test where they would otherwise be exercised.
"""
from __future__ import annotations

import base64
import sys
from pathlib import Path

import pytest

# Make sure the project root is on sys.path so imports work from tests/.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ---------------------------------------------------------------------------
# Minimal valid image fixtures
# ---------------------------------------------------------------------------

# 1×1 white PNG (base64-encoded, no padding issues)
MINIMAL_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)
MINIMAL_PNG_B64 = base64.b64encode(MINIMAL_PNG_BYTES).decode()


# ---------------------------------------------------------------------------
# Autouse: redirect all storage to isolated tmp dirs
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def redirect_storage(tmp_path, monkeypatch):
    """Redirect every on-disk location to a per-test tmp directory.

    This fixture is *autouse* so no test accidentally touches ~/.lumen/.
    """
    conv_dir = tmp_path / "conversations"
    img_dir = tmp_path / "images"
    containers_dir = tmp_path / "containers"
    mcp_config = tmp_path / "mcp.json"

    for d in (conv_dir, img_dir, containers_dir):
        d.mkdir()

    import store
    import container_service
    import mcp_service

    monkeypatch.setattr(store, "CONVERSATIONS_DIR", conv_dir)
    monkeypatch.setattr(store, "IMAGES_DIR", img_dir)
    monkeypatch.setattr(container_service, "CONTAINERS_ROOT", containers_dir)
    monkeypatch.setattr(mcp_service, "MCP_CONFIG_FILE", mcp_config)

    return {
        "conv_dir": conv_dir,
        "img_dir": img_dir,
        "containers_dir": containers_dir,
        "mcp_config": mcp_config,
    }


# ---------------------------------------------------------------------------
# Flask application / test client
# ---------------------------------------------------------------------------

@pytest.fixture
def flask_app():
    """Minimal Flask app with the Lumen blueprint — no Docker startup checks."""
    from flask import Flask
    from flask_cors import CORS
    from routes import blueprint

    app = Flask(__name__, template_folder=str(PROJECT_ROOT / "templates"))
    CORS(app)
    app.register_blueprint(blueprint)
    app.config["TESTING"] = True
    return app


@pytest.fixture
def client(flask_app):
    """Flask test client bound to the minimal app."""
    return flask_app.test_client()
