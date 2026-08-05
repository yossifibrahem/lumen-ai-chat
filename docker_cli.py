"""Resolve and invoke Docker reliably from shells and macOS GUI applications."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable


MAC_DOCKER_APP = Path("/Applications/Docker.app")


def candidate_paths() -> list[str]:
    candidates: list[str] = []
    explicit = os.getenv("LUMEN_DOCKER_PATH", "").strip()
    if explicit:
        candidates.append(explicit)

    discovered = shutil.which("docker")
    if discovered:
        candidates.append(discovered)

    if sys.platform == "darwin":
        candidates.extend([
            "/usr/local/bin/docker",
            "/opt/homebrew/bin/docker",
            "/Applications/Docker.app/Contents/Resources/bin/docker",
            str(Path.home() / ".docker" / "bin" / "docker"),
        ])

    unique: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        expanded = str(Path(candidate).expanduser())
        if expanded not in seen:
            seen.add(expanded)
            unique.append(expanded)
    return unique


def resolve() -> str | None:
    for candidate in candidate_paths():
        path = Path(candidate)
        if path.is_file() and os.access(path, os.X_OK):
            return str(path)
    return None


def executable() -> str:
    resolved = resolve()
    if not resolved:
        raise FileNotFoundError("The Docker command could not be found.")
    return resolved


def argv(args: Iterable[str]) -> list[str]:
    return [executable(), *[str(arg) for arg in args]]


def run(
    args: Iterable[str],
    *,
    timeout: float | None = None,
    cwd: Path | str | None = None,
) -> subprocess.CompletedProcess:
    return subprocess.run(
        argv(args),
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=cwd,
    )


def popen(
    args: Iterable[str],
    *,
    cwd: Path | str | None = None,
) -> subprocess.Popen:
    return subprocess.Popen(
        argv(args),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        cwd=cwd,
    )


def docker_desktop_installed() -> bool:
    return sys.platform == "darwin" and MAC_DOCKER_APP.is_dir()


def start_docker_desktop() -> subprocess.CompletedProcess:
    if sys.platform != "darwin":
        raise RuntimeError("Starting Docker Desktop is only supported on macOS.")
    if not docker_desktop_installed():
        raise FileNotFoundError("Docker Desktop is not installed in /Applications.")
    return subprocess.run(
        ["/usr/bin/open", "-a", "Docker"],
        capture_output=True,
        text=True,
        timeout=10,
    )
