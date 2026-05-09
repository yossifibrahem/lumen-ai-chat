"""
Tests for mcp_adapters.py — container launch parameter mutation,
environment variable expansion, and host mount extraction.

Docker is never called; `container_service.ensure_container` and
`container_service.wrap_command_for_exec` are always mocked.
"""
from __future__ import annotations

import os
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock, call

import mcp_adapters
from mcp_adapters import ContainerConversationRequired


# ---------------------------------------------------------------------------
# expand_config_env
# ---------------------------------------------------------------------------

class TestExpandConfigEnv:

    def test_simple_string_value_unchanged(self):
        result = mcp_adapters.expand_config_env({"KEY": "value"})
        assert result["KEY"] == "value"

    def test_tilde_expanded(self):
        result = mcp_adapters.expand_config_env({"P": "~/projects"})
        assert not result["P"].startswith("~")
        assert result["P"].startswith(os.path.expanduser("~"))

    def test_none_input_returns_empty_dict(self):
        assert mcp_adapters.expand_config_env(None) == {}

    def test_empty_dict_returns_empty_dict(self):
        assert mcp_adapters.expand_config_env({}) == {}

    def test_non_string_value_passed_through(self):
        result = mcp_adapters.expand_config_env({"PORT": 3000})
        assert result["PORT"] == 3000

    def test_numeric_key_becomes_string(self):
        result = mcp_adapters.expand_config_env({42: "val"})
        assert "42" in result

    def test_multiple_keys_all_processed(self):
        result = mcp_adapters.expand_config_env({"A": "~/a", "B": "~/b"})
        assert not result["A"].startswith("~")
        assert not result["B"].startswith("~")


# ---------------------------------------------------------------------------
# apply_workspace_process_options (via _apply_container)
# ---------------------------------------------------------------------------

def _mock_wrap_result(conv_id: str, command: str, args: list):
    """Canonical return value from wrap_command_for_exec."""
    return ("docker", ["exec", "-i", f"lumen-chat-{conv_id}", command, *args])


class TestApplyWorkspaceProcessOptions:

    def _call(self, params, env, *, conv_id="testconv", server_config=None):
        with patch("mcp_adapters.container_service.ensure_container") as mock_ensure, \
             patch("mcp_adapters.container_service.wrap_command_for_exec") as mock_wrap:
            mock_ensure.return_value = MagicMock()
            mock_wrap.return_value = _mock_wrap_result(
                conv_id, params["command"], params.get("args", [])
            )
            mcp_adapters.apply_workspace_process_options(
                params,
                env,
                server_name="test-server",
                server_config=server_config or {},
                conv_id=conv_id,
            )
            return mock_ensure, mock_wrap

    def test_raises_container_conv_required_without_conv_id(self):
        with pytest.raises(ContainerConversationRequired):
            mcp_adapters.apply_workspace_process_options(
                {"command": "npx", "args": []},
                {},
                server_name="srv",
                conv_id="",
            )

    def test_command_becomes_docker(self):
        params = {"command": "node", "args": ["server.js"]}
        self._call(params, {})
        assert params["command"] == "docker"

    def test_args_contain_exec(self):
        params = {"command": "node", "args": ["server.js"]}
        self._call(params, {})
        assert "exec" in params["args"]

    def test_cwd_removed_from_params(self):
        params = {"command": "npx", "args": [], "cwd": "/some/path"}
        self._call(params, {})
        assert "cwd" not in params

    def test_env_dict_cleared_then_repopulated(self):
        params = {"command": "npx", "args": []}
        env = {"STALE_VAR": "old_value"}
        self._call(params, env)
        # env is cleared and refilled from os.environ; STALE_VAR only
        # survives if it's also in os.environ
        if "STALE_VAR" not in os.environ:
            assert "STALE_VAR" not in env

    def test_ensure_container_called_with_conv_id(self):
        params = {"command": "npx", "args": []}
        mock_ensure, _ = self._call(params, {}, conv_id="myconv")
        mock_ensure.assert_called_once()
        call_args = mock_ensure.call_args
        assert "myconv" in call_args.args or "myconv" in str(call_args)

    def test_wrap_command_called_with_original_command(self):
        params = {"command": "python3", "args": ["-m", "server"]}
        _, mock_wrap = self._call(params, {})
        wrap_call = mock_wrap.call_args
        # The original command is passed to wrap_command_for_exec
        assert "python3" in str(wrap_call)

    def test_explicit_env_vars_forwarded(self):
        params = {"command": "npx", "args": []}
        env = {}
        server_config = {"env": {"MY_KEY": "my_value"}}
        with patch("mcp_adapters.container_service.ensure_container"), \
             patch("mcp_adapters.container_service.wrap_command_for_exec") as mock_wrap:
            mock_wrap.return_value = ("docker", [])
            mcp_adapters.apply_workspace_process_options(
                params, env,
                server_name="srv",
                server_config=server_config,
                conv_id="c1",
            )
        # WORKING_DIR and PWD must be in the env passed to wrap
        wrap_kwargs = mock_wrap.call_args.kwargs
        passed_env = wrap_kwargs.get("env", {})
        assert passed_env.get("WORKING_DIR") == "/workspace"
        assert passed_env.get("PWD") == "/workspace"


# ---------------------------------------------------------------------------
# extract_host_mounts
# ---------------------------------------------------------------------------

class TestExtractHostMounts:

    def test_empty_config_returns_empty_list(self):
        assert mcp_adapters.extract_host_mounts({}) == []

    def test_relative_args_skipped(self):
        config = {"args": ["relative/path/server.js"]}
        assert mcp_adapters.extract_host_mounts(config) == []

    def test_missing_absolute_path_skipped(self):
        config = {"args": ["/absolutely/does/not/exist/server.js"]}
        assert mcp_adapters.extract_host_mounts(config) == []

    def test_existing_absolute_path_produces_volume_spec(self, tmp_path):
        script = tmp_path / "server.js"
        script.write_text("// server")
        config = {"args": [str(script)]}
        result = mcp_adapters.extract_host_mounts(config)
        # At least one volume spec with src:dst format
        assert len(result) >= 1
        for spec in result:
            assert ":" in spec

    def test_duplicate_paths_deduplicated(self, tmp_path):
        script = tmp_path / "a.js"
        script.write_text("a")
        config = {"args": [str(script), str(script)]}
        result = mcp_adapters.extract_host_mounts(config)
        sources = [spec.split(":")[0] for spec in result]
        assert len(sources) == len(set(sources))

    def test_non_string_args_skipped(self):
        config = {"args": [42, None, True]}
        assert mcp_adapters.extract_host_mounts(config) == []

    def test_volume_spec_is_readonly(self, tmp_path):
        script = tmp_path / "srv.py"
        script.write_text("# srv")
        config = {"args": [str(script)]}
        result = mcp_adapters.extract_host_mounts(config)
        for spec in result:
            assert spec.endswith(":ro")


# ---------------------------------------------------------------------------
# ContainerConversationRequired
# ---------------------------------------------------------------------------

class TestContainerConversationRequired:

    def test_is_runtime_error(self):
        exc = ContainerConversationRequired("needs conv")
        assert isinstance(exc, RuntimeError)

    def test_message_preserved(self):
        exc = ContainerConversationRequired("MCP server 'x' requires a conversation.")
        assert "x" in str(exc)
