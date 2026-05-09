"""Flask route integration tests.

These tests use the Flask test client against the real blueprint with
storage redirected to tmp dirs by conftest.redirect_storage.

Docker-touching code (container_service.get_status, stop_container,
delete_workspace) is patched per-test to avoid real Docker calls.
"""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

import store
import mcp_service
from tests.conftest import MINIMAL_PNG_B64


# ===========================================================================
# Helpers
# ===========================================================================

def _json(resp) -> dict:
    return json.loads(resp.data)


# ===========================================================================
# Index
# ===========================================================================

class TestIndex:
    def test_get_root_returns_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_get_root_returns_html(self, client):
        resp = client.get("/")
        assert b"<html" in resp.data.lower() or b"<!doctype" in resp.data.lower()


# ===========================================================================
# Conversations — CRUD
# ===========================================================================

class TestConversationsCRUD:
    def test_list_conversations_empty(self, client):
        resp = client.get("/api/conversations")
        assert resp.status_code == 200
        assert _json(resp) == []

    def test_create_conversation_default_title(self, client):
        resp = client.post("/api/conversations", json={})
        assert resp.status_code == 201
        data = _json(resp)
        assert data["title"] == "New Conversation"
        assert "id" in data

    def test_create_conversation_custom_title(self, client):
        resp = client.post("/api/conversations", json={"title": "My Chat"})
        assert resp.status_code == 201
        assert _json(resp)["title"] == "My Chat"

    def test_list_conversations_after_create(self, client):
        client.post("/api/conversations", json={"title": "A"})
        client.post("/api/conversations", json={"title": "B"})
        resp = client.get("/api/conversations")
        assert len(_json(resp)) == 2

    def test_get_existing_conversation(self, client):
        conv = _json(client.post("/api/conversations", json={"title": "Get me"}))
        resp = client.get(f"/api/conversations/{conv['id']}")
        assert resp.status_code == 200
        assert _json(resp)["title"] == "Get me"

    def test_get_missing_conversation_returns_404(self, client):
        resp = client.get("/api/conversations/nonexistent-id")
        assert resp.status_code == 404

    def test_update_conversation_title(self, client):
        conv = _json(client.post("/api/conversations", json={"title": "Old"}))
        resp = client.put(f"/api/conversations/{conv['id']}", json={"title": "New"})
        assert resp.status_code == 200
        assert _json(resp)["title"] == "New"

    def test_update_persists_to_disk(self, client):
        conv = _json(client.post("/api/conversations", json={"title": "Disk"}))
        client.put(f"/api/conversations/{conv['id']}", json={"title": "Updated"})
        loaded = store.load(conv["id"])
        assert loaded["title"] == "Updated"

    def test_delete_existing_conversation(self, client):
        conv = _json(client.post("/api/conversations", json={}))
        with (
            patch("container_service.stop_container"),
            patch("container_service.delete_workspace"),
        ):
            resp = client.delete(f"/api/conversations/{conv['id']}")
        assert resp.status_code == 200
        assert _json(resp)["ok"] is True

    def test_delete_removes_from_list(self, client):
        conv = _json(client.post("/api/conversations", json={}))
        with (
            patch("container_service.stop_container"),
            patch("container_service.delete_workspace"),
        ):
            client.delete(f"/api/conversations/{conv['id']}")
        assert store.load(conv["id"]) is None

    def test_delete_missing_returns_404(self, client):
        with (
            patch("container_service.stop_container"),
            patch("container_service.delete_workspace"),
        ):
            resp = client.delete("/api/conversations/ghost-id-0000")
        assert resp.status_code == 404

    def test_get_conversation_includes_working_directory(self, client):
        conv = _json(client.post("/api/conversations", json={}))
        resp = client.get(f"/api/conversations/{conv['id']}")
        data = _json(resp)
        assert "working_directory" in data

    def test_get_workspace_route(self, client):
        conv = _json(client.post("/api/conversations", json={}))
        resp = client.get(f"/api/conversations/{conv['id']}/workspace")
        assert resp.status_code == 200
        assert "working_directory" in _json(resp)


# ===========================================================================
# Container status
# ===========================================================================

class TestContainerStatus:
    def test_get_container_status(self, client):
        conv = _json(client.post("/api/conversations", json={}))
        with patch("container_service.get_status", return_value="missing"):
            resp = client.get(f"/api/conversations/{conv['id']}/container")
        assert resp.status_code == 200
        data = _json(resp)
        assert data["status"] == "missing"
        assert data["conv_id"] == conv["id"]


# ===========================================================================
# Image upload & serving
# ===========================================================================

class TestImages:
    def test_upload_valid_png(self, client):
        resp = client.post("/api/images", json={
            "data": MINIMAL_PNG_B64,
            "media_type": "image/png",
        })
        assert resp.status_code == 200
        data = _json(resp)
        assert "ref" in data
        assert "url" in data
        assert data["ref"].endswith(".png")

    def test_upload_invalid_type_returns_400(self, client):
        resp = client.post("/api/images", json={
            "data": MINIMAL_PNG_B64,
            "media_type": "image/bmp",
        })
        assert resp.status_code == 400

    def test_upload_bad_base64_returns_400(self, client):
        resp = client.post("/api/images", json={
            "data": "not-base64!!!",
            "media_type": "image/png",
        })
        assert resp.status_code == 400

    def test_serve_uploaded_image(self, client):
        upload_resp = client.post("/api/images", json={
            "data": MINIMAL_PNG_B64,
            "media_type": "image/png",
        })
        name = _json(upload_resp)["ref"]
        resp = client.get(f"/api/images/{name}")
        assert resp.status_code == 200
        assert resp.content_type.startswith("image/")

    def test_serve_missing_image_returns_404(self, client):
        fake_name = "a" * 64 + ".png"
        resp = client.get(f"/api/images/{fake_name}")
        assert resp.status_code == 404


# ===========================================================================
# MCP config
# ===========================================================================

class TestMcpConfig:
    def test_get_default_config(self, client):
        resp = client.get("/api/mcp/config")
        assert resp.status_code == 200
        assert _json(resp) == {"mcpServers": {}}

    def test_save_and_reload_config(self, client):
        payload = {
            "mcpServers": {
                "fs": {"command": "npx", "args": ["-y", "@mcp/fs", "/workspace"]}
            }
        }
        post_resp = client.post("/api/mcp/config", json=payload)
        assert post_resp.status_code == 200
        assert _json(post_resp)["ok"] is True

        get_resp = client.get("/api/mcp/config")
        data = _json(get_resp)
        assert "fs" in data["mcpServers"]

    def test_save_invalid_config_returns_400(self, client):
        resp = client.post("/api/mcp/config", json={"mcpServers": "not-an-object"})
        assert resp.status_code == 400

    def test_save_non_dict_body_returns_400(self, client):
        resp = client.post("/api/mcp/config", json=["invalid"])
        assert resp.status_code == 400


# ===========================================================================
# Workspace files
# ===========================================================================

class TestWorkspaceFiles:
    def _create_conv(self, client) -> str:
        return _json(client.post("/api/conversations", json={}))["id"]

    def test_list_files_empty_workspace(self, client):
        conv_id = self._create_conv(client)
        resp = client.get(f"/api/conversations/{conv_id}/files")
        assert resp.status_code == 200
        data = _json(resp)
        assert "entries" in data

    def test_list_files_unknown_conv_returns_404(self, client):
        resp = client.get("/api/conversations/ghost/files")
        assert resp.status_code == 404

    def test_list_files_traversal_returns_400(self, client):
        conv_id = self._create_conv(client)
        resp = client.get(f"/api/conversations/{conv_id}/files?path=../../etc")
        assert resp.status_code == 400

    def test_upload_file(self, client):
        conv_id = self._create_conv(client)
        data = {"files": (b"hello world", "hello.txt")}
        from io import BytesIO
        resp = client.post(
            f"/api/conversations/{conv_id}/files",
            data={"files": (BytesIO(b"hello"), "hello.txt")},
            content_type="multipart/form-data",
        )
        assert resp.status_code == 200
        result = _json(resp)
        assert result["files"][0]["name"] == "hello.txt"

    def test_upload_no_files_returns_400(self, client):
        conv_id = self._create_conv(client)
        resp = client.post(
            f"/api/conversations/{conv_id}/files",
            data={},
            content_type="multipart/form-data",
        )
        assert resp.status_code == 400

    def test_read_file_content(self, client):
        import workspace_service
        conv_id = self._create_conv(client)
        root = workspace_service.workspace_root(conv_id)
        (root / "notes.txt").write_text("important note")
        resp = client.get(
            f"/api/conversations/{conv_id}/files/content?path=/workspace/notes.txt"
        )
        assert resp.status_code == 200
        data = _json(resp)
        assert data["content"] == "important note"

    def test_read_file_unknown_conv_returns_404(self, client):
        resp = client.get("/api/conversations/ghost/files/content?path=/workspace/f.txt")
        assert resp.status_code == 404

    def test_download_file(self, client):
        import workspace_service
        conv_id = self._create_conv(client)
        root = workspace_service.workspace_root(conv_id)
        (root / "dl.txt").write_text("download me")
        resp = client.get(
            f"/api/conversations/{conv_id}/files/download?path=/workspace/dl.txt"
        )
        assert resp.status_code == 200

    def test_download_missing_file_returns_404(self, client):
        conv_id = self._create_conv(client)
        resp = client.get(
            f"/api/conversations/{conv_id}/files/download?path=/workspace/ghost.txt"
        )
        assert resp.status_code == 404

    def test_download_unknown_conv_returns_404(self, client):
        resp = client.get(
            "/api/conversations/ghost/files/download?path=/workspace/f.txt"
        )
        assert resp.status_code == 404


# ===========================================================================
# Chat — cancel and approve
# ===========================================================================

class TestChatCancel:
    def test_cancel_unknown_stream_returns_404(self, client):
        resp = client.post("/api/chat/cancel", json={"stream_id": "no-such-stream"})
        assert resp.status_code == 404

    def test_cancel_active_stream_returns_ok(self, client, flask_app):
        """Inject a fake cancel event and verify cancel sets it."""
        import threading
        import routes as routes_module

        stream_id = "test-cancel-stream"
        event = threading.Event()
        routes_module._cancel_events[stream_id] = event
        try:
            resp = client.post("/api/chat/cancel", json={"stream_id": stream_id})
            assert resp.status_code == 200
            assert _json(resp)["ok"] is True
            assert event.is_set()
        finally:
            routes_module._cancel_events.pop(stream_id, None)


class TestChatApprove:
    def test_approve_calls_resolve_and_returns_ok(self, client):
        with patch("chat_turn_service.resolve_tool_approval") as mock_resolve:
            resp = client.post("/api/chat/approve", json={
                "stream_id": "s1",
                "call_id": "c1",
                "approved": True,
            })
        assert resp.status_code == 200
        assert _json(resp)["ok"] is True
        mock_resolve.assert_called_once_with("s1", "c1", True)

    def test_deny_passes_false(self, client):
        with patch("chat_turn_service.resolve_tool_approval") as mock_resolve:
            client.post("/api/chat/approve", json={
                "stream_id": "s2",
                "call_id": "c2",
                "approved": False,
            })
        mock_resolve.assert_called_once_with("s2", "c2", False)


# ===========================================================================
# Models proxy
# ===========================================================================

class TestModels:
    def test_returns_model_list(self, client):
        mock_model = MagicMock()
        mock_model.id = "gpt-4o"
        mock_client = MagicMock()
        mock_client.models.list.return_value = [mock_model]

        with patch("chat_turn_service.openai_client", return_value=mock_client):
            resp = client.post("/api/models", json={
                "api_key": "sk-test",
                "api_base": "https://api.openai.com/v1",
            })
        assert resp.status_code == 200
        assert "gpt-4o" in _json(resp)["models"]

    def test_returns_error_on_exception(self, client):
        with patch("chat_turn_service.openai_client", side_effect=Exception("bad key")):
            resp = client.post("/api/models", json={"api_key": "bad"})
        assert resp.status_code == 400
        assert "error" in _json(resp)
