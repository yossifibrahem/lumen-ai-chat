"""Runtime dependency checks for Docker-backed sandbox support."""
from __future__ import annotations

import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path

import advanced_config

log = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class RequirementStatus:
    """Human- and API-friendly dependency state."""

    ok: bool
    code: str
    title: str
    message: str
    action: str
    image: str
    details: str = ""

    def as_dict(self) -> dict:
        return {
            "ok": self.ok,
            "code": self.code,
            "title": self.title,
            "message": self.message,
            "action": self.action,
            "image": self.image,
            "details": self.details,
        }


def _image_name() -> str:
    return str(advanced_config.load_advanced_config()["sandbox_image"])


def _run(args: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True, cwd=cwd)


def check_docker() -> RequirementStatus:
    """Return whether the Docker daemon is reachable."""
    image = _image_name()
    try:
        result = _run(["docker", "info"])
    except FileNotFoundError as exc:
        return RequirementStatus(
            ok=False,
            code="docker_unavailable",
            title="Docker is not available",
            message="Please install/start Docker, then click Retry.",
            action="retry",
            image=image,
            details=str(exc),
        )

    if result.returncode != 0:
        return RequirementStatus(
            ok=False,
            code="docker_not_running",
            title="Docker is not running",
            message="Please start Docker, then click Retry.",
            action="retry",
            image=image,
            details=(result.stderr or result.stdout).strip(),
        )

    return RequirementStatus(
        ok=True,
        code="ok",
        title="Docker is ready",
        message="Docker is running.",
        action="continue",
        image=image,
    )


def check_sandbox_image() -> RequirementStatus:
    """Return whether the configured sandbox image exists locally."""
    image = _image_name()
    docker_status = check_docker()
    if not docker_status.ok:
        return docker_status

    result = _run(["docker", "image", "inspect", image])
    if result.returncode != 0:
        return RequirementStatus(
            ok=False,
            code="sandbox_image_missing",
            title="The Lumen sandbox image has not been built",
            message="Click Build Sandbox Image.",
            action="build",
            image=image,
            details=(result.stderr or result.stdout).strip(),
        )

    return RequirementStatus(
        ok=True,
        code="ok",
        title="Lumen is ready",
        message="Docker is running and the sandbox image is available.",
        action="continue",
        image=image,
    )


def check_requirements() -> RequirementStatus:
    """Return the first unmet runtime requirement, or ok."""
    return check_sandbox_image()


def build_sandbox_image() -> RequirementStatus:
    """Build the configured Lumen sandbox image from Dockerfile.sandbox."""
    docker_status = check_docker()
    if not docker_status.ok:
        return docker_status

    image = _image_name()
    result = _run(["docker", "build", "-f", "Dockerfile.sandbox", "-t", image, "."], cwd=PROJECT_ROOT)
    if result.returncode != 0:
        return RequirementStatus(
            ok=False,
            code="sandbox_image_build_failed",
            title="Sandbox image build failed",
            message="The sandbox image could not be built. Check the details below, then try again.",
            action="build",
            image=image,
            details=(result.stderr or result.stdout).strip(),
        )

    log.info("[startup] sandbox image '%s' built successfully", image)
    return check_requirements()
