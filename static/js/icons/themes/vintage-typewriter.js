// Vintage Typewriter icon overrides.
// Partial pack: only icons that strongly define the typewriter skin are changed.

import { icon, smallIcon } from '../svg.js';

export const VINTAGE_TYPEWRITER_ICON_OVERRIDES = Object.freeze({
  logo: icon('<path d="M6 9h12a3 3 0 0 1 3 3v6H3v-6a3 3 0 0 1 3-3z"/><path d="M8 9V5h8v4"/><path d="M7 14h2M11 14h2M15 14h2"/><path d="M8 18h8"/>'),
  ai: icon('<path d="M5 7h14v10H5z"/><path d="M8 7V4h8v3"/><path d="M8 11h8"/><path d="M8 14h5"/><path d="M4 19h16"/>'),
  user: icon('<rect x="6" y="4" width="12" height="16" rx="2"/><circle cx="12" cy="9" r="2"/><path d="M8.5 16a3.5 3.5 0 0 1 7 0"/>'),

  send: icon('<path d="M4 19 20 5l-5 15-3-7-8-4 16-4"/>'),
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>',
  plus: icon('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  mic: icon('<path d="M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V5z"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/><path d="M9 21h6"/>'),
  file: icon('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4"/><path d="M9 12h6"/><path d="M9 15h6"/>'),
  copy: icon('<path d="M8 8h11v12H8z"/><path d="M5 16H4V4h11v1"/>'),
  edit: icon('<path d="M4 19.5 5.5 15 16.7 3.8a2.1 2.1 0 0 1 3 3L8.5 18 4 19.5z"/><path d="M14.7 5.8l3.5 3.5"/>'),
  trash: icon('<path d="M5 7h14"/><path d="M9 7V4.5h6V7"/><path d="M7 9l1 11h8l1-11"/><path d="M10.5 12v5"/><path d="M13.5 12v5"/>'),
  download: icon('<path d="M12 4v10"/><path d="m8 10 4 4 4-4"/><path d="M5 19h14"/>'),
  refresh: icon('<path d="M18.5 7.5A7 7 0 0 0 6 8l-1.5 2.5"/><path d="M4.5 6.5v4h4"/><path d="M5.5 16.5A7 7 0 0 0 18 16l1.5-2.5"/><path d="M19.5 17.5v-4h-4"/>'),

  menu: icon('<path d="M5 7h14"/><path d="M5 12h14"/><path d="M5 17h14"/>'),
  settings: icon('<path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/>'),
  search: icon('<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>'),
  chat: icon('<path d="M5 5h14v10H9l-4 4V5z"/><path d="M8.5 9h7"/><path d="M8.5 12h5"/>'),
  chevronDown: icon('<path d="m7 10 5 5 5-5"/>', 'width="10" height="10"'),
  chevronLeft: icon('<path d="m15 18-6-6 6-6"/>', 'width="10" height="10"'),
  chevronRight: icon('<path d="m9 6 6 6-6 6"/>', 'width="10" height="10"'),

  chipCode: icon('<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="M14 5 10 19"/>'),
  chipPencil: icon('<path d="M4 19.5 5.5 15 16.7 3.8a2.1 2.1 0 0 1 3 3L8.5 18 4 19.5z"/>'),
  chipInfo: icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>'),
  chipBox: icon('<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/>'),
  chipHelp: icon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/><path d="M12 17h.01"/>'),

  tabAppearance: smallIcon('<circle cx="8" cy="8" r="5"/><path d="M8 3v10"/><path d="M3 8h10"/>'),
  tabChat: smallIcon('<path d="M2.5 3h11v8h-7l-4 3V3z"/><path d="M5 6h6"/><path d="M5 8.5h4"/>'),
  tabApi: smallIcon('<path d="M2.5 5.5h11v7h-11z"/><path d="M5 5.5V3.5h6v2"/><path d="M5.5 9h5"/>'),
  tabContainers: smallIcon('<path d="M8 2 13 4.8v6.4L8 14 3 11.2V4.8z"/><path d="M3 4.8 8 7.5l5-2.7"/><path d="M8 7.5V14"/>'),
  tabMcp: smallIcon('<path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z"/>'),
  syncIcon: smallIcon('<path d="M12.5 5.5A5 5 0 0 0 4 6l-1 1.5"/><path d="M3 4.5v3h3"/><path d="M3.5 10.5A5 5 0 0 0 12 10l1-1.5"/><path d="M13 11.5v-3h-3"/>'),
});
