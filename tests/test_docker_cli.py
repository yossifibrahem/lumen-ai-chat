from __future__ import annotations

from pathlib import Path

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


def test_windows_candidates_include_docker_desktop_cli(monkeypatch):
    monkeypatch.setattr(docker_cli.sys, "platform", "win32")
    monkeypatch.setattr(docker_cli.shutil, "which", lambda _name: None)
    monkeypatch.setenv("ProgramFiles", r"C:\Program Files")
    assert str(
        Path(r"C:\Program Files") / "Docker" / "Docker" / "resources" / "bin" / "docker.exe"
    ) in docker_cli.candidate_paths()


def test_windows_docker_desktop_can_be_started(monkeypatch):
    app = Path(r"C:\Program Files\Docker\Docker\Docker Desktop.exe")
    calls = []
    monkeypatch.setattr(docker_cli.sys, "platform", "win32")
    monkeypatch.setattr(docker_cli, "docker_desktop_path", lambda: app)
    monkeypatch.setattr(docker_cli.subprocess, "Popen", lambda *args, **kwargs: calls.append((args, kwargs)))

    result = docker_cli.start_docker_desktop()

    assert result.returncode == 0
    assert calls[0][0][0] == [str(app)]
    assert calls[0][1]["creationflags"] & docker_cli.subprocess.CREATE_NO_WINDOW
    assert calls[0][1]["startupinfo"].wShowWindow == docker_cli.subprocess.SW_HIDE


def test_windows_docker_commands_do_not_create_terminal_windows(monkeypatch):
    calls = []
    monkeypatch.setattr(docker_cli.sys, "platform", "win32")
    monkeypatch.setattr(docker_cli, "executable", lambda: r"C:\docker.exe")
    monkeypatch.setattr(
        docker_cli.subprocess,
        "run",
        lambda *args, **kwargs: calls.append((args, kwargs)),
    )

    docker_cli.run(["version"], timeout=2)

    kwargs = calls[0][1]
    assert kwargs["creationflags"] & docker_cli.subprocess.CREATE_NO_WINDOW
    assert kwargs["startupinfo"].dwFlags & docker_cli.subprocess.STARTF_USESHOWWINDOW
    assert kwargs["startupinfo"].wShowWindow == docker_cli.subprocess.SW_HIDE


def test_macos_docker_commands_keep_native_subprocess_defaults(monkeypatch):
    monkeypatch.setattr(docker_cli.sys, "platform", "darwin")
    assert docker_cli._windowless_process_kwargs() == {}


def test_resolve_returns_none_when_candidates_are_missing(monkeypatch):
    monkeypatch.setattr(docker_cli, "candidate_paths", lambda: ["/definitely/missing/docker"])
    assert docker_cli.resolve() is None
