import { existsSync } from 'node:fs';
import { parseCommandArgs, reportCommandArgErrors } from '@/cli/args';
import type { ShellKind } from '@/core/shell/model';

const SHELL_SAFE_ARGUMENT = /^[A-Za-z0-9_@%+=:,./-]+$/;
const USAGE =
  'Usage: cc-safety-net explain [--json] [--cwd <path>] [--shell <auto|posix|powershell>] <command>';
const SHELL_KINDS = ['auto', 'posix', 'powershell'] as const;

export interface ExplainFlags {
  json: boolean;
  cwd?: string;
  shell?: ShellKind;
  command: string;
}

export function parseExplainFlags(args: string[]): ExplainFlags | null {
  const parsed = parseCommandArgs(
    {
      label: 'explain',
      booleans: { json: ['--json'] },
      values: { cwd: ['--cwd'], shell: ['--shell'] },
      positionals: 'tail',
    },
    args,
  );
  if (reportCommandArgErrors(parsed.errors)) {
    console.error(USAGE);
    console.error('Pass -- before a command that starts with dashes.');
    return null;
  }
  if (parsed.values.cwd !== undefined && !existsSync(parsed.values.cwd)) {
    console.error(`Error: --cwd path does not exist: ${parsed.values.cwd}`);
    return null;
  }
  const shell = SHELL_KINDS.find((kind) => kind === parsed.values.shell);
  if (parsed.values.shell !== undefined && !shell) {
    console.error(`Error: --shell must be auto, posix, or powershell, got: ${parsed.values.shell}`);
    console.error(USAGE);
    return null;
  }

  const command =
    parsed.positionals.length === 1
      ? parsed.positionals[0]
      : parsed.positionals
          .map((argument) =>
            SHELL_SAFE_ARGUMENT.test(argument)
              ? argument
              : `'${argument.replaceAll("'", shell === 'powershell' ? "''" : `'\\''`)}'`,
          )
          .join(' ');
  if (!command) {
    console.error('Error: No command provided');
    console.error(USAGE);
    return null;
  }

  return { json: parsed.flags.json, cwd: parsed.values.cwd, shell, command };
}
