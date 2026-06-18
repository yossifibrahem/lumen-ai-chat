// Register theme-specific icon overrides here.
// Add a file beside retro-pixel.js, import it, then add one entry to this map.

import { RETRO_PIXEL_ICON_OVERRIDES } from './retro-pixel.js';
import { VINTAGE_TYPEWRITER_ICON_OVERRIDES } from './vintage-typewriter.js';

export const THEME_ICON_OVERRIDES = Object.freeze({
  'retro-pixel': RETRO_PIXEL_ICON_OVERRIDES,
  'vintage-typewriter': VINTAGE_TYPEWRITER_ICON_OVERRIDES,
});
