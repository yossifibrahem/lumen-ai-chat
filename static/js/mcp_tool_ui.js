// MCP tool UI policy — display labels, argument filtering, and generic JSON result rendering.
// Keep UI-specific MCP behavior here so renderer.js stays mostly orchestration/DOM code.

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getToolDisplayLabel(toolName, args = {}) {
  const description = String(args?.description || '').trim();
  return description || toolName;
}

export function getToolMetaText(toolName, args = {}) {
  const pieces = [];
  if (toolName === 'bash_tool' && args.command) pieces.push(args.command);
  if ((toolName === 'view' || toolName === 'create_file' || toolName === 'str_replace') && args.path) pieces.push(args.path);
  return pieces.join(' · ');
}

function normalizeBlockText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*\n+/, '')
    .replace(/\n+\s*$/, '');
}

function formatToolValue(value) {
  if (value == null) return '';
  if (typeof value === 'object') return normalizeBlockText(JSON.stringify(value, null, 2));
  return normalizeBlockText(value);
}

export function visibleToolArgs(args = {}) {
  if (!args || typeof args !== 'object') return {};
  return Object.fromEntries(Object.entries(args).filter(([key]) => key !== 'description'));
}

export function formatArgsHtml(args = {}) {
  return Object.entries(args).map(([key, value]) => `
    <div class="arg-item">
      <span class="arg-name">${escapeHtml(key)}</span>
      <pre class="arg-value">${escapeHtml(formatToolValue(value))}</pre>
    </div>`).join('');
}

function parseToolJson(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || !/^[\[{]/.test(text)) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function renderJsonResult(data) {
  if (Array.isArray(data)) {
    return `<div class="tr-command-result"><pre class="tr-result">${escapeHtml(formatToolValue(data))}</pre></div>`;
  }

  const entries = Object.entries(data || {});
  if (!entries.length) {
    return `<pre class="tr-result">${escapeHtml(formatToolValue(data))}</pre>`;
  }

  const blocks = entries.map(([key, value]) => `
    <div>
      <div class="tr-section-label">${escapeHtml(key)}</div>
      <pre class="tr-result">${escapeHtml(formatToolValue(value))}</pre>
    </div>`).join('');

  return `<div class="tr-command-result">${blocks}</div>`;
}

export function renderToolResultHtml(result) {
  const data = parseToolJson(result);
  return data
    ? renderJsonResult(data)
    : `<pre class="tr-result">${escapeHtml(formatToolValue(result))}</pre>`;
}
