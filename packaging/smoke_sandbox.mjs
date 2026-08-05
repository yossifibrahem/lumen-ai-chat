/** Exercise every bundled MCP tool from inside the disposable sandbox. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createInterface } from 'node:readline';

const ENTRYPOINT = '/opt/lumen/mcp/computer-use/dist/index.js';
const WORKSPACE = '/tmp/lumen-mcp-smoke';
const EXPECTED_TOOLS = ['bash_tool', 'create_file', 'str_replace', 'view'];

let nextId = 1;
const pending = new Map();
const server = spawn('node', [ENTRYPOINT], {
  env: { ...process.env, TRANSPORT: 'stdio' },
  stdio: ['pipe', 'pipe', 'pipe'],
});
let stderr = '';
server.stderr.on('data', chunk => { stderr += chunk.toString(); });

const lines = createInterface({ input: server.stdout });
lines.on('line', line => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  const waiter = pending.get(message.id);
  if (waiter) {
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    waiter.resolve(message);
  }
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`MCP request timed out: ${method}\n${stderr}`));
    }, 15_000);
    pending.set(id, { resolve, reject, timer });
    server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

async function callTool(name, args) {
  const response = await send('tools/call', { name, arguments: args });
  if (response.error) throw new Error(`${name}: ${JSON.stringify(response.error)}`);
  const text = (response.result.content || []).map(item => item.text || '').join('');
  if (response.result.isError) throw new Error(`${name}: ${text}`);
  return text;
}

async function main() {
  fs.rmSync(WORKSPACE, { recursive: true, force: true });
  fs.mkdirSync(WORKSPACE, { recursive: true });

  await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'lumen-sandbox-smoke', version: '1.0' },
  });

  const listed = await send('tools/list');
  const tools = listed.result.tools.map(tool => tool.name).sort();
  if (JSON.stringify(tools) !== JSON.stringify(EXPECTED_TOOLS)) {
    throw new Error(`unexpected tools: ${JSON.stringify(tools)}`);
  }

  const path = `${WORKSPACE}/smoke.txt`;
  await callTool('create_file', {
    description: 'sandbox smoke test', path, file_text: 'alpha beta\n',
  });
  await callTool('str_replace', {
    description: 'sandbox smoke test', path, old_str: 'alpha', new_str: 'lumen',
  });
  const viewed = await callTool('view', {
    description: 'sandbox smoke test', path,
  });
  if (!viewed.includes('lumen beta')) throw new Error(`unexpected view output: ${viewed}`);

  const bashText = await callTool('bash_tool', {
    description: 'sandbox smoke test',
    command: `test -f ${path} && printf mcp-ok`,
  });
  const bashResult = JSON.parse(bashText);
  if (bashResult.returncode !== 0 || !bashResult.stdout.includes('mcp-ok')) {
    throw new Error(`unexpected bash output: ${bashText}`);
  }

  console.log(JSON.stringify({ tools, workspace_write: true, bash: true }));
}

try {
  await main();
} finally {
  server.kill('SIGTERM');
  lines.close();
}
