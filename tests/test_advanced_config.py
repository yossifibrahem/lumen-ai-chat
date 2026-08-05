from __future__ import annotations

import json

import advanced_config


def _isolate(tmp_path, monkeypatch):
    path = tmp_path / "advanced_config.json"
    monkeypatch.setattr(advanced_config, "ADVANCED_CONFIG_FILE", path)
    monkeypatch.setattr(advanced_config, "_cache", None)
    monkeypatch.setattr(advanced_config, "_cache_at", 0.0)
    monkeypatch.setattr(advanced_config, "_ENV_LOCKED", {})
    return path


def test_uses_local_sandbox_default_when_file_is_absent(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    monkeypatch.setattr(
        advanced_config.build_info,
        "DEFAULT_SANDBOX_IMAGE",
        "lumen-sandbox",
    )

    assert advanced_config.load_advanced_config()["sandbox_image"] == "lumen-sandbox"


def test_uses_stored_sandbox_image_verbatim(tmp_path, monkeypatch):
    path = _isolate(tmp_path, monkeypatch)
    path.write_text(json.dumps({"sandbox_image": "custom-sandbox:7"}))

    assert advanced_config.load_advanced_config()["sandbox_image"] == "custom-sandbox:7"
