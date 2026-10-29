'use strict';

const DEFAULT_PROTECTED_BRANCHES = ['main', 'master'];

// A .env-style target that is not a template file. The first lookahead stops
// partial-name matches like ".envx"; the second exempts names ending in
// .example, .sample, or .template.
const ENV_WRITE_TARGET =
  '\\.env(?![\\w-])(?![\\w.-]*\\.(?:example|sample|template)(?!\\S))';

const SECRETS_PATTERNS = [
  { regex: /\bcat\s+.*\.env(\b|\.)/, label: 'cat .env (secrets)' },
  { regex: /\bsource\s+.*\.env(\b|\.)/, label: 'source .env (secrets)' },
  { regex: /\bhead\s+.*\.env(\b|\.)/, label: 'head .env (secrets)' },
  { regex: /\btail\s+.*\.env(\b|\.)/, label: 'tail .env (secrets)' },
  { regex: /\bgrep\b.*\.env(\b|\.)/, label: 'grep .env (secrets)' },
  { regex: /\bless\s+.*\.env(\b|\.)/, label: 'less .env (secrets)' },
  { regex: /\bmore\s+.*\.env(\b|\.)/, label: 'more .env (secrets)' },
  { regex: new RegExp('>{1,2}\\s*\\S*' + ENV_WRITE_TARGET), label: 'redirect to .env (secrets write)' },
  { regex: new RegExp('\\btee\\s+.*' + ENV_WRITE_TARGET), label: 'tee to .env (secrets write)' },
  { regex: new RegExp('\\b(?:cp|mv)\\b[^;&|>]*\\s\\S*' + ENV_WRITE_TARGET + '[\\w.-]*\\s*(?:$|[;&|])'), label: 'cp/mv to .env (secrets write)' },
];

const ALL_PATTERNS = [
  { regex: /\bgit\s+push\s+.*--delete\b/, label: 'git push --delete' },
  { regex: /\bgit\s+push\s+\S+\s+:/, label: 'git push --delete' },
  { regex: /\bgit\s+push\b/, label: 'git push' },
  { regex: /\bgh\s+pr\s+create\b/, label: 'gh pr create' },
  { regex: /gh\.exe"\s+pr\s+create\b/, label: 'gh pr create' },
  { regex: /\bgh\s+pr\s+merge\b/, label: 'gh pr merge' },
  { regex: /gh\.exe"\s+pr\s+merge\b/, label: 'gh pr merge' },
  { regex: /\bgh\s+pr\s+close\b/, label: 'gh pr close' },
  { regex: /gh\.exe"\s+pr\s+close\b/, label: 'gh pr close' },
  { regex: /\bgh\s+pr\s+(comment|edit)\b/, label: 'gh pr comment/edit' },
  { regex: /gh\.exe"\s+pr\s+(comment|edit)\b/, label: 'gh pr comment/edit' },
  { regex: /\bgh\s+issue\s+(create|comment|edit)\b/, label: 'gh issue create/comment/edit' },
  { regex: /gh\.exe"\s+issue\s+(create|comment|edit)\b/, label: 'gh issue create/comment/edit' },
  { regex: /\bgh\s+issue\s+close\b/, label: 'gh issue close' },
  { regex: /gh\.exe"\s+issue\s+close\b/, label: 'gh issue close' },
  { regex: /\bgh\s+issue\s+delete\b/, label: 'gh issue delete' },
  { regex: /gh\.exe"\s+issue\s+delete\b/, label: 'gh issue delete' },
  { regex: /\bgh\s+release\s+create\b/, label: 'gh release create' },
  { regex: /gh\.exe"\s+release\s+create\b/, label: 'gh release create' },
  { regex: /\bgh\s+repo\s+fork\b/, label: 'gh repo fork' },
  { regex: /gh\.exe"\s+repo\s+fork\b/, label: 'gh repo fork' },
  { regex: /\bgh\s+api\b.*--method\s+(POST|PUT|PATCH|DELETE)/i, label: 'gh api (mutating)' },
  { regex: /gh\.exe"\s+api\b.*--method\s+(POST|PUT|PATCH|DELETE)/i, label: 'gh api (mutating)' },
];

const DEFAULT_HARD = [
  'gh pr merge', 'gh pr close',
  'gh issue close', 'gh issue delete',
  'gh release create', 'gh repo fork',
  'gh api (mutating)', 'git push --delete',
];

const DEFAULT_SOFT = [];

const DEFAULT_ALLOW = [
  'git push',
  'gh pr create', 'gh pr comment/edit',
  'gh issue create/comment/edit',
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readStringList(externalActions, key, fallback, options = {}) {
  if (!Object.prototype.hasOwnProperty.call(externalActions, key)) return fallback;
  const value = externalActions[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`policy.externalActions.${key} must be an array of strings`);
  }
  if (!value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)) {
    throw new TypeError(`policy.externalActions.${key} must contain only non-empty strings`);
  }
  if (options.nonEmpty && value.length === 0) return fallback;
  return value;
}

function readExternalActionPolicy(config) {
  if (!isObject(config)) throw new TypeError('external-action config must be an object');
  if (config.policy !== undefined && !isObject(config.policy)) {
    throw new TypeError('policy must be an object');
  }
  const configured = config.policy?.externalActions;
  if (configured !== undefined && !isObject(configured)) {
    throw new TypeError('policy.externalActions must be an object');
  }
  const externalActions = configured || {};
  return {
    protectedBranches: readStringList(
      externalActions,
      'protectedBranches',
      DEFAULT_PROTECTED_BRANCHES,
      { nonEmpty: true }
    ),
    hard: readStringList(externalActions, 'hard', DEFAULT_HARD),
    soft: readStringList(externalActions, 'soft', DEFAULT_SOFT),
    allow: readStringList(externalActions, 'allow', DEFAULT_ALLOW),
  };
}

function getTier(label, policy) {
  if (!policy || !Array.isArray(policy.hard) || !Array.isArray(policy.soft) || !Array.isArray(policy.allow)) {
    return 'hard';
  }
  if (policy.hard.includes(label)) return 'hard';
  if (policy.soft.includes(label)) return 'soft';
  if (policy.allow.includes(label)) return 'allow';
  return 'hard';
}

function tokenizeShellCommands(command) {
  const commands = [];
  let tokens = [];
  let token = '';
  let quote = null;
  let escaped = false;

  const pushToken = () => {
    if (token.length > 0) tokens.push(token);
    token = '';
  };
  const pushCommand = () => {
    pushToken();
    if (tokens.length > 0) commands.push(tokens);
    tokens = [];
  };

  for (let index = 0; index < command.length; index++) {
    const char = command[index];
    if (escaped) {
      token += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && !quote) {
      const next = command[index + 1];
      // Preserve Windows path separators. Outside quotes, a backslash only
      // behaves as an escape here when it precedes shell syntax that affects
      // token boundaries; treating every backslash as an escape turns
      // C:\\Git\\bin\\git.exe into an unrecognizable executable name.
      if (next && /[\s"'\\;&|]/.test(next)) escaped = true;
      else token += '\\';
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else token += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      pushToken();
      if (char === '\n' || char === '\r') pushCommand();
      continue;
    }
    if (char === ';' || char === '&' || char === '|') {
      pushCommand();
      continue;
    }
    token += char;
  }
  if (escaped) token += '\\';
  pushCommand();
  return commands;
}

function isGitExecutable(token) {
  return /(?:^|[/\\])git(?:\.exe)?$/i.test(token);
}

function executableName(token) {
  return String(token || '').replace(/\\/g, '/').split('/').pop().toLowerCase();
}

function unwrapGitCommand(tokens) {
  let index = 0;
  while (index < tokens.length) {
    const executable = executableName(tokens[index]);
    if (executable === 'env' || executable === 'env.exe') {
      index++;
      while (index < tokens.length && (
        tokens[index].startsWith('-')
        || /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index])
      )) index++;
      continue;
    }
    if (executable === 'command') {
      index++;
      while (index < tokens.length && tokens[index].startsWith('-')) index++;
      continue;
    }
    if (executable === 'call' || executable === 'exec') {
      index++;
      if (tokens[index] === '--') index++;
      continue;
    }
    return isGitExecutable(tokens[index]) ? tokens.slice(index) : null;
  }
  return null;
}

function wrapperScript(tokens) {
  const executable = executableName(tokens[0]);
  let flagIndex = -1;
  if (['bash', 'bash.exe', 'sh', 'sh.exe', 'zsh', 'zsh.exe'].includes(executable)) {
    flagIndex = tokens.findIndex((token, index) => index > 0 && token === '-c');
  } else if (['cmd', 'cmd.exe'].includes(executable)) {
    flagIndex = tokens.findIndex((token, index) => index > 0 && token.toLowerCase() === '/c');
  } else if (['powershell', 'powershell.exe', 'pwsh', 'pwsh.exe'].includes(executable)) {
    flagIndex = tokens.findIndex((token, index) =>
      index > 0 && ['-command', '-c'].includes(token.toLowerCase())
    );
  }
  if (flagIndex < 0 || flagIndex + 1 >= tokens.length) return null;
  return tokens.slice(flagIndex + 1).join(' ');
}

function executableCommands(command, depth = 0) {
  const commands = tokenizeShellCommands(command);
  if (depth >= 3) return commands;
  const expanded = [...commands];
  for (const tokens of commands) {
    const nested = wrapperScript(tokens);
    if (nested) expanded.push(...executableCommands(nested, depth + 1));
  }
  return expanded;
}

function wrappedShellScripts(command) {
  const scripts = [];
  for (const tokens of tokenizeShellCommands(command)) {
    const nested = wrapperScript(tokens);
    if (nested) scripts.push(nested);
  }
  return scripts;
}

function protectedPushTarget(token) {
  let ref = token.replace(/^\+/, '');
  if (ref.includes(':')) ref = ref.slice(ref.lastIndexOf(':') + 1);
  ref = ref.replace(/^refs\/heads\//i, '');
  return /^(main|master)$/i.test(ref) ? ref.toLowerCase() : null;
}

function isAmbiguousForcedRefspec(token) {
  const refspec = token.replace(/^\+/, '');
  if (refspec.includes(':')) return false;
  return /^(?:HEAD(?:[~^].*)?|@(?:\{.*\})?)$/i.test(refspec);
}

function isForcePushOption(token) {
  if (token === '-f' || token === '--force' || token === '--force-if-includes'
    || token.startsWith('--force-with-lease') || token === '--mirror') {
    return true;
  }
  // Git accepts clusters of its boolean short push flags (for example -fu).
  // Restrict the cluster alphabet so an attached value such as -ofoo is not
  // mistaken for a force flag merely because its value contains "f".
  return /^-[qvdfnu]+$/.test(token) && token.slice(1).includes('f');
}

function detectHardInvariant(command) {
  for (const tokens of executableCommands(command)) {
    const gitTokens = unwrapGitCommand(tokens);
    if (!gitTokens) continue;

    const commitIndex = gitTokens.findIndex((token, index) => index > 0 && token === 'commit');
    const commitArgs = commitIndex >= 0 ? gitTokens.slice(commitIndex + 1) : [];
    const shortNoVerify = commitArgs.includes('-n');
    if (gitTokens.slice(1).includes('--no-verify') || shortNoVerify) {
      return {
        kind: 'invariant',
        label: 'P-004: git hook bypass (--no-verify/-n)',
        rule: 'P-004',
        tier: 'hard',
      };
    }

    const pushIndex = gitTokens.findIndex((token, index) => index > 0 && token === 'push');
    if (pushIndex < 0) continue;
    const pushArgs = gitTokens.slice(pushIndex + 1);
    const force = pushArgs.some(isForcePushOption);

    const positional = pushArgs.filter((token) => !token.startsWith('-'));
    // First positional argument is the remote/repository. Only explicit
    // refspecs after it can prove a protected target deterministically.
    for (const refspec of positional.slice(1)) {
      const branch = protectedPushTarget(refspec);
      const refspecForces = force || refspec.startsWith('+');
      if (branch && refspecForces) {
        return {
          kind: 'invariant',
          label: `P-001: force-push to ${branch}`,
          rule: 'P-001',
          branch,
          tier: 'hard',
        };
      }
      if (refspecForces && isAmbiguousForcedRefspec(refspec)) {
        return {
          kind: 'invariant',
          label: 'P-001: force-push destination is derived from the current HEAD',
          rule: 'P-001',
          branch: null,
          tier: 'hard',
        };
      }
    }

    if (force && positional.length <= 1) {
      return {
        kind: 'invariant',
        label: 'P-001: force-push target is implicit and could be main/master',
        rule: 'P-001',
        branch: null,
        tier: 'hard',
      };
    }
  }

  return null;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkProtectedBranchDeletion(command, protectedBranches) {
  if (protectedBranches.length === 0) return null;

  for (const branch of protectedBranches) {
    const escaped = escapeRegExp(branch);
    const pushDeleteRe = new RegExp(`\\bgit\\s+push\\s+.*--delete\\s+${escaped}\\b`);
    const pushColonRe = new RegExp(`\\bgit\\s+push\\s+\\S+\\s+:${escaped}\\b`);
    const branchDeleteRe = new RegExp(`\\bgit\\s+branch\\s+-[dD]\\s+${escaped}\\b`);

    if (pushDeleteRe.test(command) || pushColonRe.test(command) || branchDeleteRe.test(command)) {
      return branch;
    }
  }

  return null;
}

function stripQuotedContent(command) {
  let stripped = command;
  stripped = stripped.replace(/<<-?\s*'?(\w+)'?[^\n]*\n[\s\S]*?\n\s*\1\b/g, '');
  stripped = stripped.replace(/"\$\([\s\S]*?\)"/g, '""');
  stripped = stripped.replace(/'\$\([\s\S]*?\)'/g, "''");
  stripped = stripped.replace(/`[^`]*`/g, '``');
  stripped = stripped.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  stripped = stripped.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  return stripped;
}

function detectExternalAction(command, policy, depth = 0) {
  if (typeof command !== 'string') throw new TypeError('external-action command must be a string');
  const invariant = detectHardInvariant(command);
  const stripped = stripQuotedContent(command);
  if (invariant) return { ...invariant, stripped };

  if (depth < 3) {
    for (const nested of wrappedShellScripts(command)) {
      const action = detectExternalAction(nested, policy, depth + 1);
      if (action) return { ...action, wrapped: true };
    }
  }

  for (const { regex, label } of SECRETS_PATTERNS) {
    if (regex.test(stripped)) {
      return { kind: 'secret', label, tier: 'secrets', stripped };
    }
  }

  const deletedBranch = checkProtectedBranchDeletion(stripped, policy.protectedBranches);
  if (deletedBranch) {
    return {
      kind: 'protected-branch',
      label: `delete ${deletedBranch}`,
      branch: deletedBranch,
      tier: 'protected-branch',
      stripped,
    };
  }

  for (const { regex, label } of ALL_PATTERNS) {
    if (!regex.test(stripped)) continue;
    return { kind: 'external-action', label, tier: getTier(label, policy), stripped };
  }

  return null;
}

module.exports = {
  ALL_PATTERNS,
  DEFAULT_ALLOW,
  DEFAULT_HARD,
  DEFAULT_PROTECTED_BRANCHES,
  DEFAULT_SOFT,
  SECRETS_PATTERNS,
  checkProtectedBranchDeletion,
  detectExternalAction,
  detectHardInvariant,
  executableCommands,
  escapeRegExp,
  getTier,
  readExternalActionPolicy,
  stripQuotedContent,
  tokenizeShellCommands,
  unwrapGitCommand,
  wrappedShellScripts,
};
