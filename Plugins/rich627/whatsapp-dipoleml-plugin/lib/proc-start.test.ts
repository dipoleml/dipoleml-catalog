import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { parseStartTicks, procStartTicks } from "./proc-start";

// A real /proc/<pid>/stat line (bun), start ticks 59659757 in field 22.
const STAT =
  "253268 (bun) S 253154 253154 295 34816 253154 4194304 98066 0 0 0 1712 432 0 0 20 0 14 0 59659757 77426688 30226 18446744073709551615 1 1 0 0 0 0 0 4096 16890 0 0 0 17 3 0 0 0 0 0";

describe("parseStartTicks", () => {
  test("reads field 22", () => {
    expect(parseStartTicks(STAT)).toBe("59659757");
  });

  test("a comm containing spaces and ')' doesn't shift the fields", () => {
    expect(parseStartTicks(STAT.replace("(bun)", "(a b) c))"))).toBe(
      "59659757",
    );
  });

  test("unparseable input is null", () => {
    expect(parseStartTicks("")).toBeNull();
    expect(parseStartTicks("253268 bun S 1 2 3")).toBeNull();
    expect(parseStartTicks("253268 (bun) S 1 2 3")).toBeNull();
  });
});

describe("procStartTicks", () => {
  const root = mkdtempSync(join(tmpdir(), "proc-start-"));
  mkdirSync(join(root, "42"));
  writeFileSync(join(root, "42", "stat"), STAT);
  mkdirSync(join(root, "43"));
  writeFileSync(join(root, "43", "stat"), "garbage");

  test("a running process gives its start ticks", () => {
    expect(procStartTicks(42, root)).toBe("59659757");
  });

  test("no such process is null, not undefined", () => {
    expect(procStartTicks(99, root)).toBeNull();
  });

  test("an unreadable stat line is undefined (no evidence either way)", () => {
    expect(procStartTicks(43, root)).toBeUndefined();
  });

  test.if(process.platform === "linux")(
    "this process: stable across reads",
    () => {
      const first = procStartTicks(process.pid);
      expect(first).toMatch(/^\d+$/);
      expect(procStartTicks(process.pid)).toBe(first);
    },
  );
});
