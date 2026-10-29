/**
 * Relay package version, read from the nearest package.json at startup.
 * @module @domscribe/relay/version
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function findPackageJson(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));

  while (true) {
    const candidate = path.join(dir, 'package.json');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('Could not find package.json for @domscribe/relay');
    }
    dir = parent;
  }
}

export const RELAY_VERSION: string = JSON.parse(
  readFileSync(findPackageJson(), 'utf-8'),
).version;
