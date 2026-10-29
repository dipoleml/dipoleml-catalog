import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DetectContext, HookDetection } from '@/hosts/detect/context';
import {
  GROK_BUILD_HOOK_COMMAND,
  GROK_BUILD_HOOK_TIMEOUT,
  getGrokBuildHooksPath,
} from '@/hosts/grok-build/install';
import { findManagedEntry, managedEntryDriftErrors } from '@/hosts/install/pre-tool-use-entries';

function _isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function _readOptionalFile(path: string): string | undefined {
  try {
    return statSync(path, { throwIfNoEntry: false })?.isFile() === true
      ? readFileSync(path, 'utf-8')
      : '';
  } catch {
    return undefined;
  }
}

export function detect(context: DetectContext): HookDetection {
  const configPath = getGrokBuildHooksPath(context.environment);

  if (!existsSync(configPath)) {
    return { platform: 'grok-build', status: 'n/a', configPath };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (e) {
    return {
      platform: 'grok-build',
      status: 'n/a',
      configPath,
      errors: [
        `Failed to parse Grok Build hooks config ${configPath}: ${e instanceof Error ? e.message : String(e)}`,
      ],
    };
  }

  const preToolUse =
    _isRecord(parsed) && _isRecord(parsed.hooks) && Array.isArray(parsed.hooks.PreToolUse)
      ? parsed.hooks.PreToolUse
      : [];
  const entry = findManagedEntry(preToolUse, GROK_BUILD_HOOK_COMMAND);
  if (!entry) {
    return { platform: 'grok-build', status: 'n/a', configPath };
  }

  const handlerIndex = Array.isArray(entry.hooks)
    ? entry.hooks.findIndex((hook) => _isRecord(hook) && hook.command === GROK_BUILD_HOOK_COMMAND)
    : -1;
  const hookName = `global/cc-safety-net:pre_tool_use[${preToolUse.indexOf(entry)}].hooks[${handlerIndex}]`;
  const disabledHooksPath = join(dirname(dirname(configPath)), 'disabled-hooks');
  const disabledHooks = _readOptionalFile(disabledHooksPath);
  const disabled = disabledHooks?.split('\n').some((line) => line.trim() === hookName) === true;
  const errors = [
    ...(disabledHooks === undefined
      ? [
          `Cannot read ${disabledHooksPath}, so doctor cannot tell whether Grok Build skips the hook`,
        ]
      : []),
    ...(disabled
      ? [
          `Grok Build skips the hook: ${hookName} is listed in ${disabledHooksPath}; enable it in /hooks`,
        ]
      : []),
    ...managedEntryDriftErrors(entry, GROK_BUILD_HOOK_COMMAND, GROK_BUILD_HOOK_TIMEOUT),
  ];
  return {
    platform: 'grok-build',
    status: disabled ? 'disabled' : 'configured',
    method: 'hook config',
    configPath,
    errors: errors.length > 0 ? errors : undefined,
  };
}
