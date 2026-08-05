"""Application build metadata shared by the web server and desktop launcher."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path


SOURCE_VERSION = "0.1.0-dev"
LOCAL_SANDBOX_IMAGE = "lumen-sandbox"


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"))


def resource_root() -> Path:
    """Return the directory containing bundled read-only application assets."""
    if is_frozen():
        frozen_root = Path(getattr(sys, "_MEIPASS"))
        # PyInstaller's macOS bundle layout keeps real data files in
        # Contents/Resources and exposes symlinks from Contents/Frameworks.
        # Docker build contexts cannot follow those symlinks outside the
        # context directory, so use the canonical data location directly.
        resources_root = frozen_root.parent / "Resources"
        if frozen_root.name == "Frameworks" and resources_root.is_dir():
            return resources_root
        return frozen_root
    return Path(__file__).resolve().parent


def _bundled_metadata() -> dict:
    if not is_frozen():
        return {}
    path = resource_root() / "build_metadata.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


_METADATA = _bundled_metadata()
APP_VERSION = str(
    os.getenv("LUMEN_APP_VERSION")
    or _METADATA.get("version")
    or SOURCE_VERSION
).strip()
DEFAULT_SANDBOX_IMAGE = str(
    _METADATA.get("sandbox_image")
    or LOCAL_SANDBOX_IMAGE
).strip()
DESKTOP_PORT = int(os.getenv("LUMEN_DESKTOP_PORT", "38492"))
APP_ID = "lumen-ai-chat"
CONTAINER_BUILD_LABEL = "com.lumen.sandbox.image"
CONTAINER_VERSION_LABEL = "com.lumen.sandbox.version"
