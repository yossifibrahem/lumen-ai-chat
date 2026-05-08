// Settings — API + Chat behaviour settings persisted to localStorage.

import { state, SETTINGS_DEFAULTS, STORAGE_KEYS } from './state.js';
import { storage } from './storage.js';
import { api }     from './api.js';
import { showStatus, showToast } from './ui.js';

// ── Read / write ──────────────────────────────────────────────────────────────

export function loadSettings() {
  const saved = storage.get(STORAGE_KEYS.settings, {});
  Object.assign(state, SETTINGS_DEFAULTS, saved);

  const cachedModels = storage.get(STORAGE_KEYS.models);
  if (cachedModels) renderModelList(cachedModels);

  _syncAPIUI();
  _syncChatUI();
  updateModelBadge();
}

export function saveSettings() {
  _readAPIControls();
  storage.set(STORAGE_KEYS.settings, {
    apiBase:        state.apiBase,
    apiKey:         state.apiKey,
    model:          state.model,
    systemPrompt:   state.systemPrompt,
    temperature:    state.temperature,
    maxTokens:      state.maxTokens,
    requestTimeout: state.requestTimeout,
    autoGenerateTitles: state.autoGenerateTitles,
    streamResponses:    state.streamResponses,
    enterToSend:        state.enterToSend,
    contextMessages:    state.contextMessages,
  });
  updateModelBadge();
  showStatus('settings-status', 'Settings saved ✓', 'ok');
  showToast('Settings saved');
}

export function saveChatSettings() {
  _readChatControls();
  storage.set(STORAGE_KEYS.settings, {
    apiBase:        state.apiBase,
    apiKey:         state.apiKey,
    model:          state.model,
    systemPrompt:   state.systemPrompt,
    temperature:    state.temperature,
    maxTokens:      state.maxTokens,
    requestTimeout: state.requestTimeout,
    autoGenerateTitles: state.autoGenerateTitles,
    streamResponses:    state.streamResponses,
    enterToSend:        state.enterToSend,
    contextMessages:    state.contextMessages,
  });
  showToast('Chat settings saved');
}

// ── Model list ────────────────────────────────────────────────────────────────

export async function fetchModels() {
  showStatus('settings-status', 'Fetching…', 'ok');
  try {
    const data = await api.post('/api/models', {
      api_base: document.getElementById('api-base').value.trim(),
      api_key:  document.getElementById('api-key').value.trim(),
    });
    if (data.error) { showStatus('settings-status', data.error, 'err'); return; }
    storage.set(STORAGE_KEYS.models, data.models || []);
    renderModelList(data.models || []);
    showStatus('settings-status', `${data.models.length} models ✓`, 'ok');
  } catch (err) {
    showStatus('settings-status', `Error: ${err.message}`, 'err');
  }
}

export function renderModelList(models) {
  _renderChips(document.getElementById('model-list'),    'model-chip', models);
  _renderChips(document.getElementById('mp-model-list'), 'mp-chip',    models);
}

function _renderChips(container, chipClass, models) {
  if (!container) return;
  if (!models.length) {
    container.innerHTML = '<span class="mp-empty">No models — fetch them in API settings</span>';
    return;
  }
  container.innerHTML = models.map(m =>
    `<div class="${chipClass}${m === state.model ? ' selected' : ''}" data-model="${m}">${m}</div>`
  ).join('');

  container.querySelectorAll(`.${chipClass}`).forEach(chip => {
    chip.addEventListener('click', () => {
      state.model = chip.dataset.model;
      renderModelList(models);
      updateModelBadge();
      saveSettings();
    });
  });
}

function updateModelBadge() {
  document.getElementById('model-badge-label').textContent = state.model || 'No model';
}

// ── Show/hide API key ─────────────────────────────────────────────────────────

export function initKeyToggle() {
  const btn   = document.getElementById('btn-toggle-key');
  const input = document.getElementById('api-key');
  const show  = document.getElementById('eye-icon-show');
  const hide  = document.getElementById('eye-icon-hide');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type  = isHidden ? 'text' : 'password';
    // Spans use data-icon and were hydrated by initIcons(); just toggle visibility
    if (show) show.style.display = isHidden ? 'none' : '';
    if (hide) hide.style.display = isHidden ? '' : 'none';
  });
}

// ── Temperature slider live badge ─────────────────────────────────────────────

export function initParameterSliders() {
  const tempSlider  = document.getElementById('setting-temperature');
  const tempBadge   = document.getElementById('temp-badge');
  const ctxSlider   = document.getElementById('setting-context');
  const ctxBadge    = document.getElementById('context-badge');

  if (tempSlider && tempBadge) {
    tempSlider.addEventListener('input', () => {
      tempBadge.textContent = parseFloat(tempSlider.value).toFixed(2);
    });
  }

  if (ctxSlider && ctxBadge) {
    ctxSlider.addEventListener('input', () => {
      const v = parseInt(ctxSlider.value, 10);
      ctxBadge.textContent = v === 0 ? 'All' : `Last ${v}`;
    });
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _syncAPIUI() {
  const el = id => document.getElementById(id);
  el('api-base').value = state.apiBase;
  el('api-key').value  = state.apiKey;

  const temp = el('setting-temperature');
  if (temp) { temp.value = state.temperature; }
  const tempBadge = el('temp-badge');
  if (tempBadge) tempBadge.textContent = parseFloat(state.temperature).toFixed(2);

  const maxTok = el('setting-max-tokens');
  if (maxTok) maxTok.value = state.maxTokens || '';

  const timeout = el('setting-timeout');
  if (timeout) timeout.value = state.requestTimeout || 120;
}

function _syncChatUI() {
  const el = id => document.getElementById(id);
  el('system-prompt').value = state.systemPrompt;

  _setCheckbox('setting-auto-titles', state.autoGenerateTitles);
  _setCheckbox('setting-stream',      state.streamResponses);
  _setCheckbox('setting-enter-send',  state.enterToSend);

  const ctx = el('setting-context');
  if (ctx) ctx.value = state.contextMessages || 0;
  const ctxBadge = el('context-badge');
  if (ctxBadge) ctxBadge.textContent = state.contextMessages ? `Last ${state.contextMessages}` : 'All';
}

function _readAPIControls() {
  state.apiBase        = document.getElementById('api-base').value.trim();
  state.apiKey         = document.getElementById('api-key').value.trim();

  const temp = document.getElementById('setting-temperature');
  if (temp) state.temperature = parseFloat(temp.value);

  const maxTok = document.getElementById('setting-max-tokens');
  if (maxTok) state.maxTokens = parseInt(maxTok.value, 10) || 0;

  const timeout = document.getElementById('setting-timeout');
  if (timeout) state.requestTimeout = parseInt(timeout.value, 10) || 120;
}

function _readChatControls() {
  state.systemPrompt        = document.getElementById('system-prompt')?.value.trim()          ?? state.systemPrompt;
  state.autoGenerateTitles  = document.getElementById('setting-auto-titles')?.checked          ?? state.autoGenerateTitles;
  state.streamResponses     = document.getElementById('setting-stream')?.checked               ?? state.streamResponses;
  state.enterToSend         = document.getElementById('setting-enter-send')?.checked           ?? state.enterToSend;
  state.contextMessages     = parseInt(document.getElementById('setting-context')?.value, 10)  || 0;
}

function _setCheckbox(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}
