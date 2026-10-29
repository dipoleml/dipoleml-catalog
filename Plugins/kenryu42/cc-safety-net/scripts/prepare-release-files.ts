#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertReleaseVersion } from './release-state';

export function updateReleaseManifests(cwd: string, requestedVersion: string): void {
  const version = assertReleaseVersion(requestedVersion);
  [
    'package.json',
    '.claude-plugin/plugin.json',
    '.codex-plugin/plugin.json',
    '.cursor-plugin/plugin.json',
    'kimi.plugin.json',
  ].forEach((relativePath) => {
    const path = resolve(cwd, relativePath);
    writeFileSync(path, replaceVersionPreservingFormat(readFileSync(path, 'utf8'), version));
  });
}

function replaceVersionPreservingFormat(text: string, version: string) {
  return text.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`);
}

if (import.meta.main) {
  const index = process.argv.indexOf('--version');
  const version = index === -1 ? undefined : process.argv[index + 1];
  if (!version) throw new Error('--version is required');
  updateReleaseManifests(process.cwd(), version);
}
