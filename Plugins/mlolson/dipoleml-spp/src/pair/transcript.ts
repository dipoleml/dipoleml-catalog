import * as fs from "node:fs";
import * as path from "node:path";
import { getSppDir } from "../config/loader.js";

const TRANSCRIPT_FILENAME = "pair-transcript.md";
const TRANSCRIPTS_SUBDIR = "transcripts";

/**
 * Get the path to the transcripts archive subdirectory
 */
export function getTranscriptsDir(projectPath: string): string {
  return path.join(getSppDir(projectPath), TRANSCRIPTS_SUBDIR);
}

/**
 * Get the path to the current transcript file
 */
export function getTranscriptPath(projectPath: string): string {
  return path.join(getSppDir(projectPath), TRANSCRIPT_FILENAME);
}

/**
 * Read the full transcript contents.
 * Returns empty string if no transcript exists.
 */
export function getTranscript(projectPath: string): string {
  const transcriptPath = getTranscriptPath(projectPath);
  if (!fs.existsSync(transcriptPath)) {
    return "";
  }
  return fs.readFileSync(transcriptPath, "utf-8");
}

/**
 * Clear the transcript (used when starting a new turn).
 */
export function clearTranscript(projectPath: string): void {
  const transcriptPath = getTranscriptPath(projectPath);
  if (fs.existsSync(transcriptPath)) {
    fs.unlinkSync(transcriptPath);
  }
}

/**
 * Archive the transcript with a timestamp (used on rotate/end).
 * Moves pair-transcript.md to transcripts/pair-transcript-YYYYMMDD-HHMMSS.md.
 * Returns the archive path, or null if no transcript exists.
 */
export function archiveTranscript(projectPath: string): string | null {
  const transcriptPath = getTranscriptPath(projectPath);
  if (!fs.existsSync(transcriptPath)) {
    return null;
  }
  const transcriptsDir = getTranscriptsDir(projectPath);
  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const archivePath = path.join(
    transcriptsDir,
    `pair-transcript-${timestamp}.md`,
  );
  fs.renameSync(transcriptPath, archivePath);
  return archivePath;
}

/**
 * Format a timestamp as HH:MM for transcript headers.
 */
export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Append a formatted entry to the transcript.
 * Shared by file watcher and conversation hooks.
 */
export function appendToTranscript(
  projectPath: string,
  header: string,
  body: string,
): void {
  const transcriptPath = getTranscriptPath(projectPath);
  const sppDir = getSppDir(projectPath);

  // Ensure .claude-spp directory exists
  if (!fs.existsSync(sppDir)) {
    fs.mkdirSync(sppDir, { recursive: true });
  }

  const entry = `\n## ${header}\n\n${body}\n`;
  fs.appendFileSync(transcriptPath, entry, "utf-8");
}

export interface TranscriptEntry {
  filename: string;
  path: string;
  date: Date;
}

/**
 * List archived transcripts from the transcripts/ subdirectory.
 * Returns entries sorted by date descending (most recent first).
 */
export function listTranscripts(projectPath: string): TranscriptEntry[] {
  const transcriptsDir = getTranscriptsDir(projectPath);
  if (!fs.existsSync(transcriptsDir)) {
    return [];
  }

  const files = fs.readdirSync(transcriptsDir).filter((f) =>
    f.startsWith("pair-transcript-") && f.endsWith(".md"),
  );

  const entries: TranscriptEntry[] = [];
  for (const filename of files) {
    // Parse timestamp from filename: pair-transcript-YYYY-MM-DDTHHMMSS.md
    const match = filename.match(
      /pair-transcript-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})\.md/,
    );
    if (match) {
      const [, year, month, day, hour, min, sec] = match;
      const date = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
      entries.push({
        filename,
        path: path.join(transcriptsDir, filename),
        date,
      });
    }
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  return entries;
}
