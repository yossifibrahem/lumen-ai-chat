"""Unit tests for mcp_service.py — config persistence and server lookup."""
from __future__ import annotations

import json

import pytest

import mcp_service


# ===========================================================================
# load_config
# ===========================================================================

class TestLoadConfig:
    def test_returns_empty_servers_when_no_file(self):
        # MCP_CONFIG_FILE redirected to a non-existent tmp file by conftest
        config = mcp_service.load_config()
        assert config == {"mcpServers": {}}

    def test_returns_empty_servers_for_corrupt_file(self, tmp_path, monkeypatch):
        bad = tmp_path / "bad.json"
        bad.write_text("{ not valid json }")
        monkeypatch.setattr(mcp_service, "MCP_CONFIG_FILE", bad)
        assert mcp_service.load_config() == {"mcpServers": {}}

    def test_returns_empty_servers_when_top_level_is_list(self, tmp_path, monkeypatch):
        bad = tmp_path / "bad.json"
        bad.write_text("[]")
        monkeypatch.setattr(mcp_service, "MCP_CONFIG_FILE", bad)
        assert mcp_service.load_config() == {"mcpServers": {}}

    def test_loads_valid_config(self):
        mcp_service.save_config({
            "mcpServers": {
                "fs": {"command": "npx", "args": ["-y", "@mcp/fs", "/workspace"]}
            }
        })
        config = mcp_service.load_config()
        assert "fs" in config["mcpServers"]

    def test_preserves_server_fields(self):
        payload = {
            "mcpServers": {
                "search": {
                    "command": "node",
                    "args": ["server.js"],
                    "env": {"API_KEY": "secret"},
                }
            }
        }
        mcp_service.save_config(payload)
        config = mcp_service.load_config()
        srv = config["mcpServers"]["search"]
        assert srv["command"] == "node"
        assert srv["env"]["API_KEY"] == "secret"


# ===========================================================================
# save_config
# ===========================================================================

class TestSaveConfig:
    def test_saves_to_disk(self):
        mcp_service.save_config({"mcpServers": {"a": {"command": "x", "args": []}}})
        assert mcp_service.MCP_CONFIG_FILE.exists()

    def test_written_file_is_valid_json(self):
        mcp_service.save_config({"mcpServers": {}})
        raw = mcp_service.MCP_CONFIG_FILE.read_text()
        parsed = json.loads(raw)
        assert "mcpServers" in parsed

    def test_raises_for_non_dict(self):
        with pytest.raises(ValueError, match="JSON object"):
            mcp_service.save_config([1, 2, 3])  # type: ignore[arg-type]

    def test_raises_when_mcp_servers_is_list(self):
        with pytest.raises(ValueError, match="JSON object"):
            mcp_service.save_config({"mcpServers": ["a", "b"]})

    def test_default_mcp_servers_injected_if_absent(self):
        mcp_service.save_config({})
        config = mcp_service.load_config()
        assert "mcpServers" in config

    def test_overwrites_previous_config(self):
        mcp_service.save_config({"mcpServers": {"old": {"command": "old", "args": []}}})
        mcp_service.save_config({"mcpServers": {"new": {"command": "new", "args": []}}})
        config = mcp_service.load_config()
        assert "new" in config["mcpServers"]
        assert "old" not in config["mcpServers"]


# ===========================================================================
# find_server
# ===========================================================================

class TestFindServer:
    def test_returns_none_when_no_config(self):
        assert mcp_service.find_server("anything") is None

    def test_returns_none_for_unknown_server(self):
        mcp_service.save_config({"mcpServers": {"known": {"command": "x", "args": []}}})
        assert mcp_service.find_server("unknown") is None

    def test_returns_config_for_known_server(self):
        cfg = {"command": "node", "args": ["server.js"]}
        mcp_service.save_config({"mcpServers": {"myserver": cfg}})
        result = mcp_service.find_server("myserver")
        assert result is not None
        assert result["command"] == "node"
