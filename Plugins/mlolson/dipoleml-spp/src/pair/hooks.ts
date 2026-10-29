import * as fs from "node:fs";
import { isSppInitialized, loadConfig } from "../config/loader.js";
import { appendToTranscript, formatTime } from "./transcript.js";

const MAX_RESPONSE_LENGTH = 2000;

/**
 * Hook input common fields from Claude Code
 */
interface HookInputBase {
  session_id?: string;
  transcript_path?: string;
  cwd: string;
  permission_mode?: string;
  hook_event_name?: string;
}

/**
 * UserPromptSubmit hook input
 */
interface UserPromptHookInput extends HookInputBase {
  prompt: string;
}

/**
 * Stop hook input
 */
interface StopHookInput extends HookInputBase {
  stop_reason?: string;
}

/**
 * Check if we should record to transcript (drive mode active)
 */
function shouldRecord(cwd: string): boolean {
  if (!isSppInitialized(cwd)) return false;
  const config = loadConfig(cwd);
  return config.driveMode === true;
}

/**
 * Read the last assistant message from the Claude Code transcript JSONL file.
 * Each line is a JSON object. We want the last one with role "assistant".
 */
function readLastAssistantMessage(transcriptPath: string): string | null {
  if (!fs.existsSync(transcriptPath)) return null;

  const content = fs.readFileSync(transcriptPath, "utf-8");
  const lines = content.trim().split("\n");

  // Walk backwards to find last assistant message
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.role === "assistant") {
        // The message content can be a string or an array of content blocks
        if (typeof entry.content === "string") {
          return entry.content;
        }
        if (Array.isArray(entry.content)) {
          // Extract text blocks
          const textParts = entry.content
            .filter((block: { type: string }) => block.type === "text")
            .map((block: { text: string }) => block.text);
          return textParts.join("\n") || null;
        }
        // Try message field as fallback
        if (typeof entry.message === "string") {
          return entry.message;
        }
      }
    } catch {
      // Skip unparseable lines
    }
  }
  return null;
}

/**
 * Truncate text to MAX_RESPONSE_LENGTH with an indicator.
 */
function truncate(text: string): string {
  if (text.length <= MAX_RESPONSE_LENGTH) return text;
  return text.slice(0, MAX_RESPONSE_LENGTH) + "\n\n... (truncated)";
}

/**
 * Handle UserPromptSubmit hook — record human's question to transcript.
 */
export function userPromptHook(input: UserPromptHookInput): void {
  if (!shouldRecord(input.cwd)) return;
  if (!input.prompt?.trim()) return;

  const time = formatTime();
  appendToTranscript(input.cwd, `${time} — Human → Claude`, input.prompt.trim());
}

/**
 * Handle Stop hook — record Claude's response to transcript.
 */
export function stopHook(input: StopHookInput): void {
  if (!shouldRecord(input.cwd)) return;
  if (!input.transcript_path) return;

  const message = readLastAssistantMessage(input.transcript_path);
  if (!message?.trim()) return;

  const time = formatTime();
  appendToTranscript(input.cwd, `${time} — Claude → Human`, truncate(message.trim()));
}

/**
 * CLI entry point for UserPromptSubmit hook.
 * Reads JSON from stdin, calls userPromptHook.
 */
export async function runUserPromptHook(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const inputJson = Buffer.concat(chunks).toString("utf-8");

  try {
    const input: UserPromptHookInput = JSON.parse(inputJson);
    userPromptHook(input);
  } catch {
    // Invalid input — silently exit
  }
}

/**
 * CLI entry point for Stop hook.
 * Reads JSON from stdin, calls stopHook.
 */
export async function runStopHook(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const inputJson = Buffer.concat(chunks).toString("utf-8");

  try {
    const input: StopHookInput = JSON.parse(inputJson);
    stopHook(input);
  } catch {
    // Invalid input — silently exit
  }
}
