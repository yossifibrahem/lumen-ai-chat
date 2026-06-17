// Core scroll and message-row helpers shared across renderer sub-modules.

import { $, createElement, remove } from './dom.js';
import { state } from './state.js';

const BOTTOM_THRESHOLD = 32;
export let stickToBottom = true;

export const messagesEl = () => $('#messages');
const isNearBottom = el => el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD;

document.addEventListener('DOMContentLoaded', () => {
  messagesEl()?.addEventListener('scroll', event => {
    stickToBottom = isNearBottom(event.currentTarget);
  }, { passive: true });
});

export function scrollToBottom(force = false) {
  const el = messagesEl();
  if (!el || (!force && !stickToBottom)) return;
  if (!force && state.isStreaming && !state.autoScrollStreaming) return;

  requestAnimationFrame(() => {
    if (force || stickToBottom) {
      el.scrollTop = el.scrollHeight;
      stickToBottom = true;
    }
  });
}

export function createMessageRow({ avatarClass, avatarIcon, roleLabel, isUser = false }) {
  remove('#empty-state');
  document.getElementById('main')?.classList.remove('is-empty');

  const row = createElement('div', { className: `msg-row${isUser ? ' user-row' : ''}` });
  const metaHtml = isUser
    ? `<span class="msg-role-label">${roleLabel}</span><div class="msg-avatar ${avatarClass}">${avatarIcon}</div>`
    : `<div class="msg-avatar ${avatarClass}">${avatarIcon}</div><span class="msg-role-label">${roleLabel}</span>`;

  row.innerHTML = `
    <div class="msg-meta">
      ${metaHtml}
    </div>`;

  messagesEl().appendChild(row);
  return row;
}