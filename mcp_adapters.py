"""MCP adapter hooks for server-specific behavior.

Keep MCP-server quirks here instead of spreading them through routes,
storage, and invocation code. To support another server later, add a small
adapter function/class here and wire it into the exported helpers below.
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

WORKSPACE_ROOT = Path.home() / ".lumen" / "working_directory"
WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)

# Tools from the local filesystem MCP server that accept a file path.
# The server name is still checked too, so adding tools here is optional when
# the configured server name contains "filesystem".
FILESYSTEM_PATH_TOOLS = {
    "view",
    "create_file",
    "str_replace",
    "insert",
    "list_directory",
}


def conversation_working_directory(conversation_id: str) -> Path:
    """Return the isolated workspace for one conversation."""
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", conversation_id or "default")
    path = WORKSPACE_ROOT / safe_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def resolve_working_dir(working_dir: str | None) -> str | None:
    """Expand and create a workspace path, returning an absolute string."""
    if not working_dir:
        return None
    path = Path(os.path.expanduser(working_dir)).resolve()
    path.mkdir(parents=True, exist_ok=True)
    return str(path)


def expand_config_env(env: dict | None) -> dict:
    """Expand ~ in user-provided MCP env values."""
    expanded = {}
    for key, value in (env or {}).items():
        expanded[key] = os.path.expanduser(str(value)) if isinstance(value, str) else value
    return expanded


def apply_workspace_process_options(params: dict[str, Any], env: dict[str, Any], working_dir: str | None) -> None:
    """Apply local MCP workspace env/cwd in one place.

    The local Bash/Filesystem servers read WORKING_DIR. Setting cwd/PWD too
    makes tools that inherit process state behave consistently.
    """
    resolved = resolve_working_dir(working_dir)
    if not resolved:
        return
    env["WORKING_DIR"] = resolved
    env["PWD"] = resolved
    params["cwd"] = resolved


def is_filesystem_path_tool(server_name: str, tool_name: str, arguments: dict) -> bool:
    """Detect local filesystem-server tools that need workspace-rooted paths."""
    if not isinstance(arguments, dict) or "path" not in arguments:
        return False
    return "filesystem" in (server_name or "").lower() or tool_name in FILESYSTEM_PATH_TOOLS


def workspace_path(raw_path: str, working_dir: str | None) -> str:
    """Map `/x`, `x`, `./x`, and `~/x` into the active chat workspace."""
    resolved = resolve_working_dir(working_dir)
    if not resolved or not isinstance(raw_path, str) or not raw_path.strip():
        return raw_path

    raw = raw_path.strip()
    root = Path(resolved)

    if raw in {"/", ".", "./", "~", "~/"}:
        return str(root)

    if raw.startswith("~/"):
        relative = raw[2:]
    elif raw.startswith("/"):
        relative = raw.lstrip("/")
    else:
        relative = raw

    candidate = (root / relative).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        candidate = root / Path(relative).name
    return str(candidate)


def normalize_tool_arguments(server_name: str, tool_name: str, arguments: dict, working_dir: str | None) -> dict:
    """Normalize arguments for local MCP adapters before invocation."""
    if not isinstance(arguments, dict):
        return arguments

    normalized = dict(arguments)
    if is_filesystem_path_tool(server_name, tool_name, normalized):
        normalized["path"] = workspace_path(normalized["path"], working_dir)
    return normalized
