import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Environment } from '@/core/environment';
import { atomicWriteFile } from '@/core/io/atomic-write';
import {
  findJsonArrayProperty,
  removeArrayRangeItem,
  stripJsonComments,
  type TextRange,
} from '@/core/io/jsonc';
import { readRecord } from '@/hosts/detect/context';
import { runNativeCommand } from '@/hosts/install/native';
import type { InstallResult } from '@/hosts/install/types';

const OPENCODE_PACKAGE = 'cc-safety-net';
const OPENCODE_CACHE_PACKAGE = `${OPENCODE_PACKAGE}@latest`;
const OPENCODE_CONFIG_FILES = ['opencode.json', 'opencode.jsonc'] as const;
const OPENCODE_PLUGIN_LIST_ATTEMPTS = 60;
const OPENCODE_PLUGIN_LIST_INTERVAL_MS = 250;

const OPENCODE_PLUGIN_EXPORT = 'CCSafetyNetPlugin';
const OPENCODE_JSON_ERRORS = {
  stringError: 'Unterminated string in OpenCode config',
  bracketError: 'Unmatched plugin array in OpenCode config',
};

function getOpenCodeXdgConfigDir(environment: Environment) {
  return join(
    environment.env.get('XDG_CONFIG_HOME') || join(environment.home, '.config'),
    'opencode',
  );
}

function getOpenCodeConfigDir(environment: Environment) {
  return environment.env.get('OPENCODE_CONFIG_DIR') || getOpenCodeXdgConfigDir(environment);
}

export function getOpenCodeV2ConfigPaths(environment: Environment) {
  return OPENCODE_CONFIG_FILES.map((filename) => join(getOpenCodeConfigDir(environment), filename));
}

export function getOpenCodeConfigPaths(environment: Environment) {
  return [
    ...new Set([getOpenCodeConfigDir(environment), getOpenCodeXdgConfigDir(environment)]),
  ].flatMap((directory) => OPENCODE_CONFIG_FILES.map((filename) => join(directory, filename)));
}

function getOpenCodeCachePath(environment: Environment) {
  return join(
    environment.env.get('XDG_CACHE_HOME') || join(environment.home, '.cache'),
    'opencode',
    'packages',
    OPENCODE_CACHE_PACKAGE,
  );
}

function clearOpenCodeCache(environment: Environment): void {
  rmSync(getOpenCodeCachePath(environment), { recursive: true, force: true });
}

export async function getOpenCodeInstallPlan(environment: Environment) {
  const version = (await runNativeCommand(['opencode', '--version'], { stdoutOnly: true })).trim();
  const match = /^(?:opencode\s+)?v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
  const major = Number(match?.[1]);
  const minor = Number(match?.[2]);
  const patch = Number(match?.[3]);
  if (
    !match ||
    (major !== 1 && major !== 2) ||
    (major === 1 && (minor < 18 || (minor === 18 && patch < 29))) ||
    (major === 2 && minor === 0 && patch < 6)
  ) {
    throw new Error(
      `OpenCode 1.18.29+ or 2.0.6+ is required; found ${version || 'an unknown version'}.`,
    );
  }
  if (major === 2) {
    for (const configPath of getOpenCodeV2ConfigPaths(environment)) {
      if (!existsSync(configPath)) continue;
      const config = parseOpenCodeConfig(readFileSync(configPath, 'utf-8'), configPath);
      const conflicting = ['plugin', 'plugins'].some((key) => {
        const plugins = readRecord(config, key);
        return (
          Array.isArray(plugins) &&
          plugins.some(
            (plugin) =>
              isManagedPlugin(plugin) &&
              (typeof plugin === 'string' ? plugin : readRecord(plugin, 'package')) !==
                OPENCODE_CACHE_PACKAGE,
          )
        );
      });
      if (conflicting) {
        throw new Error(
          `Change the cc-safety-net package spec in ${configPath} to ${OPENCODE_CACHE_PACKAGE}, preserving its options, then retry. Adding another spec would create a duplicate plugin ID.`,
        );
      }
    }
    return {
      commands: [],
      afterInstall: async () => {
        const added = await runNativeCommand(
          ['opencode', 'plugin', 'add', OPENCODE_CACHE_PACKAGE],
          { stdoutOnly: true },
        );
        if (added.includes('is already configured in')) {
          await waitForOpenCodePluginRow();
          await runNativeCommand(['opencode', 'plugin', 'update', OPENCODE_CACHE_PACKAGE]);
        }
        const output = await waitForOpenCodePluginRow();
        if (!/^cc-safety-net\s+\S+\s+cc-safety-net@latest\s*$/m.test(output)) {
          throw new Error(
            'OpenCode did not load cc-safety-net from cc-safety-net@latest. Run `opencode plugin list` for details.',
          );
        }
        const location = ['--param', `location[directory]=${process.cwd()}`];
        await runNativeCommand(['opencode', 'api', 'integration.list', ...location]);
        const inventory = await runNativeCommand(['opencode', 'api', 'plugin.list', ...location], {
          stdoutOnly: true,
        });
        const failure = findOpenCodePluginFailure(inventory);
        if (failure) throw new Error(failure);
        if (!readOpenCodePluginStates(inventory).some(isActivePluginState)) {
          throw new Error(
            'OpenCode lists no active cc-safety-net for this directory. Run `opencode api plugin.list` for details.',
          );
        }
      },
    };
  }
  clearOpenCodeCache(environment);
  return {
    commands: [['opencode', 'plugin', '-g', '-f', OPENCODE_CACHE_PACKAGE]] as const,
    afterInstall: () => verifyOpenCodePluginRuntime(environment),
  };
}

function readOpenCodePluginStates(pluginListOutput: string | null | undefined) {
  return readPluginInventory(pluginListOutput)
    .filter(
      (row) =>
        readRecord(row, 'id') === OPENCODE_PACKAGE ||
        isManagedPlugin(readRecord(readRecord(row, 'source'), 'target')),
    )
    .map((row) => readRecord(row, 'state'));
}

function isActivePluginState(state: unknown) {
  return readRecord(state, 'status') === 'active';
}

export function findOpenCodePluginFailure(pluginListOutput: string | null | undefined) {
  const states = readOpenCodePluginStates(pluginListOutput);
  if (states.some(isActivePluginState)) return undefined;
  const failure = states.find((state) => readRecord(state, 'status') === 'failed');
  if (!failure) return undefined;
  return `OpenCode reports cc-safety-net failed: ${String(readRecord(failure, 'error')).split('\n')[0]}`;
}

function readPluginInventory(output: string | null | undefined): unknown[] {
  if (!output) return [];
  try {
    const rows = readRecord(JSON.parse(output), 'data');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function waitForOpenCodePluginRow(attempt = 1): Promise<string> {
  const output = await runNativeCommand(['opencode', 'plugin', 'list'], { stdoutOnly: true });
  if (
    /^cc-safety-net\s|\scc-safety-net@latest\s*$/m.test(output) ||
    attempt === OPENCODE_PLUGIN_LIST_ATTEMPTS
  ) {
    return output;
  }
  await new Promise((resolve) => setTimeout(resolve, OPENCODE_PLUGIN_LIST_INTERVAL_MS));
  return waitForOpenCodePluginRow(attempt + 1);
}

async function verifyOpenCodePluginRuntime(environment: Environment): Promise<void> {
  const packageDir = join(getOpenCodeCachePath(environment), 'node_modules', OPENCODE_PACKAGE);
  const packageJsonPath = join(packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(
      `The OpenCode plugin cache at ${packageDir} is missing its package, so OpenCode would load nothing and fail open. Run \`opencode plugin -g -f ${OPENCODE_CACHE_PACKAGE}\` for details.`,
    );
  }

  const main = readRecord(JSON.parse(readFileSync(packageJsonPath, 'utf-8')), 'main');
  if (typeof main !== 'string') {
    throw new Error(`The cached OpenCode plugin at ${packageDir} declares no "main" entry.`);
  }

  const entry = join(packageDir, main);
  const entryModule = (await import(pathToFileURL(entry).href)) as Record<string, unknown>;
  if (typeof entryModule[OPENCODE_PLUGIN_EXPORT] === 'function') return;
  throw new Error(
    `The cached OpenCode plugin at ${entry} does not export a callable ${OPENCODE_PLUGIN_EXPORT}, so OpenCode would load nothing and fail open.`,
  );
}

function parseOpenCodeConfig(content: string, configPath: string) {
  try {
    return JSON.parse(stripJsonComments(content)) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse OpenCode config ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

function isManagedPlugin(plugin: unknown) {
  const spec = typeof plugin === 'string' ? plugin : readRecord(plugin, 'package');
  return (
    typeof spec === 'string' &&
    (spec === OPENCODE_PACKAGE || spec.startsWith(`${OPENCODE_PACKAGE}@`))
  );
}

export function hasOpenCodePlugin(config: unknown) {
  return ['plugin', 'plugins'].some((key) => {
    const plugins = readRecord(config, key);
    return Array.isArray(plugins) && plugins.some(isManagedPlugin);
  });
}

function removeManagedPlugins(content: string, configPath: string) {
  const ranges = ['plugin', 'plugins'].flatMap((key) => {
    const array = findJsonArrayProperty(content, key, OPENCODE_JSON_ERRORS);
    if (!array) return [];
    const items: TextRange[] = [];
    let depth = 0;
    let start = array.start + 1;
    const tokens = content
      .slice(array.start + 1, array.end)
      .matchAll(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|[^"\s{}[\],/]+|[{}[\],]/g);
    for (const token of tokens) {
      if (token[0].startsWith('//') || token[0].startsWith('/*')) continue;
      const index = array.start + 1 + token.index;
      if (depth === 0) start = index;
      if (token[0] === '{' || token[0] === '[') depth++;
      if (token[0] === '}' || token[0] === ']') depth--;
      if (depth !== 0 || token[0] === ',') continue;
      const end = index + token[0].length;
      if (isManagedPlugin(JSON.parse(stripJsonComments(content.slice(start, end))))) {
        items.push({ start, end });
      }
    }
    return items;
  });
  const updated = ranges
    .sort((a, b) => a.start - b.start)
    .reverse()
    .reduce((text, item) => {
      const trivia = /^(?:\s|\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*,/.exec(text.slice(item.end));
      if (trivia?.[0].includes('/')) {
        const comma = item.end + trivia[0].length - 1;
        return text.slice(0, item.start) + text.slice(item.end, comma) + text.slice(comma + 1);
      }
      return removeArrayRangeItem(text, item);
    }, content);

  parseOpenCodeConfig(updated, configPath);
  return updated;
}

export function uninstallOpenCode(environment: Environment): InstallResult {
  clearOpenCodeCache(environment);

  const configPaths = getOpenCodeConfigPaths(environment);
  const existingConfigPath = configPaths.find((configPath) => existsSync(configPath));
  const errors: string[] = [];
  const changedPaths: string[] = [];

  for (const configPath of configPaths) {
    if (!existsSync(configPath)) continue;

    try {
      const content = readFileSync(configPath, 'utf-8');
      if (!hasOpenCodePlugin(parseOpenCodeConfig(content, configPath))) continue;

      atomicWriteFile(configPath, removeManagedPlugins(content, configPath));
      changedPaths.push(configPath);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length > 0) throw new Error(errors.join('\n'));
  return {
    path:
      changedPaths[0] ??
      existingConfigPath ??
      join(getOpenCodeConfigDir(environment), OPENCODE_CONFIG_FILES[0]),
    alreadyInstalled: changedPaths.length > 0,
  };
}
