import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Environment } from '@/core/environment';
import {
  type DetectContext,
  type HookDetection,
  readRecord,
  readStateFile,
} from '@/hosts/detect/context';

const CLAUDE_SAFETY_NET_PLUGIN_ID = 'cc-safety-net@cc-marketplace';

export function getClaudeConfigDir(environment: Environment) {
  return environment.env.get('CLAUDE_CONFIG_DIR') || join(environment.home, '.claude');
}

function getClaudeInstalledPluginsPath(environment: Environment): string {
  return join(
    environment.env.get('CLAUDE_CODE_PLUGIN_CACHE_DIR') ||
      join(getClaudeConfigDir(environment), 'plugins'),
    'installed_plugins.json',
  );
}

function isInstalledPluginRecord(value: unknown, pluginId: string): boolean {
  const record = readRecord(readRecord(value, 'plugins'), pluginId);
  return Array.isArray(record) && record.length > 0;
}

export function hasClaudeInstalledPlugin(environment: Environment, pluginId: string): boolean {
  const installed = readStateFile(getClaudeInstalledPluginsPath(environment));
  return installed.kind === 'ok' && isInstalledPluginRecord(installed.value, pluginId);
}

export function detectClaudeCode(environment: Environment): HookDetection {
  return detectClaudePlugin(
    getClaudeInstalledPluginsPath(environment),
    join(getClaudeConfigDir(environment), 'settings.json'),
  );
}

function detectClaudePlugin(installedPath: string, settingsPath: string): HookDetection {
  const installed = readStateFile(installedPath);
  if (installed.kind === 'unreadable') return { platform: 'claude-code', status: 'not-inspected' };
  if (installed.kind === 'missing') return { platform: 'claude-code', status: 'n/a' };
  if (!isInstalledPluginRecord(installed.value, CLAUDE_SAFETY_NET_PLUGIN_ID)) {
    return { platform: 'claude-code', status: 'n/a' };
  }

  const settings = readStateFile(settingsPath);
  if (settings.kind === 'unreadable') return { platform: 'claude-code', status: 'not-inspected' };

  const enabled =
    settings.kind === 'ok' &&
    readRecord(readRecord(settings.value, 'enabledPlugins'), CLAUDE_SAFETY_NET_PLUGIN_ID) === true;

  if (!enabled) {
    return {
      platform: 'claude-code',
      status: 'disabled',
      method: 'plugin config',
      configPath: settingsPath,
      errors: [`${CLAUDE_SAFETY_NET_PLUGIN_ID} is installed but not enabled in Claude Code`],
    };
  }

  return {
    platform: 'claude-code',
    status: 'configured',
    method: 'plugin config',
    configPath: installedPath,
  };
}

export function findClaudeCursorPluginManifest(environment: Environment): string | undefined {
  const cursorClaudeDir = join(environment.home, '.claude');
  const installedPath = join(cursorClaudeDir, 'plugins', 'installed_plugins.json');
  if (
    detectClaudePlugin(installedPath, join(cursorClaudeDir, 'settings.json')).status !==
    'configured'
  )
    return undefined;
  const installed = readStateFile(installedPath);
  const records =
    installed.kind === 'ok'
      ? readRecord(readRecord(installed.value, 'plugins'), CLAUDE_SAFETY_NET_PLUGIN_ID)
      : undefined;
  const installPath = (Array.isArray(records) ? records : [])
    .filter((record) => readRecord(record, 'scope') === 'user')
    .map((record) => readRecord(record, 'installPath'))
    .find((path): path is string => typeof path === 'string');
  if (!installPath) return undefined;
  const manifest = join(installPath, '.cursor-plugin', 'plugin.json');
  const parsed = readStateFile(manifest);
  const hooks = parsed.kind === 'ok' ? readRecord(parsed.value, 'hooks') : undefined;
  return typeof hooks === 'string' && existsSync(join(installPath, hooks)) ? manifest : undefined;
}

export function detect(context: DetectContext): HookDetection {
  return detectClaudeCode(context.environment);
}
