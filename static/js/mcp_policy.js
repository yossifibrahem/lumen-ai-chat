// MCP model prompt policy — local workspace semantics and description-first tool labels.
// Add/remove server-specific model guidance here instead of editing chat.js.

export function buildMcpSystemPrompt({ tools = [], isServerEnabled = () => true } = {}) {
  const enabledTools = tools.filter(tool => isServerEnabled(tool.server));
  if (!enabledTools.length) return '';

  const toolNames = enabledTools.map(tool => `${tool.server}.${tool.name}`).join(', ');
  return [
    'MCP tools are available in this chat: ' + toolNames + '.',
    'The backend scopes filesystem and bash MCP servers to this conversation\'s own working directory: ~/.lumen/working_directory/<chat_id>. Treat relative paths and leading-slash paths like /temp as workspace-rooted paths, not host-root paths.',
    'For every MCP tool call, always provide a concise, human-readable `description` argument first. This description is shown in the chat UI as the live action label, for example: "Reading README.md", "Creating src/app.py", or "Installing packages with npm".',
    'For filesystem edits, view the target file immediately before str_replace, then re-view after successful edits before making further edits to the same file.',
    'Use bash_tool for commands and the filesystem tools for precise file reads/writes/edits. Keep commands scoped to the chat working directory unless the user clearly requests otherwise.',
  ].join('\n');
}
