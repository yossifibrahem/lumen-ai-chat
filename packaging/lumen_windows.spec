# -*- mode: python ; coding: utf-8 -*-
import os
from pathlib import Path

ROOT = Path(SPECPATH).parent
METADATA = ROOT / "build" / "generated" / "build_metadata.json"
ICON = ROOT / "build" / "generated" / "Lumen.ico"
VERSION_INFO = ROOT / "build" / "generated" / "windows_version_info.txt"

a = Analysis(
    [str(ROOT / "desktop_launcher.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=[
        (str(ROOT / "templates"), "templates"),
        (str(ROOT / "static"), "static"),
        (str(METADATA), "."),
        (str(ICON), "."),
        (str(ROOT / "Dockerfile.sandbox"), "."),
        (str(ROOT / ".dockerignore"), "."),
        (
            str(ROOT / "vendor" / "computer-use-mcp-server" / "package.json"),
            "vendor/computer-use-mcp-server",
        ),
        (
            str(ROOT / "vendor" / "computer-use-mcp-server" / "package-lock.json"),
            "vendor/computer-use-mcp-server",
        ),
        (
            str(ROOT / "vendor" / "computer-use-mcp-server" / "tsconfig.json"),
            "vendor/computer-use-mcp-server",
        ),
        (
            str(ROOT / "vendor" / "computer-use-mcp-server" / "src"),
            "vendor/computer-use-mcp-server/src",
        ),
    ],
    hiddenimports=[
        "mcp.client.stdio",
        "mcp.types",
        "pystray._win32",
        "waitress",
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=["tkinter", "rumps"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="Lumen AI Chat",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=os.getenv("LUMEN_BUILD_CONSOLE", "") == "1",
    icon=str(ICON),
    version=str(VERSION_INFO),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="Lumen AI Chat",
)
