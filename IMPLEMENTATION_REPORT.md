# Lumen AI Chat — macOS Installable Application Implementation Report

**Report date:** 5 August 2026

**Review scope:** Current local working tree in `flask-chatbot-ui`

**Target release:** `0.1.0-alpha.1`

**Target platform:** Apple Silicon, macOS 14 or newer

**Current source version:** `0.1.0-dev`

## 1. Executive summary

Lumen has been converted from a developer-run Flask project into a packaged macOS menu-bar application that normal users can install from a DMG. The application contains Python, Flask, Waitress, the browser assets, and all other backend dependencies. It starts a local server on `127.0.0.1:38492` and opens the existing chat interface in the user's default browser.

Docker Desktop is the only external runtime required from the user. Lumen does not download a prebuilt Lumen image from GHCR or another application registry. On first use, the setup screen asks the user to install Lumen Tools. Docker then builds the local `lumen-sandbox` image from a Dockerfile and pinned MCP source bundled inside the `.app`. The build starts from the official `ubuntu:24.04` image, installs Node.js inside Ubuntu, compiles the computer-use MCP server inside that same image, and keeps only its compiled output and runtime dependencies.

The built-in computer-use server is registered internally as `agent_tools`. Users cannot remove or replace its command through MCP JSON, and it is not shown in the MCP JSON textarea. Its discovered tools continue to appear in the regular tool UI with their icons, enable/disable controls, and approval/auto-approval controls.

All GHCR delivery code and all configuration migration code were removed in the final cleanup. Existing configuration files are read without automatic rewriting, migration, or backup creation.

## 2. Final product direction

The final architecture is:

```text
Lumen AI Chat.app
├── bundled Python runtime and Python dependencies
├── rumps menu-bar launcher
├── Waitress + Flask at http://127.0.0.1:38492
├── existing templates and static browser UI
├── Dockerfile.sandbox
└── pinned computer-use MCP source
        │
        └── first-run local Docker build
                ├── pull official ubuntu:24.04 base
                ├── install Node.js 22 and sandbox utilities inside Ubuntu
                ├── npm ci and TypeScript compilation inside Ubuntu
                └── create local lumen-sandbox image
                        │
                        └── per-chat or per-folder containers
                                ├── /workspace host mount
                                ├── /memory.md host mount
                                └── agent_tools MCP over docker exec stdio
```

The following approaches are intentionally not part of the final design:

- No Electron application and no native chat window.
- No Python, Node.js, npm, Git, or source checkout required on the user's Mac.
- No GHCR image pull, registry authentication, or prebuilt Lumen sandbox delivery.
- No automatic migration of earlier image names or MCP configurations.
- No background updater or App Store installation.
- No Intel macOS or Windows installer in this release.

## 3. Desktop runtime and launcher

### 3.1 Frozen application

The desktop build uses PyInstaller in `onedir` mode. The `.app` contains:

- Python 3.12 runtime.
- Flask and the existing Lumen backend.
- Waitress as the packaged production WSGI server.
- `rumps` for the menu-bar process and native alerts.
- MCP and OpenAI Python dependencies.
- Flask `templates/` and `static/` assets.
- `Dockerfile.sandbox` and its restricted Docker build context.
- The pinned computer-use MCP `package.json`, lockfile, TypeScript configuration, and source.
- Generated build metadata and the Lumen icon.

The packaged runtime resolves resources through `build_info.resource_root()`. This handles both source execution and PyInstaller's macOS `Contents/Frameworks`/`Contents/Resources` layout. The desktop smoke check verifies that critical Python imports and all bundled web/Docker/MCP resources are present.

### 3.2 Local web server

- Waitress listens only on `127.0.0.1`.
- The stable desktop port is `38492`.
- The stable port preserves browser `localStorage` across launches and app upgrades.
- Desktop localhost origins were added to the default CORS allowlist.
- Source development continues to use port `8080` unless configured otherwise.
- The `/health` response now contains:

```json
{
  "ok": true,
  "app": "lumen-ai-chat",
  "version": "<build version>"
}
```

The application identifier allows the launcher to distinguish an existing Lumen server from an unrelated process occupying the same port.

### 3.3 Single-instance and port handling

- A non-blocking file lock is held at `~/.lumen/desktop.lock`.
- Launching the application a second time reopens the running Lumen URL when the health identity matches.
- If another process owns port `38492`, Lumen displays a native, actionable startup error instead of attaching to it.
- If another Lumen process has the lock but has not become healthy yet, the user is told that Lumen is still starting.
- Port and lock-file overrides are available for isolated smoke testing.

### 3.4 Menu-bar behavior

The menu-bar application provides:

- **Open Lumen** — opens the browser UI.
- **Docker Status** — displays the current Docker/image readiness state in a native alert.
- **Open Logs** — opens `~/.lumen/logs` in Finder.
- **Quit Lumen** — shuts down Waitress, closes persistent MCP sessions, stops Lumen containers, releases the instance lock, and quits the menu-bar process.

The app is configured with `LSUIElement=true`, so it does not create a normal Dock application window.
The menu-bar status item uses the bundled Lumen SVG artwork rather than a text placeholder.

### 3.5 Logging

- Runtime logs are stored at `~/.lumen/logs/lumen.log`.
- Logs rotate at 5 MiB.
- Three rotated backups are retained.
- Startup and cleanup failures are logged without preventing a controlled application exit.
- Docker shutdown commands use bounded timeouts so an unresponsive daemon cannot indefinitely block Quit.

## 4. macOS packaging

### 4.1 Application metadata

- Product name: `Lumen AI Chat`.
- Bundle identifier: `com.lumen.chat`.
- Minimum macOS version: `14.0`.
- Architecture: Apple Silicon/ARM64.
- App mode: menu-bar accessory (`LSUIElement=true`).
- High-resolution rendering is enabled.
- The `.icns` application icon is generated from the existing `static/favicon.svg` artwork.
- `CFBundleShortVersionString` and `CFBundleVersion` are generated from release metadata; CI uses the GitHub run number as the monotonic bundle build number.

The build script also patches the PyInstaller executable's Mach-O deployment target to macOS 14, keeping the executable metadata consistent with `Info.plist`.

### 4.2 Signing and DMG creation

- The current alpha is ad-hoc signed when no signing identity is supplied.
- Nested binaries and the completed app bundle are verified with `codesign`.
- When a Developer ID identity is provided, the build enables hardened runtime signing and timestamps.
- The distribution disk image is compressed UDZO format.
- The DMG contains `Lumen AI Chat.app` and an `Applications` shortcut for drag-and-drop installation.
- A SHA-256 checksum file is generated beside the DMG.
- Optional notarization is already supported by the release workflow when Apple credentials and a signing identity are configured.

### 4.3 Current local artifact

| Item | Value |
|---|---|
| App bundle | `dist/Lumen AI Chat.app` |
| DMG | `dist/Lumen-AI-Chat-0.1.0-alpha.1-apple-silicon.dmg` |
| Checksum file | `dist/Lumen-AI-Chat-0.1.0-alpha.1-apple-silicon.dmg.sha256` |
| App size | approximately 51 MiB |
| DMG size | approximately 29 MiB |
| SHA-256 | `dccb910e6f0494d6003961cec2d22f1dd37dce85d157c0a0b3888bd64357faa0` |

## 5. Docker discovery and startup states

### 5.1 Central Docker CLI resolution

Every production Docker operation now goes through `docker_cli.py`. This is necessary because Finder-launched macOS apps do not inherit a normal interactive shell `PATH`.

Resolution order includes:

1. `LUMEN_DOCKER_PATH`, when explicitly configured.
2. A Docker executable discoverable on the process `PATH`.
3. `/usr/local/bin/docker`.
4. `/opt/homebrew/bin/docker`.
5. `/Applications/Docker.app/Contents/Resources/bin/docker`.
6. `~/.docker/bin/docker`.

Both normal Docker commands and MCP `docker exec` sessions use the resolved executable.

### 5.2 Requirement states

Startup can distinguish:

| State code | Meaning | UI action |
|---|---|---|
| `docker_unavailable` | Docker CLI is not installed or cannot be found | Retry after installing Docker Desktop |
| `docker_not_running` | Docker CLI exists but the daemon is unavailable or timed out | Start Docker or Retry |
| `docker_starting` | Docker Desktop launch was accepted | Poll until the daemon is ready |
| `sandbox_image_missing` | Local `lumen-sandbox` image does not exist | Install Lumen Tools |
| `sandbox_image_outdated` | Image version label does not match the application | Reinstall/rebuild Lumen Tools |
| `sandbox_image_build_failed` | The local Docker build failed | Review streamed diagnostics and retry |
| `ok` | Docker and the expected sandbox image are ready | Continue into Lumen |

Docker daemon probes have a five-second timeout so a stuck context cannot indefinitely block application startup.

### 5.3 Explicit Docker Desktop launch

- Docker Desktop is never opened automatically without a user action.
- `POST /api/startup/start-docker` invokes `/usr/bin/open -a Docker` on macOS.
- The setup screen polls readiness every 1.5 seconds after the user clicks **Start Docker**.
- It polls for up to 80 attempts and then leaves the user with retryable status information.

### 5.4 First-run tools installation

The setup page presents **Install Lumen Tools** when the image is missing or outdated. The browser sends a protected streaming POST with a short-lived, session-bound confirmation token. The server requires an exact same-loopback origin, permits only one build at a time, and terminates the Docker client if the stream is interrupted. It then runs:

```text
docker build --progress=plain \
  --build-arg LUMEN_SANDBOX_VERSION=<application version> \
  -f Dockerfile.sandbox \
  -t lumen-sandbox .
```

Build output is streamed into the setup page line by line. A successful build rechecks all requirements and enters the application. Failures return the last build output with a retry action.

There is no non-streaming/blocking build endpoint and no packaged build-control panel elsewhere in settings.

## 6. Sandbox image implementation

### 6.1 Base and compilation model

`Dockerfile.sandbox` now has one base image only:

```dockerfile
FROM ubuntu:24.04
```

Node.js 22 is installed inside Ubuntu through the NodeSource repository. It is used both to compile the bundled TypeScript MCP server and to run it. This replaces the earlier multi-stage `node:22-bookworm-slim` concept.

The MCP installation sequence is:

1. Copy the pinned package manifest, lockfile, TypeScript configuration, and `src/` directory into the image.
2. Run `npm ci` inside Ubuntu.
3. Run the TypeScript build.
4. Prune development dependencies.
5. Ensure the required MCP SDK and Express runtime packages are installed at fixed compatible versions.
6. Copy `dist`, production `node_modules`, and `package.json` to `/opt/lumen/mcp/computer-use`.
7. Remove temporary source/build files and the npm cache.

The fixed runtime entrypoint is:

```text
node /opt/lumen/mcp/computer-use/dist/index.js
```

TypeScript is not retained as an installed development dependency in the final runtime directory.

### 6.2 Bundled MCP source

- Repository: `https://github.com/yossifibrahem/computer-use-mcp-server.git`.
- Location: `vendor/computer-use-mcp-server`.
- Git integration: submodule.
- Pinned commit: `8a96eab194f2d3bd6fe1881536e3789380043051`.
- The PyInstaller spec explicitly includes only the files needed to build the MCP server.
- `.dockerignore` rejects the entire application repository by default and allows only `Dockerfile.sandbox` plus the required MCP build files. This keeps the first-run Docker build context small and prevents unrelated user/application files from entering the image build.

### 6.3 Sandbox packages

The Ubuntu image includes Node.js plus common shell, file, network, build, archive, Python, and document-processing utilities. It also includes:

- A Python virtual environment under `/opt/venv`.
- `uv`.
- Python packages including Beautiful Soup, HTTPX, lxml, openpyxl, pandas, python-dotenv, and requests.
- The `mcp-remote` Node package.
- The built-in computer-use MCP server and production Node dependencies.

### 6.4 Runtime hardening and persistence

Per-chat/per-folder containers retain the existing resource and isolation settings:

- Workspace mounted at `/workspace`.
- Persistent memory mounted at `/memory.md` when available.
- Configurable memory and CPU limits.
- Configurable Docker network mode.
- All Linux capabilities dropped first, with only `CHOWN`, `DAC_OVERRIDE`, `SETUID`, and `SETGID` added back.
- `no-new-privileges` enabled.
- Container default command is `sleep infinity`; MCP processes are started through `docker exec` over stdio.

User workspaces and Lumen application data remain on the host under `~/.lumen`, not inside the replaceable image.

### 6.5 Image and container versioning

- The image is tagged locally as `lumen-sandbox` by default.
- The image contains `com.lumen.sandbox.version=<application version>`.
- Containers are labeled with both the configured image name and the application version.
- An image whose version does not match the application is reported as outdated and offered for rebuild.
- Existing containers are recreated if their image/version labels or concrete Docker image ID do not match the expected application build. Rebuilding the same tag/version therefore replaces running containers on their next use.
- Recreating containers does not remove the host-mounted conversation/folder workspace or `~/.lumen` data.
- Concurrent container-creation conflicts are only reused if their mounts, image/version markers, and concrete image ID match.

## 7. Built-in MCP configuration

### 7.1 Effective and editable configurations

MCP configuration now has two views:

- **Editable configuration:** custom servers read from and saved to `~/.lumen/mcp.json`.
- **Effective configuration:** a deep copy of the editable configuration plus the internal `agent_tools` server.

`GET /api/mcp/config` returns only editable custom servers. `POST /api/mcp/config` rejects any request containing the reserved `agent_tools` ID. Internal discovery and invocation use the effective configuration.

The built-in server configuration is:

```json
{
  "command": "node",
  "args": ["/opt/lumen/mcp/computer-use/dist/index.js"],
  "_lumen_builtin": true
}
```

The `_lumen_builtin` marker tells mount extraction that the container entrypoint is image-managed. Its `/opt/lumen/...` path must never be interpreted as a host path or mounted from the Mac.

### 7.2 Settings UI behavior

- `agent_tools` is omitted from the MCP JSON textarea.
- It is always restored into the server-side effective configuration.
- It cannot be overridden using the reserved ID.
- The four discovered tools still appear in the tool settings UI:
  - `view`
  - `create_file`
  - `str_replace`
  - `bash_tool`
- Existing tool icons and per-tool enable controls remain available.
- Existing server/tool approval and auto-approval controls remain available.
- Default behavior remains enabled with automatic approval off.
- Cached tool definitions render immediately but are always refreshed in the background, so newly bundled tools cannot remain hidden after an upgrade.

### 7.3 No migration behavior

The final implementation intentionally contains no MCP or image migration layer:

- No old image-name rewriting.
- No GHCR-to-local-image conversion.
- No removal of old entries from files.
- No automatic `.bak` files.
- No automatic rewriting of `mcp.json`.

If a disk `mcp.json` contains `agent_tools`, it is ignored in memory so it cannot override the built-in definition, but the file itself is not changed. Advanced configuration values, including a custom sandbox image, are also used verbatim.

## 8. API and browser setup interfaces

### 8.1 Added or expanded interfaces

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness plus Lumen application identity and build version |
| `GET` | `/api/startup/requirements` | Current Docker/image readiness state and next action |
| `POST` | `/api/startup/start-docker` | Explicitly launch Docker Desktop on macOS |
| `POST` | `/api/startup/build-sandbox-image/stream` | Stream the user-requested local image build over SSE after same-origin token validation |
| `GET` | `/api/mcp/config` | Return editable custom MCP servers only |
| `POST` | `/api/mcp/config` | Save custom MCP servers and reject the reserved built-in ID |

### 8.2 Removed interfaces

- Removed the obsolete blocking `POST /api/startup/build-sandbox-image` endpoint.
- Removed the unused `/api/advanced-settings` GET/POST aliases; `/api/container-settings` remains the active interface.
- Removed the obsolete aggregate `routes.py`; `app.py` registers the separate route blueprints directly.

## 9. Compatibility and supporting backend changes

- Upgraded the Python MCP dependency range from `mcp>=1.0.0` to `mcp>=2.0.0,<3`.
- Updated MCP session timeouts to the numeric-seconds form expected by MCP 2.x.
- Tool schema reading supports both `inputSchema` and `input_schema` field spellings.
- Tool-discovery failures now retain full exception tracebacks in logs.
- Waitress, rumps, and PyInstaller are isolated in `requirements-desktop.txt` so source-server dependencies remain clear.
- Flask templates/static paths now resolve correctly in both source and frozen modes.
- Stale-container cleanup waits until Docker and the expected image are ready.
- Normal exit and SIGTERM cleanup close MCP pools and stop Lumen containers.

## 10. Dead-code cleanup

The final cleanup removed code that was no longer reachable or supported:

- Deleted `routes.py` after direct blueprint registration made it obsolete.
- Removed the blocking `runtime_requirements.build_sandbox_image()` implementation.
- Removed unused advanced-settings route aliases.
- Removed the unused `store._rebuild_index()` helper.
- Removed unused Python imports throughout the affected tests and services.
- Removed unused JavaScript `showStatus` export.
- Removed unused Markdown `codeFenceFor` and its helper.
- Removed unused MCP tool UI `getToolMetaText` export.
- Removed unused adapter `getMetaText` hooks and related helper code.
- Removed unused `registeredTools` adapter-registry export.
- Simplified `visibleToolArgs()` by removing its unused one-argument compatibility branch.
- Simplified test SSE helpers to accept the actual internal dictionary event format only.
- Removed stale comments and documentation referring to removed compatibility paths.
- Removed obsolete container resource constants after advanced configuration became the single runtime source.

Static audits found no remaining unused Python imports, unreferenced private top-level Python helpers, or single-reference JavaScript exports in the audited application code.

## 11. Release automation

`.github/workflows/release.yml` now defines a macOS alpha release workflow.

### 11.1 Triggers

- Manual workflow dispatch with a release version.
- Git tag pushes matching `v*`.

### 11.2 Sandbox verification job

- Runs on an Ubuntu ARM64 GitHub runner.
- Checks out submodules recursively.
- Builds the same `Dockerfile.sandbox` as `linux/arm64`.
- Uses GitHub Actions cache for build acceleration.
- Does not push the image to a registry.
- Verifies the MCP entrypoint and production dependencies.
- Verifies that TypeScript is absent from production dependencies.
- Runs all four MCP tools inside the built image.

### 11.3 macOS job

- Checks out submodules recursively.
- Installs Python 3.12 and desktop/test dependencies.
- Runs the Python test suite.
- Optionally imports a Developer ID certificate.
- Builds the Apple Silicon app and DMG.
- Runs frozen-app smoke mode.
- Optionally notarizes and staples the DMG.
- Uploads the DMG and SHA-256 as workflow artifacts.
- Attaches them to a GitHub Release for version tags.

The workflow is a release definition in the repository; it has not yet been proven by a completed remote GitHub Actions release run in this working tree.

## 12. Data locations and lifecycle

Existing data placement is preserved:

| Data | Location |
|---|---|
| Conversations and folders | `~/.lumen/...` |
| MCP custom configuration | `~/.lumen/mcp.json` |
| Advanced/container configuration | `~/.lumen/advanced_config.json` |
| Persistent model memory | `~/.lumen/memory.md` |
| Conversation/folder workspaces | `~/.lumen/containers/...` |
| Desktop logs | `~/.lumen/logs/...` |
| Desktop instance lock | `~/.lumen/desktop.lock` |

Replacing the `.app` during a manual upgrade does not delete this directory. Uninstalling the app also leaves data in place. Users must remove `~/.lumen` separately if they want to permanently delete their chats, settings, memory, and workspace files.

## 13. User installation and first-run flow

The intended non-developer flow is:

1. Install Docker Desktop.
2. Download the Apple Silicon DMG.
3. Open it and drag **Lumen AI Chat** into **Applications**.
4. Control-click **Lumen AI Chat**, choose **Open**, and approve the Gatekeeper warning for the ad-hoc-signed alpha.
5. Lumen starts in the menu bar and opens the setup page in the default browser.
6. If Docker is stopped, click **Start Docker** and wait for readiness.
7. Click **Install Lumen Tools**.
8. Docker downloads Ubuntu and required packages, then builds the bundled MCP server locally.
9. When setup completes, Lumen loads the chat UI.
10. Configure the selected OpenAI-compatible model provider in Settings.

Internet access is required for the first Docker build because Ubuntu, Node.js, apt, pip, and npm packages must be downloaded. The computer-use MCP source is bundled and is not cloned on the user's device.

## 14. Verification completed

### 14.1 Automated tests

- Full Python suite: **394 passed**.
- Focused cleanup suite: **119 passed**.
- Focused startup-security suite: **22 passed**.
- Python bytecode compilation completed successfully.
- JavaScript syntax checks completed successfully.
- `git diff --check` completed without whitespace errors.

Coverage added or updated includes:

- Docker CLI discovery and Finder-compatible paths.
- Docker missing/stopped/timeout states.
- Explicit Docker Desktop start behavior.
- Missing and outdated sandbox image states.
- Streamed local Docker build command and results.
- Source/frozen resource lookup.
- Build metadata defaults.
- Desktop lock path and single-instance behavior.
- Lumen versus unrelated port collisions.
- Waitress shutdown behavior.
- Frozen smoke mode and bundled-resource validation.
- Container image/version labels and recreation.
- Built-in MCP effective/editable configuration separation.
- Reserved-ID override rejection.
- MCP schema compatibility.
- Image-managed built-in mount handling.

### 14.2 Docker and MCP verification

The local image was rebuilt from the single-stage Ubuntu Dockerfile and verified as Linux ARM64 with application version `0.1.0-dev`.

Verified behavior:

- Fixed MCP entrypoint exists.
- Node.js 22 runs inside the image.
- TypeScript development dependency is absent from the installed runtime directory.
- `view` discovered and executed.
- `create_file` discovered and wrote into the mounted workspace.
- `str_replace` discovered and modified the test file.
- `bash_tool` discovered and executed successfully.
- No host MCP source mount is required at runtime.
- The production npm dependency overlay reported zero known vulnerabilities at build time.

### 14.3 Packaged application verification

- Fresh application and DMG build completed.
- Frozen application started and stopped successfully in isolated smoke mode.
- Flask templates, static resources, Dockerfile, and MCP source were found inside the frozen app.
- The bundled Dockerfile exactly matched the source Dockerfile.
- The bundled Dockerfile contained only `FROM ubuntu:24.04`.
- Bundle identifier, minimum macOS version, and `LSUIElement` values were verified.
- Deep `codesign` verification passed.
- `hdiutil verify` reported a valid DMG checksum.
- Generated SHA-256 file matched the DMG.

## 15. Documentation completed

`README.md` and `devs.md` now document:

- The browser-based menu-bar desktop direction.
- Docker Desktop as the only user-installed runtime.
- First-run local Ubuntu image build.
- Bundled and pinned computer-use MCP source.
- Hidden built-in MCP JSON definition with visible tool controls.
- macOS installation and Gatekeeper steps.
- Manual app upgrades and persistent data behavior.
- Uninstall behavior.
- Developer source setup and submodule checkout.
- Local sandbox build and MCP smoke commands.
- DMG build, signing, and optional notarization.
- Release workflow behavior without registry publication.
- Troubleshooting for Docker, first-run builds, port collisions, logs, and data cleanup.

## 16. Repository change inventory

### 16.1 New files and directories

| Path | Purpose |
|---|---|
| `.github/workflows/release.yml` | Sandbox verification and macOS release workflow |
| `.gitmodules` | Pinned computer-use MCP submodule declaration |
| `build_info.py` | Shared version, image, port, labels, and frozen-resource metadata |
| `desktop_launcher.py` | Waitress/menu-bar/single-instance desktop runtime |
| `docker_cli.py` | Central Docker discovery and invocation |
| `requirements-desktop.txt` | Waitress, rumps, and PyInstaller dependencies |
| `packaging/build_macos.sh` | Icon, freeze, sign, DMG, and checksum build script |
| `packaging/lumen_macos.spec` | PyInstaller bundle definition and embedded resources |
| `packaging/build_metadata.json` | Default release metadata |
| `packaging/write_build_metadata.py` | Per-build metadata generation |
| `packaging/smoke_sandbox.py` | Host-driven Docker/MCP smoke test |
| `packaging/smoke_sandbox.mjs` | In-image MCP protocol smoke test |
| `tests/test_advanced_config.py` | Local image/default configuration behavior |
| `tests/test_build_info.py` | Build metadata and resource lookup |
| `tests/test_desktop_launcher.py` | Desktop lifecycle and single-instance behavior |
| `tests/test_docker_cli.py` | Docker resolution behavior |
| `vendor/computer-use-mcp-server` | MCP source submodule pinned at `8a96eab...` |

### 16.2 Major modified files

| Path | Main change |
|---|---|
| `Dockerfile.sandbox` | Single Ubuntu image; install Node; compile bundled MCP; prune development dependencies |
| `.dockerignore` | Restrict Docker context to the Dockerfile and required MCP source |
| `.gitignore` | Ignore local freeze/build outputs and auxiliary environments |
| `app.py` | Frozen assets, desktop CORS, startup gating, direct blueprints, shutdown integration |
| `advanced_config.py` | Build-metadata image default with values otherwise used verbatim |
| `container_service.py` | Central Docker CLI, image/version labels, safe recreation |
| `mcp_adapters.py` | Treat built-in server as image-managed and mount-free |
| `mcp_service.py` | Editable/effective config split and internal built-in definition |
| `mcp_session_pool.py` | MCP 2.x timeout compatibility |
| `routes_mcp.py` | Return editable configuration only |
| `routes_startup.py` | Health identity, Docker start, streamed local build only |
| `runtime_requirements.py` | Expanded readiness states and local build stream |
| `templates/startup_requirements.html` | Start Docker, install tools, progress, errors, and polling UI |
| `requirements.txt` | MCP 2.x dependency range |
| `README.md` | User installation, architecture, Docker, release, and lifecycle documentation |
| `devs.md` | Developer/release internals and troubleshooting |
| `tests/` | Updated compatibility tests and new desktop/Docker/MCP/version coverage |

### 16.3 Removed file

| Path | Reason |
|---|---|
| `routes.py` | Obsolete aggregate route module after direct blueprint registration |

### 16.4 Frontend cleanup files

Dead or compatibility-only JavaScript was removed from:

- `static/js/chat_send.js`
- `static/js/markdown.js`
- `static/js/mcp_tool_ui.js`
- `static/js/tool_adapters/agent_tools.js`
- `static/js/tool_adapters/exa.js`
- `static/js/tool_adapters/registry.js`
- `static/js/ui.js`

Small import/call-site updates were made in `static/js/app.js` and `static/js/mcp.js`.

## 17. Known limitations and work not yet completed

The following are intentionally incomplete or require a real release environment:

1. **Clean-account acceptance test:** The full installation flow has not yet been repeated on a separate clean macOS 14+ account with no Python development environment.
2. **Remote workflow execution:** The GitHub Actions workflow exists locally but has not yet completed a remote tagged release run from these uncommitted changes.
3. **Publication:** The current DMG has not been uploaded as a GitHub Release by this work.
4. **Developer ID/notarization:** The local artifact is ad-hoc signed and is not notarized. Users must use Control-click → Open/Open Anyway on first launch.
5. **Automatic updates:** Updates remain manual DMG replacements.
6. **Architectures/platforms:** Intel macOS and Windows installers are deferred.
7. **First-run duration and size:** Every user performs a local Docker build. The app download is small, but Docker must download Ubuntu and package dependencies and will consume substantially more disk space than the 29 MiB DMG.
8. **Network dependency:** First-run installation depends on Docker Hub, NodeSource, Ubuntu apt repositories, PyPI, and npm being reachable.
9. **No automatic config cleanup:** Because all migrations were intentionally removed, old custom image values remain active until the user changes them. A disk `agent_tools` entry is ignored but not deleted.
10. **Docker prerequisite:** The app diagnoses a missing Docker executable but does not install Docker Desktop itself.
11. **Browser UI:** Closing the browser tab does not quit Lumen; the menu-bar **Quit Lumen** action controls the application lifecycle.

## 18. Recommended review checklist

Before committing or publishing, review these decisions:

- Confirm local first-run Docker builds are preferred over a prebuilt registry image despite longer setup time.
- Confirm bundling the pinned MCP source in the `.app` is acceptable for source/licensing obligations.
- Confirm the image contains the desired Ubuntu, shell, Python, Node, network, and build utilities.
- Confirm the current container capability/network defaults match the intended security posture.
- Confirm `agent_tools` should be mandatory and non-removable.
- Confirm ignoring, rather than deleting, an `agent_tools` entry on disk is the desired no-migration behavior.
- Confirm stable port `38492` and bundle ID `com.lumen.chat` are final before public distribution.
- Confirm the current 51 MiB app/29 MiB DMG size is acceptable.
- Run the clean-account acceptance flow.
- Run the workflow manually before creating the first public tag.
- Add Developer ID and notarization secrets when a warning-free installation is required.

## 19. Current working-tree status

All described source changes are currently local and uncommitted. The DMG is a generated ignored artifact. No commit, push, GitHub Actions release, or GitHub Release publication is implied by this report.
