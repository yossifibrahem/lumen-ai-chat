// Retro Pixel only overrides icons that should visually become blockier.
// Anything not listed here automatically falls back to DEFAULT_ICONS.

import { pixelIcon } from '../svg.js';

export const RETRO_PIXEL_ICON_OVERRIDES = Object.freeze({
  user: pixelIcon('<rect x="7" y="4" width="10" height="10"/><path d="M5 22v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3"/><path d="M10 8h.01M14 8h.01"/>'),
  ai: pixelIcon('<rect x="4" y="5" width="16" height="14"/><path d="M8 9h2M14 9h2M9 14h6"/><path d="M12 5V2M9 2h6"/>'),
  logo: pixelIcon('<path d="M4 4h16v16H4z"/><path d="M8 9h2v2H8zM14 9h2v2h-2zM9 15h6"/>'),

  trash: pixelIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'),
  copy: pixelIcon('<rect x="9" y="9" width="14" height="14" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),

  menu: pixelIcon('<rect x="3" y="4" width="18" height="16"/><path d="M9 4v16M5 8h2M5 12h2M5 16h2"/>'),
  send: pixelIcon('<path d="M4 4l16 8-16 8v-6l8-2-8-2V4z"/>', 'stroke-width="2.2"'),
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>',

  chat: pixelIcon('<path d="M4 4h16v12H9l-5 4V4z"/><path d="M8 8h8M8 12h6"/>'),
  search: pixelIcon('<rect x="4" y="4" width="11" height="11"/><path d="M15 15l5 5"/>', 'stroke-width="2.2"'),

  chipInfo: pixelIcon('<rect x="5" y="4" width="14" height="16"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
  chipBox: pixelIcon('<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>'),
  chipHelp: pixelIcon('<path d="M5 5h14v14H5z"/><path d="M9 9h6M9 13h3M14 13h1M9 17h6"/>'),
});
