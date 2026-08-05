#!/usr/bin/env python3
"""Exercise the bundled computer-use MCP server through a Docker container."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import tempfile
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import docker_cli  # noqa: E402
from mcp import ClientSession, StdioServerParameters  # noqa: E402
from mcp.client.stdio import stdio_client  # noqa: E402


MCP_ENTRYPOINT = "/opt/lumen/mcp/computer-use/dist/index.js"
EXPECTED_TOOLS = {"view", "create_file", "str_replace", "bash_tool"}


def _docker(args: list[str], *, check: bool = True):
    completed = docker_cli.run(args)
    if check and completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "Docker command failed").strip()
        raise RuntimeError(f"docker {' '.join(args[:2])} failed: {detail}")
    return completed


def _text(result: object) -> str:
    return "".join(
        getattr(item, "text", "")
        for item in getattr(result, "content", [])
        if getattr(item, "type", "") == "text"
    )


def _assert_ok(result: object, label: str) -> str:
    text = _text(result)
    if getattr(result, "isError", False):
        raise RuntimeError(f"{label} failed: {text}")
    return text


async def _exercise_server(container_name: str) -> dict[str, object]:
    executable = docker_cli.executable()
    params = StdioServerParameters(
        command=executable,
        args=[
            "exec",
            "-i",
            "--workdir",
            "/workspace",
            container_name,
            "node",
            MCP_ENTRYPOINT,
        ],
        env=dict(os.environ),
    )

    async with stdio_client(params) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            discovered = {tool.name for tool in (await session.list_tools()).tools}
            if discovered != EXPECTED_TOOLS:
                raise RuntimeError(
                    f"unexpected tools: expected {sorted(EXPECTED_TOOLS)}, got {sorted(discovered)}"
                )

            created = await session.call_tool(
                "create_file",
                {
                    "description": "sandbox smoke test",
                    "path": "/workspace/lumen-smoke.txt",
                    "file_text": "alpha beta\n",
                },
            )
            _assert_ok(created, "create_file")

            replaced = await session.call_tool(
                "str_replace",
                {
                    "description": "sandbox smoke test",
                    "path": "/workspace/lumen-smoke.txt",
                    "old_str": "alpha",
                    "new_str": "lumen",
                },
            )
            _assert_ok(replaced, "str_replace")

            viewed = await session.call_tool(
                "view",
                {
                    "description": "sandbox smoke test",
                    "path": "/workspace/lumen-smoke.txt",
                },
            )
            viewed_text = _assert_ok(viewed, "view")
            if "lumen beta" not in viewed_text:
                raise RuntimeError(f"view returned unexpected content: {viewed_text}")

            bashed = await session.call_tool(
                "bash_tool",
                {
                    "description": "sandbox smoke test",
                    "command": "pwd && test -f /workspace/lumen-smoke.txt && printf mcp-ok",
                },
            )
            bash_payload = json.loads(_assert_ok(bashed, "bash_tool"))
            if bash_payload.get("returncode") != 0 or "mcp-ok" not in bash_payload.get("stdout", ""):
                raise RuntimeError(f"bash_tool returned unexpected result: {bash_payload}")

    return {"tools": sorted(discovered), "workspace_write": True, "bash": True}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", default="lumen-sandbox")
    args = parser.parse_args()

    container_name = f"lumen-mcp-smoke-{uuid.uuid4().hex[:12]}"
    with tempfile.TemporaryDirectory(prefix="lumen-mcp-smoke-") as workspace:
        try:
            _docker(
                [
                    "run",
                    "--detach",
                    "--name",
                    container_name,
                    "--label",
                    "com.lumen.smoke=true",
                    "--volume",
                    f"{workspace}:/workspace",
                    args.image,
                ]
            )
            _docker(
                ["exec", container_name, "test", "-f", MCP_ENTRYPOINT]
            )
            result = asyncio.run(_exercise_server(container_name))
            result.update({"image": args.image, "entrypoint": MCP_ENTRYPOINT})
            print(json.dumps(result, indent=2))
        finally:
            _docker(["rm", "--force", container_name], check=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
