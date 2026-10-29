import { spawn } from "node:child_process";
import { loadConfig, saveConfig } from "../config/loader.js";

/**
 * Spawn the file watcher as a detached background process.
 * Stores the PID in config.watcherPid.
 * Returns the child process PID.
 */
export function spawnWatcher(projectPath: string): number {
  // Use the current CLI script path as the spp binary
  const sppBin = process.argv[1];

  const child = spawn(
    process.execPath, // node binary
    [sppBin, "watcher:start", projectPath],
    {
      detached: true,
      stdio: "ignore",
      cwd: projectPath,
    },
  );

  child.unref();

  const pid = child.pid;
  if (pid === undefined) {
    throw new Error("Failed to spawn watcher process");
  }

  // Store PID in config
  const config = loadConfig(projectPath);
  config.watcherPid = pid;
  saveConfig(projectPath, config);

  return pid;
}

/**
 * Kill the watcher process using stored PID.
 * Silently ignores if process is already dead.
 */
export function killWatcher(projectPath: string): void {
  const config = loadConfig(projectPath);
  const pid = config.watcherPid;
  if (!pid) return;

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process already dead — ignore
  }

  // Clear PID from config
  config.watcherPid = undefined;
  saveConfig(projectPath, config);
}

/**
 * Check if the watcher process is still running.
 */
export function isWatcherRunning(projectPath: string): boolean {
  const config = loadConfig(projectPath);
  const pid = config.watcherPid;
  if (!pid) return false;

  try {
    process.kill(pid, 0); // signal 0 tests if process exists
    return true;
  } catch {
    return false;
  }
}
