# Lumen — Flask AI Chatbot

A sleek, feature-rich AI chatbot with streaming, Markdown/LaTeX rendering, MCP tool calling, and persistent conversations.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run
python app.py
# → Open http://localhost:8080
```

## Features

| Feature | Details |
|---|---|
| **Streaming** | Real-time token-by-token response via SSE |
| **Markdown + LaTeX** | Full GitHub Flavored Markdown + KaTeX math rendering |
| **Code Highlighting** | Syntax highlighting via highlight.js with copy button |
| **OpenAI-compatible** | Works with OpenAI, Ollama, LM Studio, Groq, Together, etc. |
| **Model Fetch** | Auto-fetch available models from any API endpoint |
| **Persistent Conversations** | Saved as JSON files in `./conversations/` |
| **MCP Tool Calling** | Configure MCP servers in `mcp.json` |
| **Workspace File Panel** | Browse each chat's `/workspace`, resize the panel, open files in a full-panel preview, copy text contents, and download any file |
| **Tool Confirmation** | Every tool call shows name + arguments; requires user approval |

## Settings

Go to **Settings** tab:
- Set your **API Base URL** (e.g., `http://localhost:11434/v1` for Ollama)
- Enter your **API Key**
- Click **Fetch Models** to auto-discover available models
- Click a model chip to select it
- Optionally set a **System Prompt**

## MCP Tool Calling

Edit `mcp.json` or use the **MCP** tab in the UI:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {}
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-key-here"
      }
    }
  }
}
```

Click **Reload Tools** to connect and list available tools. When the model requests a tool, you'll see a confirmation card with the tool name and arguments before anything executes.

## File Structure

```
chatbot/
├── app.py                  # App factory + entry point
├── routes.py               # Thin HTTP routes (one Blueprint)
├── chat_turn_service.py    # Persistent chat turn orchestration + title generation
├── workspace_service.py    # /workspace path safety, file listing, preview, uploads
├── store.py                # Conversation persistence (file-system CRUD)
├── mcp_service.py          # MCP config, tool discovery, tool invocation
├── streaming.py            # SSE formatting + OpenAI stream loop
├── mcp.json                # MCP server configuration (auto-created)
├── requirements.txt
├── conversations/          # Saved conversations (auto-created)
├── templates/
│   └── index.html          # App shell (no inline CSS or JS)
└── static/
    ├── css/
    │   └── main.css        # All styles
    └── js/
        ├── app.js          # Entry point — event binding + boot
        ├── state.js        # Shared state object + constants
        ├── storage.js      # localStorage wrapper
        ├── api.js          # Typed HTTP client
        ├── markdown.js     # Markdown + LaTeX rendering pipeline
        ├── renderer.js     # DOM rendering (messages, tool dialogs)
        ├── format.js       # Shared client-side formatting helpers
        ├── conversations.js# Conversation list, open, create, delete
        ├── settings.js     # Settings load/save, model list
        ├── mcp.js          # MCP config, tool list, tool execution
        ├── chat.js         # SSE stream loop + tool-call orchestration
        └── ui.js           # Toast, modals, sidebar, input helpers
```

## Compatible APIs

- **OpenAI** → `https://api.openai.com/v1`
- **Ollama** → `http://localhost:11434/v1`
- **LM Studio** → `http://localhost:1234/v1`
- **Groq** → `https://api.groq.com/openai/v1`
- **Together AI** → `https://api.together.xyz/v1`
- **Anthropic (via proxy)** → any OpenAI-compatible proxy


## Optimized Bash + Filesystem MCP Setup

Lumen now treats the companion `bash-mcp-server` and `filesystem-mcp-server` as first-class chat tools:

- Each conversation gets a persistent workspace at `~/.lumen/containers/<chat_id>`.
- Host-runtime MCP servers receive that host path as `WORKING_DIR`, `PWD`, and process `cwd`; container-runtime MCP servers receive `/workspace`, mounted from the same host folder.
- The chat UI displays each tool call by its required `description` argument instead of the raw tool name, e.g. `Reading README.md` or `Installing packages with npm`.
- App-level MCP behavior is isolated in `mcp_adapters.py`, `static/js/mcp_policy.js`, and `static/js/mcp_tool_ui.js`, so future server quirks can be added/removed without scattering changes across routes or render code.

### Recommended local configuration

Build both servers first:

```bash
cd bash-mcp-server-main && npm install && npm run build
cd ../filesystem-mcp-server-main && npm install && npm run build
```

Then open **Settings → MCP Servers**, add the built server paths manually in `mcp.json`, click **Save Config**, then **Reload Tools**:

```json
{
  "mcpServers": {
    "BASH_MCP_SERVER": {
      "command": "node",
      "args": ["/absolute/path/to/bash-mcp-server-main/dist/index.js"],
      "env": {}
    },
    "FILESYSTEM_MCP_SERVER": {
      "command": "node",
      "args": ["/absolute/path/to/filesystem-mcp-server-main/dist/index.js"],
      "env": {}
    }
  }
}
```

---

## Per-Chat Container Isolation

MCP servers run on the host by default. Local tools that should be isolated must explicitly opt into a per-chat Docker container with `"runtime": "container"`. For backward compatibility, `"sandbox": true` also works. Server names such as `bash` or `filesystem` are **not** containerized automatically.

Each containerized conversation uses its own Docker container (`lumen-chat-<conv_id>`), so bash commands, Python package installs, and filesystem writes are isolated from the host OS and from other chats.

### How it works

| Layer | What changes |
|---|---|
| **Default MCP runtime** | Host, unless `"runtime": "container"` is set |
| **Host workspace** | `~/.lumen/containers/<conv_id>/` |
| **In-container path** | `/workspace` |
| **MCP invocation** | `docker exec -i --workdir /workspace --env WORKING_DIR=/workspace lumen-chat-<conv_id> ...` |
| **Container lifetime** | Created on first containerized tool call, removed when conversation is deleted |

### Quick start

```bash
# 1. Build the sandbox image once per machine, or whenever Dockerfile.sandbox changes
docker build -f Dockerfile.sandbox -t lumen-sandbox .

# 2. Run the app as normal
python app.py
```

Containers are started automatically on the first containerized MCP tool call. Deleting a conversation removes both its Docker container and its host workspace folder. Orphaned `lumen-chat-*` containers from previous runs are removed at startup.

### Runtime config

Host runtime, useful for remote MCP servers such as Exa:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.exa.ai/mcp"]
    }
  }
}
```

Container runtime, useful for local bash/filesystem/code execution tools:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["/path/to/filesystem-mcp-server/dist/index.js"],
      "runtime": "container"
    }
  }
}
```

Legacy config still works:

```json
{
  "sandbox": true
}
```

Important safety behavior: if a server is configured for container runtime and Docker cannot start the container, the server does **not** fall back to host execution. The tool fails closed instead.

### Container API

```
GET /api/conversations/<conv_id>/container
→ { "status": "running"|"stopped"|"missing", "container_name": "lumen-chat-…", "workspace": "…" }

GET /api/conversations/<conv_id>/files?path=/workspace
→ List files/folders in the chat workspace

GET /api/conversations/<conv_id>/files/content?path=/workspace/app.py
→ Preview text/code/Markdown in the workspace panel; binary files are download-only

GET /api/conversations/<conv_id>/files/download?path=/workspace/app.py
→ Download any file from the chat workspace
→ Preview text/code/Markdown files when safe

GET /api/conversations/<conv_id>/files/download?path=/workspace/output.zip
→ Download any file from the chat workspace
```

### Resource limits (defaults)

| Limit | Value |
|---|---|
| Memory | 512 MB |
| CPUs | 1 |
| Network | bridge |
| Capabilities | minimal (CHOWN, DAC_OVERRIDE, SETUID, SETGID) |

Override these with environment variables instead of editing code:

```bash
export LUMEN_SANDBOX_IMAGE=lumen-sandbox
export LUMEN_CONTAINERS_ROOT=~/.lumen/containers
export LUMEN_CONTAINER_MEMORY=512m
export LUMEN_CONTAINER_CPUS=1
export LUMEN_CONTAINER_NETWORK=bridge
export LUMEN_CONTAINER_PREFIX=lumen-chat-
```
