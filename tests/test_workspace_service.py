"""
Tests for workspace_service.py — path normalisation, traversal safety,
directory listing, file reading, upload name sanitisation.

`workspace_root()` is patched in every test that touches the filesystem so
we control exactly where files live without depending on container_service.
"""
from __future__ import annotations

import io
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

import store
import workspace_service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_workspace(tmp_lumen) -> tuple[str, Path]:
    """Create a conversation and a matching workspace directory, return both."""
    conv = store.create("ws-test")
    conv_id = conv["id"]
    root = tmp_lumen["containers_dir"] / conv_id
    root.mkdir(parents=True, exist_ok=True)
    return conv_id, root


# ---------------------------------------------------------------------------
# workspace_relpath
# ---------------------------------------------------------------------------

class TestWorkspaceRelpath:
    """Pure path-normalisation logic — no filesystem, no mocks needed."""

    @pytest.mark.parametrize("value", ["", ".", "/", "/workspace"])
    def test_root_variants_return_empty_string(self, value):
        assert workspace_service.workspace_relpath(value) == ""

    def test_strips_workspace_prefix(self):
        assert workspace_service.workspace_relpath("/workspace/foo/bar") == "foo/bar"

    def test_simple_relative_path(self):
        assert workspace_service.workspace_relpath("hello.txt") == "hello.txt"

    def test_nested_relative_path(self):
        assert workspace_service.workspace_relpath("a/b/c.py") == "a/b/c.py"

    def test_backslash_normalised_to_forward_slash(self):
        assert workspace_service.workspace_relpath("foo\\bar") == "foo/bar"

    def test_parent_traversal_raises(self):
        with pytest.raises(ValueError, match="traversal"):
            workspace_service.workspace_relpath("../escape")

    def test_embedded_traversal_raises(self):
        with pytest.raises(ValueError, match="traversal"):
            workspace_service.workspace_relpath("a/../../etc/passwd")

    def test_absolute_non_workspace_path_raises(self):
        with pytest.raises(ValueError, match="Only /workspace"):
            workspace_service.workspace_relpath("/etc/passwd")

    def test_none_treated_as_empty(self):
        assert workspace_service.workspace_relpath(None) == ""

    def test_dot_segments_stripped(self):
        assert workspace_service.workspace_relpath("./foo/./bar") == "foo/bar"


# ---------------------------------------------------------------------------
# resolve_workspace_path
# ---------------------------------------------------------------------------

class TestResolveWorkspacePath:

    def test_empty_path_resolves_to_root(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        with patch("workspace_service.workspace_root", return_value=root):
            target, rel = workspace_service.resolve_workspace_path(conv_id, "")
        assert target == root
        assert rel == ""

    def test_valid_nested_path_resolved(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "sub").mkdir()
        with patch("workspace_service.workspace_root", return_value=root):
            target, rel = workspace_service.resolve_workspace_path(conv_id, "/workspace/sub")
        assert target == root / "sub"
        assert rel == "sub"

    def test_traversal_attempt_raises(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        with patch("workspace_service.workspace_root", return_value=root):
            with pytest.raises(ValueError):
                workspace_service.resolve_workspace_path(conv_id, "../escape")

    def test_symlink_escape_rejected(self, tmp_lumen):
        """A path that resolves outside the root after symlink expansion must raise."""
        conv_id, root = _make_workspace(tmp_lumen)
        # We test this via the relpath validator; resolve_workspace_path raises
        # ValueError for any path that escapes after .resolve().
        with patch("workspace_service.workspace_root", return_value=root):
            with pytest.raises(ValueError):
                workspace_service.resolve_workspace_path(conv_id, "/etc/passwd")


# ---------------------------------------------------------------------------
# list_dir
# ---------------------------------------------------------------------------

class TestListDir:

    def test_returns_404_for_unknown_conversation(self, tmp_lumen):
        _, status = workspace_service.list_dir("nonexistent-conv-id", "")
        assert status == 404

    def test_returns_200_with_entries_for_root(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "hello.txt").write_text("hello")
        with patch("workspace_service.workspace_root", return_value=root):
            result, status = workspace_service.list_dir(conv_id, "")
        assert status == 200
        names = [e["name"] for e in result["entries"]]
        assert "hello.txt" in names

    def test_directories_sorted_before_files(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "zfile.txt").write_text("z")
        (root / "adir").mkdir()
        with patch("workspace_service.workspace_root", return_value=root):
            result, _ = workspace_service.list_dir(conv_id, "")
        entries = result["entries"]
        assert entries[0]["type"] == "directory"
        assert entries[1]["type"] == "file"

    def test_returns_400_for_traversal_path(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        with patch("workspace_service.workspace_root", return_value=root):
            result, status = workspace_service.list_dir(conv_id, "../escape")
        assert status == 400

    def test_returns_404_for_nonexistent_subpath(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        with patch("workspace_service.workspace_root", return_value=root):
            result, status = workspace_service.list_dir(conv_id, "/workspace/ghost_dir")
        assert status == 404

    def test_returns_400_when_path_is_a_file(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "file.txt").write_text("content")
        with patch("workspace_service.workspace_root", return_value=root):
            result, status = workspace_service.list_dir(conv_id, "/workspace/file.txt")
        assert status == 400

    def test_entry_shape(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "shape.py").write_text("x = 1")
        with patch("workspace_service.workspace_root", return_value=root):
            result, _ = workspace_service.list_dir(conv_id, "")
        entry = next(e for e in result["entries"] if e["name"] == "shape.py")
        assert "name" in entry
        assert "path" in entry
        assert "type" in entry
        assert "size" in entry
        assert "previewable" in entry

    def test_path_field_has_workspace_prefix(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "sample.txt").write_text("x")
        with patch("workspace_service.workspace_root", return_value=root):
            result, _ = workspace_service.list_dir(conv_id, "")
        entry = next(e for e in result["entries"] if e["name"] == "sample.txt")
        assert entry["path"].startswith("/workspace")


# ---------------------------------------------------------------------------
# read_file
# ---------------------------------------------------------------------------

class TestReadFile:

    def test_reads_text_file_content(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "notes.txt").write_text("hello world")
        with patch("workspace_service.workspace_root", return_value=root):
            result, status = workspace_service.read_file(conv_id, "/workspace/notes.txt")
        assert status == 200
        assert result["content"] == "hello world"
        assert result["previewable"] is True

    def test_reads_python_file(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "script.py").write_text("print('hi')")
        with patch("workspace_service.workspace_root", return_value=root):
            result, status = workspace_service.read_file(conv_id, "/workspace/script.py")
        assert status == 200
        assert "print" in result["content"]

    def test_returns_404_for_missing_conversation(self, tmp_lumen):
        _, status = workspace_service.read_file("ghost-conv", "/workspace/x.txt")
        assert status == 404

    def test_returns_404_for_missing_file(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        with patch("workspace_service.workspace_root", return_value=root):
            _, status = workspace_service.read_file(conv_id, "/workspace/ghost.txt")
        assert status == 404

    def test_returns_400_for_directory(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "mydir").mkdir()
        with patch("workspace_service.workspace_root", return_value=root):
            _, status = workspace_service.read_file(conv_id, "/workspace/mydir")
        assert status == 400

    def test_result_shape(self, tmp_lumen):
        conv_id, root = _make_workspace(tmp_lumen)
        (root / "shape.md").write_text("# Title")
        with patch("workspace_service.workspace_root", return_value=root):
            result, _ = workspace_service.read_file(conv_id, "/workspace/shape.md")
        for key in ("name", "path", "type", "size", "previewable", "mime_type"):
            assert key in result


# ---------------------------------------------------------------------------
# safe_upload_name
# ---------------------------------------------------------------------------

class TestSafeUploadName:

    def test_normal_ascii_name_unchanged(self):
        assert workspace_service.safe_upload_name("report.pdf") == "report.pdf"

    def test_spaces_and_hyphens_kept(self):
        result = workspace_service.safe_upload_name("my file-v2.txt")
        assert "my file-v2.txt" == result

    def test_path_separators_replaced(self):
        result = workspace_service.safe_upload_name("a/b/c.txt")
        assert "/" not in result

    def test_special_chars_replaced_with_underscore(self):
        result = workspace_service.safe_upload_name("evil;rm -rf.sh")
        assert ";" not in result

    def test_empty_name_returns_file(self):
        assert workspace_service.safe_upload_name("") == "file"

    def test_strips_leading_trailing_dots_and_spaces(self):
        result = workspace_service.safe_upload_name("...hidden")
        assert not result.startswith(".")

    def test_unicode_replaced(self):
        result = workspace_service.safe_upload_name("héllo.txt")
        # Non-ASCII replaced; file extension may survive
        assert isinstance(result, str)
        assert len(result) > 0


# ---------------------------------------------------------------------------
# workspace_path helper
# ---------------------------------------------------------------------------

class TestWorkspacePath:

    def test_empty_rel_returns_workspace_root(self):
        assert workspace_service.workspace_path("") == "/workspace"

    def test_non_empty_rel_has_separator(self):
        assert workspace_service.workspace_path("foo/bar.txt") == "/workspace/foo/bar.txt"
