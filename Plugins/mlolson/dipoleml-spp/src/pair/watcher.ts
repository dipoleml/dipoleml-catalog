import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import { watch } from "chokidar";
import { getSppDir } from "../config/loader.js";
import { appendToTranscript, formatTime } from "./transcript.js";

// --- Types ---
interface FileState {
  content: string;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

// --- Constants ---
const DEBOUNCE_MS = 500;
const IGNORED_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.hg/**",
  "**/.claude-spp/**",
  "**/.claude/**",
  "**/dist/**",
  "**/.DS_Store",
];
const MAX_FILE_SIZE_BYTES = 1_000_000; // 1MB

// --- State ---
const fileStates = new Map<string, FileState>();

// --- Binary detection ---

/**
 * Check if a file is binary by looking for null bytes in the first 8KB.
 */
export function isBinaryFile(filePath: string): boolean {
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buf, 0, 8192, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } catch {
    return true; // If we can't read it, treat as binary
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// --- Diff computation ---

/**
 * Compute a unified diff between old and new content using the system `diff` command.
 * Returns the diff hunks (everything from @@ lines onward), or empty string if identical.
 */
export function computeDiff(oldContent: string, newContent: string): string {
  const tmpOld = path.join(os.tmpdir(), `spp-old-${process.pid}`);
  const tmpNew = path.join(os.tmpdir(), `spp-new-${process.pid}`);
  try {
    fs.writeFileSync(tmpOld, oldContent);
    fs.writeFileSync(tmpNew, newContent);
    // diff exits 0 when files are identical
    execFileSync("diff", ["-u", tmpOld, tmpNew], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return ""; // Identical
  } catch (err: unknown) {
    // diff exits 1 when files differ — that's the normal case
    if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 1 && "stdout" in err) {
      const output = (err as { stdout: string }).stdout;
      const lines = output.split("\n");
      // Strip the --- / +++ header lines, keep from first @@ onward
      const hhIdx = lines.findIndex((l) => l.startsWith("@@"));
      if (hhIdx >= 0) {
        return lines.slice(hhIdx).join("\n").trimEnd();
      }
      return output.trimEnd();
    }
    // diff exits 2 on real error — skip this change
    return "";
  } finally {
    try { fs.unlinkSync(tmpOld); } catch { /* ignore */ }
    try { fs.unlinkSync(tmpNew); } catch { /* ignore */ }
  }
}

// --- File change handling ---

function cacheFileContent(absPath: string, projectPath: string): void {
  const relPath = path.relative(projectPath, absPath);
  if (relPath.startsWith(".claude-spp")) return;
  try {
    const stat = fs.statSync(absPath);
    if (stat.size > MAX_FILE_SIZE_BYTES) return;
    if (isBinaryFile(absPath)) return;
    const content = fs.readFileSync(absPath, "utf-8");
    fileStates.set(relPath, { content, debounceTimer: null });
  } catch {
    // File unreadable — skip
  }
}

function processFileChange(
  absPath: string,
  relPath: string,
  projectPath: string,
): void {
  let newContent: string;
  try {
    const stat = fs.statSync(absPath);
    if (stat.size > MAX_FILE_SIZE_BYTES) return;
    if (isBinaryFile(absPath)) return;
    newContent = fs.readFileSync(absPath, "utf-8");
  } catch {
    return; // File deleted or unreadable
  }

  const state = fileStates.get(relPath);
  const oldContent = state?.content ?? "";

  // Dedup: skip if content unchanged
  if (newContent === oldContent) return;

  const diff = computeDiff(oldContent, newContent);
  if (!diff) return;

  const time = formatTime();
  appendToTranscript(projectPath, `${time} — Saved ${relPath}`, `\`\`\`diff\n${diff}\n\`\`\``);

  // Update state
  fileStates.set(relPath, { content: newContent, debounceTimer: null });
}

function handleFileEvent(
  absPath: string,
  projectPath: string,
): void {
  const relPath = path.relative(projectPath, absPath);

  // Guard against recursive transcript recording
  if (relPath.startsWith(".claude-spp")) return;
  const state = fileStates.get(relPath);

  // Clear existing debounce timer
  if (state?.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  const timer = setTimeout(() => {
    processFileChange(absPath, relPath, projectPath);
  }, DEBOUNCE_MS);

  // Update or create state with new timer (preserve content)
  if (state) {
    state.debounceTimer = timer;
  } else {
    fileStates.set(relPath, { content: "", debounceTimer: timer });
  }
}

// --- .gitignore parsing ---

/**
 * Convert a single .gitignore pattern to chokidar-compatible glob pattern(s).
 */
export function gitignorePatternToGlobs(pattern: string): string[] {
  const hasLeadingSlash = pattern.startsWith("/");
  const hasTrailingSlash = pattern.endsWith("/");

  // Remove leading slash (means "relative to repo root")
  if (hasLeadingSlash) pattern = pattern.slice(1);
  // Remove trailing slash
  if (hasTrailingSlash) pattern = pattern.slice(0, -1);

  // A pattern with a slash (after stripping leading/trailing) is anchored
  // to the repo root in .gitignore semantics
  const isAnchored = hasLeadingSlash || pattern.includes("/");

  if (isAnchored) {
    if (hasTrailingSlash) {
      return [`${pattern}/**`];
    }
    return [pattern, `${pattern}/**`];
  }

  // Unanchored: can match anywhere in the tree
  if (hasTrailingSlash) {
    return [`**/${pattern}/**`];
  }
  return [`**/${pattern}`, `**/${pattern}/**`];
}

/**
 * Parse a .gitignore file and return chokidar-compatible glob patterns.
 * Handles common .gitignore syntax: comments, blanks, directory patterns,
 * anchored patterns, and wildcard patterns.
 * Does not handle negation patterns (!pattern).
 */
export function loadGitignorePatterns(projectPath: string): string[] {
  const gitignorePath = path.join(projectPath, ".gitignore");
  let content: string;
  try {
    content = fs.readFileSync(gitignorePath, "utf-8");
  } catch {
    return [];
  }

  const patterns: string[] = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#")) continue;

    // Skip negation patterns
    if (line.startsWith("!")) continue;

    patterns.push(...gitignorePatternToGlobs(line));
  }

  return patterns;
}

// --- Main entry point ---

/**
 * Run the file watcher. This function blocks until SIGTERM/SIGINT.
 * Called by `spp watcher:start <projectPath>`.
 */
export function runWatcher(projectPath: string): void {
  // Ensure spp dir exists for transcript
  const sppDir = getSppDir(projectPath);
  if (!fs.existsSync(sppDir)) {
    fs.mkdirSync(sppDir, { recursive: true });
  }

  const gitignorePatterns = loadGitignorePatterns(projectPath);
  const allIgnored = [...IGNORED_PATTERNS, ...gitignorePatterns];

  let isReady = false;

  const watcher = watch(projectPath, {
    ignored: allIgnored,
    persistent: true,
    ignoreInitial: false, // We want add events for initial scan to cache content
  });

  // During initial scan: cache content silently
  watcher.on("add", (filePath: string) => {
    if (!isReady) {
      cacheFileContent(filePath, projectPath);
      return;
    }
    // Real new file after initial scan
    handleFileEvent(filePath, projectPath);
  });

  watcher.on("change", (filePath: string) => {
    handleFileEvent(filePath, projectPath);
  });

  watcher.on("ready", () => {
    isReady = true;
  });

  // Graceful shutdown
  const shutdown = () => {
    watcher.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
