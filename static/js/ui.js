// Generic UI helpers — no domain knowledge, no API calls.

import { storage }     from './storage.js';
import { STORAGE_KEYS } from './state.js';

// ── Toast & status ────────────────────────────────────────────────────────────

let _toastTimer;

export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

export function showStatus(elementId, message, type) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.className   = `status-msg ${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const sidebarMedia = window.matchMedia('(max-width: 768px)');

function getSidebarElements() {
  return {
    sidebar: document.getElementById('sidebar'),
    toggle: document.getElementById('btn-toggle-sidebar'),
    search: document.getElementById('sidebar-search'),
    conversations: document.getElementById('conv-list'),
  };
}

function getSidebarBackdrop() {
  let backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) return backdrop;

  backdrop = document.createElement('div');
  backdrop.id = 'sidebar-backdrop';
  backdrop.addEventListener('click', () => toggleSidebar(false));
  document.body.appendChild(backdrop);
  return backdrop;
}

function applySidebarState(open, { persist = !sidebarMedia.matches } = {}) {
  const { sidebar, toggle, search, conversations } = getSidebarElements();
  if (!sidebar || !toggle) return;

  const isMobile = sidebarMedia.matches;
  sidebar.classList.toggle('collapsed', !open);
  sidebar.dataset.state = open ? 'open' : (isMobile ? 'hidden' : 'mini');

  // Keep off-screen/hidden controls out of keyboard navigation. The desktop
  // mini rail itself remains interactive so New chat and Settings still work.
  if (search) search.inert = !open;
  if (conversations) conversations.inert = !open;

  const action = open ? 'Close sidebar' : 'Open sidebar';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', action);
  toggle.title = action;

  const backdrop = isMobile ? getSidebarBackdrop() : document.getElementById('sidebar-backdrop');
  backdrop?.classList.toggle('visible', isMobile && open);

  if (persist) storage.set(STORAGE_KEYS.sidebar, open);
}

export function toggleSidebar(forceOpen) {
  const sidebar  = document.getElementById('sidebar');
  const open     = forceOpen !== undefined ? forceOpen : sidebar.classList.contains('collapsed');

  applySidebarState(open);
}

export function initSidebar(defaultOpen = true) {
  const savedState = storage.get(STORAGE_KEYS.sidebar);
  const desktopOpen = savedState !== null ? savedState : defaultOpen;

  // Mobile is an ephemeral overlay; opening or closing it must not overwrite
  // the user's desktop open/mini preference.
  applySidebarState(sidebarMedia.matches ? false : desktopOpen, { persist: false });
  document.documentElement.classList.remove('sidebar-init-closed');

  sidebarMedia.addEventListener('change', event => {
    const savedDesktopState = storage.get(STORAGE_KEYS.sidebar);
    const preferredDesktopState = savedDesktopState !== null ? savedDesktopState : defaultOpen;
    applySidebarState(event.matches ? false : preferredDesktopState, { persist: false });
  });
}

// ── Modals ────────────────────────────────────────────────────────────────────

export function openModal(id)  { document.getElementById(id).classList.add('open'); }
export function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Input helpers ─────────────────────────────────────────────────────────────

export function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

export function updateCharCount() {
  const input = document.getElementById('user-input');
  const count = document.getElementById('char-count');
  const len   = input.value.length;
  count.textContent = len > 0 ? `${len} chars` : '';
}

// ── Mobile keyboard handling ──────────────────────────────────────────────────

export function initMobileKeyboardHandling() {
  if (!window.visualViewport) return;

  const root     = document.documentElement;
  const messages = document.getElementById('messages');
  let   rafId    = null;

  function applyVVH() {
    rafId  = null;
    const h = window.visualViewport.height;
    root.style.setProperty('--vvh', `${h}px`);

    if (messages) {
      requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
      });
    }
  }

  function schedule() {
    if (rafId !== null) return;          // already queued
    rafId = requestAnimationFrame(applyVVH);
  }

  window.visualViewport.addEventListener('resize', schedule);
  window.visualViewport.addEventListener('scroll', schedule);

  // Set the initial value so the variable is defined before any paint.
  applyVVH();
}
