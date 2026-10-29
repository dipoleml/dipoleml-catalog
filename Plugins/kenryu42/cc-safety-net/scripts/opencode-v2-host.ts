export const OPENCODE_V2_HOST_SCRIPT = `
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { AppNodeBuilder } from '@opencode/core/effect/app-node-builder';
import { Image } from '@opencode/core/image';
import { PluginHooks } from '@opencode/core/plugin/hooks';
import { Tool } from '@opencode/core/tool';
import { LayerNode } from '@opencode/util/effect/layer-node';
import { Effect, Layer, Schema } from 'effect';

const plugin = (await import(pathToFileURL(process.argv[1]).href)).default;
const layer = AppNodeBuilder.build(LayerNode.group([Tool.node, PluginHooks.node]), [
  Image.node.replace(Layer.mock(Image.Service, {})),
]);
await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
  const hooks = yield* PluginHooks.Service;
  const tools = yield* Tool.Service;
  const commands = [];
  yield* plugin.effect({
    location: { directory: process.cwd() }, options: { shell: 'posix' },
    tool: { hook: (name, callback) => hooks.register('tool', name, callback) },
    shell: { hook: (name, callback) => hooks.register('shell', name, callback) },
    command: {
      list: () => Effect.succeed({ data: [] }),
      transform: (callback) => Effect.sync(() => {
        callback({ add: (command) => commands.push(command) });
        return { dispose: Effect.void };
      }),
    },
    session: { prompt: () => Effect.die('unexpected prompt') },
  });
  assert.deepEqual(commands.map(command => command.name), ['cc-safety-net']);
  let executions = 0;
  const definition = (codemode) => ({
    name: 'shell', description: 'Test shell executor, never runs command text',
    options: { codemode }, input: Schema.Struct({ command: Schema.String }),
    execute: () => Effect.sync(() => { executions++; return { content: 'executed' }; }),
  });
  const request = (name, input) => ({
    sessionID: 'ses_packed-v2', agent: 'build', messageID: 'msg_packed-v2',
    call: { type: 'tool-call', id: 'call_packed-v2', name, input },
  });
  yield* tools.transform(editor => editor.add(definition(false)));
  const direct = yield* tools.snapshot();
  yield* direct.execute(request('shell', { command: 'git status' }));
  assert.equal(executions, 1);
  const denied = yield* direct.execute(request('shell', { command: 'git reset --hard' })).pipe(Effect.flip);
  assert.equal(denied._tag, 'Tool.Error');
  assert.match(denied.message, /git.reset-hard/);
  assert.equal(executions, 1);
  yield* tools.transform(editor => editor.add(definition(true)));
  const nested = yield* tools.snapshot();
  const result = yield* nested.execute(request('execute', {
    code: 'return await tools.shell({ command: "git reset --hard" })',
  })).pipe(Effect.result);
  assert.match(JSON.stringify(result), /git.reset-hard/);
  assert.equal(executions, 1);
  const shellEvent = { shell: '/bin/bash', command: 'echo safe', cwd: process.cwd(), timeout: 1000, env: {} };
  yield* hooks.trigger('shell', 'create.before', shellEvent);
  const mismatch = yield* hooks.trigger('shell', 'create.before', { ...shellEvent, shell: '/bin/pwsh' }).pipe(Effect.exit);
  assert.equal(mismatch._tag, 'Failure');
  process.stdout.write('OpenCode v2 registry: safe execution, typed denial, Code Mode denial, shell mismatch passed\\n');
})).pipe(Effect.provide(layer)));
`;
