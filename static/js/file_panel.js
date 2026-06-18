// Workspace file panel — browse files inside the per-chat /workspace.

import { api } from './api.js';
import { STORAGE_KEYS, state } from './state.js';
import { ICONS } from './icons.js';

import { applyMarkdown } from './markdown.js';
import { showToast } from './ui.js';
import { storage } from './storage.js';
import { escapeHtml, formatBytes, fileExtension as ext } from './format.js';

const PANEL_WIDTH_KEY = 'lumen_file_panel_width';
const MIN_PANEL_WIDTH = 280;
const DEFAULT_PANEL_WIDTH = 380;

let currentPath = '/workspace';
let selectedPath = null;
let isOpen = false;
let renderMode = 'render';   // 'render' | 'code'
let currentFileData = null;  // last loaded file payload, for re-rendering without re-fetch
let panelWidth = DEFAULT_PANEL_WIDTH;

// Resolved once in initFilePanel — these elements are stable for the page lifetime.
let els = {};

function maxPanelWidth() {
  return Math.max(MIN_PANEL_WIDTH, Math.min(Math.round(window.innerWidth * 0.72), 920));
}

function clampPanelWidth(width) {
  return Math.min(Math.max(width, MIN_PANEL_WIDTH), maxPanelWidth());
}

function applyPanelWidth(width) {
  if (!els.panel) return;
  panelWidth = clampPanelWidth(Number(width) || DEFAULT_PANEL_WIDTH);
  els.panel.style.setProperty('--file-panel-w', `${panelWidth}px`);
}

function loadSavedPanelWidth() {
  applyPanelWidth(Number(storage.get(PANEL_WIDTH_KEY)) || DEFAULT_PANEL_WIDTH);
}

function savePanelWidth(width) {
  applyPanelWidth(width);
  storage.set(PANEL_WIDTH_KEY, panelWidth);
}

function formatDate(seconds) {
  if (!seconds) return '';
  return new Date(seconds * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function languageFromName(name = '') {
  const map = {
    js: 'javascript', mjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', rs: 'rust', go: 'go', java: 'java', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp',
    cs: 'csharp', php: 'php', sh: 'bash', bash: 'bash', css: 'css', html: 'html', htm: 'html',
    json: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml', sql: 'sql', md: 'markdown', toml: 'toml',
  };
  return map[ext(name)] || '';
}

function isMarkdown(name = '') {
  return ['md', 'markdown'].includes(ext(name));
}

function isHtml(name = '') {
  return ['html', 'htm'].includes(ext(name));
}

function isRenderable(name = '') {
  return isMarkdown(name) || isHtml(name);
}

function sourceLines(content = '') {
  const text = String(content ?? '').replace(/\r\n?/g, '\n');
  const displayText = text.endsWith('\n') ? text.slice(0, -1) : text;
  return displayText.split('\n');
}

function renderCodePreview(root, content = '', language = '') {
  const lines = sourceLines(content);
  const lineDigits = Math.max(2, String(lines.length).length);
  const safeLanguage = String(language || '').replace(/[^\w#+.-]/g, '');
  const pre = document.createElement('pre');
  pre.className = 'file-preview-code-block';
  pre.style.setProperty('--line-number-ch', `${lineDigits}ch`);

  lines.forEach((line, index) => {
    const row = document.createElement('span');
    row.className = 'file-preview-code-line';

    const number = document.createElement('span');
    number.className = 'file-preview-line-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(index + 1);

    const code = document.createElement('code');
    if (safeLanguage) code.className = `language-${safeLanguage}`;
    code.textContent = line || '​';

    row.append(number, code);
    pre.appendChild(row);
  });

  root.appendChild(pre);
  pre.querySelectorAll('code').forEach(block => window.hljs?.highlightElement(block));
}

function isMissingWorkspacePath(error = '') {
  return ['Path not found', 'File not found', 'Path is not a file'].includes(error);
}

function setPanelOpen(open, { persist = true } = {}) {
  isOpen = open;
  if (persist) storage.set(STORAGE_KEYS.filePanelOpen, open);
  els.panel?.classList.toggle('open', open);
  els.toggle?.classList.toggle('active', open);

  if (open) {
    refreshFilePanel({ keepPreview: Boolean(selectedPath) }).catch(() => {});
  }
}

function setPreviewOpen(open) {
  els.panel?.classList.toggle('preview-open', open);
}

function updateToggleButton(name, mode) {
  if (!els.toggleRender) return;

  if (!isRenderable(name)) {
    els.toggleRender.hidden = true;
    return;
  }

  els.toggleRender.hidden = false;
  if (mode === 'render') {
    els.toggleRender.innerHTML = ICONS.eyeShow;
    els.toggleRender.title = 'View source';
    els.toggleRender.setAttribute('aria-label', 'View source');
    els.toggleRender.classList.add('active');
  } else {
    els.toggleRender.innerHTML = ICONS.eyeHide;
    els.toggleRender.title = 'Preview';
    els.toggleRender.setAttribute('aria-label', 'Preview');
    els.toggleRender.classList.remove('active');
  }
}

/**
 * Inject `<base target="_blank">` into an HTML string so that any links
 * inside the previewed document open in a new tab rather than navigating
 * the iframe (or, worse, the parent page).  If a <base> tag already exists
 * we leave it untouched so the author's intent is preserved.
 *
 * Also injects a small script that intercepts same-page hash-anchor clicks
 * (e.g. <a href="#section">) and handles them via scrollIntoView instead,
 * so they scroll within the preview rather than opening a new tab (which
 * is what `<base target="_blank">` would otherwise cause).
 *
 * Uses DOMParser so the browser's own HTML parser handles insertion correctly
 * regardless of document structure, casing, or encoding.
 */
function injectBaseTarget(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Leave the document untouched if it already controls its own base target.
  if (doc.querySelector('base')) return html;

  const base = doc.createElement('base');
  base.target = '_blank';
  base.rel = 'noopener noreferrer';
  doc.head.prepend(base);

  // Intercept hash-only links so they scroll within the iframe instead of
  // opening a new tab (the default behaviour imposed by <base target="_blank">).
  const script = doc.createElement('script');
  script.textContent = `
document.addEventListener('click', function(e) {
  var a = e.target.closest('a[href]');
  if (!a) return;
  var href = a.getAttribute('href');
  if (!href || href[0] !== '#') return;
  e.preventDefault();
  var id = href.slice(1);
  var target = id ? document.getElementById(id) || document.querySelector('[name="' + id + '"]') : document.documentElement;
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth' });
}, true);`;
  doc.head.prepend(script);

  return doc.documentElement.outerHTML;
}

function renderContent(data, mode) {
  els.body.innerHTML = '';

  if (isHtml(data.name)) {
    if (mode === 'render') {
      const iframe = document.createElement('iframe');
      iframe.className = 'file-preview-iframe';
      // allow-scripts: needed for JS in previewed HTML.
      // allow-popups: required for target="_blank" links to actually open a new tab;
      //   without it the browser silently blocks window.open and <a target="_blank">.
      // allow-popups-to-escape-sandbox: lets popup tabs behave as normal browser tabs
      //   rather than inheriting the iframe's sandbox restrictions.
      // allow-same-origin is intentionally omitted: when present, clicking a
      // link to localhost (or any same-origin URL) navigates the iframe to the
      // full app, rendering a duplicate of the UI inside the file panel.
      // Without allow-same-origin the iframe runs in a unique opaque origin so
      // same-origin navigation is blocked by the browser's sandbox policy.
      iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
      // Inject a <base target="_blank"> so all links open in a new tab
      // rather than navigating the iframe.
      const safeContent = injectBaseTarget(data.content || '');
      iframe.srcdoc = safeContent;
      els.body.appendChild(iframe);
    } else {
      const preview = document.createElement('div');
      preview.className = 'file-preview-content msg-content file-preview-code';
      els.body.appendChild(preview);
      renderCodePreview(preview, data.content || '', 'html');
    }
  } else if (isMarkdown(data.name)) {
    const preview = document.createElement('div');
    preview.className = `file-preview-content msg-content${mode === 'render' ? '' : ' file-preview-code'}`;
    els.body.appendChild(preview);
    if (mode === 'render') {
      applyMarkdown(preview, data.content || '', { copyCodeButtons: false });
    } else {
      renderCodePreview(preview, data.content || '', 'markdown');
    }
  } else {
    const language = languageFromName(data.name);
    const preview = document.createElement('div');
    preview.className = 'file-preview-content msg-content file-preview-code';
    els.body.appendChild(preview);
    renderCodePreview(preview, data.content || '', language);
  }
}


function resetPreview() {
  selectedPath = null;
  currentFileData = null;
  renderMode = 'render';
  els.title.textContent = 'Preview';
  els.body.innerHTML = '';
  els.copy.disabled = true;
  els.copy.removeAttribute('data-content');
  els.download.disabled = true;
  els.download.removeAttribute('data-path');
  if (els.toggleRender) els.toggleRender.hidden = true;
}

function closePreview() {
  resetPreview();
  setPreviewOpen(false);
}

function setEmptyPreview(message = 'Select a file to preview it here.') {
  resetPreview();
  els.body.innerHTML = `<div class="file-panel-empty">${escapeHtml(message)}</div>`;
}

function renderList(payload) {
  els.path.textContent = payload.path || currentPath;
  els.list.innerHTML = '';

  if (payload.parent) {
    els.list.appendChild(fileRow({ name: '..', path: payload.parent, type: 'directory', size: null }, true));
  }

  if (!payload.entries?.length && !payload.parent) {
    els.list.innerHTML = '<div class="file-panel-empty">No files yet. Tool output and uploads will appear here.</div>';
    return;
  }

  payload.entries.forEach(entry => els.list.appendChild(fileRow(entry)));
  if (payload.truncated) {
    const note = document.createElement('div');
    note.className = 'file-panel-note';
    note.textContent = payload.limit ? `Showing the first ${payload.limit} entries.` : 'Showing a partial list.';
    els.list.appendChild(note);
  }
}

function fileRow(entry, isParent = false) {
  const row = document.createElement('button');
  row.className = `file-row ${entry.type === 'directory' ? 'is-dir' : 'is-file'}${entry.path === selectedPath ? ' active' : ''}`;
  row.title = entry.path;
  row.innerHTML = `
    <span class="file-row-icon">${entry.type === 'directory' ? ICONS.mcpFileSystem : ICONS.file}</span>
    <span class="file-row-main">
      <span class="file-row-name">${escapeHtml(entry.name)}</span>
      <span class="file-row-sub">${entry.type === 'directory' ? (isParent ? 'Parent folder' : 'Folder') : formatBytes(entry.size)}</span>
    </span>`;
  row.addEventListener('click', () => {
    if (entry.type === 'directory') loadFileList(entry.path);
    else loadFilePreview(entry.path);
  });
  return row;
}

async function loadFileList(path = currentPath, { fallbackToRoot = true } = {}) {
  if (!state.convId) {
    currentPath = '/workspace';
    els.list.innerHTML = '<div class="file-panel-empty">Start or open a chat to browse its workspace.</div>';
    setEmptyPreview('Workspace files will appear after a chat exists.');
    setPreviewOpen(false);
    return;
  }

  currentPath = path || '/workspace';
  if (!els.list.children.length) {
    els.list.innerHTML = '<div class="file-panel-empty">Loading files…</div>';
  }
  const payload = await api.get(`/api/conversations/${encodeURIComponent(state.convId)}/files?path=${encodeURIComponent(currentPath)}`);
  if (payload.error) {
    if (payload.error === 'Path not found' && fallbackToRoot && currentPath !== '/workspace') {
      currentPath = '/workspace';
      return loadFileList('/workspace', { fallbackToRoot: false });
    }
    els.list.innerHTML = `<div class="file-panel-empty">${escapeHtml(payload.error)}</div>`;
    return false;
  }
  currentPath = payload.path || currentPath;
  renderList(payload);
  return true;
}

async function loadFilePreview(path) {
  if (!state.convId || !path) return;
  selectedPath = path;
  setPreviewOpen(true);

  if (!els.body.children.length) {
    els.body.innerHTML = '<div class="file-panel-empty">Loading preview…</div>';
  }
  els.copy.disabled = true;
  els.copy.removeAttribute('data-content');
  els.download.disabled = true;
  els.download.removeAttribute('data-path');

  const data = await api.get(`/api/conversations/${encodeURIComponent(state.convId)}/files/content?path=${encodeURIComponent(path)}`);
  if (data.error) {
    if (isMissingWorkspacePath(data.error)) {
      closePreview();
      await loadFileList(currentPath);
      showToast('Previewed file is no longer available');
      return false;
    }
    setEmptyPreview(data.error);
    setPreviewOpen(true);
    return false;
  }

  els.title.textContent = data.name || 'File';
  els.download.disabled = false;
  els.download.dataset.path = data.path;

  if (!data.previewable) {
    els.body.innerHTML = `
      <div class="file-panel-empty">
        This file cannot be previewed as text.<br />
        <span>Use Download to save it.</span>
      </div>`;
    return true;
  }

  els.copy.disabled = false;
  els.copy.dataset.content = data.content || '';

  currentFileData = data;
  renderMode = 'render';
  updateToggleButton(data.name, renderMode);
  renderContent(data, renderMode);
  return true;
}

function initPanelResize() {
  if (!els.panel || !els.resizer) return;

  loadSavedPanelWidth();
  window.addEventListener('resize', () => applyPanelWidth(panelWidth));

  els.resizer.addEventListener('pointerdown', event => {
    if (window.innerWidth <= 1024) return;
    event.preventDefault();
    els.resizer.setPointerCapture?.(event.pointerId);
    els.panel.classList.add('resizing');
    document.body.classList.add('file-panel-resizing');

    const onMove = moveEvent => {
      applyPanelWidth(window.innerWidth - moveEvent.clientX);
    };

    const onUp = upEvent => {
      els.resizer.releasePointerCapture?.(upEvent.pointerId);
      els.panel.classList.remove('resizing');
      document.body.classList.remove('file-panel-resizing');
      savePanelWidth(panelWidth);
      window.removeEventListener('pointermove', onMove);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  });
}

export async function refreshFilePanel({ keepPreview = true } = {}) {
  if (!els.panel || !isOpen) return;

  try {
    await loadFileList(currentPath);
    if (keepPreview && selectedPath && els.panel.classList.contains('preview-open')) {
      await loadFilePreview(selectedPath);
    }
  } catch (err) {
    console.warn('Could not refresh workspace files', err);
  }
}

export function resetFilePanel() {
  currentPath = '/workspace';
  closePreview();
  // Preserve the open/closed panel state; only reset path and preview for the new chat.
}


export function initFilePanel() {
  els = {
    panel:         document.getElementById('file-panel'),
    resizer:       document.getElementById('file-panel-resizer'),
    toggle:        document.getElementById('btn-toggle-files'),
    close:         document.getElementById('btn-close-files'),
    refresh:       document.getElementById('btn-refresh-files'),
    previewRefresh: document.getElementById('btn-refresh-files-preview'),
    previewClose:  document.getElementById('btn-close-files-preview'),
    back:          document.getElementById('btn-back-files'),
    path:          document.getElementById('file-panel-path'),
    list:          document.getElementById('file-panel-list'),
    title:         document.getElementById('file-preview-title'),
    body:          document.getElementById('file-preview-body'),
    copy:          document.getElementById('btn-copy-file'),
    download:      document.getElementById('btn-download-file'),
    toggleRender:  document.getElementById('btn-toggle-render'),
  };

  initPanelResize();
  setPanelOpen(storage.get(STORAGE_KEYS.filePanelOpen, false), { persist: false });
  setEmptyPreview();
  setPreviewOpen(false);

  els.toggle?.addEventListener('click', () => setPanelOpen(!isOpen));
  const closePanel = () => setPanelOpen(false);
  const refreshPanel = () => refreshFilePanel({ keepPreview: Boolean(selectedPath) })
    .catch(err => showToast(err.message || 'Could not refresh files'));

  els.close?.addEventListener('click', closePanel);
  els.previewClose?.addEventListener('click', closePanel);
  els.back?.addEventListener('click', closePreview);
  els.refresh?.addEventListener('click', refreshPanel);
  els.previewRefresh?.addEventListener('click', refreshPanel);

  els.toggleRender?.addEventListener('click', () => {
    if (!currentFileData) return;
    renderMode = renderMode === 'render' ? 'code' : 'render';
    updateToggleButton(currentFileData.name, renderMode);
    renderContent(currentFileData, renderMode);
  });

  els.copy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.copy.dataset.content || '');
      showToast('Copied file content');
    } catch {
      showToast('Copy failed');
    }
  });

  els.download?.addEventListener('click', () => {
    if (!state.convId || !els.download.dataset.path) return;
    const link = document.createElement('a');
    link.href = `/api/conversations/${encodeURIComponent(state.convId)}/files/download?path=${encodeURIComponent(els.download.dataset.path)}`;
    link.download = '';
    link.click();
  });

  document.addEventListener('lumen:open-workspace-file', e => {
    const path = e.detail?.path;
    if (!path) return;
    setPanelOpen(true);
    loadFilePreview(path).catch(() => {});
  });
}