/**
 * Lock file management for relay daemon.
 * Provides atomic read/write and stale detection for workspace isolation.
 * @module @domscribe/relay/lifecycle/lock-manager
 */

import {
  existsSync,
  readFileSync,
  openSync,
  closeSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  mkdirSync,
  constants,
} from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG, PATHS } from '@domscribe/core';
import { RELAY_VERSION } from '../version.js';
import { z } from 'zod';

/**
 * Structure of the relay lock file stored at .domscribe/relay.lock.
 * Used for workspace isolation - each workspace has its own relay instance.
 */
export const RelayLockSchema = z.object({
  pid: z.number().describe('Process ID of the running relay server'),
  host: z.string().optional().describe('Host the relay server is bound to'),
  port: z.number().optional().describe('Port the relay server is listening on'),
  startedAt: z.string().describe('ISO timestamp when the relay was started'),
  workspaceRoot: z.string().describe('Absolute path to the workspace root'),
  version: z.string().describe('Version of domscribe that started the relay'),
  nonce: z.string().describe('Nonce of the relay server'),
  status: z.enum(['claiming', 'claimed']).describe('Status of the lock'),
});

export type RelayLock = z.infer<typeof RelayLockSchema>;

export class RelayLockManager {
  private readonly nonce?: string;
  private readonly domscribeDir: string;
  private readonly lockFilePath: string;

  constructor(
    private readonly workspaceRoot: string,
    { nonce }: { nonce?: string } = {},
  ) {
    this.nonce = nonce;
    this.domscribeDir = path.join(workspaceRoot, PATHS.DOMSCRIBE_DIR);
    this.lockFilePath = path.join(
      this.domscribeDir,
      DEFAULT_CONFIG.RELAY_LOCK_FILE,
    );
  }

  // --- Read operations (no nonce required) ---

  getLockData(): RelayLock | null {
    if (!existsSync(this.lockFilePath)) {
      return null;
    }

    try {
      const content = readFileSync(this.lockFilePath, 'utf-8');
      const result = RelayLockSchema.safeParse(JSON.parse(content));
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  isLockFilePresent(): boolean {
    return existsSync(this.lockFilePath);
  }

  getLockFilePath(): string {
    return this.lockFilePath;
  }

  // --- Stale lock file removal (no nonce required) ---

  removeLockFile(): void {
    try {
      unlinkSync(this.lockFilePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  // --- Write operations (nonce required) ---

  claim(): void {
    const nonce = this.requireNonce();

    if (this.isLockFilePresent()) {
      throw new Error(
        `Lock file already exists at ${this.lockFilePath}. Another relay may be running.`,
      );
    }

    const data: RelayLock = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      workspaceRoot: path.resolve(this.workspaceRoot),
      version: RELAY_VERSION,
      nonce,
      status: 'claiming',
    };

    // Ensure .domscribe directory exists
    if (!existsSync(this.domscribeDir)) {
      mkdirSync(this.domscribeDir, { recursive: true });
    }

    this.exclusiveWrite(data);
  }

  finalize({ host, port }: { host: string; port: number }): void {
    const nonce = this.requireNonce();
    const data = this.getLockData();

    if (!data) {
      throw new Error('Lock file not found');
    }

    if (data.nonce !== nonce) {
      throw new Error('Nonce mismatch');
    }

    if (data.status !== 'claiming') {
      throw new Error('Lock not in claiming state');
    }

    data.status = 'claimed';
    data.host = host;
    data.port = port;
    this.atomicWrite(data);
  }

  release(): void {
    const nonce = this.requireNonce();
    const data = this.getLockData();

    if (!data) {
      return;
    }

    if (data.nonce !== nonce) {
      return;
    }

    try {
      unlinkSync(this.lockFilePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  // --- Private ---

  private requireNonce(): string {
    if (!this.nonce) {
      throw new Error('Nonce is required for write operations');
    }
    return this.nonce;
  }

  /**
   * Create lock file exclusively using O_EXCL — fails atomically if the file
   * already exists, preventing TOCTOU races between competing processes.
   * Used by claim().
   */
  private exclusiveWrite(data: RelayLock): void {
    let fd: number;
    try {
      fd = openSync(
        this.lockFilePath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new Error(
          `Lock file already exists at ${this.lockFilePath}. Another relay may be running.`,
          { cause: error },
        );
      }
      throw error;
    }

    try {
      writeFileSync(fd, JSON.stringify(data, null, 2), 'utf-8');
    } finally {
      closeSync(fd);
    }
  }

  /**
   * Atomically replace lock file contents via temp file + rename.
   * Readers never see partial content. Used by finalize().
   */
  private atomicWrite(data: RelayLock): void {
    const tempPath = path.join(
      this.domscribeDir,
      `relay.lock.${process.pid}.tmp`,
    );

    try {
      writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      renameSync(tempPath, this.lockFilePath);
    } catch (error) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}

/**
 * Create a RelayLockManager for the given workspace.
 */
export function createLockManager(
  workspaceRoot: string,
  { nonce }: { nonce: string },
): RelayLockManager {
  return new RelayLockManager(workspaceRoot, { nonce });
}
