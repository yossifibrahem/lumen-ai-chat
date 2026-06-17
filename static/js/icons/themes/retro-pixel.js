// Retro Pixel icon pack.
// This pack intentionally overrides every default icon key so the retro theme
// never mixes smooth modern glyphs with chunky pixel controls.

import { pixelIcon, pixelSmallIcon } from '../svg.js';

export const RETRO_PIXEL_ICON_OVERRIDES = Object.freeze({
  // ── Avatars ────────────────────────────────────────────────────────────────
  user: pixelIcon('<path d="M8 4h8v8H8z"/><path d="M6 22v-5h3v-3h6v3h3v5"/><path d="M10 8h1M14 8h1"/>'),
  ai: pixelIcon('<path d="M4 6h16v12H4z"/><path d="M7 3h10v3H7z"/><path d="M12 3V1"/><path d="M8 10h2M14 10h2M9 14h6"/><path d="M2 10h2M20 10h2"/>'),

  // ── Actions ────────────────────────────────────────────────────────────────
  check: pixelIcon('<path d="M4 12h4v4h2v-2h2v-2h2v-2h2V8h2V6h2"/>', 'stroke-width="2.5"'),
  close: pixelIcon('<path d="M6 6h3v3h2v2h2V9h2V6h3v3h-3v2h-2v2h2v2h3v3h-3v-3h-2v-2h-2v2H9v3H6v-3h3v-2h2v-2H9V9H6z"/>'),
  moreVertical: pixelIcon('<path d="M10 3h4v4h-4zM10 10h4v4h-4zM10 17h4v4h-4z" fill="currentColor" stroke="none"/>'),
  trash: pixelIcon('<path d="M4 6h16"/><path d="M8 6V3h8v3"/><path d="M6 8h12v13H6z"/><path d="M10 11v7M14 11v7"/>'),
  copy: pixelIcon('<path d="M8 8h12v12H8z"/><path d="M4 4h12v4"/><path d="M4 4v12h4"/>'),
  download: pixelIcon('<path d="M5 18h14v3H5z"/><path d="M11 3h2v9h4l-5 5-5-5h4z"/>'),
  edit: pixelIcon('<path d="M5 16v4h4L20 9l-4-4L5 16z"/><path d="M14 7l3 3"/><path d="M4 22h16"/>'),
  refresh: pixelIcon('<path d="M19 5v6h-6"/><path d="M5 19v-6h6"/><path d="M18 11a6 6 0 0 0-10-4L5 10"/><path d="M6 13a6 6 0 0 0 10 4l3-3"/>'),

  // ── Navigation / chrome ────────────────────────────────────────────────────
  chevronLeft: pixelIcon('<path d="M15 5h-2v2h-2v2H9v2H7v2h2v2h2v2h2v2h2"/>', 'width="10" height="10" stroke-width="2.5"'),
  chevronRight: pixelIcon('<path d="M9 5h2v2h2v2h2v2h2v2h-2v2h-2v2h-2v2H9"/>', 'width="10" height="10" stroke-width="2.5"'),
  chevronDown: pixelIcon('<path d="M5 9h3v3h2v2h4v-2h2V9h3"/>', 'width="10" height="10" stroke-width="2.5"'),
  menu: pixelIcon('<path d="M4 6h16M4 12h16M4 18h16"/>', 'stroke-width="3"'),
  settings: pixelIcon('<path d="M4 6h7M15 6h5"/><path d="M11 4h4v4h-4z"/><path d="M4 18h5M13 18h7"/><path d="M9 16h4v4H9z"/>'),
  plus: pixelIcon('<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor" stroke="none"/>'),

  // ── Brand / logo ───────────────────────────────────────────────────────────
  logo: pixelIcon('<path d="M4 4h16v16H4z"/><path d="M7 2h10v2H7z"/><path d="M8 9h3v3H8zM13 9h3v3h-3z"/><path d="M9 15h6"/>'),

  // ── Input toolbar ──────────────────────────────────────────────────────────
  send: pixelIcon('<path d="M4 4v16l16-8L4 4z"/><path d="M7 10v4l7-2-7-2z"/>'),
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><rect x="6" y="6" width="12" height="12"/></svg>',
  mic: pixelIcon('<path d="M9 3h6v10H9z"/><path d="M5 10v3a7 7 0 0 0 14 0v-3"/><path d="M11 20h2v3h-2z"/><path d="M8 23h8"/>'),
  file: pixelIcon('<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h4"/><path d="M8 13h8M8 17h6"/>'),

  // ── Conversation list ──────────────────────────────────────────────────────
  chat: pixelIcon('<path d="M4 4h16v12H9l-5 4V4z"/><path d="M8 8h8M8 12h6"/>'),
  search: pixelIcon('<path d="M4 4h10v10H4z"/><path d="M14 14l6 6"/>', 'stroke-width="2.5"'),

  // ── Decorative / small ─────────────────────────────────────────────────────
  bulb: pixelIcon('<path d="M8 7h2V5h4v2h2v5h-2v3H10v-3H8z"/><path d="M9 18h6M10 21h4"/>', 'width="14" height="14"'),
  layers: pixelIcon('<path d="M12 3 21 8 12 13 3 8z"/><path d="M3 12 12 17 21 12"/><path d="M3 16 12 21 21 16"/>', 'width="14" height="14"'),

  // ── Suggestion chip icons ──────────────────────────────────────────────────
  chipCode: pixelIcon('<path d="M8 7H6v2H4v2H2v2h2v2h2v2h2"/><path d="M16 7h2v2h2v2h2v2h-2v2h-2v2h-2"/><path d="M14 4 10 20"/>'),
  chipPencil: pixelIcon('<path d="M5 16v4h4L20 9l-4-4L5 16z"/><path d="M14 7l3 3"/>'),
  chipInfo: pixelIcon('<path d="M5 4h14v16H5z"/><path d="M11 10h2v6h-2z"/><path d="M11 7h2v2h-2z"/>'),
  chipBox: pixelIcon('<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/>'),
  chipHelp: pixelIcon('<path d="M5 5h14v14H5z"/><path d="M9 9h2V7h4v2h2v3h-2v2h-2v2h-2v-3h2v-2h2V9h-4v2H9z"/><path d="M11 17h2v2h-2z"/>'),

  // ── Tab icons ──────────────────────────────────────────────────────────────
  tabApi: pixelSmallIcon('<path d="M2 5h12v8H2z"/><path d="M5 5V3h6v2"/><path d="M6 9h4"/>'),
  tabChat: pixelSmallIcon('<path d="M2 3h12v8H6l-4 3V3z"/><path d="M5 6h6M5 8h4"/>'),
  tabAppearance: pixelSmallIcon('<path d="M7 1h2v3H7zM7 12h2v3H7zM1 7h3v2H1zM12 7h3v2h-3z"/><path d="M6 6h4v4H6z"/>'),
  tabMcp: pixelSmallIcon('<path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2z"/><path d="M7 4h2M4 7v2M7 12h3v-5"/>'),
  toolDefault: pixelSmallIcon('<path d="M13 2 3 6l4 2 2 5z"/>', 'width="14" height="14"'),
  tabContainers: pixelSmallIcon('<path d="M8 1 14 4v8l-6 3-6-3V4z"/><path d="M2 4l6 3 6-3"/><path d="M8 7v8"/>'),

  // ── API key visibility toggle ──────────────────────────────────────────────
  eyeShow: pixelSmallIcon('<path d="M1 8h2V6h2V4h6v2h2v2h2v1h-2v2h-2v2H5v-2H3V9H1z"/><path d="M7 7h2v2H7z"/>', 'width="14" height="14"'),
  eyeHide: pixelSmallIcon('<path d="M1 8h2V6h2V4h6v2h2v2h2v1h-2v2h-1M10 13H5v-2H3V9H1"/><path d="M2 2l12 12"/>', 'width="14" height="14"'),

  // ── Sync / fetch ───────────────────────────────────────────────────────────
  syncIcon: pixelSmallIcon('<path d="M12 3v4H8"/><path d="M4 13V9h4"/><path d="M11 7a4 4 0 0 0-6-2L3 7"/><path d="M5 9a4 4 0 0 0 6 2l2-2"/>'),

  // ── MCP server icons ───────────────────────────────────────────────────────
  mcpWebSearch: pixelIcon('<path d="M4 4h16v16H4z"/><path d="M4 12h16"/><path d="M12 4v16"/><path d="M8 6h8M8 18h8"/>', 'width="14" height="14"'),
  mcpBash: pixelIcon('<path d="M3 4h18v16H3z"/><path d="M6 8h3v2h2v2H9v2H6"/><path d="M13 15h5"/>', 'width="14" height="14"'),
  mcpFileSystem: pixelIcon('<path d="M3 5h7l2 3h9v12H3z"/><path d="M3 8h18"/>', 'width="14" height="14"'),
  mcpMemory: pixelIcon('<path d="M6 6h12v12H6z"/><path d="M9 9h6v6H9z"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>', 'width="14" height="14"'),
  mcpDatabase: pixelIcon('<path d="M5 5h14v4H5z"/><path d="M5 9h14v5H5z"/><path d="M5 14h14v5H5z"/><path d="M8 7h8M8 12h8M8 17h8"/>', 'width="14" height="14"'),
  mcpGit: pixelIcon('<path d="M7 4v14"/><path d="M7 10h5v5h5"/><path d="M5 2h4v4H5zM5 16h4v4H5zM15 13h4v4h-4z"/>', 'width="14" height="14"'),
  mcpFile: pixelIcon('<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h4"/>', 'width="14" height="14"'),
  mcpPencil: pixelIcon('<path d="M5 16v4h4L20 9l-4-4L5 16z"/><path d="M14 7l3 3"/>', 'width="14" height="14"'),
  mcpLink: pixelIcon('<path d="M9 8h5v2H9z"/><path d="M5 8H3v8h8v-2H5z"/><path d="M13 10h6v6h-6v2h8V8h-8z"/>', 'width="14" height="14"'),
  mcpEye: pixelIcon('<path d="M2 12h2v-2h2V8h12v2h2v2h2v1h-2v2h-2v2H6v-2H4v-2H2z"/><path d="M10 10h4v4h-4z"/>', 'width="14" height="14"'),
});
