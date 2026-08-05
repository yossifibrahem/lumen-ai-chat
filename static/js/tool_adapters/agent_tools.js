/**
 * Adapter: agent_tools server
 *
 * Covers all four tools provided by the unified agent_tools MCP server:
 *   • view        — read a file or directory listing
 *   • create_file — write a new file with given content
 *   • str_replace — replace a unique string inside a file
 *   • bash_tool   — run a shell command and return stdout/stderr/exit code
 * The `description` arg is already stripped globally by visibleToolArgs in
 */

import { registerAdapter } from './registry.js';

// ── File operation tools ──────────────────────────────────────────────────────

registerAdapter({
  tools: ['view'],
  usingLabel: 'Viewing file',
});

registerAdapter({
  tools: ['create_file'],
  usingLabel: 'Creating file',
});

registerAdapter({
  tools: ['str_replace'],
  usingLabel: 'Editing file',
});

// ── Shell tool ────────────────────────────────────────────────────────────────

registerAdapter({
  tools: ['bash_tool'],
  usingLabel: 'Running command',
});
