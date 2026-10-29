#!/usr/bin/env bun
import { renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AMP_PLUGIN_ENTRY } from '../src/hosts/amp/artifact';
import { isPublicDeclarationOutput } from './build-output';
import { buildAmpBundle, buildOpenClawBundle, buildRuntimeBundles } from './build-runtime';
import { formatSubprocessFailure } from './subprocess-output';
import { verifyBuildArtifacts } from './verify-build';

const result = await buildRuntimeBundles('dist');

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const ampResult = await buildAmpBundle('dist');
if (!ampResult.success) {
  console.error('Amp bundle failed:');
  for (const log of ampResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

const openClawResult = await buildOpenClawBundle('dist');
if (!openClawResult.success) {
  console.error('OpenClaw bundle failed:');
  for (const log of openClawResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

const typesResult = Bun.spawnSync(['bun', 'run', 'build:types']);
if (typesResult.exitCode !== 0) {
  console.error(formatSubprocessFailure('build:types', typesResult));
  process.exit(1);
}

for await (const path of new Bun.Glob('dist/**/*.d.ts').scan('.')) {
  if (!isPublicDeclarationOutput(path)) await Bun.file(path).delete();
}
for (const name of ['index', 'api', 'opencode-v2']) {
  renameSync(join('dist', 'entries', `${name}.d.ts`), join('dist', `${name}.d.ts`));
}

await Bun.$`chmod 755 dist/bin/cc-safety-net.js`;
await verifyBuildArtifacts();
console.log(
  `  dist/index.js              ${(statSync('dist/index.js').size / 1024).toFixed(2)} KB`,
);
console.log(`  dist/cli.js                ${(statSync('dist/cli.js').size / 1024).toFixed(2)} KB`);
console.log(
  `  dist/bin/cc-safety-net.js  ${(statSync('dist/bin/cc-safety-net.js').size / 1024).toFixed(2)} KB`,
);
console.log(
  `  dist/bin/hook.js           ${(statSync('dist/bin/hook.js').size / 1024).toFixed(2)} KB`,
);
console.log(
  `  dist/pi/index.js           ${(statSync('dist/pi/index.js').size / 1024).toFixed(2)} KB`,
);
console.log(
  `  dist/amp/${AMP_PLUGIN_ENTRY}  ${(statSync(`dist/amp/${AMP_PLUGIN_ENTRY}`).size / 1024).toFixed(2)} KB`,
);
console.log(
  `  dist/openclaw/cc-safety-net/index.js  ${(statSync('dist/openclaw/cc-safety-net/index.js').size / 1024).toFixed(2)} KB`,
);
console.log('  ✓ Build verification passed');
