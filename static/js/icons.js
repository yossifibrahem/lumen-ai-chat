// Public icon API used by the app.
// Default icons are global. Themes can override a small subset through
// static/js/icons/themes/* without duplicating the whole icon pack.

import { DEFAULT_ICONS } from './icons/default.js';
import { THEME_ICON_OVERRIDES } from './icons/themes/index.js';

const ICON_KEY_ATTR = 'data-icon-key';

function activeUiTheme() {
  if (typeof document === 'undefined') return 'default';
  return document.documentElement.getAttribute('data-ui-theme') || 'default';
}

function escapeAttr(value) {
  return String(value).replace(/[&<>"]/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[ch]));
}

export function getIcon(key, theme = activeUiTheme()) {
  return THEME_ICON_OVERRIDES[theme]?.[key] || DEFAULT_ICONS[key];
}

export function renderIcon(key, theme = activeUiTheme()) {
  const markup = getIcon(key, theme);
  if (markup === undefined) return undefined;
  return `<span class="app-icon" ${ICON_KEY_ATTR}="${escapeAttr(key)}" aria-hidden="true">${markup}</span>`;
}

export function refreshIcons(root = document) {
  root.querySelectorAll(`.app-icon[${ICON_KEY_ATTR}]`).forEach(el => {
    const key = el.getAttribute(ICON_KEY_ATTR);
    const markup = getIcon(key);
    if (markup !== undefined) el.innerHTML = markup;
  });
}

// Keep the existing `ICONS.key` API, but resolve the active icon lazily.
// This means newly rendered buttons use the current theme immediately.
export const ICONS = new Proxy({}, {
  get(_target, key) {
    if (typeof key !== 'string') return undefined;
    return renderIcon(key);
  },
  has(_target, key) {
    return typeof key === 'string' && key in DEFAULT_ICONS;
  },
  ownKeys() {
    return Reflect.ownKeys(DEFAULT_ICONS);
  },
  getOwnPropertyDescriptor(_target, key) {
    if (typeof key !== 'string' || !(key in DEFAULT_ICONS)) return undefined;
    return { enumerable: true, configurable: true };
  },
});

// ── MCP icon picker options ────────────────────────────────────────────────────
// Ordered list of icons users can assign to MCP servers.
export const MCP_ICON_OPTIONS = [
  { key: 'mcpWebSearch',  label: 'Web Search' },
  { key: 'mcpBash',       label: 'Terminal'   },
  { key: 'mcpFileSystem', label: 'Files'      },
  { key: 'mcpFile',       label: 'File'       },
  { key: 'mcpPencil',     label: 'Pencil'     },
  { key: 'mcpLink',       label: 'Link'       },
  { key: 'mcpEye',        label: 'Eye'        },
  { key: 'mcpMemory',     label: 'Memory'     },
  { key: 'mcpDatabase',   label: 'Database'   },
  { key: 'mcpGit',        label: 'Git'        },
];

// ── HTML hydration ─────────────────────────────────────────────────────────────
// Call once at boot. Finds every [data-icon] element in the document and sets
// its innerHTML to the matching ICONS entry.
export function initIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const key = el.dataset.icon;
    const markup = renderIcon(key);
    if (markup !== undefined) el.innerHTML = markup;
  });
}
