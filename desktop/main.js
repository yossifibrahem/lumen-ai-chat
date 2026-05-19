const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;
let serverPort = null;

const DEFAULT_DESKTOP_PORT = 38492;
const DESKTOP_PORT = Number.parseInt(process.env.LUMEN_DESKTOP_PORT || String(DEFAULT_DESKTOP_PORT), 10);

// Keep Electron's browser storage in one stable location for both `npm run desktop`
// and packaged builds.  The app also uses a stable localhost port below so
// browser localStorage keeps the same origin across launches.
app.setName('Lumen AI Chat');
app.setPath('userData', path.join(app.getPath('appData'), 'Lumen AI Chat'));

function appRoot() {
  return app.isPackaged ? app.getAppPath() : path.resolve(__dirname, '..');
}

function appIconPath() {
  const root = appRoot();
  const assets = path.join(root, 'desktop', 'assets');

  if (process.platform === 'win32') {
    return path.join(assets, 'icon.ico');
  }
  return path.join(assets, 'icon.png');
}


function useCustomTitleBar() {
  return process.platform === 'win32' || process.platform === 'linux';
}

function desktopAssetPath(fileName) {
  return path.join(appRoot(), 'desktop', fileName);
}

function sendWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('lumen-window-state', {
    maximized: mainWindow.isMaximized(),
    fullscreen: mainWindow.isFullScreen(),
  });
}

async function installDesktopChrome() {
  if (!useCustomTitleBar() || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const cssPath = desktopAssetPath('titlebar.css');
  const jsPath = desktopAssetPath('titlebar.js');

  try {
    await mainWindow.webContents.insertCSS(fs.readFileSync(cssPath, 'utf8'));
    await mainWindow.webContents.executeJavaScript(fs.readFileSync(jsPath, 'utf8'));
  } catch (error) {
    console.error('[desktop] Failed to install custom title bar:', error);
  }
}

function bundledPython(root) {
  const candidates = process.platform === 'win32'
    ? [
        path.join(root, '.venv', 'Scripts', 'python.exe'),
        path.join(root, 'venv', 'Scripts', 'python.exe'),
      ]
    : [
        path.join(root, '.venv', 'bin', 'python3'),
        path.join(root, '.venv', 'bin', 'python'),
        path.join(root, 'venv', 'bin', 'python3'),
        path.join(root, 'venv', 'bin', 'python'),
      ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function pythonCommand(root) {
  return process.env.LUMEN_PYTHON || bundledPython(root) || (process.platform === 'win32' ? 'python' : 'python3');
}

function canUsePort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

async function desktopPort() {
  if (Number.isInteger(DESKTOP_PORT) && DESKTOP_PORT > 0 && await canUsePort(DESKTOP_PORT)) {
    return DESKTOP_PORT;
  }

  throw new Error(
    `Port ${Number.isInteger(DESKTOP_PORT) ? DESKTOP_PORT : DEFAULT_DESKTOP_PORT} is already in use. `
    + 'Close the other Lumen instance or set LUMEN_DESKTOP_PORT to a stable free port.'
  );
}

function waitForHealth(port, timeoutMs = 30000, getExitInfo = null) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      // If the server process already exited, fail immediately with its output.
      if (getExitInfo) {
        const exitInfo = getExitInfo();
        if (exitInfo) {
          reject(exitInfo);
          return;
        }
      }

      const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 1000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve();
          return;
        }
        retry();
      });

      req.on('error', retry);
      req.on('timeout', () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('The local Lumen server did not become ready within 30 seconds.'));
        return;
      }
      setTimeout(check, 250);
    };

    check();
  });
}

/**
 * Build a PATH string that includes common Docker installation locations.
 *
 * On macOS, GUI apps launched from the Dock or Finder inherit a minimal
 * environment that omits directories like /usr/local/bin and
 * /opt/homebrew/bin where Docker Desktop installs its CLI shim.  We
 * augment the inherited PATH so that `docker` is always findable even
 * when the app is not started from a terminal.
 */
function buildEnvPath() {
  const inherited = process.env.PATH || '';

  if (process.platform !== 'darwin') {
    return inherited;
  }

  // Common locations for Docker CLI on macOS:
  //   - /usr/local/bin  — Docker Desktop (Intel) and many Homebrew packages
  //   - /opt/homebrew/bin — Homebrew on Apple Silicon
  //   - /Applications/Docker.app/Contents/Resources/bin — Docker Desktop bundle
  //   - ~/.docker/bin — Docker Desktop credential helpers / scan plugin
  const macosCandidates = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    `${process.env.HOME || '/Users/Shared'}/.docker/bin`,
    '/Applications/Docker.app/Contents/Resources/bin',
  ];

  const existing = new Set(inherited.split(':').filter(Boolean));
  const extra = macosCandidates.filter((p) => !existing.has(p));

  if (extra.length === 0) {
    return inherited;
  }

  return inherited ? `${inherited}:${extra.join(':')}` : extra.join(':');
}

async function startFlaskServer() {
  const root = appRoot();
  const port = await desktopPort();
  const python = pythonCommand(root);
  const code = [
    'from app import create_app',
    `create_app().run(debug=False, host="127.0.0.1", port=${port}, threaded=True, use_reloader=False)`,
  ].join('; ');

  serverPort = port;

  // Collect stderr lines so we can surface them in the error dialog if Flask
  // crashes before /health becomes reachable.
  const stderrLines = [];
  let earlyExitError = null;

  serverProcess = spawn(python, ['-c', code], {
    cwd: root,
    env: {
      ...process.env,
      LUMEN_DESKTOP: '1',
      PYTHONUNBUFFERED: '1',
      // Override PATH so the Flask subprocess (and any child processes it
      // spawns, e.g. `docker`) can find binaries that the GUI-session
      // environment omits on macOS.
      PATH: buildEnvPath(),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  serverProcess.stdout.on('data', (data) => process.stdout.write(`[flask] ${data}`));
  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(`[flask] ${data}`);
    stderrLines.push(String(data));
  });

  serverProcess.on('exit', (exitCode, signal) => {
    // Capture early exit so waitForHealth can detect it immediately.
    if (!mainWindow || mainWindow.isDestroyed()) {
      const stderr = stderrLines.join('').trim();
      earlyExitError = buildExitError(python, root, exitCode, signal, stderr);
    }
    serverProcess = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('lumen-server-exit', { code: exitCode, signal });
    }
  });

  // Let waitForHealth detect process exits during startup polling.
  const getExitInfo = () => earlyExitError;

  try {
    await waitForHealth(port, 30000, getExitInfo);
  } catch (err) {
    // If we caught a structured Error with extra detail, rethrow it.
    // Otherwise, build a helpful error from whatever stderr we collected.
    if (err && err._lumenDetail) {
      throw err;
    }
    const stderr = stderrLines.join('').trim();
    throw buildExitError(python, root, null, null, stderr, err.message);
  }

  return `http://127.0.0.1:${port}`;
}

/**
 * Build a human-readable Error for a Flask startup failure.
 * Includes Python path, working directory, and captured stderr output.
 */
function buildExitError(python, root, exitCode, signal, stderr, timeoutMsg = null) {
  const lines = [];

  if (timeoutMsg) {
    lines.push(timeoutMsg);
  } else if (signal) {
    lines.push(`The Flask server was terminated by signal ${signal}.`);
  } else {
    lines.push(`The Flask server exited unexpectedly (exit code ${exitCode}).`);
  }

  lines.push('');
  lines.push(`Python: ${python}`);
  lines.push(`Working directory: ${root}`);

  if (stderr) {
    lines.push('');
    lines.push('Server output:');
    // Show last 30 lines so the dialog is readable.
    const outputLines = stderr.split('\n').filter(Boolean);
    const tail = outputLines.slice(-30).join('\n');
    lines.push(tail);
  } else {
    lines.push('');
    lines.push('No server output was captured.');
    lines.push('Make sure Python is installed and dependencies are available:');
    lines.push('  pip install -r requirements.txt');
  }

  const err = new Error(lines.join('\n'));
  err._lumenDetail = true;
  return err;
}

function createWindow(url) {
  Menu.setApplicationMenu(null);

  const customTitleBar = useCustomTitleBar();

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    title: 'Lumen AI Chat',
    show: false,
    frame: !customTitleBar,
    backgroundColor: '#0f172a',
    icon: appIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', async () => {
    await installDesktopChrome();
    sendWindowState();
  });
  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.on('enter-full-screen', sendWindowState);
  mainWindow.on('leave-full-screen', sendWindowState);

  mainWindow.loadURL(url);
}

async function boot() {
  try {
    const url = await startFlaskServer();
    createWindow(url);
  } catch (error) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Lumen AI Chat — startup failed',
      message: 'The desktop app could not start the local Flask server.',
      detail: error.message,
    });
    app.quit();
  }
}

function stopFlaskServer() {
  if (!serverProcess) {
    return;
  }
  const child = serverProcess;
  serverProcess = null;
  child.kill(process.platform === 'win32' ? undefined : 'SIGTERM');
}


ipcMain.handle('lumen-window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.handle('lumen-window-toggle-maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  sendWindowState();
});

ipcMain.handle('lumen-window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

app.whenReady().then(boot);

app.on('window-all-closed', () => {
  stopFlaskServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', stopFlaskServer);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverPort) {
    createWindow(`http://127.0.0.1:${serverPort}`);
  }
});