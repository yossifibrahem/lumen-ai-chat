// Customization — UI preferences persisted to localStorage.

import { state, CUSTOMIZATION_DEFAULTS, STORAGE_KEYS } from './state.js';
import { storage } from './storage.js';
import { refreshIcons } from './icons.js';

// ── Apply ─────────────────────────────────────────────────────────────────────
// Reads from `state` and pushes every setting into the live DOM.

let autoThemeListenerAttached = false;

const UI_THEME_STYLESHEETS = {
  pixel: 'ui-theme-pixel',
};

function normalizeUiTheme(theme) {
  return Object.prototype.hasOwnProperty.call(UI_THEME_STYLESHEETS, theme) ? theme : 'default';
}

export function applyCustomization() {
  // Theme (light/dark/auto)
  _applyTheme(state.theme || CUSTOMIZATION_DEFAULTS.theme);

  // Visual style / UI theme
  _applyUiTheme(state.uiTheme || CUSTOMIZATION_DEFAULTS.uiTheme);

  // Font size
  const isMobile = window.innerWidth <= 768;
  const sizes = isMobile
    ? { small: '12px', medium: '14px', large: '16px' }
    : { small: '14px', medium: '16px', large: '18px' };
  document.documentElement.style.setProperty('--font-size-base', sizes[state.fontSize] || sizes.medium);

  // Font family
  _applyFontFamily(state.fontFamily || 'sora');

  // Accent color — custom hex overrides swatch if set
  const accent = (state.customAccentColor && /^#[0-9a-f]{6}$/i.test(state.customAccentColor))
    ? state.customAccentColor
    : (state.accentColor || CUSTOMIZATION_DEFAULTS.accentColor);
  _applyAccent(accent);

  // Suggestion chips visibility
  document.documentElement.classList.toggle('hide-suggestion-chips', !state.showSuggestionChips);


}

function _applyTheme(theme) {
  let effective = theme;
  if (theme === 'auto') {
    effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', effective);
}

function _applyUiTheme(theme) {
  const normalized = normalizeUiTheme(theme);
  document.documentElement.setAttribute('data-ui-theme', normalized);

  Object.entries(UI_THEME_STYLESHEETS).forEach(([themeKey, linkId]) => {
    const link = document.getElementById(linkId);
    if (link) link.disabled = normalized !== themeKey;
  });

  refreshIcons();
}

function _applyFontFamily(family) {
  const map = {
    space:   "'Space Grotesk', sans-serif",
    pixel:   "'Pixelify Sans', 'JetBrains Mono', monospace",
    typewriter: "'Special Elite', 'Courier New', monospace",
    sora:    "'Sora', sans-serif",
    tiempos: "'Instrument Serif', Georgia, serif",
    mono:    "'JetBrains Mono', monospace",
    system:  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };
  document.documentElement.style.setProperty('--font-roman', map[family] || map.space);
}

function _applyAccent(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;

  const root = document.documentElement;
  const accentText = readableTextForRgb(rgb);

  root.style.setProperty('--accent',            hex);
  root.style.setProperty('--accent-rgb',        rgb);
  root.style.setProperty('--on-accent',         accentText);
  root.style.setProperty('--accent-dim',        `rgba(${rgb},0.12)`);
  root.style.setProperty('--accent-hover',      `rgba(${rgb},0.20)`);
  root.style.setProperty('--accent-glow',       `rgba(${rgb},0.06)`);
  root.style.setProperty('--accent-border',     `rgba(${rgb},0.4)`);
  root.style.setProperty('--accent-border-dim', `rgba(${rgb},0.25)`);
  root.style.setProperty('--accent-border-mid', `rgba(${rgb},0.50)`);
}

// ── Load ──────────────────────────────────────────────────────────────────────

export function loadCustomization() {
  const saved = storage.get(STORAGE_KEYS.customization, {});
  Object.assign(state, { ...CUSTOMIZATION_DEFAULTS, ...saved });
  applyCustomization();
  syncCustomizationUI();

  // If auto theme, re-apply when OS preference changes. Attach once only;
  // loadCustomization can be called again after reset/import-style flows.
  if (!autoThemeListenerAttached) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (state.theme === 'auto') _applyTheme('auto');
    });
    autoThemeListenerAttached = true;
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────

export function saveCustomization() {
  _readControlsIntoState();
  storage.set(STORAGE_KEYS.customization, {
    sidebarDefaultOpen:    state.sidebarDefaultOpen,
    showSuggestionChips:   state.showSuggestionChips,
    hideToolBlocks:        state.hideToolBlocks,
    groupSequentialBlocks: state.groupSequentialBlocks,
    hideThinkingTokens:    state.hideThinkingTokens,
    fontSize:              state.fontSize,
    fontFamily:            state.fontFamily,
    theme:                 state.theme,
    uiTheme:               state.uiTheme,
    accentColor:           state.accentColor,
    customAccentColor:     state.customAccentColor,
  });
  applyCustomization();
}

// ── Init listeners ────────────────────────────────────────────────────────────

export function initSwatchPicker() {
  // Colour swatches — only update active highlight
  document.querySelectorAll('.cust-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.cust-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      // Clear custom color when a preset swatch is selected
      const hexInput = document.getElementById('cust-accent-hex');
      const picker   = document.getElementById('cust-accent-picker');
      if (hexInput) hexInput.value = '';
      if (picker)   picker.value  = sw.dataset.color;
    });
  });

  // Custom color picker
  const picker   = document.getElementById('cust-accent-picker');
  const hexInput = document.getElementById('cust-accent-hex');

  if (picker && hexInput) {
    picker.addEventListener('input', () => {
      hexInput.value = picker.value;
      _deactivateSwatches();
    });
    hexInput.addEventListener('input', () => {
      const val = hexInput.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(val)) {
        picker.value = val;
        _deactivateSwatches();
      }
    });
  }

  // Theme radio cards
  document.querySelectorAll('input[name="cust-theme"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // Selection is previewed by the card itself; the app theme changes on Apply.
    });
  });
}

function _deactivateSwatches() {
  document.querySelectorAll('.cust-swatch').forEach(s => s.classList.remove('active'));
}

// ── Sync UI controls → current state ─────────────────────────────────────────

export function syncCustomizationUI() {
  _setCheckbox('cust-sidebar-open',    state.sidebarDefaultOpen);
  _setCheckbox('cust-suggestion-chips',state.showSuggestionChips);
  _setCheckbox('cust-hide-tool-blocks',   state.hideToolBlocks);
  _setCheckbox('cust-hide-thinking',     state.hideThinkingTokens);
  _setCheckbox('cust-group-seq-blocks',  state.groupSequentialBlocks);

  const fs = document.getElementById('cust-font-size');
  if (fs) fs.value = state.fontSize;

  const ff = document.getElementById('cust-font-family');
  if (ff) ff.value = state.fontFamily;

  const uiTheme = document.getElementById('cust-ui-theme');
  if (uiTheme) uiTheme.value = normalizeUiTheme(state.uiTheme || CUSTOMIZATION_DEFAULTS.uiTheme);

  // Theme radio
  const themeRadio = document.querySelector(`input[name="cust-theme"][value="${state.theme || CUSTOMIZATION_DEFAULTS.theme}"]`);
  if (themeRadio) themeRadio.checked = true;

  // Swatches
  document.querySelectorAll('.cust-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === state.accentColor && !state.customAccentColor);
  });

  // Custom color fields
  const hexInput = document.getElementById('cust-accent-hex');
  const picker   = document.getElementById('cust-accent-picker');
  if (hexInput) hexInput.value = state.customAccentColor || '';
  if (picker) {
    picker.value = state.customAccentColor || state.accentColor || CUSTOMIZATION_DEFAULTS.accentColor;
  }
}

// ── Read DOM controls → state ─────────────────────────────────────────────────

function _readControlsIntoState() {
  state.sidebarDefaultOpen    = document.getElementById('cust-sidebar-open')?.checked     ?? state.sidebarDefaultOpen;
  state.showSuggestionChips   = document.getElementById('cust-suggestion-chips')?.checked  ?? state.showSuggestionChips;
  state.hideToolBlocks        = document.getElementById('cust-hide-tool-blocks')?.checked   ?? state.hideToolBlocks;
  state.hideThinkingTokens    = document.getElementById('cust-hide-thinking')?.checked     ?? state.hideThinkingTokens;
  state.groupSequentialBlocks = document.getElementById('cust-group-seq-blocks')?.checked  ?? state.groupSequentialBlocks;
  state.fontSize              = document.getElementById('cust-font-size')?.value           ?? state.fontSize;
  state.fontFamily            = document.getElementById('cust-font-family')?.value         ?? state.fontFamily;
  state.uiTheme               = normalizeUiTheme(document.getElementById('cust-ui-theme')?.value ?? state.uiTheme);

  const themeRadio = document.querySelector('input[name="cust-theme"]:checked');
  if (themeRadio) state.theme = themeRadio.value;

  // Accent: custom hex takes priority over swatch
  const hexInput = document.getElementById('cust-accent-hex');
  const customHex = hexInput?.value.trim() || '';
  if (customHex && /^#[0-9a-f]{6}$/i.test(customHex)) {
    state.customAccentColor = customHex;
  } else {
    state.customAccentColor = '';
    const activeSwatch = document.querySelector('.cust-swatch.active');
    if (activeSwatch) state.accentColor = activeSwatch.dataset.color;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _setCheckbox(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : null;
}

function readableTextForRgb(rgbString) {
  const [r, g, b] = rgbString.split(',').map(Number).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.20 ? '#201711' : '#fff7ea';
}
