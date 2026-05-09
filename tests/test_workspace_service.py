"""Unit tests for workspace_service.py — path safety and file operations."""
from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import MagicMock

import pytest

import store
import workspace_service


# ===========================================================================
# workspace_relpath — pure path normalisation
# ===========================================================================

class TestWorkspaceRelpath:
    @pytest.mark.parametrize("value", ["", ".", "/", "/workspace"])
    def test_root_variants_return_empty_string(self, value):
        assert workspace_service.workspace_relpath(value) == ""

    def test_none_returns_empty_string(self):
        assert workspace_service.workspace_relpath(None) == ""

    def test_workspace_prefixed_path(self):
        assert workspace_service.workspace_relpath("/workspace/foo") == "foo"

    def test_nested_workspace_path(self):
        assert workspace_service.workspace_relpath("/workspace/a/b/c") == "a/b/c"

    def test_relative_path_without_workspace_prefix(self):
        assert workspace_service.workspace_relpath("notes/readme.txt") == "notes/readme.txt"

    def test_dot_segments_stripped(self):
        assert workspace_service.workspace_relpath("/workspace/./foo") == "foo"

    def test_backslash_normalised(self):
        # Windows-style separators are converted to forward slashes
        assert workspace_service.workspace_relpath("foo\\bar") == "foo/bar"

    def test_traversal_raises(self):
        with pytest.raises(ValueError, match="traversal"):
            workspace_service.workspace_relpath("/workspace/../etc/passwd")

    def test_traversal_in_middle_raises(self):
        with pytest.raises(ValueError, match="traversal"):
            workspace_service.workspace_relpath("foo/../../../etc/passwd")

    def test_non_workspace_absolute_raises(self):
        with pytest.raises(ValueError, match="/workspace"):
            workspace_service.workspace_relpath("/etc/passwd")

    def test_trailing_slash_stripped(self):
        result = workspace_service.workspace_relpath("/workspace/foo/")
        assert result == "foo"


# ===========================================================================
# resolve_workspace_path — joins root + rel and checks containment
# ===========================================================================

class TestResolveWorkspacePath:
    def _make_conv(self):
        conv = store.create("Test conv")
        return conv["id"]

    def test_root_path_resolves_to_workspace_root(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        target, rel = workspace_service.resolve_workspace_path(conv_id, "")
        assert target == root
        assert rel == ""

    def test_valid_path_inside_workspace(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        # Create a real subdirectory so resolve doesn't raise on symlinks
        subdir = root / "mydir"
        subdir.mkdir()
        target, rel = workspace_service.resolve_workspace_path(conv_id, "/workspace/mydir")
        assert rel == "mydir"
        assert target == subdir.resolve()

    def test_escape_attempt_raises(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        # A symlink inside the workspace pointing to a directory outside it
        outside = root.parent / "outside_dir"
        outside.mkdir(exist_ok=True)
        (root / "escape_link").symlink_to(outside)
        with pytest.raises(ValueError, match="escapes"):
            workspace_service.resolve_workspace_path(conv_id, "/workspace/escape_link")


# ===========================================================================
# workspace_path helper
# ===========================================================================

class TestWorkspacePath:
    def test_empty_rel_gives_workspace_root(self):
        assert workspace_service.workspace_path("") == "/workspace"

    def test_rel_prefixed_correctly(self):
        assert workspace_service.workspace_path("foo/bar") == "/workspace/foo/bar"


# ===========================================================================
# safe_upload_name
# ===========================================================================

class TestSafeUploadName:
    def test_clean_name_unchanged(self):
        assert workspace_service.safe_upload_name("report.pdf") == "report.pdf"

    def test_dangerous_chars_replaced(self):
        result = workspace_service.safe_upload_name("../../etc/passwd")
        assert ".." not in result
        assert "/" not in result

    def test_empty_name_defaults_to_file(self):
        assert workspace_service.safe_upload_name("") == "file"

    def test_only_dots_defaults_to_file(self):
        assert workspace_service.safe_upload_name("...") == "file"

    def test_spaces_preserved(self):
        result = workspace_service.safe_upload_name("my report.txt")
        assert "report" in result

    def test_unicode_special_chars_replaced(self):
        result = workspace_service.safe_upload_name("naïve café.txt")
        # Non-ASCII letters are replaced; ".txt" suffix kept
        assert result.endswith(".txt")


# ===========================================================================
# list_dir
# ===========================================================================

class TestListDir:
    def _make_conv(self):
        return store.create("WS Test")["id"]

    def test_returns_404_for_unknown_conversation(self):
        result, status = workspace_service.list_dir("nonexistent-id", "")
        assert status == 404
        assert "error" in result

    def test_returns_400_for_traversal_path(self):
        conv_id = self._make_conv()
        result, status = workspace_service.list_dir(conv_id, "../../../etc")
        assert status == 400

    def test_returns_200_for_empty_workspace(self):
        conv_id = self._make_conv()
        result, status = workspace_service.list_dir(conv_id, "")
        assert status == 200
        assert result["entries"] == []
        assert result["path"] == "/workspace"

    def test_lists_files_and_dirs(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        (root / "file.txt").write_text("hello")
        (root / "subdir").mkdir()
        result, status = workspace_service.list_dir(conv_id, "")
        assert status == 200
        names = {e["name"] for e in result["entries"]}
        assert "file.txt" in names
        assert "subdir" in names

    def test_dirs_sorted_before_files(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        (root / "aaa.txt").write_text("x")
        (root / "zzz_dir").mkdir()
        result, status = workspace_service.list_dir(conv_id, "")
        entries = result["entries"]
        # Directory should appear before the text file
        types = [e["type"] for e in entries]
        assert types[0] == "directory"

    def test_returns_404_for_missing_subpath(self):
        conv_id = self._make_conv()
        result, status = workspace_service.list_dir(conv_id, "/workspace/ghost")
        assert status == 404

    def test_returns_400_when_path_is_file_not_dir(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        (root / "file.txt").write_text("hi")
        result, status = workspace_service.list_dir(conv_id, "/workspace/file.txt")
        assert status == 400

    def test_entry_has_required_fields(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        (root / "test.py").write_text("pass")
        result, _ = workspace_service.list_dir(conv_id, "")
        entry = result["entries"][0]
        for field in ("name", "path", "type", "size", "modified", "previewable"):
            assert field in entry


# ===========================================================================
# read_file
# ===========================================================================

class TestReadFile:
    def _make_conv(self):
        return store.create("RF Test")["id"]

    def test_returns_404_for_unknown_conversation(self):
        result, status = workspace_service.read_file("nonexistent-id", "/workspace/x.txt")
        assert status == 404

    def test_returns_404_for_missing_file(self):
        conv_id = self._make_conv()
        result, status = workspace_service.read_file(conv_id, "/workspace/ghost.txt")
        assert status == 404

    def test_returns_400_for_directory(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        (root / "adir").mkdir()
        result, status = workspace_service.read_file(conv_id, "/workspace/adir")
        assert status == 400

    def test_reads_text_file_content(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        (root / "hello.txt").write_text("Hello, world!")
        result, status = workspace_service.read_file(conv_id, "/workspace/hello.txt")
        assert status == 200
        assert result["content"] == "Hello, world!"
        assert result["previewable"] is True

    def test_large_file_not_previewable(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        big_file = root / "big.txt"
        big_file.write_bytes(b"x" * (workspace_service.MAX_PREVIEW_BYTES + 1))
        result, status = workspace_service.read_file(conv_id, "/workspace/big.txt")
        assert status == 200
        assert result["previewable"] is False
        assert result["content"] is None

    def test_python_file_is_previewable(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        (root / "script.py").write_text("print('hi')")
        result, status = workspace_service.read_file(conv_id, "/workspace/script.py")
        assert result["previewable"] is True

    def test_json_file_is_previewable(self):
        conv_id = self._make_conv()
        root = workspace_service.workspace_root(conv_id)
        (root / "data.json").write_text('{"key": "val"}')
        result, status = workspace_service.read_file(conv_id, "/workspace/data.json")
        assert result["previewable"] is True


# ===========================================================================
# save_uploads
# ===========================================================================

class TestSaveUploads:
    def _make_conv(self):
        return store.create("Upload Test")["id"]

    def _make_file(self, filename: str, content: bytes = b"data") -> MagicMock:
        f = MagicMock()
        f.filename = filename
        f.stream = io.BytesIO(content)
        return f

    def test_returns_404_for_unknown_conversation(self):
        result, status = workspace_service.save_uploads("nope", [self._make_file("f.txt")])
        assert status == 404

    def test_saves_file_successfully(self):
        conv_id = self._make_conv()
        result, status = workspace_service.save_uploads(conv_id, [self._make_file("readme.txt", b"hello")])
        assert status == 200
        assert len(result["files"]) == 1
        assert result["files"][0]["name"] == "readme.txt"

    def test_uploaded_file_exists_on_disk(self):
        conv_id = self._make_conv()
        workspace_service.save_uploads(conv_id, [self._make_file("data.csv", b"a,b,c")])
        upload_dir = workspace_service.workspace_root(conv_id) / "uploads"
        assert (upload_dir / "data.csv").exists()

    def test_returns_400_for_no_valid_files(self):
        conv_id = self._make_conv()
        bad = MagicMock()
        bad.filename = ""
        result, status = workspace_service.save_uploads(conv_id, [bad])
        assert status == 400

    def test_deduplicates_filenames(self):
        conv_id = self._make_conv()
        files = [
            self._make_file("note.txt", b"first"),
            self._make_file("note.txt", b"second"),
        ]
        result, status = workspace_service.save_uploads(conv_id, files)
        assert status == 200
        names = [f["name"] for f in result["files"]]
        assert len(set(names)) == 2  # two distinct names

    def test_rejects_file_exceeding_size_limit(self):
        conv_id = self._make_conv()
        huge = self._make_file("big.bin", b"x" * (workspace_service.MAX_UPLOAD_BYTES + 1))
        result, status = workspace_service.save_uploads(conv_id, [huge])
        assert status == 413
        assert "error" in result
