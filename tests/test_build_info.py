from __future__ import annotations

import sys

import build_info


def test_source_build_defaults_to_local_first_run_image():
    if not build_info.is_frozen():
        assert build_info.DEFAULT_SANDBOX_IMAGE == "lumen-sandbox"


def test_source_resource_root_contains_web_assets():
    assert (build_info.resource_root() / "templates" / "index.html").is_file()
    assert (build_info.resource_root() / "static" / "js" / "app.js").is_file()
    assert (build_info.resource_root() / "Dockerfile.sandbox").is_file()
    assert (build_info.resource_root() / "vendor" / "computer-use-mcp-server" / "src" / "index.ts").is_file()


def test_frozen_macos_resource_root_uses_real_resources_directory(monkeypatch, tmp_path):
    frameworks = tmp_path / "Contents" / "Frameworks"
    resources = tmp_path / "Contents" / "Resources"
    frameworks.mkdir(parents=True)
    resources.mkdir()
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "_MEIPASS", str(frameworks), raising=False)

    assert build_info.resource_root() == resources
