"""Tests for Docker runtime detection without requiring a Docker daemon."""
from __future__ import annotations

import subprocess

import runtime_requirements as requirements


def _configure(monkeypatch):
    monkeypatch.setattr(requirements, "_image_name", lambda: "test-sandbox")


def test_reports_missing_docker_cli_before_running_a_command(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(requirements.shutil, "which", lambda command: None)
    monkeypatch.setattr(
        requirements,
        "_run",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("must not run")),
    )

    status = requirements.check_docker()

    assert status.ok is False
    assert status.code == "docker_unavailable"
    assert status.action == "retry"
    assert "PATH" in status.details


def test_probes_the_daemon_with_the_resolved_cli_and_a_timeout(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(requirements.shutil, "which", lambda command: "/opt/docker/bin/docker")
    calls = []

    def fake_run(args, **kwargs):
        calls.append((args, kwargs))
        return subprocess.CompletedProcess(args, 0, stdout="27.5.1\n", stderr="")

    monkeypatch.setattr(requirements, "_run", fake_run)

    status = requirements.check_docker()

    assert status.ok is True
    assert calls == [
        (
            ["/opt/docker/bin/docker", "version", "--format", "{{.Server.Version}}"],
            {"timeout": requirements.DOCKER_PROBE_TIMEOUT_SECONDS},
        )
    ]


def test_reports_an_unreachable_or_inaccessible_daemon(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(requirements.shutil, "which", lambda command: "/usr/bin/docker")
    monkeypatch.setattr(
        requirements,
        "_run",
        lambda args, **kwargs: subprocess.CompletedProcess(
            args,
            1,
            stdout="",
            stderr="permission denied while trying to connect to the Docker daemon",
        ),
    )

    status = requirements.check_docker()

    assert status.ok is False
    assert status.code == "docker_not_running"
    assert "access" in status.message
    assert "permission denied" in status.details


def test_times_out_instead_of_hanging_app_startup(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(requirements.shutil, "which", lambda command: "/usr/bin/docker")

    def time_out(args, **kwargs):
        raise subprocess.TimeoutExpired(args, kwargs["timeout"])

    monkeypatch.setattr(requirements, "_run", time_out)

    status = requirements.check_docker()

    assert status.ok is False
    assert status.code == "docker_not_running"
    assert status.title == "Docker is not responding"
    assert "5 seconds" in status.details


def test_reports_an_executable_that_cannot_be_started(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(requirements.shutil, "which", lambda command: "/usr/bin/docker")
    monkeypatch.setattr(
        requirements,
        "_run",
        lambda args, **kwargs: (_ for _ in ()).throw(PermissionError("not executable")),
    )

    status = requirements.check_docker()

    assert status.ok is False
    assert status.code == "docker_unavailable"
    assert status.details == "not executable"
