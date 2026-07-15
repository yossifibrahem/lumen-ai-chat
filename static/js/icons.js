// Public icon API used by the app.

import { DEFAULT_ICONS } from './icons/default.js';

export const ICONS = Object.freeze(Object.fromEntries(
  Object.entries(DEFAULT_ICONS).map(([key, markup]) => [
    key,
    `<span class="app-icon" aria-hidden="true">${markup}</span>`,
  ]),
));

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
// its innerHTML to the matching icon entry.
export function initIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const key = el.dataset.icon;
    const markup = ICONS[key];
    if (markup !== undefined) el.innerHTML = markup;
  });
}
