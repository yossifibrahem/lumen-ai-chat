"""Unit tests for store.py — conversation persistence and image storage."""
from __future__ import annotations

import base64
import json
import time

import pytest

import store
from tests.conftest import MINIMAL_PNG_B64, MINIMAL_PNG_BYTES


# ===========================================================================
# Image storage
# ===========================================================================

class TestSaveImage:
    def test_valid_png_returns_filename(self):
        name = store.save_image(MINIMAL_PNG_B64, "image/png")
        assert name.endswith(".png")
        assert len(name) == 64 + 4  # sha256 hex + ".png"

    def test_valid_png_file_is_written(self):
        name = store.save_image(MINIMAL_PNG_B64, "image/png")
        path = store.IMAGES_DIR / name
        assert path.exists()
        assert path.read_bytes() == MINIMAL_PNG_BYTES

    def test_same_content_returns_same_name(self):
        name1 = store.save_image(MINIMAL_PNG_B64, "image/png")
        name2 = store.save_image(MINIMAL_PNG_B64, "image/png")
        assert name1 == name2

    def test_jpg_alias_normalised_to_jpeg(self):
        name = store.save_image(MINIMAL_PNG_B64, "image/jpg")
        assert name.endswith(".jpeg")

    def test_jpeg_media_type_accepted(self):
        name = store.save_image(MINIMAL_PNG_B64, "image/jpeg")
        assert name.endswith(".jpeg")

    def test_webp_media_type_accepted(self):
        name = store.save_image(MINIMAL_PNG_B64, "image/webp")
        assert name.endswith(".webp")

    def test_gif_media_type_accepted(self):
        name = store.save_image(MINIMAL_PNG_B64, "image/gif")
        assert name.endswith(".gif")

    def test_unsupported_type_raises(self):
        with pytest.raises(ValueError, match="Unsupported image type"):
            store.save_image(MINIMAL_PNG_B64, "image/bmp")

    def test_invalid_base64_raises(self):
        with pytest.raises(ValueError, match="Invalid image data"):
            store.save_image("not-valid-base64!!!", "image/png")

    def test_media_type_with_charset_param(self):
        # e.g. "image/png; charset=utf-8" — extension extracted correctly
        name = store.save_image(MINIMAL_PNG_B64, "image/png; charset=utf-8")
        assert name.endswith(".png")


class TestGetImagePath:
    def test_returns_path_for_existing_image(self):
        name = store.save_image(MINIMAL_PNG_B64, "image/png")
        result = store.get_image_path(name)
        assert result is not None
        assert result.exists()

    def test_returns_none_for_missing_image(self):
        fake = "a" * 64 + ".png"
        result = store.get_image_path(fake)
        assert result is None

    def test_returns_none_for_path_traversal(self):
        assert store.get_image_path("../../etc/passwd") is None

    def test_returns_none_for_name_with_spaces(self):
        assert store.get_image_path("hello world.png") is None

    def test_returns_none_for_uppercase_hex(self):
        # _SAFE_NAME requires lowercase hex
        upper = "A" * 64 + ".png"
        assert store.get_image_path(upper) is None

    def test_returns_none_for_wrong_extension(self):
        name = "a" * 64 + ".exe"
        assert store.get_image_path(name) is None


# ===========================================================================
# Conversation CRUD
# ===========================================================================

class TestCreate:
    def test_returns_dict_with_id(self):
        conv = store.create("Hello")
        assert "id" in conv
        assert conv["title"] == "Hello"

    def test_default_title(self):
        conv = store.create()
        assert conv["title"] == "New Conversation"

    def test_creates_json_file(self):
        conv = store.create("Test")
        path = store.CONVERSATIONS_DIR / f"{conv['id']}.json"
        assert path.exists()

    def test_includes_created_at(self):
        conv = store.create()
        assert "created_at" in conv

    def test_includes_updated_at(self):
        conv = store.create()
        assert "updated_at" in conv

    def test_messages_list_empty(self):
        conv = store.create()
        assert conv["messages"] == []


class TestLoad:
    def test_returns_none_for_missing_id(self):
        assert store.load("nonexistent-id-12345") is None

    def test_loads_saved_conversation(self):
        conv = store.create("Load me")
        loaded = store.load(conv["id"])
        assert loaded is not None
        assert loaded["title"] == "Load me"

    def test_returns_none_for_corrupt_json(self):
        conv_id = "corrupt-conv"
        (store.CONVERSATIONS_DIR / f"{conv_id}.json").write_text("{ bad json }")
        assert store.load(conv_id) is None


class TestSave:
    def test_save_updates_title(self):
        conv = store.create("Original")
        conv["title"] = "Updated"
        saved = store.save(conv["id"], conv)
        assert saved["title"] == "Updated"

    def test_save_stamps_updated_at(self):
        conv = store.create("Stamp test")
        old_ts = conv["updated_at"]
        time.sleep(0.01)
        conv["title"] = "New"
        saved = store.save(conv["id"], conv)
        assert saved["updated_at"] >= old_ts  # non-decreasing

    def test_save_persists_to_disk(self):
        conv = store.create("Persist")
        conv["title"] = "Persisted"
        store.save(conv["id"], conv)
        on_disk = json.loads((store.CONVERSATIONS_DIR / f"{conv['id']}.json").read_text())
        assert on_disk["title"] == "Persisted"


class TestDelete:
    def test_returns_true_for_existing(self):
        conv = store.create()
        assert store.delete(conv["id"]) is True

    def test_returns_false_for_missing(self):
        assert store.delete("does-not-exist") is False

    def test_file_removed_after_delete(self):
        conv = store.create()
        store.delete(conv["id"])
        assert not (store.CONVERSATIONS_DIR / f"{conv['id']}.json").exists()

    def test_load_returns_none_after_delete(self):
        conv = store.create()
        store.delete(conv["id"])
        assert store.load(conv["id"]) is None


class TestListAll:
    def test_empty_when_no_conversations(self):
        assert store.list_all() == []

    def test_returns_all_conversations(self):
        c1 = store.create("A")
        c2 = store.create("B")
        ids = {c["id"] for c in store.list_all()}
        assert c1["id"] in ids
        assert c2["id"] in ids

    def test_returns_title_and_id(self):
        store.create("My Title")
        listing = store.list_all()
        assert len(listing) == 1
        item = listing[0]
        assert "id" in item
        assert "title" in item
        assert item["title"] == "My Title"

    def test_most_recently_modified_first(self):
        c1 = store.create("First")
        time.sleep(0.05)
        c2 = store.create("Second")
        listing = store.list_all()
        assert listing[0]["id"] == c2["id"]

    def test_skips_corrupt_files_silently(self):
        (store.CONVERSATIONS_DIR / "bad.json").write_text("not json")
        store.create("Good")
        listing = store.list_all()
        assert len(listing) == 1  # only the good one
