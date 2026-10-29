// Per-incarnation identity of a process: what .server.lock records so a
// genuine duplicate server can be told apart from a reused PID, and what the
// parent watchdog compares every tick. Shared by server.ts and
// scripts/doctor.ts so the two can never disagree about what a lock means.
//
// The lock file:
//   line 1  pid
//   line 2  `ps -o lstart` (macOS, Linux) or a CIM FILETIME (Windows)
//   line 3  CLIENT_ID of the client that spawned the holder ("" if none)
//   line 4  Linux only, since 0.27.3: `<start ticks>@<boot id>`
//
// Line 4 exists because lstart is not stable on Linux: procps derives it from
// the current wall clock, so a VM clock step (Docker Desktop resyncing against
// the host) moves a live primary's lstart by a second, and a server starting
// afterwards read the live lock as stale, deleted it and opened a second
// WhatsApp connection. /proc/<pid>/stat start ticks (lib/proc-start.ts) are
// fixed for the life of the process; the boot id pins them to one boot, since
// ticks alone restart from zero on reboot and could collide with a reused PID.
//
// Line 2 is still written, in the old form, so a server from before 0.27.3
// that is still running (plugin updates do not restart live sessions) keeps
// reading a new lock exactly as it always did. A new server prefers line 4
// and falls back to line 2 when a lock has none. What this cannot fix: any
// pre-0.27.3 reader still judges by line 2, so after a clock step it reads
// any live lock as stale, old or new, until every such session restarts.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { procStartTicks } from "./proc-start";

function lstartProbe(pid: number): [string, string[]] {
  return process.platform === "win32"
    ? [
        // Absolute path: a bare "powershell.exe" resolves via cwd/PATH.
        `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          // CIM, not Get-Process: it can read the start time of a process the
          // caller does not own (an elevated session's server).
          `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" -ErrorAction Stop | ForEach-Object { $_.CreationDate.ToFileTimeUtc() })`,
        ],
      ]
    : ["ps", ["-p", String(pid), "-o", "lstart="]];
}
const PROBE_OPTS = {
  encoding: "utf8" as const,
  stdio: ["ignore", "pipe", "ignore"] as ("ignore" | "pipe")[],
  timeout: 5000,
  windowsHide: true,
};

// Lock line 2: a string if the process is running, null if there is no such
// process, undefined if the probe could not tell (timeout, spawn failure, WMI
// error). Callers must not read undefined as "dead" — that is how a lock
// fails open.
export function processLstart(pid: number): string | null | undefined {
  const [cmd, args] = lstartProbe(pid);
  try {
    return execFileSync(cmd, args, PROBE_OPTS).trim() || null;
  } catch (err) {
    // ps exits 1 for "no such process"; on Windows a non-zero exit is a real
    // PowerShell/WMI failure (not-found prints nothing and exits 0).
    return process.platform !== "win32" &&
      typeof (err as { status?: unknown }).status === "number"
      ? null
      : undefined;
  }
}

// Lock line 4 on Linux; undefined elsewhere, and on a Linux where /proc could
// not supply both halves (then line 2 does the work, as before 0.27.3).
export function lockIdentity(pid: number): string | null | undefined {
  if (process.platform !== "linux") return undefined;
  const ticks = procStartTicks(pid);
  if (typeof ticks !== "string") return ticks;
  let bootId: string;
  try {
    bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
  } catch {
    return undefined;
  }
  return bootId ? `${ticks}@${bootId}` : undefined;
}

// The clock-stable start time the parent watchdog compares every 15 s: start
// ticks on Linux (no boot id needed — a parent cannot outlive a reboot),
// lstart/FILETIME elsewhere. Same string/null/undefined contract.
export function processStartTime(pid: number): string | null | undefined {
  return process.platform === "linux"
    ? procStartTicks(pid)
    : processLstart(pid);
}

export type ParsedLock = {
  pid: number;
  start: string;
  client: string;
  identity: string;
};

export function parseLock(raw: string): ParsedLock {
  const [pidLine = "", startLine = "", clientLine = "", idLine = ""] =
    raw.split("\n");
  return {
    pid: Number(pidLine.trim()),
    start: startLine.trim(),
    client: clientLine.trim(),
    identity: idLine.trim(),
  };
}

// Three lines plus a trailing newline, exactly as before 0.27.3; a fourth
// only when there is an identity to record, so the file is byte-identical to
// the old format everywhere but Linux.
export function formatLock(
  pid: number,
  start: string | null | undefined,
  client: string,
  identity: string | null | undefined,
): string {
  const base = `${pid}\n${start ?? ""}\n${client}\n`;
  return identity ? `${base}${identity}\n` : base;
}

// Is the lock's recorded holder the process now running as lock.pid?
//   live     same incarnation: a genuine duplicate server
//   stale    no such process, or the PID was reused by something else
//   unknown  the probe could not tell — fail closed, never read as stale
export function lockHolderState(
  lock: ParsedLock,
): "live" | "stale" | "unknown" {
  if (process.platform === "linux" && lock.identity !== "") {
    const now = lockIdentity(lock.pid);
    if (now === undefined) return "unknown";
    if (now === null) return "stale";
    return now === lock.identity ? "live" : "stale";
  }
  // Non-Linux, or a Linux lock written before 0.27.3: compare line 2. A lock
  // with no start time at all cannot be verified — take over rather than
  // risk a false refusal (the bug the start time was added to fix).
  const now = processLstart(lock.pid);
  if (now === undefined) return "unknown";
  if (now === null) return "stale";
  return lock.start !== "" && now === lock.start ? "live" : "stale";
}
