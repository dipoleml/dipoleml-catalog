import { execFile } from 'node:child_process';
import type { Context, Plugin } from '@opencode/plugin/effect/plugin';
import type { ToolHooks } from '@opencode/plugin/effect/tool';
import { Tool } from '@opencode/schema/tool';
import { Effect } from 'effect';
import { getNonCommandToolInputKind } from '@/core/tool-input';
import { quoteShellWord } from '@/gate/analyzer/shell-execution';
import type { ToolRoute } from '@/gate/invocation';
import { loadBuiltinCommands } from './builtin-commands/commands';
import {
  evaluateOpenCodeTool,
  OPENCODE_V2_COMMAND_TOOL,
  resolveOpenCodeShellRoute,
} from './plugin';

const OPENCODE_WORKTREE_REMOVE_TOOL = 'opencode_worktree_remove';
const POSIX_SHELL_PROBE = 'x=ccsn; case $x in ccsn) echo $x-posix;; esac';
const POSIX_SHELL_PROBE_TIMEOUT_MS = 10_000;
const posixShellChecks = new Map<string, Promise<boolean>>();

type V2Context = Pick<Context, 'options' | 'shell'> & {
  location: Pick<Context['location'], 'directory'>;
  tool: {
    hook: (
      name: 'execute.before',
      callback: (event: ToolHooks['execute.before']) => Effect.Effect<void, Tool.Error>,
    ) => ReturnType<Context['tool']['hook']>;
  };
  command: Pick<Context['command'], 'transform' | 'list'>;
  session: Pick<Context['session'], 'prompt'>;
};

export function createOpenCodeV2Plugin() {
  return {
    id: 'cc-safety-net',
    effect: (ctx: V2Context) =>
      Effect.gen(function* () {
        const shell = ctx.options.shell ?? (process.platform === 'win32' ? 'powershell' : 'posix');
        if (shell !== 'posix' && shell !== 'powershell') {
          return yield* Effect.die(
            new Error('CC Safety Net: plugin option shell must be posix or powershell.'),
          );
        }
        yield* ctx.tool.hook('execute.before', (event) =>
          Effect.try({
            try: () =>
              evaluateOpenCodeTool({
                configCwd: ctx.location.directory,
                expandHomeWorkdir: true,
                tool: event.tool,
                sessionID: event.sessionID,
                ...getOpenCodeV2ToolCall(event.tool, event.input, shell),
              }),
            catch: (error) =>
              new Tool.Error({ message: error instanceof Error ? error.message : String(error) }),
          }),
        );
        // The tool event does not expose the resolved executable.
        yield* ctx.shell.hook('create.before', (event) =>
          Effect.promise(
            async () =>
              resolveOpenCodeShellRoute(event.shell) === shell &&
              (shell === 'powershell' ||
                runsPosixShellSyntax(event.shell, event.env, ctx.location.directory)),
          ).pipe(
            Effect.flatMap((matches) =>
              matches
                ? Effect.void
                : Effect.die(
                    new Error(
                      `CC Safety Net: actual shell "${event.shell}" does not match plugin option shell "${shell}". Configure the plugin's shell option to match OpenCode; supported dialects are posix and powershell.`,
                    ),
                  ),
            ),
          ),
        );
        const commands = yield* ctx.command.list().pipe(Effect.orDie);
        if (commands.data.some((command) => command.name === 'cc-safety-net')) return;
        yield* ctx.command.transform((editor) => {
          const command = loadBuiltinCommands()['cc-safety-net'];
          if (!command) return;
          editor.add({
            name: 'cc-safety-net',
            description: command.description,
            execute: (input) =>
              ctx.session
                .prompt({
                  // oxlint-disable-next-line typescript/no-misused-spread -- forwarded as data; OpenCode reads the prompt's fields, never its prototype.
                  ...input.prompt,
                  sessionID: input.sessionID,
                  delivery: input.delivery,
                  text: `${command.template}\n\n${input.prompt.text}`,
                })
                .pipe(Effect.asVoid),
          });
        });
      }),
  } satisfies Plugin;
}

function getOpenCodeV2ToolCall(
  tool: string,
  input: unknown,
  shell: 'posix' | 'powershell',
): { toolInput: unknown; route: ToolRoute } {
  if (tool === OPENCODE_V2_COMMAND_TOOL)
    return { toolInput: input, route: { kind: 'command', shell } };
  const forced =
    typeof input === 'object' && input !== null && 'force' in input && input.force === true;
  if (tool !== OPENCODE_WORKTREE_REMOVE_TOOL || !forced) {
    return { toolInput: input, route: { kind: getNonCommandToolInputKind(tool) } };
  }
  const directory =
    'directory' in input && typeof input.directory === 'string' ? input.directory : '';
  return {
    toolInput: { command: `git worktree remove --force -- ${quoteShellWord(directory)}` },
    route: { kind: 'command', shell: 'posix' },
  };
}

function runsPosixShellSyntax(shell: string, env: NodeJS.ProcessEnv, cwd: string) {
  const pending = posixShellChecks.get(shell);
  if (pending) return pending;
  const check = new Promise<boolean>((resolve) => {
    const abort = new AbortController();
    const deadline = setTimeout(() => {
      abort.abort();
      resolve(false);
    }, POSIX_SHELL_PROBE_TIMEOUT_MS);
    execFile(
      shell,
      ['-c', POSIX_SHELL_PROBE],
      { cwd, env, signal: abort.signal, killSignal: 'SIGKILL' },
      (error, stdout) => {
        clearTimeout(deadline);
        resolve(error === null && stdout.includes('ccsn-posix'));
      },
    );
  }).then((passed) => {
    if (!passed) posixShellChecks.delete(shell);
    return passed;
  });
  posixShellChecks.set(shell, check);
  return check;
}
