import { isProcessRunning, sleep } from './process.js';

describe('isProcessRunning', () => {
  it('should return true for the current process', () => {
    expect(isProcessRunning(process.pid)).toBe(true);
  });

  it('should return false for a non-existent PID', () => {
    // PID 9999999 is extremely unlikely to exist
    expect(isProcessRunning(9999999)).toBe(false);
  });

  it('should return false when process.kill throws a non-EPERM error', () => {
    // Arrange
    const original = process.kill;
    process.kill = (() => {
      const err = new Error('ESRCH') as NodeJS.ErrnoException;
      err.code = 'ESRCH';
      throw err;
    }) as typeof process.kill;

    // Act & Assert
    expect(isProcessRunning(12345)).toBe(false);

    // Cleanup
    process.kill = original;
  });

  it('should return true when process.kill throws EPERM (exists but no permission)', () => {
    // Arrange
    const original = process.kill;
    process.kill = (() => {
      const err = new Error('EPERM') as NodeJS.ErrnoException;
      err.code = 'EPERM';
      throw err;
    }) as typeof process.kill;

    // Act & Assert
    expect(isProcessRunning(12345)).toBe(true);

    // Cleanup
    process.kill = original;
  });

  it('should return false when a non-Error is thrown', () => {
    // Arrange
    const original = process.kill;
    process.kill = (() => {
      throw 'unexpected';
    }) as typeof process.kill;

    // Act & Assert
    expect(isProcessRunning(12345)).toBe(false);

    // Cleanup
    process.kill = original;
  });
});

describe('sleep', () => {
  it('should resolve after the specified duration', async () => {
    const start = Date.now();

    await sleep(50);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});
