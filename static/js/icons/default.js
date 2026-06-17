// Global/default icon pack.
// All themes inherit these icons unless they provide a small override pack.

import { icon, smallIcon, ICON_BODIES } from './svg.js';

export const DEFAULT_ICONS = Object.freeze({
  // ── Avatars ────────────────────────────────────────────────────────────────
  user: icon('<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M9 8h.01M15 8h.01"/>'),
  ai: icon('<rect x="4" y="6" width="16" height="13" rx="4"/><path d="M9 11h.01M15 11h.01M9.5 15h5"/><path d="M12 6V3"/><path d="M9.5 3h5"/>'),

  // ── Actions ────────────────────────────────────────────────────────────────
  check: icon('<polyline points="20 6 9 17 4 12"/>', 'stroke-width="2.5"'),
  close: icon(ICON_BODIES.x, 'stroke-width="2.5"'),
  moreVertical: icon('<circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>', 'fill="currentColor" stroke="none"'),
  trash: icon('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>'),
  copy: icon('<rect x="8" y="8" width="12" height="12" rx="3"/><rect x="4" y="4" width="12" height="12" rx="3"/>'),
  download: icon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
  edit: icon(ICON_BODIES.pen),
  refresh: icon('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>'),

  // ── Navigation / chrome ────────────────────────────────────────────────────
  chevronLeft: icon('<polyline points="15 18 9 12 15 6"/>', 'width="10" height="10" stroke-width="2.5"'),
  chevronRight: icon('<polyline points="9 18 15 12 9 6"/>', 'width="10" height="10" stroke-width="2.5"'),
  chevronDown: icon('<polyline points="6 9 12 15 18 9"/>', 'width="10" height="10" stroke-width="2.5"'),
  menu: icon('<path d="M4 7h16M4 12h16M4 17h16"/>', 'stroke-width="2.5"'),
  settings: icon('<path d="M4 7h16M4 17h16"/><rect x="7" y="4" width="4" height="6"/><rect x="13" y="14" width="4" height="6"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.6"'),

  // ── Brand / logo ───────────────────────────────────────────────────────────
  logo: icon('<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8.5 10h.01M15.5 10h.01M9 15h6"/><path d="M12 4V2"/>'),

  // ── Input toolbar ──────────────────────────────────────────────────────────
  send: icon('<path d="M4 5l16 7-16 7 3-7-3-7z"/><path d="M7 12h8"/>', 'stroke-width="2.2"'),
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>',
  mic: icon('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>'),
  file: icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'),

  // ── Conversation list ──────────────────────────────────────────────────────
  chat: icon('<path d="M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-5l-5 4v-4a3 3 0 0 1-3-3V5z"/><path d="M8 7h8M8 11h5"/>'),
  search: icon('<circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/>', 'stroke-width="2.2"'),

  // ── Decorative / small ─────────────────────────────────────────────────────
  bulb: icon('<path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3 6l-1 2H9l-1-2C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z"/>', 'width="14" height="14"'),
  layers: icon('<polygon points="12 2 22 8.5 12 15 2 8.5"/><polyline points="2 13 12 19.5 22 13"/><polyline points="2 17.5 12 24 22 17.5"/>', 'width="14" height="14"'),

  // ── Suggestion chip icons (sized by CSS) ───────────────────────────────────
  chipCode: icon('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>'),
  chipPencil: icon('<path d="M5 17v2h2L19 7l-2-2L5 17z"/><path d="M14 6l4 4"/>'),
  chipInfo: icon('<rect x="5" y="4" width="14" height="16" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
  chipBox: icon('<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 9h8M8 13h5"/>'),
  chipHelp: icon('<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 9h6M9 13h3M14 13h1M9 17h6"/>'),

  // ── Tab icons (modal navigation) ──────────────────────────────────────────
  tabApi: smallIcon('<rect x="1" y="4.5" width="14" height="8.5" rx="2"/><path d="M5.5 4.5V3.5a2.5 2.5 0 0 1 5 0v1"/><circle cx="8" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>'),
  tabChat: smallIcon('<path d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>'),
  tabAppearance: smallIcon('<circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42"/>'),
  tabMcp: smallIcon('<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><path d="M11.5 9v3M9 11.5h3"/>'),
  toolDefault: smallIcon('<path d="M13 2L3 6l4 2 2 4 4-10z"/>', 'width="14" height="14"'),
  tabContainers: smallIcon('<path d="M8 1L1 4.5v7L8 15l7-3.5v-7L8 1z"/><path d="M1 4.5l7 3.5 7-3.5"/><path d="M8 8v7"/>'),

  // ── API key visibility toggle ──────────────────────────────────────────────
  eyeShow: smallIcon('<path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/>', 'width="14" height="14"'),
  eyeHide: smallIcon('<path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/><line x1="2" y1="2" x2="14" y2="14"/>', 'width="14" height="14"'),

  // ── Sync / fetch (used for Fetch Models and Reload Tools buttons) ──────────
  syncIcon: smallIcon('<path d="M14 8A6 6 0 1 1 9.7 2.5"/><path d="M14 2v4h-4"/>'),

  // ── MCP server icons (used in tool strips & the per-server icon picker) ────
  mcpWebSearch: icon('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', 'width="14" height="14"'),
  mcpBash: icon('<rect x="1" y="2" width="22" height="20" rx="2"/><polyline points="7 9 11 13 7 17"/><line x1="13" y1="17" x2="19" y2="17"/>', 'width="14" height="14"'),
  mcpFileSystem: icon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>', 'width="14" height="14"'),
  mcpMemory: icon('<rect x="4" y="4" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>', 'width="14" height="14"'),
  mcpDatabase: icon('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>', 'width="14" height="14"'),
  mcpGit: icon('<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>', 'width="14" height="14"'),
  mcpFile: icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', 'width="14" height="14"'),
  mcpPencil: icon('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>', 'width="14" height="14"'),
  mcpLink: icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', 'width="14" height="14"'),
  mcpEye: icon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', 'width="14" height="14"'),
});
