"""Resolve and invoke Docker reliably from shells and desktop applications."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable


MAC_DOCKER_APP = Path("/Applications/Docker.app")


def _windowless_process_kwargs() -> dict:
    """Prevent console executables from flashing a terminal in the Windows app."""
    if sys.platform != "win32":
        return {}
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = subprocess.SW_HIDE
    return {
        "creationflags": subprocess.CREATE_NO_WINDOW,
        "startupinfo": startupinfo,
    }


def windows_docker_app_candidates() -> list[Path]:
    candidates: list[Path] = []
    program_files = os.getenv("ProgramFiles", "").strip()
    local_app_data = os.getenv("LOCALAPPDATA", "").strip()
    if program_files:
        candidates.append(Path(program_files) / "Docker" / "Docker" / "Docker Desktop.exe")
    if local_app_data:
        candidates.append(Path(local_app_data) / "Docker" / "Docker Desktop.exe")
    return candidates


def docker_desktop_path() -> Path | None:
    if sys.platform == "darwin":
        return MAC_DOCKER_APP if MAC_DOCKER_APP.is_dir() else None
    if sys.platform == "win32":
        return next((path for path in windows_docker_app_candidates() if path.is_file()), None)
    return None


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
    elif sys.platform == "win32":
        program_files = os.getenv("ProgramFiles", "").strip()
        if program_files:
            candidates.append(
                str(Path(program_files) / "Docker" / "Docker" / "resources" / "bin" / "docker.exe")
            )
        candidates.append(str(Path.home() / ".docker" / "bin" / "docker.exe"))

    unique: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        expanded = os.path.expanduser(candidate)
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
        **_windowless_process_kwargs(),
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
        **_windowless_process_kwargs(),
    )


def docker_desktop_installed() -> bool:
    return docker_desktop_path() is not None


def start_docker_desktop() -> subprocess.CompletedProcess:
    app_path = docker_desktop_path()
    if app_path is None:
        if sys.platform == "darwin":
            raise FileNotFoundError("Docker Desktop is not installed in /Applications.")
        if sys.platform == "win32":
            raise FileNotFoundError("Docker Desktop is not installed in a standard location.")
        raise RuntimeError("Starting Docker Desktop is only supported on macOS and Windows.")
    if sys.platform == "darwin":
        return subprocess.run(
            ["/usr/bin/open", "-a", "Docker"],
            capture_output=True,
            text=True,
            timeout=10,
        )

    command = [str(app_path)]
    subprocess.Popen(
        command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
        **_windowless_process_kwargs(),
    )
    return subprocess.CompletedProcess(command, 0, "", "")
