import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Environment } from '@/core/environment';
import { findClaudeCursorPluginManifest } from '@/hosts/claude-code/detect';
import {
  CURSOR_HOOK_COMMAND,
  CURSOR_MARKETPLACE_NAME,
  getCursorHooksPath,
  getCursorPluginDirs,
} from '@/hosts/cursor/install';
import type { DetectContext, HookDetection } from '@/hosts/detect/context';

function _findCursorManagedEntries(config: unknown): Array<Record<string, unknown>> {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return [];
  const hooks = (config as Record<string, unknown>).hooks;
  if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) return [];
  const preToolUse = (hooks as Record<string, unknown>).preToolUse;
  if (!Array.isArray(preToolUse)) return [];

  return preToolUse.filter(
    (entry): entry is Record<string, unknown> =>
      !!entry &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      (entry as Record<string, unknown>).command === CURSOR_HOOK_COMMAND,
  );
}

function _cursorDriftErrors(entries: Array<Record<string, unknown>>): string[] {
  const errors: string[] = [];
  if (entries.length > 1) {
    errors.push('Multiple managed cc-safety-net hooks found; reinstall to collapse duplicates');
  }
  const entry = entries[0];
  if (entry && entry.failClosed !== true) {
    errors.push('Managed hook is missing "failClosed": true; reinstall to repair');
  }
  if (entry && entry.timeout !== 30) {
    errors.push('Managed hook "timeout" is not 30; reinstall to repair');
  }
  return errors;
}

export const CURSOR_CLAUDE_PLUGIN_METHOD = 'Claude Code plugin';
export const CURSOR_NATIVE_PLUGIN_METHOD = 'Cursor plugin';

function findCursorPluginVersion(environment: Environment) {
  const versions = join(getCursorPluginDirs(environment).cache, CURSOR_MARKETPLACE_NAME);
  if (!existsSync(versions)) return {};
  try {
    return {
      version: readdirSync(versions)
        .map((version) => join(versions, version))
        .find((dir) => existsSync(join(dir, '.cache-complete'))),
    };
  } catch {
    return { unreadable: versions };
  }
}

function findCursorPluginRoute(environment: Environment, nativeVersion: string | undefined) {
  if (nativeVersion) {
    const caveat = [
      "Cursor records enabled plugins on your Cursor account, which doctor cannot check, and keeps a plugin's files after it is uninstalled.",
      'Cursor pins marketplace plugins to the commit they were added at, so `cc-safety-net update` cannot update this plugin, while the npx hook (`cc-safety-net install --cursor`) stays current.',
    ].join(' ');
    return {
      method: CURSOR_NATIVE_PLUGIN_METHOD,
      configPath: nativeVersion,
      duplicate: `The Cursor plugin also runs this check, so every tool call is checked twice. ${caveat} If the plugin is installed, run \`cc-safety-net uninstall --cursor\`, uninstall CC Safety Net from /plugins in cursor-agent, then run \`cc-safety-net install --cursor\`.`,
      alone: `${caveat} If /plugins in cursor-agent does not list CC Safety Net as installed, run \`cc-safety-net install --cursor\`.`,
    };
  }
  const claudeManifest = findClaudeCursorPluginManifest(environment);
  if (!claudeManifest) return undefined;
  const caveat =
    'Cursor runs the Claude Code plugin only while it imports Claude Code plugins, which doctor cannot check.';
  return {
    method: CURSOR_CLAUDE_PLUGIN_METHOD,
    configPath: claudeManifest,
    duplicate: `The Claude Code plugin also runs this check in Cursor, so every tool call is checked twice. ${caveat} If Cursor runs it, run \`cc-safety-net uninstall --cursor\` to remove this hook.`,
    alone: `${caveat} If it stops, run \`cc-safety-net install --cursor\`.`,
  };
}

export function detect(context: DetectContext): HookDetection {
  const hookConfig = detectHookConfig(context);
  const nativePlugin = findCursorPluginVersion(context.environment);
  if (nativePlugin.unreadable)
    return hookConfig.status === 'configured'
      ? {
          ...hookConfig,
          errors: [
            ...(hookConfig.errors ?? []),
            `Cannot read ${nativePlugin.unreadable}, so doctor cannot tell whether the Cursor plugin also runs this check.`,
          ],
        }
      : { platform: 'cursor', status: 'not-inspected' };
  const plugin = findCursorPluginRoute(context.environment, nativePlugin.version);
  if (!plugin) return hookConfig;
  if (hookConfig.status === 'configured')
    return { ...hookConfig, errors: [...(hookConfig.errors ?? []), plugin.duplicate] };
  return {
    platform: 'cursor',
    status: 'configured',
    method: plugin.method,
    configPath: plugin.configPath,
    errors: [...(hookConfig.errors ?? []), plugin.alone],
  };
}

function detectHookConfig(context: DetectContext): HookDetection {
  const configPath = getCursorHooksPath(context.environment);

  if (!existsSync(configPath)) {
    return { platform: 'cursor', status: 'n/a', configPath };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (e) {
    return {
      platform: 'cursor',
      status: 'n/a',
      configPath,
      errors: [
        `Failed to parse Cursor hooks config ${configPath}: ${e instanceof Error ? e.message : String(e)}`,
      ],
    };
  }

  const entries = _findCursorManagedEntries(parsed);
  if (entries.length === 0) {
    return { platform: 'cursor', status: 'n/a', configPath };
  }

  const errors = _cursorDriftErrors(entries);
  return {
    platform: 'cursor',
    status: 'configured',
    method: 'hook config',
    configPath,
    errors: errors.length > 0 ? errors : undefined,
  };
}
