"""Unit tests for streaming.py — SSE formatting and tool-call chunk merging."""
from __future__ import annotations

import json

import pytest

import streaming


# ===========================================================================
# sse_event
# ===========================================================================

class TestSseEvent:
    def test_format_starts_with_data_prefix(self):
        event = streaming.sse_event({"type": "text", "content": "hello"})
        assert event.startswith("data: ")

    def test_format_ends_with_double_newline(self):
        event = streaming.sse_event({"type": "text", "content": "hi"})
        assert event.endswith("\n\n")

    def test_payload_is_valid_json(self):
        event = streaming.sse_event({"type": "text", "content": "world"})
        json_part = event[len("data: "):].strip()
        parsed = json.loads(json_part)
        assert parsed["type"] == "text"
        assert parsed["content"] == "world"

    def test_nested_payload_serialised(self):
        payload = {"type": "tool_calls", "calls": [{"id": "c1", "function": {"name": "bash"}}]}
        event = streaming.sse_event(payload)
        json_part = event[len("data: "):].strip()
        parsed = json.loads(json_part)
        assert parsed["calls"][0]["id"] == "c1"

    def test_empty_payload_serialised(self):
        event = streaming.sse_event({})
        json_part = event[len("data: "):].strip()
        assert json.loads(json_part) == {}


# ===========================================================================
# _merge_tool_call_chunk — internal accumulator
# ===========================================================================

class TestMergeToolCallChunk:
    """Tests for the internal _merge_tool_call_chunk helper."""

    def _make_chunk(self, index: int, *, id: str = "", name: str = "", args: str = ""):
        chunk = type("Chunk", (), {})()
        chunk.index = index
        chunk.id = id
        func = type("Func", (), {"name": name, "arguments": args})()
        chunk.function = func
        return chunk

    def test_new_index_initialises_entry(self):
        store: dict = {}
        chunk = self._make_chunk(0, id="call_1", name="bash", args="")
        streaming._merge_tool_call_chunk(store, chunk)
        assert 0 in store
        assert store[0]["id"] == "call_1"
        assert store[0]["function"]["name"] == "bash"

    def test_arguments_accumulated_across_chunks(self):
        store: dict = {}
        streaming._merge_tool_call_chunk(store, self._make_chunk(0, id="c1", name="run", args='{"cmd":'))
        streaming._merge_tool_call_chunk(store, self._make_chunk(0, id="", name="", args='"ls"}'))
        assert store[0]["function"]["arguments"] == '{"cmd":"ls"}'

    def test_name_accumulated_across_chunks(self):
        # Some providers stream tool name in multiple deltas
        store: dict = {}
        streaming._merge_tool_call_chunk(store, self._make_chunk(0, id="x", name="ba", args=""))
        streaming._merge_tool_call_chunk(store, self._make_chunk(0, id="", name="sh", args=""))
        assert store[0]["function"]["name"] == "bash"

    def test_multiple_tool_call_indices(self):
        store: dict = {}
        streaming._merge_tool_call_chunk(store, self._make_chunk(0, id="c0", name="tool_a", args="{}"))
        streaming._merge_tool_call_chunk(store, self._make_chunk(1, id="c1", name="tool_b", args="{}"))
        assert len(store) == 2
        assert store[0]["function"]["name"] == "tool_a"
        assert store[1]["function"]["name"] == "tool_b"

    def test_id_updated_from_later_chunk_if_non_empty(self):
        store: dict = {}
        streaming._merge_tool_call_chunk(store, self._make_chunk(0, id="first", name="t", args=""))
        streaming._merge_tool_call_chunk(store, self._make_chunk(0, id="second", name="", args=""))
        # id should reflect the last non-empty id seen
        assert store[0]["id"] == "second"

    def test_none_function_does_not_crash(self):
        """Defensive: chunk.function may be None in some provider responses."""
        store: dict = {}
        chunk = self._make_chunk(0, id="c1", name="", args="")
        chunk.function = None
        # Should not raise
        streaming._merge_tool_call_chunk(store, chunk)
        assert 0 in store


# ===========================================================================
# make_streaming_response
# ===========================================================================

class TestMakeStreamingResponse:
    def test_content_type_is_text_event_stream(self, flask_app):
        def gen():
            yield "data: hello\n\n"

        with flask_app.test_request_context():
            resp = streaming.make_streaming_response(gen())
        assert "text/event-stream" in resp.content_type

    def test_cache_control_no_cache(self, flask_app):
        def gen():
            yield "data: x\n\n"

        with flask_app.test_request_context():
            resp = streaming.make_streaming_response(gen())
        assert resp.headers.get("Cache-Control") == "no-cache"
