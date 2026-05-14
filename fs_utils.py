"""Filesystem utilities shared across the backend."""
from __future__ import annotations

import time
from pathlib import Path


def atomic_replace(src: Path, dst: Path, *, retries: int = 5, delay: float = 0.05) -> None:
    """Replace *dst* with *src* atomically.

    On Windows, ``os.replace()`` can raise ``PermissionError`` (WinError 5)
    when another thread momentarily holds the destination file open.  Retry a
    handful of times with a short linear back-off before re-raising so that
    transient file-lock races don't surface as 500 errors.
    """
    for attempt in range(retries):
        try:
            src.replace(dst)
            return
        except PermissionError:
            if attempt == retries - 1:
                raise
            time.sleep(delay * (attempt + 1))