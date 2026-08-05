# Windows Packaging Lessons

## Purpose

This document records what was learned during the first Windows desktop packaging attempt. The implementation was reverted so a new approach can begin from the stable macOS/development baseline without carrying experimental changes into the main application.

The intended product remains:

- a consistent Lumen desktop experience on macOS and Windows;
- no prerequisite for normal users other than Docker Desktop and an internet connection;
- the computer-use MCP server source bundled with the application and compiled as part of the local sandbox image build;
- no separately installed Python, Node.js, MCP server, terminal, or development toolchain;
- platform-specific code only where native operating-system behavior requires it.

## Reverted attempt

The following commits were reverted locally on 6 August 2026:

- `059dc49` — `feat: add self-contained Windows desktop app`
- `b2ed385` — `fix: close Windows tray app after cleanup`

The attempt used PyInstaller `onedir`, Waitress, and `pystray` to produce a portable Windows ZIP. The rollback deliberately restores the tracked application to the state established by the macOS production commit `e768fed`.

## What worked

- A windowless Windows executable could run the existing Flask application through Waitress.
- The packaged application could include templates, static assets, the Dockerfile, dependency manifests, and the pinned MCP server source.
- The sandbox image could compile the bundled MCP server during the Docker image build. Users did not need Node.js or the MCP project installed on the host.
- Docker Desktop and the Docker CLI could be discovered from standard Windows installation locations even when the desktop process had a restricted `PATH`.
- Windows subprocess creation flags prevented Docker and MCP commands from repeatedly flashing terminal windows.
- The built-in MCP server could expose its expected tools from the packaged application after correcting windowless-process stderr handling.
- A portable ZIP and SHA-256 checksum could be generated successfully on an x64 Windows machine.

## Problems observed

### 1. Shutdown lifecycle

Selecting **Quit Lumen** could stop the local server while leaving the Windows process and tray icon alive for several minutes.

Verified contributing factors:

- `pystray` menu callbacks and its Windows message loop require careful thread ownership. Cleanup must not block the tray callback thread.
- Persistent MCP pools were closed sequentially. Each pool could wait for approximately the configured tool timeout, so total shutdown time could grow by minutes.
- Docker cleanup has its own bounded operations, but bounding only Docker was insufficient when MCP cleanup could still block.
- Removing the tray icon immediately hides useful evidence that cleanup is still running. The desired behavior is to keep the icon visible during normal cleanup, then remove it when cleanup completes.

A future implementation should define one application-wide shutdown deadline, request concurrent MCP cleanup, stop the local server, clean owned containers, release the instance lock, and only then stop the native tray loop. Windows may need a final process watchdog, but that watchdog should be isolated to the Windows adapter and should log an abnormal forced exit.

### 2. False sandbox-image installation prompt

The Windows package sometimes displayed **Lumen tools need to be installed** even though the local image already existed and its inputs had not changed.

Two distinct causes were identified:

- On the tested Docker Desktop installation, `docker image ls` showed `lumen-sandbox:latest`, `docker image inspect lumen-sandbox` reported `No such image`, and `docker image inspect lumen-sandbox:latest` succeeded. Docker image references should therefore be canonicalized explicitly before inspection and execution.
- Sandbox compatibility was tied to the desktop application version. That is a cross-platform design problem: a packaging-only release could unnecessarily invalidate the same Docker/MCP image on either Windows or macOS.

A future implementation should identify the sandbox by a stable content digest derived only from inputs that affect the image, such as:

- `.dockerignore`;
- `Dockerfile.sandbox`;
- MCP `package.json` and lockfile;
- MCP TypeScript configuration and source files.

The digest must be platform-independent, including normalization of Git checkout line endings. Desktop code, icons, documentation, and package version changes must not invalidate the sandbox. Actual Dockerfile, MCP source, or MCP dependency changes must invalidate it once.

Docker inspection errors should also be classified carefully. Only a confirmed missing or incompatible image should offer an image build. Transient daemon, permission, or inspection failures should offer Retry and retain diagnostic details.

### 3. Windowless subprocess behavior

Code that works in a terminal-backed development process can fail in a frozen GUI process because standard streams may be absent.

- Windows subprocesses need `CREATE_NO_WINDOW` or equivalent startup information to avoid console flashes.
- A windowed PyInstaller application can have `sys.stderr is None`. MCP subprocess code must receive a valid writable stderr target rather than blindly forwarding the parent stream.
- Long-lived handles used for subprocess logging must stay open for the lifetime of those subprocesses.

These concerns belong in a small Windows process adapter rather than being spread through application logic.

### 4. Packaging and repository hygiene

- The application does not use Electron. A root `package-lock.json` created by unrelated Electron tooling was not an application dependency and was safely removed during the attempt.
- The MCP server's own lockfile under `vendor/computer-use-mcp-server` is required and must remain bundled.
- Windows builds should use a dedicated virtual environment and generated `build/` and `dist/` outputs must remain ignored.
- The Windows package must be tested from the extracted distribution, not only from source or the PyInstaller work directory.
- A `onedir` package must be distributed as the complete directory/ZIP; copying only the executable is not sufficient.

## Recommended restart boundaries

Keep the existing application and macOS implementation unchanged as the behavioral reference. Introduce a thin platform layer with explicit contracts instead of adding operating-system branches throughout the application:

1. **Desktop host contract** — start/open the local server, expose native menu actions, and coordinate shutdown.
2. **Process runner contract** — resolve Docker and launch Docker/MCP subprocesses without visible consoles.
3. **Instance-lock contract** — use the existing macOS lock behavior and a native Windows equivalent.
4. **Sandbox identity contract** — validate an explicit image reference and a content-derived compatibility marker independent of the desktop version.
5. **Shutdown coordinator** — one shared, bounded backend cleanup sequence, with only the native tray-loop termination implemented per operating system.

Changes to core chat routes, conversation behavior, tool execution semantics, configuration formats, and the bundled MCP implementation should be avoided unless a failing packaged-app test proves they are necessary.

## Minimum validation for the next attempt

Before committing a new Windows implementation, verify all of the following from a clean extracted package:

1. Start with Docker Desktop already running and the sandbox image already present; no installation prompt should appear.
2. Rebuild only the desktop package; the existing image must still be accepted.
3. Change a sandbox input; exactly one image rebuild must be requested.
4. Start without Docker running; the UI should explain the state and start Docker only with user consent.
5. Discover and invoke both bundled and configured external MCP servers.
6. Confirm that no terminal windows flash during Docker or MCP operations.
7. Quit with zero, one, and multiple active MCP sessions; the tray icon should remain during cleanup and the process should exit within the documented deadline.
8. Confirm that no Lumen process, listening port, owned container, or stale instance lock remains after Quit.
9. Run the complete automated test suite on Windows and the macOS launcher contract tests.
10. Confirm that macOS packaging files and native behavior have no unintended diff.

## Evidence retained

During the reverted attempt, the final experimental package passed 416 tests with one skipped. A real packaged startup followed by the internal Quit path exited with code `0`, left zero Lumen processes, and completed in 8.66 seconds. These results demonstrate useful techniques, but they do not justify retaining the broader experimental source changes; the next implementation should reproduce the behavior through the narrower boundaries above.

## Rollback verification

After the Git reverts, the tracked repository content matched `e768fed` exactly. Running that restored macOS-era test suite on Windows collected 386 tests: 383 passed, one was skipped, and three failed because the baseline tests contain platform-specific path expectations:

- two container volume tests expect the host path with Windows backslashes, while Docker path normalization produces forward slashes;
- one Docker CLI test expects the macOS `/Applications/Docker.app/...` path even when executed on Windows.

These tests were intentionally not changed during the rollback. They should be addressed as explicit cross-platform contracts at the start of the next Windows effort, before implementation code is added.
