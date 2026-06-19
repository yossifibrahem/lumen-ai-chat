// Pixel Terminal icon pack.
// Every default key is overridden so the skin never mixes rounded and pixel art.

import { pixelIcon, pixelSmallIcon } from '../svg.js';

const p = (body, attrs = '') => pixelIcon(body, attrs);
const ps = (body, attrs = '') => pixelSmallIcon(body, attrs);
const solid = (body, attrs = '') => p(body, `fill="currentColor" stroke="none" ${attrs}`);
const smallSolid = (body, attrs = '') => ps(body, `fill="currentColor" stroke="none" ${attrs}`);

export const PIXEL_THEME_ICONS = Object.freeze({
  user: solid('<rect x="9" y="4" width="6" height="2"/><rect x="7" y="6" width="10" height="6"/><rect x="9" y="12" width="6" height="2"/><rect x="5" y="16" width="14" height="2"/><rect x="3" y="18" width="18" height="3"/><rect x="9" y="8" width="2" height="2" fill="var(--bg)"/><rect x="13" y="8" width="2" height="2" fill="var(--bg)"/>'),
  ai: solid('<rect x="11" y="2" width="2" height="3"/><rect x="8" y="2" width="8" height="2"/><rect x="5" y="5" width="14" height="2"/><rect x="3" y="7" width="18" height="11"/><rect x="5" y="18" width="5" height="2"/><rect x="14" y="18" width="5" height="2"/><rect x="10" y="20" width="4" height="2"/><rect x="7" y="10" width="3" height="3" fill="var(--bg)"/><rect x="14" y="10" width="3" height="3" fill="var(--bg)"/><rect x="9" y="15" width="6" height="2" fill="var(--bg)"/>'),

  check: solid('<rect x="4" y="11" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="10" y="11" width="3" height="3"/><rect x="13" y="8" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/>'),
  close: solid('<rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="8" y="8" width="3" height="3"/><rect x="13" y="8" width="3" height="3"/><rect x="10" y="10" width="4" height="4"/><rect x="8" y="13" width="3" height="3"/><rect x="13" y="13" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/><rect x="16" y="16" width="3" height="3"/>'),
  moreVertical: solid('<rect x="10" y="4" width="4" height="4"/><rect x="10" y="10" width="4" height="4"/><rect x="10" y="16" width="4" height="4"/>'),
  trash: p('<path d="M5 7h14v14H5zM8 4h8v3M3 7h18M9 11v6M15 11v6"/>'),
  copy: p('<path d="M8 8h12v12H8zM4 4h12v4M4 4v12h4"/>'),
  download: solid('<rect x="10" y="3" width="4" height="10"/><rect x="7" y="10" width="10" height="4"/><rect x="9" y="14" width="6" height="3"/><rect x="4" y="18" width="16" height="3"/>'),
  edit: p('<path d="M5 16v4h4L20 9l-4-4L5 16zM14 7l4 4M12 20h9"/>'),
  refresh: p('<path d="M19 8V4h-4M19 4a9 9 0 0 0-12 2M5 16v4h4M5 20a9 9 0 0 0 12-2"/>'),

  chevronLeft: solid('<rect x="12" y="5" width="3" height="3"/><rect x="9" y="8" width="3" height="3"/><rect x="6" y="11" width="3" height="3"/><rect x="9" y="14" width="3" height="3"/><rect x="12" y="17" width="3" height="3"/>'),
  chevronRight: solid('<rect x="9" y="5" width="3" height="3"/><rect x="12" y="8" width="3" height="3"/><rect x="15" y="11" width="3" height="3"/><rect x="12" y="14" width="3" height="3"/><rect x="9" y="17" width="3" height="3"/>'),
  chevronDown: solid('<rect x="4" y="8" width="3" height="3"/><rect x="7" y="11" width="3" height="3"/><rect x="10" y="14" width="4" height="3"/><rect x="14" y="11" width="3" height="3"/><rect x="17" y="8" width="3" height="3"/>'),
  menu: solid('<rect x="3" y="5" width="18" height="3"/><rect x="3" y="11" width="18" height="3"/><rect x="3" y="17" width="18" height="3"/>'),
  settings: p('<path d="M3 7h7M14 7h7M10 4v6h4V4h-4zM3 17h3M10 17h11M6 14v6h4v-6H6z"/>'),
  plus: solid('<rect x="10" y="4" width="4" height="16"/><rect x="4" y="10" width="16" height="4"/>'),

  logo: solid('<rect x="10" y="2" width="4" height="3"/><rect x="7" y="2" width="10" height="2"/><rect x="4" y="5" width="16" height="2"/><rect x="2" y="7" width="20" height="12"/><rect x="4" y="19" width="16" height="3"/><rect x="6" y="9" width="4" height="4" fill="var(--bg)"/><rect x="14" y="9" width="4" height="4" fill="var(--bg)"/><rect x="8" y="15" width="2" height="2" fill="var(--bg)"/><rect x="10" y="17" width="4" height="2" fill="var(--bg)"/><rect x="14" y="15" width="2" height="2" fill="var(--bg)"/>'),

  send: solid('<rect x="3" y="4" width="4" height="16"/><rect x="7" y="6" width="4" height="12"/><rect x="11" y="8" width="4" height="8"/><rect x="15" y="10" width="6" height="4"/><rect x="7" y="11" width="9" height="2" fill="var(--bg)"/>'),
  stop: solid('<rect x="5" y="5" width="14" height="14"/>'),
  mic: p('<path d="M9 3h6v11H9zM5 10v5h3v3h3v3h2v-3h3v-3h3v-5M8 21h8"/>'),
  file: p('<path d="M5 3h9l5 5v13H5zM14 3v5h5M8 13h8M8 17h6"/>'),

  chat: p('<path d="M3 4h18v13H9l-5 4v-4H3zM7 9h10M7 13h7"/>'),
  search: p('<path d="M5 5h11v11H5zM16 16l5 5M8 9h5M8 12h3"/>'),
  bulb: ps('<path d="M5 2h6v2h2v6h-2v2H5v-2H3V4h2zM6 14h4M6 7h4"/>'),
  layers: ps('<path d="M8 2l6 3-6 3-6-3 6-3zM2 8l6 3 6-3M2 11l6 3 6-3"/>'),

  chipCode: p('<path d="M9 5 3 12l6 7M15 5l6 7-6 7M14 3l-4 18"/>'),
  chipPencil: p('<path d="M5 16v4h4L20 9l-4-4L5 16zM14 7l4 4"/>'),
  chipInfo: p('<path d="M5 3h14v18H5zM11 10h3v7h-3zM11 6h3v2h-3z"/>'),
  chipBox: p('<path d="M4 7l8-4 8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10"/>'),
  chipHelp: p('<path d="M4 4h16v16H4zM9 9V7h6v5h-3v3M12 18h.01"/>'),

  tabApi: ps('<path d="M2 5h12v8H2zM5 5V3h6v2M6 9h4"/>'),
  tabChat: ps('<path d="M2 3h12v9H7l-4 3v-3H2zM5 7h6"/>'),
  tabAppearance: smallSolid('<rect x="6" y="6" width="4" height="4"/><rect x="7" y="1" width="2" height="3"/><rect x="7" y="12" width="2" height="3"/><rect x="1" y="7" width="3" height="2"/><rect x="12" y="7" width="3" height="2"/><rect x="3" y="3" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/><rect x="11" y="11" width="2" height="2"/>'),
  tabMcp: ps('<path d="M1 1h5v5H1zM10 1h5v5h-5zM1 10h5v5H1zM6 3h4M3 6v4M10 3v10H6"/>'),
  toolDefault: smallSolid('<rect x="11" y="2" width="3" height="3"/><rect x="8" y="5" width="3" height="3"/><rect x="5" y="8" width="3" height="3"/><rect x="2" y="11" width="5" height="3"/><rect x="8" y="8" width="3" height="3"/>'),
  tabContainers: ps('<path d="M8 1l6 3v8l-6 3-6-3V4l6-3zM2 4l6 3 6-3M8 7v8"/>'),

  eyeShow: ps('<path d="M1 8l3-4h8l3 4-3 4H4L1 8zM6 6h4v4H6z"/>'),
  eyeHide: ps('<path d="M1 8l3-4h8l3 4-3 4H4L1 8zM2 2l12 12"/>'),
  syncIcon: ps('<path d="M14 6V2h-4M14 2a6 6 0 0 0-10 2M2 10v4h4M2 14a6 6 0 0 0 10-2"/>'),

  mcpWebSearch: p('<path d="M8 3h8v2h3v3h2v8h-2v3h-3v2H8v-2H5v-3H3V8h2V5h3V3zM3 12h18M12 3v18M8 5v14M16 5v14"/>'),
  mcpBash: p('<path d="M3 4h18v16H3zM7 9l4 3-4 3M13 16h5"/>'),
  mcpFileSystem: p('<path d="M3 6h7l2 3h9v11H3zM3 6V4h7l2 2"/>'),
  mcpMemory: p('<path d="M6 6h12v12H6zM9 9h6v6H9zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M18 9h4M2 15h4M18 15h4"/>'),
  mcpDatabase: p('<path d="M4 5h16v14H4zM4 5l4-2h8l4 2M4 10h16M4 15h16"/>'),
  mcpGit: p('<path d="M7 5v13M7 9h7v8M7 5h.01M7 18h.01M17 17h.01"/>'),
  mcpFile: p('<path d="M5 3h9l5 5v13H5zM14 3v5h5"/>'),
  mcpPencil: p('<path d="M5 16v4h4L20 9l-4-4L5 16zM14 7l4 4"/>'),
  mcpLink: p('<path d="M4 13v5h7l3-3M20 11V6h-7l-3 3M8 16l8-8"/>'),
  mcpEye: p('<path d="M2 12l5-6h10l5 6-5 6H7l-5-6zM9 9h6v6H9z"/>'),
});
