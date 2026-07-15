// Shared SVG helpers for the app icon catalog.

function svgIcon(body, attrs = '') {
  return `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision">${body}</svg>`;
}

function smallSvgIcon(body, attrs = '') {
  return `<svg ${attrs} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision">${body}</svg>`;
}

export const icon = (body, attrs = '') => svgIcon(body, attrs);
export const smallIcon = (body, attrs = '') => smallSvgIcon(body, attrs);
