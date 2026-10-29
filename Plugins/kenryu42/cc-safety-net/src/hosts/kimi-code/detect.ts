import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Environment } from '@/core/environment';
import {
  type DetectContext,
  type HookDetection,
  readRecord,
  readStateFile,
} from '@/hosts/detect/context';

const KIMI_HOOK_COMMAND_PATTERN = /cc-safety-net\s+hook\s+(?:[^\s]+\s+)*--kimi-code(\s|["']|$)/;
const KIMI_PLUGIN_ID = 'cc-safety-net';
export const KIMI_PLUGIN_METHOD = 'plugin config';
const KIMI_HOOK_KEYS = new Set(['event', 'matcher', 'command', 'timeout']);
const KIMI_HOOK_EVENTS = new Set([
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PermissionRequest',
  'PermissionResult',
  'UserPromptSubmit',
  'UserPromptQueued',
  'TurnStarted',
  'Stop',
  'StopFailure',
  'Interrupt',
  'SessionStart',
  'SessionEnd',
  'SessionHeartbeat',
  'SubagentStart',
  'SubagentStop',
  'TaskStarted',
  'PreCompact',
  'PostCompact',
  'Notification',
]);

function _getKimiHome(environment: Environment): string {
  return environment.env.get('KIMI_CODE_HOME') || join(environment.home, '.kimi-code');
}

function _splitTomlTopLevel(text: string, separator: ',' | '\n'): string[] {
  const parts = [''];
  let quote = '';
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index] as string;
    if (quote !== '') {
      const escaped = quote === '"' && char === '\\' ? (text[++index] ?? '') : '';
      parts[parts.length - 1] += char + escaped;
      if (escaped === '' && char === quote) quote = '';
      continue;
    }
    if (char === '#') {
      const lineEnd = text.indexOf('\n', index);
      index = (lineEnd === -1 ? text.length : lineEnd) - 1;
      continue;
    }
    if (char === separator && depth === 0) {
      parts.push('');
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    if (char === '[' || char === '{') depth++;
    if (char === ']' || char === '}') depth--;
    parts[parts.length - 1] += char;
  }
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}

function _parseTomlPair(pair: string) {
  const match = /^(?:"([^"]*)"|'([^']*)'|([^\s="']+))\s*=\s*([\s\S]+)$/.exec(pair);
  return match ? { key: match[1] ?? match[2] ?? match[3] ?? '', value: match[4] ?? '' } : undefined;
}

function _tomlString(value: string | undefined) {
  return value === undefined ? undefined : /^("""|'''|"|')([\s\S]*)\1$/.exec(value)?.[2];
}

function _kimiHookEntries(content: string): string[][] {
  const blocks = content.split(/(?=^\s*\[)/m);
  const inline = blocks
    .filter((block) => !/^\s*\[/.test(block))
    .flatMap((block) => _splitTomlTopLevel(block, '\n'))
    .map(_parseTomlPair)
    .find((pair) => pair?.key === 'hooks')?.value;
  if (inline !== undefined) {
    return _splitTomlTopLevel(inline.slice(1, -1), ',').map((item) =>
      _splitTomlTopLevel(item.slice(1, -1), ','),
    );
  }
  return blocks
    .filter((block) => /^\s*\[\[hooks]]/.test(block))
    .map((block) => _splitTomlTopLevel(block.replace(/^\s*\[\[hooks]]/, ''), '\n'));
}

function _kimiHookEntryProblem(entry: readonly string[]) {
  const pairs = entry.map(_parseTomlPair);
  const unparsed = entry.find((_pair, index) => pairs[index] === undefined);
  const unknown = pairs.find((pair) => pair !== undefined && !KIMI_HOOK_KEYS.has(pair.key))?.key;
  const duplicate = pairs.find(
    (pair, index) =>
      pair !== undefined && pairs.findIndex((other) => other?.key === pair.key) < index,
  )?.key;
  const field = (key: string) => pairs.find((pair) => pair?.key === key)?.value;
  const matcher = field('matcher');
  const timeout = field('timeout');
  const timeoutValue = Number(timeout?.replace(/(?<=[\da-f])_(?=[\da-f])/gi, ''));
  const problems: [boolean, string][] = [
    [unparsed !== undefined, `"${unparsed}" is not a key = value pair`],
    [unknown !== undefined, `unknown key "${unknown}"`],
    [duplicate !== undefined, `duplicate key "${duplicate}"`],
    [
      !KIMI_HOOK_EVENTS.has(_tomlString(field('event')) ?? ''),
      '"event" is not a Kimi Code hook event',
    ],
    [matcher !== undefined && _tomlString(matcher) === undefined, '"matcher" is not a string'],
    [!_tomlString(field('command')), '"command" is missing or empty'],
    [
      timeout !== undefined &&
        !(Number.isInteger(timeoutValue) && timeoutValue >= 1 && timeoutValue <= 600),
      '"timeout" is not an integer from 1 to 600',
    ],
  ];
  return problems.find(([failed]) => failed)?.[1];
}

function _detectKimiPlugin(environment: Environment): HookDetection | undefined {
  const installedPath = join(_getKimiHome(environment), 'plugins', 'installed.json');
  const installed = readStateFile(installedPath);
  if (installed.kind === 'missing') return undefined;
  const plugins = installed.kind === 'ok' ? readRecord(installed.value, 'plugins') : undefined;
  if (!Array.isArray(plugins)) {
    return {
      platform: 'kimi-code',
      status: 'n/a',
      configPath: installedPath,
      errors: [
        `Cannot read ${installedPath}, so doctor cannot tell whether the Kimi Code plugin is installed`,
      ],
    };
  }
  const record = plugins.find((plugin) => readRecord(plugin, 'id') === KIMI_PLUGIN_ID);
  if (record === undefined) return undefined;
  if (readRecord(record, 'enabled') !== true) {
    return {
      platform: 'kimi-code',
      status: 'disabled',
      method: KIMI_PLUGIN_METHOD,
      configPath: installedPath,
      errors: [
        `${KIMI_PLUGIN_ID} is installed but not enabled in Kimi Code; run /plugins enable ${KIMI_PLUGIN_ID}`,
      ],
    };
  }
  return {
    platform: 'kimi-code',
    status: 'configured',
    method: KIMI_PLUGIN_METHOD,
    configPath: installedPath,
  };
}

export function detect(context: DetectContext): HookDetection {
  const configPath = join(_getKimiHome(context.environment), 'config.toml');
  const notInstalled = (): HookDetection =>
    _detectKimiPlugin(context.environment) ?? { platform: 'kimi-code', status: 'n/a', configPath };

  if (!existsSync(configPath)) return notInstalled();

  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch (e) {
    return {
      platform: 'kimi-code',
      status: 'n/a',
      configPath,
      errors: [`Failed to read ${configPath}: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  if (!KIMI_HOOK_COMMAND_PATTERN.test(content)) return notInstalled();

  const entries = /"""|'''/.test(content) ? [] : _kimiHookEntries(content);
  const errors = entries.flatMap((entry, index) => {
    const problem = _kimiHookEntryProblem(entry);
    return problem === undefined
      ? []
      : [
          `Kimi Code ignores every hook because hooks entry ${index + 1} is invalid (${problem}); fix it in ${configPath}`,
        ];
  });
  return {
    platform: 'kimi-code',
    status: errors.length > 0 ? 'disabled' : 'configured',
    method: 'hook config',
    configPath,
    errors: errors.length > 0 ? errors : undefined,
  };
}
