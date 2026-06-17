// DOM rendering — the only module that touches #messages.
// API calls, persistence, and chat orchestration live elsewhere.
//
// Large sub-concerns are split into focused modules:
//   renderer_core.js        – scroll helpers and createMessageRow
//   renderer_groups.js      – block grouping, collapsible logic
//   renderer_thinking.js    – thinking block create/update/finalize
//   renderer_attachments.js – attachment cards and content parts
//   renderer_tools.js       – tool strip states (using/approval/running/result)
//   renderer_actions.js     – copy/edit/regenerate/branch footers

import { applyMarkdown } from './markdown.js';
import { createElement } from './dom.js';
import { ICONS } from './icons.js';
import { escapeHtml } from './format.js';

import { scrollToBottom as _scrollToBottom, messagesEl, createMessageRow, moveComposerToMain } from './renderer_core.js';
import { prepareAssistantRow } from './renderer_groups.js';
import { getRawText, appendContentParts } from './renderer_attachments.js';
import { appendThinkingBlock } from './renderer_thinking.js';
import { appendToolResultInline } from './renderer_tools.js';
import { addUserFooter, addAssistantFooter } from './renderer_actions.js';
import { assistantFooterHostIndex } from './chat_log_utils.js';

export { createThinkingBlock, updateThinkingBlock, finalizeThinkingBlock } from './renderer_thinking.js';
export { createToolStrip, toolStripSetApproval, toolStripSetRunning, toolStripFinalize, toolStripSetStopped, cancelAllToolApprovals } from './renderer_tools.js';
export { refreshMessageFooter } from './renderer_actions.js';

// Wrap scrollToBottom with the same signature expected by callers
export function scrollToBottom(force = false) { _scrollToBottom(force); }

const SUGGESTION_CHIPS = [
  { icon: ICONS.chipCode,   label: 'Build',      prompt: 'Help me build a clean solution for' },
  { icon: ICONS.chipPencil, label: 'Draft',      prompt: 'Help me draft this clearly:' },
  { icon: ICONS.chipInfo,   label: 'Teach',      prompt: 'Explain this step by step:' },
  { icon: ICONS.chipBox,    label: 'Inspect',    prompt: 'Analyze this carefully:' },
  { icon: ICONS.chipHelp,   label: 'Ideas',      prompt: 'Brainstorm practical ideas for' },
];

export function clearMessages() {
  const messages = messagesEl();
  const composer = document.getElementById('composer-area');

  messages.innerHTML = `
    <div id="empty-state">
      <div class="es-logo"><span>Lu</span><em>men</em></div>
      <div class="es-sub">A clean little console for big thoughts.</div>
    </div>`;

  if (composer) messages.appendChild(composer);
  document.getElementById('main')?.classList.add('is-empty');

  const suggestionsBar = document.getElementById('suggestions-bar');
  if (suggestionsBar) {
    suggestionsBar.innerHTML = SUGGESTION_CHIPS.map(chip => `
      <button class="suggestion-chip" data-prompt="${escapeHtml(chip.prompt)}">
        ${chip.icon}${escapeHtml(chip.label)}
      </button>`).join('');

    suggestionsBar.querySelectorAll('.suggestion-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('user-input');
        if (input) {
          input.value = btn.dataset.prompt;
          input.focus();
          input.dispatchEvent(new Event('input'));
        }
      });
    });
  }
  const inputEl = document.getElementById('user-input');
  if (inputEl) {
    inputEl.value = inputEl.value || '';
    inputEl.dispatchEvent(new Event('input'));
  }
}

export function appendMessage(role, content, logIndex = -1, entry = null) {
  if (!content) return null;

  const isUser = role === 'user';
  const row = isUser
    ? createMessageRow({ avatarClass: 'user-av', avatarIcon: ICONS.user, roleLabel: 'You', isUser: true })
    : prepareAssistantRow();

  if (logIndex >= 0) row.dataset.logIndex = logIndex;
  row.querySelector('.msg-footer')?.remove();

  const contentEl = createElement('div', { className: 'msg-content' });
  appendContentParts(contentEl, content);
  row.appendChild(contentEl);

  if (isUser) {
    addUserFooter(row, () => getRawText(content), logIndex, () => content, entry?.branch);
  } else {
    addAssistantFooter(row, () => getRawText(content), logIndex, entry?.branch);
  }
  _scrollToBottom(isUser);
  return contentEl;
}

export function createStreamingMessage() {
  const row = prepareAssistantRow();
  const contentEl = createElement('div', { className: 'msg-content', html: '&nbsp;' });
  row.appendChild(contentEl);
  _scrollToBottom();
  return contentEl;
}

export function appendAssistantStatus(content = 'Response stopped.', logIndex = -1, entry = null) {
  const row = prepareAssistantRow();
  row.querySelector('.msg-footer')?.remove();
  if (logIndex >= 0) row.dataset.logIndex = String(logIndex);
  const statusEl = createElement('div', { className: 'msg-content msg-status', text: content });
  if (logIndex >= 0) statusEl.dataset.logIndex = String(logIndex);
  row.appendChild(statusEl);
  addAssistantFooter(row, () => content, logIndex, entry?.branch);
  _scrollToBottom();
  return statusEl;
}

export function finalizeStreamingMessage(contentEl, text, { logIndex = -1, branch = null } = {}) {
  if (!text || !text.trim()) {
    contentEl.remove();
    return;
  }

  contentEl.dataset.rawText = text;
  applyMarkdown(contentEl, text);

  const row = contentEl.parentElement;
  if (logIndex >= 0) row.dataset.logIndex = String(logIndex);
  row.querySelector('.msg-footer')?.remove();
  addAssistantFooter(row, () => text, logIndex, branch);
}

export function setStreamingMessageLogIndex(contentEl, logIndex, branch = null) {
  const row = contentEl?.parentElement;
  if (!row) return;
  row.dataset.logIndex = logIndex;
  const footerEl = row.querySelector('.msg-footer');
  if (!footerEl) return;
  const getText = () => contentEl?.dataset?.rawText || contentEl?.textContent || '';
  footerEl.remove();
  addAssistantFooter(row, getText, logIndex, branch);
}

function ensureTerminalAssistantFooter(displayLog) {
  const rows = [...messagesEl().querySelectorAll('.msg-row')];
  const row = rows.at(-1);
  if (!row || row.classList.contains('user-row') || row.querySelector('.msg-footer')) return;

  const getText = () => row.querySelector('.msg-content')?.dataset.rawText ||
    row.querySelector('.msg-content')?.textContent ||
    row.textContent.trim();
  const logIndex = assistantFooterHostIndex(displayLog);
  if (logIndex < 0) return;
  const branch = displayLog[logIndex]?.branch?.kind === 'assistant' ? displayLog[logIndex].branch : null;
  addAssistantFooter(row, getText, logIndex, branch);
}


export function renderAllMessages(displayLog) {
  moveComposerToMain();
  messagesEl().innerHTML = '';
  if (displayLog.length > 0) {
    document.getElementById('main')?.classList.remove('is-empty');
  } else {
    clearMessages();
    return;
  }
  displayLog.forEach((entry, idx) => {
    if (entry.type === 'message') {
      if (entry.role === 'assistant' && !String(entry.content ?? '').trim()) return;
      appendMessage(entry.role, entry.content, idx, entry);
    }
    if (entry.type === 'tool_result') appendToolResultInline(entry.name, entry.args, entry.result, entry.displayName, idx);
    if (entry.type === 'thinking') appendThinkingBlock(entry.content, idx);
    if (entry.type === 'status') appendAssistantStatus(entry.content, idx, entry);
  });
  ensureTerminalAssistantFooter(displayLog);
  _scrollToBottom(true);
}
