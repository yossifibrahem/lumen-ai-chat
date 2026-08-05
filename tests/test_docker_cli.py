from __future__ import annotations

import docker_cli


def test_explicit_docker_path_has_priority(tmp_path, monkeypatch):
    explicit = tmp_path / "docker"
    explicit.write_text("#!/bin/sh\n")
    explicit.chmod(0o755)
    monkeypatch.setenv("LUMEN_DOCKER_PATH", str(explicit))
    monkeypatch.setattr(docker_cli.shutil, "which", lambda _name: "/another/docker")
    assert docker_cli.resolve() == str(explicit)


def test_macos_candidates_include_docker_desktop_bundle(monkeypatch):
    monkeypatch.setattr(docker_cli.sys, "platform", "darwin")
    monkeypatch.setattr(docker_cli.shutil, "which", lambda _name: None)
    assert "/Applications/Docker.app/Contents/Resources/bin/docker" in docker_cli.candidate_paths()


def test_resolve_returns_none_when_candidates_are_missing(monkeypatch):
    monkeypatch.setattr(docker_cli, "candidate_paths", lambda: ["/definitely/missing/docker"])
    assert docker_cli.resolve() is None
