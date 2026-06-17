// Single source of truth for every icon in the app.
// JS files import ICONS directly; HTML elements use data-icon="key" and
// are hydrated at boot by calling initIcons().

const icon = (body, attrs = '') =>
  `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" shape-rendering="crispEdges">${body}</svg>`;

// Shared SVG bodies reused by multiple icons to avoid duplicate paths.
const _xBody   = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
const _penBody = '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>';

export const ICONS = {
  // ── Avatars ────────────────────────────────────────────────────────────────
  user: icon('<rect x="7" y="4" width="10" height="10"/><path d="M5 22v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3"/><path d="M10 8h.01M14 8h.01"/>'),
  ai:   icon('<rect x="4" y="5" width="16" height="14"/><path d="M8 9h2M14 9h2M9 14h6"/><path d="M12 5V2M9 2h6"/>'),

  // ── Actions ────────────────────────────────────────────────────────────────
  check:   icon('<polyline points="20 6 9 17 4 12"/>', 'stroke-width="2.5"'),
  close:   icon(_xBody, 'stroke-width="2.5"'),
  moreVertical: icon('<circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>', 'fill="currentColor" stroke="none"'),
  trash:   icon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'),
  copy:    icon('<rect x="9" y="9" width="14" height="14" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  download: icon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
  edit:    icon(_penBody),
  refresh: icon('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>'),

  // ── Navigation / chrome ────────────────────────────────────────────────────
  chevronLeft:  icon('<polyline points="15 18 9 12 15 6"/>',   'width="10" height="10" stroke-width="2.5"'),
  chevronRight: icon('<polyline points="9 18 15 12 9 6"/>',   'width="10" height="10" stroke-width="2.5"'),
  chevronDown:  icon('<polyline points="6 9 12 15 18 9"/>',   'width="10" height="10" stroke-width="2.5"'),
  menu:         icon('<rect x="3" y="4" width="18" height="16"/><path d="M9 4v16M5 8h2M5 12h2M5 16h2"/>'),
  settings:     icon('<path d="M4 7h16M4 17h16"/><rect x="7" y="4" width="4" height="6"/><rect x="13" y="14" width="4" height="6"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.6"'),

  // ── Brand / logo ───────────────────────────────────────────────────────────
  logo: icon('<path d="M4 4h16v16H4z"/><path d="M8 9h2v2H8zM14 9h2v2h-2zM9 15h6"/>'),

  // ── Input toolbar ──────────────────────────────────────────────────────────
  send:      icon('<path d="M4 4l16 8-16 8v-6l8-2-8-2V4z"/>', 'stroke-width="2.2"'),
  stop: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  mic:       icon('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>'),
  file:      icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'),

  // ── Conversation list ──────────────────────────────────────────────────────
  chat: icon('<path d="M4 4h16v12H9l-5 4V4z"/><path d="M8 8h8M8 12h6"/>'),
  search: icon('<rect x="4" y="4" width="11" height="11"/><path d="M15 15l5 5"/>', 'stroke-width="2.2"'),

  // ── Decorative / small ─────────────────────────────────────────────────────
  bulb:   icon('<path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3 6l-1 2H9l-1-2C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z"/>', 'width="14" height="14"'),
  layers: icon('<polygon points="12 2 22 8.5 12 15 2 8.5"/><polyline points="2 13 12 19.5 22 13"/><polyline points="2 17.5 12 24 22 17.5"/>', 'width="14" height="14"'),

  // ── Suggestion chip icons (sized by CSS) ───────────────────────────────────
  chipCode:    icon('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>'),
  chipPencil:  icon('<path d="M5 17v2h2L19 7l-2-2L5 17z"/><path d="M14 6l4 4"/>'),
  chipInfo:    icon('<rect x="5" y="4" width="14" height="16"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
  chipBox:     icon('<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>'),
  chipHelp:    icon('<path d="M5 5h14v14H5z"/><path d="M9 9h6M9 13h3M14 13h1M9 17h6"/>'),


  // ── Tab icons (modal navigation) ──────────────────────────────────────────
  tabApi: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="1" y="4.5" width="14" height="8.5" rx="2"/><path d="M5.5 4.5V3.5a2.5 2.5 0 0 1 5 0v1"/><circle cx="8" cy="8.5" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  tabChat: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>`,
  tabAppearance: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42"/></svg>`,
  tabMcp: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><path d="M11.5 9v3M9 11.5h3"/></svg>`,
  toolDefault: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 6l4 2 2 4 4-10z"/></svg>`,
  tabContainers: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1L1 4.5v7L8 15l7-3.5v-7L8 1z"/><path d="M1 4.5l7 3.5 7-3.5"/><path d="M8 8v7"/></svg>`,

  // ── API key visibility toggle ──────────────────────────────────────────────
  eyeShow: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/></svg>`,
  eyeHide: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/><line x1="2" y1="2" x2="14" y2="14"/></svg>`,

  // ── Sync / fetch (used for Fetch Models and Reload Tools buttons) ──────────
  syncIcon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 8A6 6 0 1 1 9.7 2.5"/><path d="M14 2v4h-4"/></svg>`,

  // ── MCP server icons (used in tool strips & the per-server icon picker) ────
  mcpWebSearch:  icon('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', 'width="14" height="14"'),
  mcpBash:       icon('<rect x="1" y="2" width="22" height="20" rx="2"/><polyline points="7 9 11 13 7 17"/><line x1="13" y1="17" x2="19" y2="17"/>', 'width="14" height="14"'),
  mcpFileSystem: icon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>', 'width="14" height="14"'),
  mcpMemory:     icon('<rect x="4" y="4" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>', 'width="14" height="14"'),
  mcpDatabase:   icon('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>', 'width="14" height="14"'),
  mcpGit:        icon('<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>', 'width="14" height="14"'),
  mcpFile:       icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', 'width="14" height="14"'),
  mcpPencil:     icon('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>', 'width="14" height="14"'),
  mcpLink:       icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', 'width="14" height="14"'),
  mcpEye:        icon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', 'width="14" height="14"'),
};

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
export function initIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    const key = el.dataset.icon;
    if (ICONS[key] !== undefined) el.innerHTML = ICONS[key];
  });
}