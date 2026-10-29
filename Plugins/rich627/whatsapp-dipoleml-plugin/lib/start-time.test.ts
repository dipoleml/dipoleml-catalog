import { describe, expect, test } from "bun:test";
import {
  formatLock,
  lockHolderState,
  lockIdentity,
  parseLock,
  processLstart,
  processStartTime,
} from "./start-time";

const linux = process.platform === "linux";
// PIDs are at most 2^22 on Linux and far smaller elsewhere.
const NO_SUCH_PID = 2 ** 30;

describe("processLstart / processStartTime", () => {
  // Explicit timeouts: on Windows each probe is a PowerShell CIM spawn of a
  // few seconds, and these tests run several.
  test("this process: strings, stable across reads", () => {
    const lstart = processLstart(process.pid);
    expect(typeof lstart).toBe("string");
    expect(processLstart(process.pid)).toBe(lstart);
    const start = processStartTime(process.pid);
    expect(typeof start).toBe("string");
    expect(processStartTime(process.pid)).toBe(start);
  }, 30_000);

  test.if(linux)("Linux: processStartTime is start ticks, not lstart", () => {
    expect(processStartTime(process.pid)).toMatch(/^\d+$/);
    expect(processLstart(process.pid)).not.toMatch(/^\d+$/);
  });

  test("a PID that cannot exist is null, not undefined", () => {
    expect(processLstart(NO_SUCH_PID)).toBeNull();
    expect(processStartTime(NO_SUCH_PID)).toBeNull();
  }, 30_000);
});

describe("lockIdentity", () => {
  test.if(linux)("Linux: ticks@boot-id, stable, null for no process", () => {
    const id = lockIdentity(process.pid);
    expect(id).toMatch(/^\d+@[0-9a-f-]{36}$/);
    expect(lockIdentity(process.pid)).toBe(id);
    expect(lockIdentity(NO_SUCH_PID)).toBeNull();
  });

  test.if(!linux)("elsewhere: undefined — line 2 does the work", () => {
    expect(lockIdentity(process.pid)).toBeUndefined();
  });
});

describe("formatLock / parseLock", () => {
  test("three lines without an identity, byte-identical to the old form", () => {
    expect(formatLock(42, "Sat May 16 07:43:46 2026", "c1", undefined)).toBe(
      "42\nSat May 16 07:43:46 2026\nc1\n",
    );
    expect(formatLock(42, undefined, "", null)).toBe("42\n\n\n");
  });

  test("a fourth line only when there is an identity", () => {
    expect(formatLock(42, "x", "", "7@boot")).toBe("42\nx\n\n7@boot\n");
  });

  test("round trip, and a pre-0.27.3 lock parses with an empty identity", () => {
    expect(parseLock(formatLock(42, "x", "c1", "7@boot"))).toEqual({
      pid: 42,
      start: "x",
      client: "c1",
      identity: "7@boot",
    });
    expect(parseLock("42\nx\nc1\n")).toEqual({
      pid: 42,
      start: "x",
      client: "c1",
      identity: "",
    });
    expect(parseLock("").pid).toBe(0); // callers reject pid <= 0 as malformed
  });
});

describe("lockHolderState", () => {
  const lstart = processLstart(process.pid) as string;
  const lock = (start: string, identity = "") =>
    parseLock(formatLock(process.pid, start, "", identity));

  test("the lock server.ts writes for a live process is live", () => {
    expect(lockHolderState(lock(lstart, lockIdentity(process.pid) ?? ""))).toBe(
      "live",
    );
  });

  test("a pre-0.27.3 lock (line 2 only) for a live process is live", () => {
    expect(lockHolderState(lock(lstart))).toBe("live");
  });

  test("a different lstart is a reused PID", () => {
    expect(lockHolderState(lock("Thu Jan  1 00:00:00 1970"))).toBe("stale");
  });

  test("a lock without a start time is never live", () => {
    expect(lockHolderState(lock(""))).toBe("stale");
  });

  test("no such process is stale", () => {
    expect(lockHolderState(parseLock(`${NO_SUCH_PID}\n${lstart}\n\n`))).toBe(
      "stale",
    );
  });

  test.if(linux)(
    "Linux: line 4 decides — a wrong identity is stale even if lstart matches",
    () => {
      expect(lockHolderState(lock(lstart, "1@not-this-boot"))).toBe("stale");
    },
  );

  test.if(linux)(
    "Linux: line 4 decides — a drifted lstart is still live when line 4 matches",
    () => {
      const id = lockIdentity(process.pid) as string;
      expect(lockHolderState(lock("Thu Jan  1 00:00:00 1970", id))).toBe(
        "live",
      );
    },
  );
});
