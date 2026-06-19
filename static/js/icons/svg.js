// Shared SVG helpers for the app icon system.
// Keep raw SVG construction here so icon packs can stay tiny and easy to drop in.

export function svgIcon(body, attrs = '', { size = 24, pixel = false, fill = 'none' } = {}) {
  const strokeLinecap = pixel ? 'square' : 'round';
  const strokeLinejoin = pixel ? 'miter' : 'round';
  const rendering = pixel ? 'shape-rendering="crispEdges"' : 'shape-rendering="geometricPrecision"';
  return `<svg ${attrs} viewBox="0 0 ${size} ${size}" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}" ${rendering}>${body}</svg>`;
}

export function smallSvgIcon(body, attrs = '', { pixel = false, fill = 'none' } = {}) {
  const strokeLinecap = pixel ? 'square' : 'round';
  const strokeLinejoin = pixel ? 'miter' : 'round';
  const rendering = pixel ? 'shape-rendering="crispEdges"' : 'shape-rendering="geometricPrecision"';
  return `<svg ${attrs} width="12" height="12" viewBox="0 0 16 16" fill="${fill}" stroke="currentColor" stroke-width="1.7" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}" ${rendering}>${body}</svg>`;
}

export const icon = (body, attrs = '') => svgIcon(body, attrs);
export const smallIcon = (body, attrs = '') => smallSvgIcon(body, attrs);
export const pixelIcon = (body, attrs = '') => svgIcon(body, attrs, { pixel: true });
export const pixelSmallIcon = (body, attrs = '') => smallSvgIcon(body, attrs, { pixel: true });

export const ICON_BODIES = Object.freeze({
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  pen: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
});
