import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RelayLockManager, createLockManager } from './lock-manager.js';

describe('RelayLockManager', () => {
  let tempDir: string;
  let domscribeDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'lock-manager-test-'));
    domscribeDir = path.join(tempDir, '.domscribe');
    mkdirSync(domscribeDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getLockData', () => {
    it('should return null when no lock file exists', () => {
      const manager = new RelayLockManager(tempDir);

      expect(manager.getLockData()).toBeNull();
    });

    it('should return parsed lock data when valid', () => {
      // Arrange
      const lockData = {
        pid: 1234,
        host: '127.0.0.1',
        port: 9876,
        startedAt: new Date().toISOString(),
        workspaceRoot: tempDir,
        version: '0.1.0',
        nonce: 'test-nonce',
        status: 'claimed',
      };
      writeFileSync(
        path.join(domscribeDir, 'relay.lock'),
        JSON.stringify(lockData),
      );
      const manager = new RelayLockManager(tempDir);

      // Act
      const result = manager.getLockData();

      // Assert
      expect(result).toEqual(lockData);
    });

    it('should return null for invalid JSON', () => {
      // Arrange
      writeFileSync(path.join(domscribeDir, 'relay.lock'), 'not json');
      const manager = new RelayLockManager(tempDir);

      // Act & Assert
      expect(manager.getLockData()).toBeNull();
    });

    it('should return null for JSON that fails schema validation', () => {
      // Arrange
      writeFileSync(
        path.join(domscribeDir, 'relay.lock'),
        JSON.stringify({ pid: 'not-a-number' }),
      );
      const manager = new RelayLockManager(tempDir);

      // Act & Assert
      expect(manager.getLockData()).toBeNull();
    });
  });

  describe('isLockFilePresent', () => {
    it('should return false when lock file does not exist', () => {
      const manager = new RelayLockManager(tempDir);

      expect(manager.isLockFilePresent()).toBe(false);
    });

    it('should return true when lock file exists', () => {
      // Arrange
      writeFileSync(path.join(domscribeDir, 'relay.lock'), '{}');
      const manager = new RelayLockManager(tempDir);

      // Act & Assert
      expect(manager.isLockFilePresent()).toBe(true);
    });
  });

  describe('getLockFilePath', () => {
    it('should return the expected path', () => {
      const manager = new RelayLockManager(tempDir);

      expect(manager.getLockFilePath()).toBe(
        path.join(domscribeDir, 'relay.lock'),
      );
    });
  });

  describe('removeLockFile', () => {
    it('should remove the lock file', () => {
      // Arrange
      const lockPath = path.join(domscribeDir, 'relay.lock');
      writeFileSync(lockPath, '{}');
      const manager = new RelayLockManager(tempDir);

      // Act
      manager.removeLockFile();

      // Assert
      expect(existsSync(lockPath)).toBe(false);
    });

    it('should not throw when lock file does not exist', () => {
      const manager = new RelayLockManager(tempDir);

      expect(() => manager.removeLockFile()).not.toThrow();
    });
  });

  describe('claim', () => {
    it('should throw when no nonce is provided', () => {
      const manager = new RelayLockManager(tempDir);

      expect(() => manager.claim()).toThrow('Nonce is required');
    });

    it('should create lock file with claiming status', () => {
      // Arrange
      const manager = new RelayLockManager(tempDir, { nonce: 'my-nonce' });

      // Act
      manager.claim();

      // Assert
      const data = manager.getLockData();
      expect(data).toBeTruthy();
      expect(data?.status).toBe('claiming');
      expect(data?.nonce).toBe('my-nonce');
      expect(data?.pid).toBe(process.pid);
      expect(data?.workspaceRoot).toBe(path.resolve(tempDir));
    });

    it('should throw if lock file already exists', () => {
      // Arrange
      writeFileSync(path.join(domscribeDir, 'relay.lock'), '{}');
      const manager = new RelayLockManager(tempDir, { nonce: 'my-nonce' });

      // Act & Assert
      expect(() => manager.claim()).toThrow('Lock file already exists');
    });

    it('should create .domscribe directory if it does not exist', () => {
      // Arrange — use a fresh temp dir without .domscribe
      const freshDir = mkdtempSync(path.join(tmpdir(), 'lock-no-ds-'));
      const manager = new RelayLockManager(freshDir, { nonce: 'n' });

      // Act
      manager.claim();

      // Assert
      expect(existsSync(path.join(freshDir, '.domscribe'))).toBe(true);
      expect(manager.isLockFilePresent()).toBe(true);

      // Cleanup
      rmSync(freshDir, { recursive: true, force: true });
    });
  });

  describe('finalize', () => {
    it('should transition lock from claiming to claimed with host/port', () => {
      // Arrange
      const manager = new RelayLockManager(tempDir, { nonce: 'my-nonce' });
      manager.claim();

      // Act
      manager.finalize({ host: '127.0.0.1', port: 3000 });

      // Assert
      const data = manager.getLockData();
      expect(data?.status).toBe('claimed');
      expect(data?.host).toBe('127.0.0.1');
      expect(data?.port).toBe(3000);
    });

    it('should throw when lock file does not exist', () => {
      const manager = new RelayLockManager(tempDir, { nonce: 'my-nonce' });

      expect(() => manager.finalize({ host: '127.0.0.1', port: 3000 })).toThrow(
        'Lock file not found',
      );
    });

    it('should throw on nonce mismatch', () => {
      // Arrange
      const claimer = new RelayLockManager(tempDir, { nonce: 'nonce-a' });
      claimer.claim();

      const imposter = new RelayLockManager(tempDir, { nonce: 'nonce-b' });

      // Act & Assert
      expect(() =>
        imposter.finalize({ host: '127.0.0.1', port: 3000 }),
      ).toThrow('Nonce mismatch');
    });

    it('should throw when lock is not in claiming state', () => {
      // Arrange
      const manager = new RelayLockManager(tempDir, { nonce: 'my-nonce' });
      manager.claim();
      manager.finalize({ host: '127.0.0.1', port: 3000 });

      // Act & Assert — already claimed
      expect(() => manager.finalize({ host: '127.0.0.1', port: 4000 })).toThrow(
        'Lock not in claiming state',
      );
    });
  });

  describe('release', () => {
    it('should remove lock file when nonce matches', () => {
      // Arrange
      const manager = new RelayLockManager(tempDir, { nonce: 'my-nonce' });
      manager.claim();

      // Act
      manager.release();

      // Assert
      expect(manager.isLockFilePresent()).toBe(false);
    });

    it('should not remove lock file when nonce does not match', () => {
      // Arrange
      const claimer = new RelayLockManager(tempDir, { nonce: 'nonce-a' });
      claimer.claim();

      const other = new RelayLockManager(tempDir, { nonce: 'nonce-b' });

      // Act
      other.release();

      // Assert — lock file should still exist
      expect(claimer.isLockFilePresent()).toBe(true);
    });

    it('should not throw when lock file does not exist', () => {
      const manager = new RelayLockManager(tempDir, { nonce: 'my-nonce' });

      expect(() => manager.release()).not.toThrow();
    });
  });
});

describe('createLockManager', () => {
  it('should return a RelayLockManager instance', () => {
    const manager = createLockManager('/tmp/test', { nonce: 'n' });

    expect(manager).toBeInstanceOf(RelayLockManager);
  });
});
