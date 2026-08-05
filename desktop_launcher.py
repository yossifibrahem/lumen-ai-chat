"""Native desktop launcher for the frozen Lumen web application."""
from __future__ import annotations

import errno
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser

if sys.platform == "win32":
    import ctypes
    import msvcrt

    import pystray
    from PIL import Image, ImageDraw
else:
    import fcntl

if sys.platform == "darwin":
    import rumps

from waitress import create_server

import app as lumen_app
import build_info
import runtime_requirements


HOST = "127.0.0.1"
PORT = build_info.DESKTOP_PORT
BASE_URL = f"http://{HOST}:{PORT}"
LUMEN_DIR = Path(
    os.getenv("LUMEN_DESKTOP_DATA_DIR", str(Path.home() / ".lumen"))
)
LOG_DIR = LUMEN_DIR / "logs"
LOG_FILE = LOG_DIR / "lumen.log"
LOCK_FILE = Path(
    os.getenv("LUMEN_DESKTOP_LOCK_FILE", str(LUMEN_DIR / "desktop.lock"))
)
MENU_BAR_ICON = build_info.resource_root() / "static" / "favicon.svg"
WINDOWS_ICON = build_info.resource_root() / "Lumen.ico"


def configure_logging() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(handler)


def _health_payload(timeout: float = 1.0) -> dict | None:
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health", timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, ValueError, urllib.error.URLError):
        return None
    return payload if isinstance(payload, dict) else None


def _wait_for_health(timeout: float = 30.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        payload = _health_payload()
        if payload and payload.get("app") == build_info.APP_ID:
            return True
        time.sleep(0.25)
    return False


def _port_available() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            probe.bind((HOST, PORT))
        except OSError:
            return False
    return True


def _validate_frozen_runtime() -> None:
    """Import lazy critical dependencies and verify bundled web resources."""
    from mcp import ClientSession, StdioServerParameters  # noqa: F401
    from mcp.client.stdio import stdio_client  # noqa: F401
    from openai import OpenAI  # noqa: F401

    root = build_info.resource_root()
    required = [
        root / "templates" / "index.html",
        root / "static" / "js" / "app.js",
        MENU_BAR_ICON,
        root / "Dockerfile.sandbox",
        root / ".dockerignore",
        root / "vendor" / "computer-use-mcp-server" / "package.json",
        root / "vendor" / "computer-use-mcp-server" / "package-lock.json",
        root / "vendor" / "computer-use-mcp-server" / "tsconfig.json",
        root / "vendor" / "computer-use-mcp-server" / "src" / "index.ts",
    ]
    if sys.platform == "win32" and build_info.is_frozen():
        required.append(WINDOWS_ICON)
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError(f"Frozen application resources are missing: {', '.join(missing)}")


class SingleInstance:
    """Hold a non-blocking, process-scoped lock for the desktop application."""

    def __init__(self) -> None:
        LUMEN_DIR.mkdir(parents=True, exist_ok=True)
        self._handle = LOCK_FILE.open("a+")
        self._locked = False

    def acquire(self) -> bool:
        try:
            if sys.platform == "win32":
                self._handle.seek(0)
                if not self._handle.read(1):
                    self._handle.seek(0)
                    self._handle.write(" ")
                    self._handle.flush()
                self._handle.seek(0)
                msvcrt.locking(self._handle.fileno(), msvcrt.LK_NBLCK, 1)
                self._handle.seek(1)
            else:
                fcntl.flock(self._handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                self._handle.seek(0)
                self._handle.truncate()
            self._handle.write(str(os.getpid()))
            self._handle.flush()
            self._locked = True
            return True
        except (BlockingIOError, OSError):
            return False

    def close(self) -> None:
        try:
            if self._locked:
                if sys.platform == "win32":
                    self._handle.seek(0)
                    msvcrt.locking(self._handle.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    fcntl.flock(self._handle.fileno(), fcntl.LOCK_UN)
        finally:
            self._locked = False
            self._handle.close()


class DesktopServer:
    def __init__(self, instance_lock: SingleInstance) -> None:
        self._instance_lock = instance_lock
        self._server = None
        self._server_thread: threading.Thread | None = None
        self._server_stopping = threading.Event()

    def start_server(self) -> None:
        if not _port_available():
            payload = _health_payload()
            if payload and payload.get("app") == build_info.APP_ID:
                webbrowser.open(BASE_URL)
                raise SystemExit(0)
            raise RuntimeError(
                f"Port {PORT} is already in use by another application. "
                "Close it or set LUMEN_DESKTOP_PORT to a stable free port."
            )

        flask_app = lumen_app.create_app()
        self._server = create_server(flask_app, host=HOST, port=PORT, threads=8)
        self._server_stopping.clear()
        self._server_thread = threading.Thread(
            target=self._run_server,
            name="lumen-waitress",
            daemon=True,
        )
        self._server_thread.start()
        if not _wait_for_health():
            raise RuntimeError("The local Lumen server did not become ready within 30 seconds.")
        if os.getenv("LUMEN_DESKTOP_NO_BROWSER", "") != "1":
            webbrowser.open(BASE_URL)

    def _run_server(self) -> None:
        try:
            self._server.run()
        except OSError as exc:
            if self._server_stopping.is_set() and exc.errno == errno.EBADF:
                return
            raise

    def stop_server(self) -> None:
        if self._server is not None:
            self._server_stopping.set()
            dispatcher = getattr(self._server, "task_dispatcher", None)
            if dispatcher is not None:
                dispatcher.shutdown(timeout=5)
            self._server.close()
        if self._server_thread is not None:
            self._server_thread.join(timeout=5)

    def open_lumen(self, *_args) -> None:
        webbrowser.open(BASE_URL)


if sys.platform == "darwin":

    class LumenMenuBar(DesktopServer, rumps.App):
        def __init__(self, instance_lock: SingleInstance) -> None:
            rumps.App.__init__(
                self,
                "Lumen AI Chat",
                icon=str(MENU_BAR_ICON),
                template=False,
                quit_button=None,
            )
            DesktopServer.__init__(self, instance_lock)
            self.menu = [
                rumps.MenuItem("Open Lumen", callback=self.open_lumen),
                rumps.MenuItem("Docker Status", callback=self.docker_status),
                rumps.MenuItem("Open Logs", callback=self.open_logs),
                None,
                rumps.MenuItem("Quit Lumen", callback=self.quit_lumen),
            ]

        def docker_status(self, _sender=None) -> None:
            status = runtime_requirements.check_requirements()
            rumps.alert(title=status.title, message=status.message, ok="OK")

        def open_logs(self, _sender=None) -> None:
            LOG_DIR.mkdir(parents=True, exist_ok=True)
            subprocess.Popen(["/usr/bin/open", str(LOG_DIR)])

        def quit_lumen(self, _sender=None) -> None:
            try:
                self.stop_server()
                lumen_app._shutdown_containers()
            finally:
                self._instance_lock.close()
                rumps.quit_application()


if sys.platform == "win32":

    def _windows_icon_image() -> Image.Image:
        if WINDOWS_ICON.is_file():
            with Image.open(WINDOWS_ICON) as image:
                return image.convert("RGBA")
        image = Image.new("RGBA", (64, 64), "#171713")
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((10, 10, 54, 54), radius=0, fill="#fff3d6", outline="#120f0a", width=4)
        draw.rectangle((20, 24, 28, 32), fill="#d96c4b")
        draw.rectangle((36, 24, 44, 32), fill="#d96c4b")
        draw.rectangle((24, 42, 40, 46), fill="#120f0a")
        draw.rectangle((28, 4, 36, 12), fill="#d96c4b")
        return image


    def _windows_alert(title: str, message: str) -> None:
        ctypes.windll.user32.MessageBoxW(None, message, title, 0x00000040)


    class LumenTray(DesktopServer):
        def __init__(self, instance_lock: SingleInstance) -> None:
            super().__init__(instance_lock)
            self._icon = pystray.Icon(
                "lumen-ai-chat",
                _windows_icon_image(),
                "Lumen AI Chat",
                menu=pystray.Menu(
                    pystray.MenuItem("Open Lumen", self.open_lumen, default=True),
                    pystray.MenuItem("Docker Status", self.docker_status),
                    pystray.MenuItem("Open Logs", self.open_logs),
                    pystray.Menu.SEPARATOR,
                    pystray.MenuItem("Quit Lumen", self.quit_lumen),
                ),
            )

        def run(self) -> None:
            self._icon.run()

        def docker_status(self, *_args) -> None:
            status = runtime_requirements.check_requirements()
            _windows_alert(status.title, status.message)

        def open_logs(self, *_args) -> None:
            LOG_DIR.mkdir(parents=True, exist_ok=True)
            os.startfile(LOG_DIR)  # type: ignore[attr-defined]

        def quit_lumen(self, *_args) -> None:
            try:
                self.stop_server()
                lumen_app._shutdown_containers()
            finally:
                self._instance_lock.close()
                self._icon.stop()


def _show_alert(title: str, message: str) -> None:
    if sys.platform == "darwin":
        rumps.alert(title=title, message=message, ok="Close")
    elif sys.platform == "win32":
        _windows_alert(title, message)
    else:
        logging.error("%s: %s", title, message)


def _desktop_app(instance: SingleInstance):
    if sys.platform == "darwin":
        return LumenMenuBar(instance)
    if sys.platform == "win32":
        return LumenTray(instance)
    raise RuntimeError("The desktop launcher supports macOS and Windows only.")


def main() -> int:
    configure_logging()
    instance = SingleInstance()
    if not instance.acquire():
        if _wait_for_health(timeout=5):
            webbrowser.open(BASE_URL)
            instance.close()
            return 0
        _show_alert(
            "Lumen is starting",
            "Another Lumen process is already running. Try again in a moment.",
        )
        instance.close()
        return 1

    desktop_app = None
    try:
        desktop_app = _desktop_app(instance)
        desktop_app.start_server()
        if os.getenv("LUMEN_DESKTOP_SMOKE_TEST", "") == "1":
            _validate_frozen_runtime()
            desktop_app.stop_server()
            instance.close()
            return 0
        desktop_app.run()
        return 0
    except SystemExit:
        instance.close()
        return 0
    except Exception as exc:
        logging.exception("desktop startup failed")
        if desktop_app is not None:
            try:
                desktop_app.stop_server()
            except Exception:
                logging.exception("desktop server cleanup failed")
        instance.close()
        _show_alert("Lumen could not start", str(exc))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
