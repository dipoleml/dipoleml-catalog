// A process's start time on Linux, read from /proc/<pid>/stat (field 22:
// clock ticks after boot). It is fixed for the life of the process.
//
// `ps -o lstart` is not: procps prints boot time + start ticks, and boot time
// is derived from the current wall clock minus uptime. When a VM's clock is
// stepped (Docker Desktop's VM resyncs against the host), every
// process's lstart moves with it, by a second or more, while the process
// itself never changed. Anything comparing lstart over time then sees a new
// process where there is the same one.
import { readFileSync } from "fs";

// Field 22 of a /proc/<pid>/stat line, or null if the line can't be parsed.
// Field 2 (comm) is in parentheses and may itself contain spaces or ")", so
// fields are counted from the last ")".
export function parseStartTicks(stat: string): string | null {
  const end = stat.lastIndexOf(")");
  if (end === -1) return null;
  // After ") " come fields 3, 4, ...: field 22 is index 19.
  const ticks = stat.slice(end + 2).split(" ")[19];
  return ticks && /^\d+$/.test(ticks) ? ticks : null;
}

// Same contract as lib/start-time.ts's processLstart: a string while the process
// runs, null when there is no such process, undefined when the read could
// not tell (callers must not read undefined as "dead").
export function procStartTicks(
  pid: number,
  procRoot = "/proc",
): string | null | undefined {
  let stat: string;
  try {
    stat = readFileSync(`${procRoot}/${pid}/stat`, "utf8");
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "ENOENT" ? null : undefined;
  }
  return parseStartTicks(stat) ?? undefined;
}
