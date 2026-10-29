/**
 * Leaf process utilities for relay lifecycle management.
 * Zero internal dependencies — other lifecycle modules depend on this.
 * @module @domscribe/relay/lifecycle/process
 */

/**
 * Check if a process with the given PID is running.
 * Uses signal 0 which checks existence without actually signaling.
 */
export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // ESRCH means process doesn't exist
    // EPERM means process exists but we don't have permission (still running)
    if (error instanceof Error && 'code' in error) {
      return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
    return false;
  }
}

/**
 * Sleep for the specified duration.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
