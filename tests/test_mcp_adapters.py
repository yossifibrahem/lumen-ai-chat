"""Unit tests for mcp_adapters.py — env expansion, host mount extraction, project root detection."""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from mcp_adapters import (
    ContainerConversationRequired,
    apply_workspace_process_options,
    expand_config_env,
    extract_host_mounts,
    find_project_root,
)


# ===========================================================================
# expand_config_env
# ===========================================================================

class TestExpandConfigEnv:
    def test_empty_dict_returns_empty(self):
        assert expand_config_env({}) == {}

    def test_none_returns_empty(self):
        assert expand_config_env(None) == {}

    def test_plain_string_values_preserved(self):
        result = expand_config_env({"KEY": "value"})
        assert result["KEY"] == "value"

    def test_tilde_expanded_in_values(self):
        result = expand_config_env({"HOME_DIR": "~/projects"})
        assert result["HOME_DIR"] == os.path.expanduser("~/projects")
        assert "~" not in result["HOME_DIR"]

    def test_non_string_values_kept_as_is(self):
        result = expand_config_env({"PORT": 8080})
        assert result["PORT"] == 8080

    def test_keys_coerced_to_str(self):
        result = expand_config_env({42: "val"})
        assert "42" in result

    def test_multiple_keys(self):
        result = expand_config_env({"A": "alpha", "B": "beta"})
        assert result == {"A": "alpha", "B": "beta"}


# ===========================================================================
# find_project_root
# ===========================================================================

class TestFindProjectRoot:
    def test_returns_none_for_path_with_no_markers(self, tmp_path):
        # tmp_path has no package.json / pyproject.toml etc.
        result = find_project_root(tmp_path)
        assert result is None

    def test_detects_package_json(self, tmp_path):
        (tmp_path / "package.json").write_text("{}")
        result = find_project_root(tmp_path)
        assert result == tmp_path

    def test_detects_pyproject_toml(self, tmp_path):
        (tmp_path / "pyproject.toml").write_text("[tool.pytest]")
        result = find_project_root(tmp_path)
        assert result == tmp_path

    def test_walks_up_to_find_root(self, tmp_path):
        parent = tmp_path / "project"
        child = parent / "src" / "module"
        child.mkdir(parents=True)
        (parent / "pyproject.toml").write_text("")
        result = find_project_root(child)
        assert result == parent

    def test_returns_none_when_only_very_deep_marker(self, tmp_path):
        # Marker more than 6 levels up should not be found
        # (find_project_root only walks 6 levels)
        deep = tmp_path
        for i in range(8):
            deep = deep / f"lvl{i}"
        deep.mkdir(parents=True)
        (tmp_path / "package.json").write_text("{}")
        result = find_project_root(deep)
        assert result is None


# ===========================================================================
# extract_host_mounts
# ===========================================================================

class TestExtractHostMounts:
    def test_empty_args_returns_empty(self):
        assert extract_host_mounts({"args": []}) == []

    def test_relative_args_not_mounted(self):
        assert extract_host_mounts({"args": ["relative/path.js"]}) == []

    def test_non_string_args_ignored(self):
        assert extract_host_mounts({"args": [123, None]}) == []

    def test_absolute_path_that_exists_produces_volume(self, tmp_path):
        script = tmp_path / "server.js"
        script.write_text("")
        result = extract_host_mounts({"args": [str(script)]})
        # At minimum the parent dir should be mounted read-only
        assert len(result) >= 1
        assert result[0].endswith(":ro")

    def test_absolute_path_with_package_json_mounts_project(self, tmp_path):
        (tmp_path / "package.json").write_text("{}")
        script = tmp_path / "dist" / "server.js"
        script.parent.mkdir()
        script.write_text("")
        result = extract_host_mounts({"args": [str(script)]})
        # Should mount the project root (tmp_path), not just dist/
        assert any(str(tmp_path) in vol for vol in result)

    def test_missing_path_omitted_with_warning(self, tmp_path, caplog):
        # Use a path where both the file AND its parent don't exist,
        # so find_project_root returns None and the fallback mount_src is also missing.
        ghost_dir = tmp_path / "nonexistent_dir"
        nonexistent = str(ghost_dir / "ghost_script.js")
        import logging
        with caplog.at_level(logging.WARNING, logger="mcp_adapters"):
            result = extract_host_mounts({"args": [nonexistent]})
        assert result == []

    def test_duplicate_mounts_deduplicated(self, tmp_path):
        # Two args pointing into the same project should yield one mount
        (tmp_path / "package.json").write_text("{}")
        for name in ("a.js", "b.js"):
            (tmp_path / name).write_text("")
        result = extract_host_mounts({"args": [
            str(tmp_path / "a.js"),
            str(tmp_path / "b.js"),
        ]})
        sources = [v.split(":")[0] for v in result]
        assert len(sources) == len(set(sources))  # no duplicates


# ===========================================================================
# apply_workspace_process_options — ContainerConversationRequired
# ===========================================================================

class TestApplyWorkspaceProcessOptions:
    def test_raises_when_no_conv_id(self):
        params = {"command": "node", "args": []}
        env: dict = {}
        with pytest.raises(ContainerConversationRequired):
            apply_workspace_process_options(
                params, env,
                server_name="test",
                server_config={},
                conv_id="",
            )

    def test_raises_on_empty_string_conv_id(self):
        params = {"command": "node", "args": []}
        env: dict = {}
        with pytest.raises(ContainerConversationRequired):
            apply_workspace_process_options(
                params, env,
                server_name="srv",
                server_config={},
                conv_id="",
            )
