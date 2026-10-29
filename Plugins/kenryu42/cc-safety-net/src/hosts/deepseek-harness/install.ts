import { existsSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Environment } from '@/core/environment';
import { DEEPSEEK_HARNESS_NPM_PROBE } from '@/hosts/catalog';
import {
  getDeepSeekHarnessProfilesDir,
  listInstalledDeepSeekHarnessProfiles,
} from '@/hosts/deepseek-harness/detect';
import {
  type InstallTargetChoice,
  type InstallTargetProbe,
  probeInstallTarget,
} from '@/hosts/install/choices';
import { getPackageVersion } from '@/hosts/system-info';

type DesktopLocation = { platform?: NodeJS.Platform; systemApplications?: string };

const PACKAGE_NAME = 'cc-safety-net';
const NPX_DSH = ['npx', '-y', '@deepseek-ai/dsh'] as const;
const DESKTOP_APP_NAME = 'DeepSeek Harness';
const DESKTOP_USER_DATA = ['@deepseek-ai', 'dsh-desktop'] as const;
const DESKTOP_RUNNING =
  'Quit DeepSeek Harness Desktop, then run this command again: Desktop plugins can only change while it is closed.';
const desktopNotFound = (verb: 'add' | 'remove') =>
  `DeepSeek Harness Desktop is not in its default location, so ${verb} ${PACKAGE_NAME} from its Plugins page.`;

const hasProfile = (environment: Environment, name: 'desktop' | 'web') =>
  existsSync(join(getDeepSeekHarnessProfilesDir(environment), name, 'package.json'));

function locateDesktop(environment: Environment, location: DesktopLocation) {
  const platform = location.platform ?? process.platform;
  const profile = hasProfile(environment, 'desktop');
  const candidates =
    platform === 'darwin'
      ? [
          join(environment.home, 'Applications'),
          location.systemApplications ?? '/Applications',
        ].map((applications) =>
          join(
            applications,
            `${DESKTOP_APP_NAME}.app`,
            'Contents',
            'Resources',
            'runtime',
            'cli',
            'bin',
            'dsh',
          ),
        )
      : platform === 'win32'
        ? [
            join(
              environment.env.get('LOCALAPPDATA') || join(environment.home, 'AppData', 'Local'),
              'Programs',
              DESKTOP_APP_NAME,
              'resources',
              'runtime',
              'cli',
              'bin',
              'dsh.cmd',
            ),
          ]
        : [];
  return { profile, cli: profile ? candidates.find((path) => existsSync(path)) : undefined };
}

function isDesktopRunning(environment: Environment, platform = process.platform): boolean {
  if (platform === 'win32') {
    return existsSync(
      join(
        environment.env.get('APPDATA') || join(environment.home, 'AppData', 'Roaming'),
        ...DESKTOP_USER_DATA,
        'lockfile',
      ),
    );
  }
  const lock = readLinkOrUndefined(
    join(environment.home, 'Library', 'Application Support', ...DESKTOP_USER_DATA, 'SingletonLock'),
  );
  const pid = Number(/-(\d+)$/.exec(lock ?? '')?.[1]);
  return Number.isInteger(pid) && pid > 0 && processExists(pid);
}

function readLinkOrUndefined(path: string): string | undefined {
  try {
    return readlinkSync(path);
  } catch {
    return undefined;
  }
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export async function planDeepSeekHarnessInstall(
  environment: Environment,
  options: DesktopLocation & { probe?: InstallTargetProbe } = {},
) {
  const desktop = locateDesktop(environment, options);
  if (desktop.cli && isDesktopRunning(environment, options.platform)) {
    throw new Error(DESKTOP_RUNNING);
  }
  const web =
    !desktop.cli ||
    hasProfile(environment, 'web') ||
    (await (options.probe ?? probeInstallTarget)(DEEPSEEK_HARNESS_NPM_PROBE));
  const targets = [
    ...(desktop.cli ? [{ profile: 'desktop', label: 'Desktop', dsh: [desktop.cli] as const }] : []),
    ...(web ? [{ profile: 'web', label: 'web', dsh: NPX_DSH }] : []),
  ];
  return {
    commands: targets.map(
      (target) =>
        [
          ...target.dsh,
          'plugin',
          '--profile',
          target.profile,
          'add',
          `${PACKAGE_NAME}@${getPackageVersion()}`,
        ] as const,
    ),
    afterInstall: async () => {
      const enabled = new Set(
        listInstalledDeepSeekHarnessProfiles(environment)
          .filter((profile) => profile.enabled)
          .map((profile) => profile.name),
      );
      const disabled = targets.filter((target) => !enabled.has(target.profile));
      if (disabled.length > 0) {
        throw new Error(
          `DeepSeek Harness installed ${PACKAGE_NAME} in the ${describeProfiles(disabled)} but did not enable it. Enable it from the Plugins page.`,
        );
      }
    },
    message: [
      `Added ${PACKAGE_NAME} to the DeepSeek Harness ${describeProfiles(targets)}.`,
      ...(desktop.profile && !desktop.cli ? [desktopNotFound('add')] : []),
    ].join('\n'),
  };
}

function describeProfiles(targets: readonly { label: string }[]): string {
  return `${targets.map((target) => target.label).join(' and ')} profile${targets.length > 1 ? 's' : ''}`;
}

export function planDeepSeekHarnessUninstall(
  environment: Environment,
  location: DesktopLocation = {},
) {
  const installed = new Set(
    listInstalledDeepSeekHarnessProfiles(environment).map((profile) => profile.name),
  );
  if (!installed.has('desktop') && !installed.has('web')) {
    throw new Error(
      `${PACKAGE_NAME} is not installed in the DeepSeek Harness web or Desktop profile`,
    );
  }
  const cli = installed.has('desktop') ? locateDesktop(environment, location).cli : undefined;
  const desktopLeftBehind = installed.has('desktop') && !cli;
  if (desktopLeftBehind && !installed.has('web')) throw new Error(desktopNotFound('remove'));
  if (cli && isDesktopRunning(environment, location.platform)) throw new Error(DESKTOP_RUNNING);
  return {
    commands: [
      ...(cli ? [[cli, 'plugin', '--profile', 'desktop', 'remove', PACKAGE_NAME] as const] : []),
      ...(installed.has('web')
        ? [[...NPX_DSH, 'plugin', '--profile', 'web', 'remove', PACKAGE_NAME] as const]
        : []),
    ],
    ...(desktopLeftBehind
      ? {
          afterUninstall: () => {
            throw new Error(
              `Removed ${PACKAGE_NAME} from the DeepSeek Harness web profile, but ${desktopNotFound('remove')}`,
            );
          },
        }
      : {}),
  };
}

export function markDeepSeekHarnessDesktopAvailable(
  choices: readonly InstallTargetChoice[],
  environment: Environment,
  location: DesktopLocation = {},
): InstallTargetChoice[] {
  const desktopFound = locateDesktop(environment, location).cli !== undefined;
  return choices.map((choice) =>
    choice.target === 'deepseek-harness' && desktopFound
      ? { ...choice, available: true, unavailableReason: undefined }
      : choice,
  );
}
