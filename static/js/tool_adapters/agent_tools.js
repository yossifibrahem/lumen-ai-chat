/**
 * Adapter: agent_tools server
 *
 * Covers all four tools provided by the unified agent_tools MCP server:
 *   • view        — read a file or directory listing
 *   • create_file — write a new file with given content
 *   • str_replace — replace a unique string inside a file
 *   • bash_tool   — run a shell command and return stdout/stderr/exit code
 *
 * File operation tools show the active path as strip meta-text so the target
 * file is immediately visible without expanding the arguments block.
 * bash_tool shows the command inline instead.
 *
 * The `description` arg is already stripped globally by visibleToolArgs in
 * mcp_tool_ui.js, so adapters here only need to handle display extras.
 */

import { registerAdapter } from './registry.js';

// ── Shared helper for file-path tools ────────────────────────────────────────

const pathMetaText = {
  getMetaText(args) {
    return args.path ? String(args.path) : '';
  },
};

// ── File operation tools ──────────────────────────────────────────────────────

registerAdapter({
  tools: ['view'],
  usingLabel: 'Viewing file',
  ...pathMetaText,
});

registerAdapter({
  tools: ['create_file'],
  usingLabel: 'Creating file',
  ...pathMetaText,
});

registerAdapter({
  tools: ['str_replace'],
  usingLabel: 'Editing file',
  ...pathMetaText,
});

// ── Shell tool ────────────────────────────────────────────────────────────────

registerAdapter({
  tools: ['bash_tool'],

  usingLabel: 'Running command',

  /**
   * Show the command inline in the strip header.
   * @param {Object} args
   * @returns {string}
   */
  getMetaText(args) {
    return args.command ? String(args.command) : '';
  },
});
