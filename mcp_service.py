"""
MCP service layer — config persistence, tool discovery, tool invocation.

The asyncio coroutines are executed safely from Flask's synchronous
context via `run_async`, which always spins up a dedicated thread to
avoid conflicts with any existing event loop.
"""
from __future__ import annotations

import asyncio
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from mcp_adapters import apply_workspace_process_options, expand_config_env

MCP_CONFIG_FILE = Path("mcp.json")


# ── Config ────────────────────────────────────────────────────────────────────

def load_config() -> dict:
    if MCP_CONFIG_FILE.exists():
        return json.loads(MCP_CONFIG_FILE.read_text())
    return {"mcpServers": {}}


def save_config(config: dict) -> None:
    MCP_CONFIG_FILE.write_text(json.dumps(config, indent=2))


def find_server(server_name: str) -> dict | None:
    return load_config().get("mcpServers", {}).get(server_name)



# ── Internal helpers ──────────────────────────────────────────────────────────

def _build_server_params(
    server_name: str,
    server_config: dict,
    *,
    working_dir: str | None = None,
    conv_id: str = "",
) -> Any:
    from mcp import StdioServerParameters  # optional dependency

    env = {**os.environ, **expand_config_env(server_config.get("env", {}))}
    params = {
        "command": server_config.get("command", ""),
        "args": server_config.get("args", []),
        "env": env,
    }
    apply_workspace_process_options(
        params,
        env,
        working_dir,
        server_name=server_name,
        server_config=server_config,
        conv_id=conv_id,
    )

    try:
        return StdioServerParameters(**params)
    except Exception:
        # Some older SDK builds reject unknown fields such as `cwd`. Retry with
        # the portable env-only shape. WORKING_DIR/PWD remain in env.
        params.pop("cwd", None)
        return StdioServerParameters(**params)


# ── Async operations ──────────────────────────────────────────────────────────

async def fetch_tools(server_name: str, server_config: dict, conv_id: str = "") -> list[dict]:
    """Connect to an MCP server and return its tool definitions."""
    from mcp import ClientSession
    from mcp.client.stdio import stdio_client

    params = _build_server_params(server_name, server_config, conv_id=conv_id)
    tools: list[dict] = []
    try:
        async with stdio_client(params) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                for tool in (await session.list_tools()).tools:
                    tools.append({
                        "server":      server_name,
                        "name":        tool.name,
                        "description": tool.description or "",
                        "inputSchema": getattr(tool, "inputSchema", {}),
                    })
    except Exception as exc:
        print(f"[MCP] Failed to list tools from '{server_name}': {exc}")
    return tools


async def invoke_tool(server_name: str, server_config: dict, tool_name: str, arguments: dict, *, working_dir: str | None = None, conv_id: str = "") -> str:
    """Call a single MCP tool and return its text output."""
    from mcp import ClientSession
    from mcp.client.stdio import stdio_client

    params = _build_server_params(server_name, server_config, working_dir=working_dir, conv_id=conv_id)
    try:
        async with stdio_client(params) as (reader, writer):
            async with ClientSession(reader, writer) as session:
                await session.initialize()
                result = await session.call_tool(tool_name, arguments)
                text = "\n".join(
                    c.text if hasattr(c, "text") else str(c)
                    for c in result.content
                )
                return text
    except Exception as exc:
        return f"Error calling tool '{tool_name}': {exc}"


# ── Sync bridge ───────────────────────────────────────────────────────────────

def run_async(coro) -> Any:
    """Run an async coroutine from a synchronous Flask handler."""
    with ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, coro).result()
