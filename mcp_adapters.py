"""MCP process launch helpers.

Host runtime is the default. A server runs in the per-chat Docker container only
when its config explicitly says ``"runtime": "container"`` or legacy
``"sandbox": true``.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import container_service

log = logging.getLogger(__name__)

WORKSPACE_ROOT = container_service.CONTAINERS_ROOT
CONTAINER_WORKDIR = "/workspace"


class ContainerConversationRequired(RuntimeError):
    """Raised when a container-runtime MCP server is used without a chat id."""


def server_runtime(server_config: dict) -> str:
    configured = str(server_config.get("runtime", "")).strip().lower()
    if configured in {"container", "docker", "sandbox"}:
        return "container"
    if configured in {"host", "local", "plain", ""}:
        return "host"
    if server_config.get("sandbox") is True:
        return "container"
    log.warning("Unknown MCP runtime %r; using host", configured)
    return "host"


def uses_container(server_config: dict) -> bool:
    return server_runtime(server_config) == "container"


def conversation_working_directory(conversation_id: str) -> Path:
    """Return the host-side workspace mounted as /workspace in containers."""
    return container_service.conversation_workspace(conversation_id)


def expand_config_env(env: dict | None) -> dict:
    """Expand user-friendly paths in explicit MCP env config."""
    return {
        str(key): os.path.expanduser(str(value)) if isinstance(value, str) else value
        for key, value in (env or {}).items()
    }


def apply_workspace_process_options(
    params: dict[str, Any],
    env: dict[str, Any],
    working_dir: str | None,
    *,
    server_name: str = "",
    server_config: dict | None = None,
    conv_id: str = "",
) -> None:
    """Mutate StdioServerParameters kwargs for host or container runtime."""
    server_config = server_config or {}

    if uses_container(server_config):
        _apply_container(params, env, server_name, server_config, conv_id)
        return

    _apply_host(params, env, working_dir)


def _apply_container(
    params: dict[str, Any],
    env: dict[str, Any],
    server_name: str,
    server_config: dict,
    conv_id: str,
) -> None:
    if not conv_id:
        raise ContainerConversationRequired(
            f"MCP server '{server_name}' uses container runtime, but no conversation id was provided."
        )

    extra_volumes = extract_host_mounts(server_config)
    container_service.ensure_container(conv_id, extra_volumes=extra_volumes)

    explicit_env = expand_config_env(server_config.get("env", {}))
    container_env = {
        **{str(k): str(v) for k, v in explicit_env.items()},
        "WORKING_DIR": CONTAINER_WORKDIR,
        "PWD": CONTAINER_WORKDIR,
    }

    command, args = container_service.wrap_command_for_exec(
        conv_id,
        params["command"],
        params.get("args", []),
        env=container_env,
    )
    params["command"] = command
    params["args"] = args

    # Keep docker client env minimal and predictable. Explicit MCP env values are
    # injected into the container by docker exec --env above.
    env.clear()
    env.update(os.environ)
    params.pop("cwd", None)


def _apply_host(params: dict[str, Any], env: dict[str, Any], working_dir: str | None) -> None:
    resolved = _resolve_working_dir(working_dir)
    if not resolved:
        return
    env["WORKING_DIR"] = resolved
    env["PWD"] = resolved
    params["cwd"] = resolved


def _resolve_working_dir(working_dir: str | None) -> str | None:
    if not working_dir:
        return None
    path = Path(os.path.expanduser(working_dir)).resolve()
    path.mkdir(parents=True, exist_ok=True)
    return str(path)


def extract_host_mounts(server_config: dict) -> list[str]:
    """Mount absolute script/project paths used by a container-runtime server."""
    volumes: list[str] = []
    seen: set[str] = set()

    for arg in server_config.get("args", []):
        if not isinstance(arg, str):
            continue
        path = Path(os.path.expanduser(arg))
        if not path.is_absolute():
            continue

        mount_src = find_project_root(path) or (path.parent if path.suffix else path)
        if not mount_src.exists():
            log.warning(
                "[mcp] cannot mount missing path for container server: %s", mount_src
            )
            continue

        src = str(mount_src)
        if src not in seen:
            seen.add(src)
            volumes.append(f"{src}:{src}:ro")

    return volumes


def find_project_root(path: Path) -> Path | None:
    """Find a nearby project root without accidentally mounting /home or /."""
    candidate = path.parent if path.is_file() else path
    markers = {"node_modules", "package.json", "pyproject.toml", "setup.py"}

    for _ in range(6):
        if any((candidate / marker).exists() for marker in markers):
            return candidate
        parent = candidate.parent
        if parent == candidate:
            break
        candidate = parent
    return None
