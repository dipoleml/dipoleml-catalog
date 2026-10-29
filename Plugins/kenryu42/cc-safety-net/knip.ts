import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/entries/bin.ts!',
    'src/entries/cli.ts!',
    'src/entries/index.ts!',
    'src/entries/opencode-v2.ts!',
    'src/entries/api.ts!',
    'src/entries/pi/index.ts!',
    'src/entries/deepseek-harness/index.ts!',
    'src/entries/amp.ts!',
    'src/entries/openclaw.ts!',
    'src/gui/frontend/head.ts!',
    'src/gui/frontend/main.ts!',
    'scripts/build.ts!',
    'scripts/build-plugin-tree.ts!',
    'scripts/check-comments.ts!',
    'scripts/gui-dev.ts!',
    'scripts/project-bun.ts!',
    'scripts/publish-plugin-branch.ts!',
    'scripts/prepare-release-files.ts!',
    'scripts/release-assets.ts!',
    'scripts/release-transaction.ts!',
    'scripts/verify-coverage.ts!',
    'scripts/verify-package.ts!',
    'scripts/verify-repository-plugin.ts!',
  ],
  project: ['src/**/*.ts!', 'scripts/**/*.ts!'],
  // Workflow-invoked scripts are declared in `entry` above; the plugin would
  // re-claim them as dev-only entries and hide their imports from --production.
  'github-actions': false,
  ignoreBinaries: ['gh', 'tsc'],
  ignoreDependencies: ['@opencode-ai/plugin'],
};

export default config;
