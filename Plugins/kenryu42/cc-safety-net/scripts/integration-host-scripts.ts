export const PI_HOST_SCRIPT = `
import { pathToFileURL } from 'node:url';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const parsed = JSON.parse(input);
const requests = Array.isArray(parsed) ? parsed : [parsed];
const events = new Map();
const commands = new Map();
const sentMessages = [];
const pi = {
  on(name, handler) {
    events.set(name, handler);
  },
  registerCommand(name, command) {
    commands.set(name, command);
  },
  sendUserMessage(content, options) {
    sentMessages.push({ content, options });
  },
};
const extension = (await import(pathToFileURL(process.argv[1]).href)).default;
await extension(pi);

const results = [];
for (const request of requests) {
  if (request.kind === 'registration') {
    await commands.get('cc-safety-net').handler(request.commandArgs, {
      isIdle: () => request.idle,
    });
    results.push({
      eventNames: [...events.keys()],
      commandNames: [...commands.keys()],
      commandDescription: commands.get('cc-safety-net').description,
      sentMessages: [...sentMessages],
    });
    continue;
  }
  const result = await events.get('tool_call')(request.event, {
    cwd: process.cwd(),
    sessionManager: { getSessionId: () => request.sessionId },
  });
  results.push({ result: result ?? null });
}
process.stdout.write(JSON.stringify(Array.isArray(parsed) ? { results } : results[0]));
`;

export const DEEPSEEK_HARNESS_HOST_SCRIPT = `
import { pathToFileURL } from 'node:url';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
const plugin = (await import(pathToFileURL(process.argv[1]).href)).default;
const guards = [];
const postExecuteListeners = [];
plugin.apply({
  tools: {
    guard(guard) {
      guards.push(guard);
      return () => {};
    },
  },
  on(event, listener) {
    if (event === 'tools/post-execute') postExecuteListeners.push(listener);
    return () => {};
  },
});
const execution = {
  name: request.tool ?? 'bash',
  arguments: { command: request.command },
  agent: { session: { header: { id: request.sessionId, cwd: process.cwd() } } },
};
const reason = guards[0](execution);
const postExecute = request.tool
  ? await postExecuteListeners[0](execution, {}, async () => ({ kind: 'accept' }))
  : null;
process.stdout.write(
  JSON.stringify({ guards: guards.length, reason: reason ?? null, postExecute }),
);
`;

export const AMP_HOST_SCRIPT = `
import { pathToFileURL, fileURLToPath } from 'node:url';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
const plugin = (await import(pathToFileURL(request.artifact).href)).default;
let handler;
const amp = {
  system: { workspaceRoot: pathToFileURL(request.workspaceRoot).href },
  helpers: {
    filePathFromURI: (uri) => fileURLToPath(uri),
    shellCommandFromToolCall: (event) =>
      event.tool === 'Bash' ? { command: event.input.command } : null,
  },
  on: (name, registered) => {
    if (name === 'tool.call') handler = registered;
  },
};
plugin(amp);
const result = await handler({
  tool: 'Bash',
  input: { command: request.command },
  thread: { id: request.threadId },
});
process.stdout.write(JSON.stringify(result));
`;

/** @internal */
export const OPENCLAW_HOST_SCRIPT = `
import { pathToFileURL } from 'node:url';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
const plugin = (await import(pathToFileURL(process.argv[1]).href)).default;
let registration;
let handler;
plugin.register({
  config: { marker: 'openclaw-host-config' },
  runtime: {
    agent: {
      resolveAgentWorkspaceDir: (config, agentId) =>
        config.marker === 'openclaw-host-config' && agentId === request.agentId
          ? request.workspaceDir
          : undefined,
    },
  },
  on: (hookName, registered, options) => {
    registration = { hookName, ...options };
    handler = registered;
  },
});
const result = await handler(
  { toolName: request.toolName, params: request.params },
  { toolName: request.toolName, agentId: request.agentId, sessionId: request.sessionId },
);
process.stdout.write(JSON.stringify({
  id: plugin.id,
  name: plugin.name,
  registration,
  result: result ?? null,
}));
`;

export const OPENCODE_HOST_SCRIPT = `
import { pathToFileURL } from 'node:url';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const parsed = JSON.parse(input);
const requests = Array.isArray(parsed) ? parsed : [parsed];
const pluginModule = await import(pathToFileURL(process.argv[1]).href);
// OpenCode >=1.18.29 prefers the object entrypoint, without also invoking named exports.
const factories = [pluginModule.default.server];
const pluginInput = {
  client: {},
  project: {},
  directory: process.cwd(),
  worktree: process.cwd(),
  experimental_workspace: { register() {} },
  serverUrl: new URL('http://127.0.0.1:4096'),
  $: () => {},
};
const hooks = await Promise.all(factories.map((factory) => factory(pluginInput)));

const results = [];
for (const request of requests) {
  if (request.kind === 'config') {
    for (const hook of hooks) await hook.config?.(request.config);
    results.push({
      exportNames: Object.keys(pluginModule),
      pluginCount: hooks.length,
      commandNames: Object.keys(request.config.command ?? {}),
      existingCommand: request.config.command?.existing,
    });
    continue;
  }
  try {
    for (const hook of hooks) {
      await hook['tool.execute.before']?.(
        { tool: request.tool, sessionID: request.sessionId, callID: request.sessionId + '-call' },
        { args: request.args },
      );
    }
    results.push({ allowed: true });
  } catch (error) {
    results.push({
      allowed: false,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
process.stdout.write(JSON.stringify(Array.isArray(parsed) ? { results } : results[0]));
`;
