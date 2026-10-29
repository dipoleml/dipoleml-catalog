import {
  BASH_LONG_VALUE_OPTIONS,
  getBasename,
  parseShellArgv,
  scanShellShortOptions,
} from '@/core/shell/tokens';

const BASH_STARTUP_OPTIONS = ['--init-file', '--rcfile'] as const;

/** @internal */
export type ShellStartupEnvironmentName = 'BASH_ENV' | 'ENV';
/** @internal */
export type ShellStartupArgvSource =
  | { readonly kind: 'literal'; readonly value: string }
  | { readonly kind: 'absent' };
export type ShellStartupLoaderMetadata = {
  readonly argvSource: ShellStartupArgvSource | null;
  readonly argvSourceApplies: boolean;
  readonly envName: ShellStartupEnvironmentName | null;
  readonly envSourceApplies: boolean;
};

const SHELL_STARTUP_ENV_NAMES = new Map<string, ShellStartupEnvironmentName>([
  ['bash', 'BASH_ENV'],
  ['dash', 'ENV'],
  ['ksh', 'ENV'],
  ['sh', 'ENV'],
]);

export function extractDashCArg(tokens: readonly string[]): string | null {
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (token === '-c') return getCommandStringAfterDashC(tokens, i, true);
    if (token.startsWith('-') && token.includes('c') && !token.startsWith('--')) {
      const command = getCommandStringAfterDashC(tokens, i, false);
      if (command !== null) return command;
    }
  }
  return null;
}

const SYNTAX_CHECK_OPTION = /^-[cn]+$/;

export function isShellSyntaxCheck(tokens: readonly string[]): boolean {
  const words = tokens.slice(1);
  if (
    words.some((word) => /^[-+]./.test(word) && word !== '--' && !SYNTAX_CHECK_OPTION.test(word))
  ) {
    return false;
  }
  const optionEnd = words.findIndex((word) => !SYNTAX_CHECK_OPTION.test(word));
  return words
    .slice(0, optionEnd === -1 ? undefined : optionEnd)
    .some((word) => word.includes('n'));
}

const OPTION_CLUSTER_TAKING_NO_VALUE = /^-[abcefhiklmnprstuvx]+$/;

export function hasUnidentifiableCommandString(tokens: readonly string[]): boolean {
  const operandIndex = tokens.findIndex(
    (word, index) => index > 0 && !OPTION_CLUSTER_TAKING_NO_VALUE.test(word),
  );
  const words =
    operandIndex === -1 || /^[-+]/.test(tokens[operandIndex] ?? '')
      ? tokens.slice(1)
      : tokens.slice(1, operandIndex + 1);
  if (words.some((word) => word.startsWith('+'))) return true;
  const dashCClusters = words.filter(
    (word) => word.startsWith('-') && !word.startsWith('--') && word.includes('c'),
  );
  if (dashCClusters.length === 0) return false;
  const command = extractDashCArg(tokens);
  if (command === null) {
    return words.some((word) => word.startsWith('-') && !dashCClusters.includes(word));
  }
  return /^[-+]/.test(command) || dashCClusters.some((word) => /[oO]/.test(word));
}

function getCommandStringAfterDashC(
  tokens: readonly string[],
  dashCIndex: number,
  allowDashCommand: boolean,
): string | null {
  if (tokens[dashCIndex + 1] === '--') return tokens[dashCIndex + 2] || null;
  const commandString = tokens[dashCIndex + 1];
  if (!commandString || (!allowDashCommand && commandString.startsWith('-'))) return null;
  return commandString;
}

export function extractShellStartupLoaderMetadata(
  tokens: readonly string[],
): ShellStartupLoaderMetadata {
  const shell = getBasename(tokens[0] ?? '').toLowerCase();
  const parsed = parseShellStartupArgv(tokens, shell);
  const envName = SHELL_STARTUP_ENV_NAMES.get(shell) ?? null;
  const valid = parsed.argvSource?.kind !== 'absent';
  return {
    argvSource: shell === 'bash' ? parsed.argvSource : null,
    argvSourceApplies:
      shell === 'bash' && parsed.interactive && parsed.argvSource?.kind === 'literal',
    envName,
    envSourceApplies:
      valid &&
      (envName === 'BASH_ENV' ? !parsed.interactive : envName === 'ENV' && parsed.interactive),
  };
}

function parseShellStartupArgv(
  tokens: readonly string[],
  shell: string,
): { argvSource: ShellStartupArgvSource | null; interactive: boolean } {
  const parsed = parseShellArgv(tokens);
  const boundary = parsed.commandIndex ?? parsed.scriptIndex ?? tokens.length;
  const sources: ShellStartupArgvSource[] = [];
  let interactive = false;
  let bashLongOptionsOpen = true;

  for (let index = 1; index < boundary; index++) {
    const token = tokens[index];
    if (
      token === undefined ||
      token === '--' ||
      token === '-' ||
      (token[0] !== '-' && token[0] !== '+')
    ) {
      break;
    }

    if (token.startsWith('--')) {
      const option =
        shell === 'bash' && bashLongOptionsOpen
          ? BASH_STARTUP_OPTIONS.find((candidate) => token === candidate)
          : undefined;
      if (option) {
        const value = tokens[index + 1];
        sources.push(value === undefined ? { kind: 'absent' } : { kind: 'literal', value });
        index++;
        continue;
      }

      const longOption = token.split('=', 1)[0] ?? token;
      if (shell === 'bash' && BASH_LONG_VALUE_OPTIONS.has(longOption) && !token.includes('=')) {
        index++;
      }
      continue;
    }

    if (shell === 'bash') bashLongOptionsOpen = false;
    const shortScan = scanShellShortOptions(shell, token, tokens[index + 1], 'startup');
    if (shortScan.interactive) interactive = token[0] === '-';
    index += shortScan.followingValues;
  }

  return { argvSource: sources.at(-1) ?? null, interactive };
}
