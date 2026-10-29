import { join } from 'node:path';
import type { Environment } from '@/core/environment';
import {
  type DetectContext,
  expandTilde,
  type HookDetection,
  readRecord,
  readStateFile,
} from '@/hosts/detect/context';

const PI_EXTENSION_PATH = 'dist/pi/index.js';
const PI_EXTENSION_PATTERN_MATCHES = new Set([PI_EXTENSION_PATH, 'index.js']);
const GLOB_CHARACTERS = /[*?[\]{}]/;

export function getPiSettingsPath(environment: Environment): string {
  const agentDir = environment.env.get('PI_CODING_AGENT_DIR');
  return join(
    agentDir ? expandTilde(agentDir, environment.home) : join(environment.home, '.pi', 'agent'),
    'settings.json',
  );
}

export function isPiSafetyNetPackageSource(source: unknown): source is string {
  if (typeof source !== 'string') return false;
  return source === 'npm:cc-safety-net' || source.startsWith('npm:cc-safety-net@');
}

function _piLoadsExtension(filter: unknown): boolean {
  if (!Array.isArray(filter) || filter.length === 0) return false;
  if (!filter.every((entry): entry is string => typeof entry === 'string')) return false;
  const namesExtension = (prefix: string) =>
    filter.some(
      (entry) =>
        entry.startsWith(prefix) && entry.slice(1).replace(/^\.[/\\]/, '') === PI_EXTENSION_PATH,
    );
  if (namesExtension('-')) return false;
  if (namesExtension('+')) return true;
  const includes = filter.filter((entry) => !/^[-+!]/.test(entry));
  return (
    (includes.length === 0 || includes.some((entry) => PI_EXTENSION_PATTERN_MATCHES.has(entry))) &&
    !filter.some(
      (entry) =>
        entry.startsWith('!') &&
        (PI_EXTENSION_PATTERN_MATCHES.has(entry.slice(1)) || GLOB_CHARACTERS.test(entry)),
    )
  );
}

export function detect(context: DetectContext): HookDetection {
  const settingsPath = getPiSettingsPath(context.environment);
  const settings = readStateFile(settingsPath);
  if (settings.kind === 'unreadable') return { platform: 'pi', status: 'not-inspected' };
  if (settings.kind === 'missing') return { platform: 'pi', status: 'n/a' };

  const packages = readRecord(settings.value, 'packages');
  if (!Array.isArray(packages)) return { platform: 'pi', status: 'n/a' };

  const entry = packages.find((candidate) =>
    isPiSafetyNetPackageSource(
      typeof candidate === 'string' ? candidate : readRecord(candidate, 'source'),
    ),
  );
  if (entry === undefined) return { platform: 'pi', status: 'n/a' };

  const extensions = readRecord(entry, 'extensions');
  if (extensions !== undefined && !_piLoadsExtension(extensions)) {
    return {
      platform: 'pi',
      status: 'disabled',
      method: 'package config',
      configPath: settingsPath,
      errors: ['npm:cc-safety-net is installed but its extension is disabled in Pi settings'],
    };
  }

  return {
    platform: 'pi',
    status: 'configured',
    method: 'package config',
    configPath: settingsPath,
  };
}
