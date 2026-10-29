import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { stripJsonComments } from '@/core/io/jsonc';
import type { DetectContext, HookDetection } from '@/hosts/detect/context';
import {
  findOpenCodePluginFailure,
  getOpenCodeConfigPaths,
  getOpenCodeV2ConfigPaths,
  hasOpenCodePlugin,
} from '@/hosts/opencode/install';

export function detect(context: DetectContext): HookDetection {
  const errors: string[] = [];
  for (const configPath of context.openCodeVersion?.startsWith('2.')
    ? getOpenCodeV2ConfigPaths(context.environment)
    : getOpenCodeConfigPaths(context.environment)) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const json = stripJsonComments(content);
        const config: unknown = JSON.parse(json);

        if (hasOpenCodePlugin(config)) {
          const failure = findOpenCodePluginFailure(context.openCodePluginListOutput);
          if (failure) {
            return {
              platform: 'opencode',
              status: 'disabled',
              method: 'opencode api plugin.list',
              configPath,
              errors: [...errors, failure],
            };
          }
          return {
            platform: 'opencode',
            status: 'configured',
            method: 'plugin array',
            configPath,
            errors: errors.length > 0 ? errors : undefined,
          };
        }
      } catch (e) {
        errors.push(
          `Failed to parse ${basename(configPath)}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  return {
    platform: 'opencode',
    status: 'n/a',
    errors: errors.length > 0 ? errors : undefined,
  };
}
