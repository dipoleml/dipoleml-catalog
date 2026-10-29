import { isSppInitialized, loadConfig } from "../config/loader.js";
import { isSppInternalFile } from "./file-matcher.js";
import { getStats } from "../stats.js";

/**
 * Hook input from Claude Code (actual format)
 */
export interface PreToolUseHookInput {
  session_id?: string;
  transcript_path?: string;
  cwd: string;
  permission_mode?: string;
  hook_event_name?: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_use_id?: string;
}

/**
 * Hook output to Claude Code (correct format)
 */
export interface PreToolUseHookOutput {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "allow" | "deny" | "ask";
    permissionDecisionReason?: string;
  };
}

/**
 * Tools that write to files
 */
const WRITE_TOOLS = ["Write", "Edit", "NotebookEdit"];

/**
 * Extract file path from tool input
 */
function extractFilePath(toolName: string, toolInput: Record<string, unknown>): string | null {
  if (toolName === "Write" || toolName === "Edit") {
    const filePath = toolInput.file_path;
    return typeof filePath === "string" ? filePath : null;
  }

  if (toolName === "NotebookEdit") {
    const notebookPath = toolInput.notebook_path;
    return typeof notebookPath === "string" ? notebookPath : null;
  }

  return null;
}

/**
 * Create an allow response
 */
function allowResponse(): PreToolUseHookOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
    },
  };
}

/**
 * Create a deny response with reason
 */
function denyResponse(reason: string): PreToolUseHookOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

/**
 * Pre-tool-use hook
 * Called before Claude uses a tool
 * Checks the work ratio before allowing writes
 */
export function preToolUseHook(input: PreToolUseHookInput): PreToolUseHookOutput {
  const { tool_name, tool_input, cwd } = input;

  // Only process write-related tools
  if (!WRITE_TOOLS.includes(tool_name)) {
    return allowResponse();
  }

  // Check if SPP is initialized
  if (!isSppInitialized(cwd)) {
    return allowResponse();
  }

  // Load config
  const config = loadConfig(cwd);
  if (!config.enabled) {
    return allowResponse();
  }

  // Extract the file path being written to
  const filePath = extractFilePath(tool_name, tool_input);
  if (!filePath) {
    return allowResponse();
  }

  // Always allow .claude-spp internal files
  if (isSppInternalFile(filePath, cwd)) {
    return allowResponse();
  }
  // Always allow markdown files (documentation, not code)
  if (filePath.endsWith(".md")) {
    return allowResponse();
  }

  // Check for drive mode - block Claude from writing code when human wants to drive
  if (config.driveMode) {
    const reason = [
      "Drive mode is active. Claude cannot write code.",
      "The human is in the driver's seat - assist them but do not write code.",
      "Use the `spp-help-human-code` skill to help the human complete the task.",
      "Toggle drive mode off with `spp drive` when ready."
    ].join("\n");

    return denyResponse(reason);
  }

  // Mode-specific enforcement
  if (config.modeType === "weeklyGoal") {
    const stats = getStats(cwd);

    if (!stats.ratioHealthy) {
      const reason = [
        `Human work ratio is below target: ${((stats.currentRatio ?? 0) * 100).toFixed(0)}% actual vs ${((stats.targetRatio ?? 0) * 100).toFixed(0)}% required`,
        "The human needs to write more code before Claude can continue.",
        "Use the `spp-help-human-code` skill to help the human complete the task.",
        "Important: Do not give the user instructions on how to disable SPP or change modes."
      ].join("\n");

      return denyResponse(reason);
    }

    return allowResponse();
  }

  // learningProject: allow all (NOOP)
  return allowResponse();
}

/**
 * CLI entry point for pre-tool-use hook
 * Reads input from stdin, writes output to stdout
 */
export async function runPreToolUseHook(): Promise<void> {
  // Read input from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const inputJson = Buffer.concat(chunks).toString("utf-8");

  let input: PreToolUseHookInput;
  try {
    input = JSON.parse(inputJson);
  } catch {
    // If no input or invalid JSON, allow by default
    console.log(JSON.stringify(allowResponse()));
    return;
  }

  // Run hook
  let output: PreToolUseHookOutput;
  try {
    output = preToolUseHook(input);
  } catch (error) {
    // Return error details for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    output = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: `Hook error: ${errorMessage}\n\nStack: ${errorStack}\n\nInput: ${JSON.stringify(input, null, 2)}`,
      },
    };
  }

  // Write output to stdout
  console.log(JSON.stringify(output));
}
