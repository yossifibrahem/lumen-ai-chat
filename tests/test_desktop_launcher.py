from __future__ import annotations

import errno
import importlib.util
from pathlib import Path
import sys
import threading
import types
from types import SimpleNamespace

import pytest

import desktop_launcher


def _bare_server():
    return object.__new__(desktop_launcher.DesktopServer)


def test_desktop_lock_defaults_to_lumen_data_directory():
    assert desktop_launcher.LOCK_FILE == Path.home() / ".lumen" / "desktop.lock"


@pytest.mark.skipif(sys.platform != "win32", reason="Windows file locking only")
def test_windows_single_instance_lock_is_exclusive(tmp_path, monkeypatch):
    monkeypatch.setattr(desktop_launcher, "LUMEN_DIR", tmp_path)
    monkeypatch.setattr(desktop_launcher, "LOCK_FILE", tmp_path / "desktop.lock")
    first = desktop_launcher.SingleInstance()
    second = desktop_launcher.SingleInstance()
    try:
        assert first.acquire()
        assert not second.acquire()
    finally:
        second.close()
        first.close()


def test_macos_launcher_contract_remains_loadable(monkeypatch):
    class FakeApp:
        def __init__(
            self,
            name,
            title=None,
            icon=None,
            template=None,
            menu=None,
            quit_button="Quit",
        ):
            self.name = name
            self.title = title
            self.icon = icon
            self.template = template
            self.menu = menu
            self.quit_button = quit_button

        def run(self):
            return None

    class FakeMenuItem:
        def __init__(self, title, callback=None):
            self.title = title
            self.callback = callback

    fake_rumps = types.ModuleType("rumps")
    fake_rumps.App = FakeApp
    fake_rumps.MenuItem = FakeMenuItem
    fake_rumps.alert = lambda **_kwargs: None
    fake_rumps.quit_application = lambda: None

    fake_fcntl = types.ModuleType("fcntl")
    fake_fcntl.LOCK_EX = 1
    fake_fcntl.LOCK_NB = 2
    fake_fcntl.LOCK_UN = 8
    fake_fcntl.flock = lambda *_args: None

    monkeypatch.setitem(sys.modules, "rumps", fake_rumps)
    monkeypatch.setitem(sys.modules, "fcntl", fake_fcntl)
    monkeypatch.setattr(sys, "platform", "darwin")
    launcher_path = Path(desktop_launcher.__file__)
    spec = importlib.util.spec_from_file_location(
        "desktop_launcher_macos_contract",
        launcher_path,
    )
    assert spec is not None and spec.loader is not None
    macos_launcher = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(macos_launcher)

    instance_lock = object()
    menu = macos_launcher.LumenMenuBar(instance_lock)

    assert isinstance(menu, macos_launcher.DesktopServer)
    assert isinstance(menu, FakeApp)
    assert menu.icon == str(macos_launcher.MENU_BAR_ICON)
    assert menu.title is None
    assert menu.quit_button is None
    assert [item.title if item else None for item in menu.menu] == [
        "Open Lumen",
        "Docker Status",
        "Open Logs",
        None,
        "Quit Lumen",
    ]
    assert isinstance(macos_launcher._desktop_app(instance_lock), macos_launcher.LumenMenuBar)


@pytest.mark.skipif(sys.platform != "darwin", reason="macOS menu bar only")
def test_menu_bar_uses_bundled_lumen_artwork():
    menu = desktop_launcher.LumenMenuBar(object())
    assert desktop_launcher.MENU_BAR_ICON.is_file()
    assert menu.icon == str(desktop_launcher.MENU_BAR_ICON)
    assert menu.title is None


def test_port_collision_with_lumen_reopens_existing_app(monkeypatch):
    opened = []
    monkeypatch.setattr(desktop_launcher, "_port_available", lambda: False)
    monkeypatch.setattr(
        desktop_launcher,
        "_health_payload",
        lambda: {"app": desktop_launcher.build_info.APP_ID},
    )
    monkeypatch.setattr(desktop_launcher.webbrowser, "open", opened.append)

    with pytest.raises(SystemExit) as stopped:
        _bare_server().start_server()

    assert stopped.value.code == 0
    assert opened == [desktop_launcher.BASE_URL]


def test_port_collision_with_unrelated_service_is_actionable(monkeypatch):
    monkeypatch.setattr(desktop_launcher, "_port_available", lambda: False)
    monkeypatch.setattr(desktop_launcher, "_health_payload", lambda: {"app": "other"})

    with pytest.raises(RuntimeError, match="already in use by another application"):
        _bare_server().start_server()


def test_stop_server_closes_waitress_and_joins_thread():
    calls = []
    menu = _bare_server()
    menu._server_stopping = threading.Event()
    menu._server = SimpleNamespace(close=lambda: calls.append("close"))
    menu._server_thread = SimpleNamespace(join=lambda timeout: calls.append(("join", timeout)))

    menu.stop_server()

    assert calls == ["close", ("join", 5)]


def test_expected_waitress_close_race_is_suppressed():
    menu = _bare_server()
    menu._server_stopping = threading.Event()
    menu._server_stopping.set()
    menu._server = SimpleNamespace(
        run=lambda: (_ for _ in ()).throw(OSError(errno.EBADF, "closed"))
    )

    menu._run_server()


def test_smoke_mode_starts_then_stops_without_entering_menu_loop(monkeypatch):
    events = []

    class FakeInstance:
        def acquire(self):
            events.append("lock")
            return True

        def close(self):
            events.append("unlock")

    class FakeDesktopApp:
        def __init__(self, instance):
            assert isinstance(instance, FakeInstance)

        def start_server(self):
            events.append("start")

        def stop_server(self):
            events.append("stop")

        def run(self):
            raise AssertionError("menu loop must not run during a smoke test")

    monkeypatch.setenv("LUMEN_DESKTOP_SMOKE_TEST", "1")
    monkeypatch.setattr(desktop_launcher, "configure_logging", lambda: None)
    monkeypatch.setattr(
        desktop_launcher,
        "_validate_frozen_runtime",
        lambda: events.append("validate"),
    )
    monkeypatch.setattr(desktop_launcher, "SingleInstance", FakeInstance)
    monkeypatch.setattr(
        desktop_launcher,
        "_desktop_app",
        lambda instance: FakeDesktopApp(instance),
    )

    assert desktop_launcher.main() == 0
    assert events == ["lock", "start", "validate", "stop", "unlock"]


def test_frozen_runtime_validation_finds_bundled_assets():
    desktop_launcher._validate_frozen_runtime()
