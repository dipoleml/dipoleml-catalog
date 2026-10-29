export function normalizeCommandToken(token: string): string {
  return getBasename(token).toLowerCase();
}

export function getBasename(token: string): string {
  return (
    token
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.exe$/i, '') ?? token
  );
}

export function extractShortOpts(
  tokens: readonly string[],
  options?: { readonly shortOptsWithValue?: ReadonlySet<string> },
): Set<string> {
  const opts = new Set<string>();
  let pastDoubleDash = false;

  for (const token of tokens) {
    if (token === '--') {
      pastDoubleDash = true;
      continue;
    }
    if (pastDoubleDash) continue;

    if (token.startsWith('-') && !token.startsWith('--') && token.length > 1) {
      for (let i = 1; i < token.length; i++) {
        const char = token[i];
        if (!char || !/[a-zA-Z]/.test(char)) {
          break;
        }
        const shortOpt = `-${char}`;
        opts.add(shortOpt);
        if (options?.shortOptsWithValue?.has(shortOpt)) {
          break;
        }
      }
    }
  }

  return opts;
}

const SHELL_SHORT_VALUE_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  bash: ['O', 'o'],
  dash: ['o'],
  ksh: ['o'],
  sh: ['o'],
  zsh: ['o'],
};
export const BASH_LONG_VALUE_OPTIONS = new Set(['--init-file', '--rcfile']);

export function scanShellShortOptions(
  shell: string,
  token: string,
  nextToken: string | undefined,
  mode: 'startup' | 'argv',
): {
  interactive: boolean;
  followingValues: number;
  commandSelected: boolean;
  stdinMode: boolean;
} {
  let interactive = false;
  let followingValues = 0;
  let commandSelected = false;
  let stdinMode = false;
  for (let optionIndex = 1; optionIndex < token.length; optionIndex++) {
    const option = token[optionIndex];
    if (option === undefined) break;
    if (shell === 'ksh' && option === 'o' && optionIndex + 1 < token.length) {
      if (mode === 'argv') {
        const optionName = token.slice(optionIndex + 1);
        if (
          token[0] === '-' &&
          (optionName === 'c' || (optionName[0] === '-' && optionName.endsWith('c')))
        ) {
          commandSelected = true;
        }
      }
      break;
    }
    if (
      shell === 'ksh' &&
      option === 'o' &&
      optionIndex + 1 === token.length &&
      (nextToken?.startsWith('-') || nextToken?.startsWith('+'))
    ) {
      break;
    }
    if (shell === 'zsh' && option === 'o' && optionIndex + 1 < token.length) break;
    if (mode === 'startup' && option === 'i') interactive = token[0] === '-';
    if (mode === 'argv' && token[0] === '-' && option === 'c') commandSelected = true;
    if (mode === 'argv' && option === 's') stdinMode = token[0] === '-';
    if (!SHELL_SHORT_VALUE_OPTIONS[shell]?.includes(option)) continue;
    if (optionIndex + 1 === token.length) followingValues++;
    break;
  }
  return { interactive, followingValues, commandSelected, stdinMode };
}

export function parseShellArgv(tokens: readonly string[]) {
  const shell = getBasename(tokens[0] ?? '').toLowerCase();
  let commandSelected = false;
  let stdinMode = false;

  for (let index = 1; index < tokens.length; index++) {
    const token = tokens[index];
    if (token === undefined) break;
    if (token === '--') {
      const commandIndex = commandSelected && tokens[index + 1] !== undefined ? index + 1 : null;
      return {
        command: commandIndex === null ? null : (tokens[commandIndex] ?? null),
        commandIndex,
        scriptIndex:
          !commandSelected && !stdinMode && tokens[index + 1] !== undefined ? index + 1 : null,
        readsStdinAsCommands: !commandSelected && (stdinMode || tokens[index + 1] === undefined),
      };
    }
    if (token === '-' || (token[0] !== '-' && token[0] !== '+')) {
      return {
        command: commandSelected ? token : null,
        commandIndex: commandSelected ? index : null,
        scriptIndex: !commandSelected && !stdinMode && token !== '-' ? index : null,
        readsStdinAsCommands: !commandSelected && (stdinMode || token === '-'),
      };
    }
    if (token.startsWith('--')) {
      const option = token.split('=', 1)[0] ?? token;
      if (shell === 'bash' && BASH_LONG_VALUE_OPTIONS.has(option) && !token.includes('=')) index++;
      continue;
    }

    const shortScan = scanShellShortOptions(shell, token, tokens[index + 1], 'argv');
    if (shortScan.commandSelected) commandSelected = true;
    if (shortScan.stdinMode) stdinMode = true;
    index += shortScan.followingValues;
  }

  return {
    command: null,
    commandIndex: null,
    scriptIndex: null,
    readsStdinAsCommands: !commandSelected,
  };
}

export type QuoteScanState = {
  inSingle: boolean;
  inDouble: boolean;
  escaped: boolean;
};

export function advanceQuoteScanState(char: string, state: QuoteScanState): boolean {
  if (state.escaped) {
    state.escaped = false;
    return true;
  }

  if (char === '\\' && !state.inSingle) {
    state.escaped = true;
    return true;
  }

  if (char === "'" && !state.inDouble) {
    state.inSingle = !state.inSingle;
    return true;
  }

  if (char === '"' && !state.inSingle) {
    state.inDouble = !state.inDouble;
    return true;
  }

  return false;
}

export function hasUnclosedQuotes(command: string): boolean {
  const state: QuoteScanState = { inSingle: false, inDouble: false, escaped: false };

  for (const char of stripShellComments(command)) {
    advanceQuoteScanState(char, state);
  }

  return state.inSingle || state.inDouble;
}

function stripShellComments(command: string): string {
  let result = '';
  const state: QuoteScanState = { inSingle: false, inDouble: false, escaped: false };
  let inComment = false;
  let atTokenStart = true;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (!char) break;

    if (inComment) {
      if (char === '\n' || char === '\r') {
        result += char;
        inComment = false;
        state.escaped = false;
      }
      continue;
    }

    if (char === '#' && !state.inSingle && !state.inDouble && atTokenStart) {
      inComment = true;
      continue;
    }

    result += char;
    if (!state.inSingle && !state.inDouble && !state.escaped) {
      atTokenStart = /[\s;&|()<>]/.test(char);
    }
    advanceQuoteScanState(char, state);
  }

  return result;
}
