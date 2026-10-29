import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Environment } from '@/core/environment';
import {
  type DetectContext,
  expandTilde,
  type HookDetection,
  lstatOrUndefined,
  readRecord,
  readStateFile,
} from '@/hosts/detect/context';

const PACKAGE_NAME = 'cc-safety-net';

export function getDeepSeekHarnessProfilesDir(environment: Environment): string {
  const dshHome = environment.env.get('DSH_HOME');
  return join(
    dshHome?.trim()
      ? resolve(expandTilde(dshHome, environment.home))
      : join(environment.home, '.dsh'),
    'profiles',
  );
}

function inspectProfiles(environment: Environment) {
  const profilesDir = getDeepSeekHarnessProfilesDir(environment);
  const profiles = lstatOrUndefined(profilesDir)?.isDirectory()
    ? readdirSync(profilesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== 'node_modules')
        .map((entry) => {
          const configPath = join(profilesDir, entry.name, 'package.json');
          return { name: entry.name, configPath, manifest: readStateFile(configPath) };
        })
    : [];
  const installed = profiles.flatMap((profile) => {
    if (profile.manifest.kind !== 'ok') return [];
    const value = profile.manifest.value;
    if (readRecord(readRecord(value, 'dependencies'), PACKAGE_NAME) === undefined) return [];
    const bundles = readRecord(readRecord(readRecord(value, 'dsh'), 'profile'), 'bundles');
    return [
      {
        name: profile.name,
        configPath: profile.configPath,
        enabled: Array.isArray(bundles) && bundles.includes(PACKAGE_NAME),
      },
    ];
  });
  return {
    installed,
    unreadable: profiles.some((profile) => profile.manifest.kind === 'unreadable'),
  };
}

export function listInstalledDeepSeekHarnessProfiles(environment: Environment) {
  return inspectProfiles(environment).installed;
}

export function detect(context: DetectContext): HookDetection {
  const profiles = inspectProfiles(context.environment);
  const enabled = profiles.installed.filter((profile) => profile.enabled);
  const disabled = profiles.installed.filter((profile) => !profile.enabled);
  const errors = disabled.map(
    (profile) =>
      `${PACKAGE_NAME} is installed in the ${profile.name} profile but its bundle is disabled`,
  );

  if (enabled.length > 0) {
    return {
      platform: 'deepseek-harness',
      status: 'configured',
      method: 'dsh bundle',
      configPaths: enabled.map((profile) => profile.configPath),
      ...(errors.length > 0 ? { errors } : {}),
    };
  }
  if (disabled.length > 0) {
    return {
      platform: 'deepseek-harness',
      status: 'disabled',
      method: 'dsh bundle',
      configPaths: disabled.map((profile) => profile.configPath),
      errors,
    };
  }
  return profiles.unreadable
    ? { platform: 'deepseek-harness', status: 'not-inspected' }
    : { platform: 'deepseek-harness', status: 'n/a' };
}
