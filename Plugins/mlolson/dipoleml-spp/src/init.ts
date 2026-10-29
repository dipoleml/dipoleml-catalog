import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadConfig, saveConfig, isSppInitialized, getSppDir } from "./config/loader.js";
import {
  DEFAULT_CONFIG,
  type Config,
  type ModeType,
  type StatsWindow,
  type TrackingMode,
  type VcsType,
  MODE_TYPE_LABELS,
  MODE_TYPE_DESCRIPTIONS,
  ModeTypeSchema,
  TRACKING_MODE_LABELS,
  TrackingModeSchema,
} from "./config/schema.js";
import {
  getTotalCommitCount,
  getHeadCommitHash,
} from "./vcs/index.js";

/**
 * Add an entry to .gitignore or .hgignore
 * Creates the ignore file if it doesn't exist
 */
function addToIgnoreFile(projectPath: string, entry: string, vcsType: VcsType): void {
  const ignoreFileName = vcsType === "git" ? ".gitignore" : ".hgignore";
  const ignorePath = path.join(projectPath, ignoreFileName);

  if (!fs.existsSync(ignorePath)) {
    console.log(`Creating ${ignoreFileName}...`);
    // For .hgignore, we need to specify syntax
    const content = vcsType === "hg" ? `syntax: glob\n${entry}\n` : `${entry}\n`;
    fs.writeFileSync(ignorePath, content, "utf-8");
    console.log(`Added "${entry}" to ${ignoreFileName}`);
    return;
  }

  const content = fs.readFileSync(ignorePath, "utf-8");
  const lines = content.split("\n").map(line => line.trim());

  if (lines.includes(entry)) {
    console.log(`"${entry}" already in ${ignoreFileName}`);
    return;
  }

  console.log(`Adding "${entry}" to ${ignoreFileName}...`);
  const newContent = content.trimEnd() + "\n" + entry + "\n";
  fs.writeFileSync(ignorePath, newContent, "utf-8");
  console.log(`Added "${entry}" to ${ignoreFileName}`);
}


/**
 * Check if the spp command is available globally
 */
function isSppCommandAvailable(): boolean {
  try {
    execSync("which spp", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Prompt user to install claude-spp globally
 * Skipped when SPP_SKIP_GLOBAL_CHECK=1 (for testing)
 */
function ensureGlobalInstall(): void {
  if (process.env.SPP_SKIP_GLOBAL_CHECK === "1") {
    return;
  }
  if (!isSppCommandAvailable()) {
    const packageName = "git+https://github.com/mlolson/claude-spp.git";
    throw new Error(`spp command not found. Please install:\n  npm install -g ${packageName}`);
  }
}

/**
 * Install git post-commit hook for tracking human lines
 * @throws Error if not in a git repository
 */
export function installGitHook(projectPath: string): void {
  const gitHooksDir = path.join(projectPath, ".git", "hooks");
  const hookPath = path.join(gitHooksDir, "post-commit");

  // Resolve hook source relative to this module (in the installed package)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sourceHook = path.join(__dirname, "git", "hooks", "post-commit");

  // Check if source hook exists
  if (!fs.existsSync(sourceHook)) {
    throw new Error(`Source hook not found at: ${sourceHook}`);
  }

  // Ensure hooks directory exists
  if (!fs.existsSync(gitHooksDir)) {
    fs.mkdirSync(gitHooksDir, { recursive: true });
  }

  // Read source hook content
  const sourceContent = fs.readFileSync(sourceHook, "utf-8");
  const sourceContentWithShebang = "#!/bin/bash\n" + sourceContent;

  // Check if hook already contains our content
  if (fs.existsSync(hookPath)) {
    const existingContent = fs.readFileSync(hookPath, "utf-8");
    if (existingContent.includes("# <SPP>")) {
      fs.writeFileSync(hookPath, existingContent.replace(/# <SPP>[\s\S]*?# <\/SPP>/g, sourceContent));
    } else {
      if (existingContent.trim() === "") {
        // Hook exists but is empty - write full contents
        fs.writeFileSync(hookPath, sourceContentWithShebang);
      } else {
        // Hook exists and is not empty - append without shebang
        const newContent = existingContent.trimEnd() + "\n\n" + sourceContent;
        fs.writeFileSync(hookPath, newContent);
      }
    }
  } else {
    fs.writeFileSync(hookPath, sourceContentWithShebang);
  }

  // Ensure the file is executable
  fs.chmodSync(hookPath, 0o755);
}

/**
 * Install Claude Code hooks by writing to .claude/settings.json
 * Registers PreToolUse, SystemPrompt, StatusLine, UserPromptSubmit, and Stop hooks.
 * Merges with any existing settings (preserving user-defined keys).
 */
export function installClaudeHooks(projectPath: string): void {
  const claudeDir = path.join(projectPath, ".claude");
  const settingsPath = path.join(claudeDir, "settings.json");

  // Load existing settings if present
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    } catch {
      // If settings file is corrupt, start fresh
      settings = {};
    }
  }

  // Define the SPP hooks
  const sppHooks: Record<string, Array<{ hooks: Array<{ type: string; command: string }> }>> = {
    PreToolUse: [{
      hooks: [{ type: "command", command: "spp hook:pre-tool-use" }],
    }],
    UserPromptSubmit: [{
      hooks: [{ type: "command", command: "spp hook:user-prompt" }],
    }],
    Stop: [{
      hooks: [{ type: "command", command: "spp hook:stop" }],
    }],
  };

  // Merge hooks into settings (overwrite SPP hooks, preserve others)
  const existingHooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  for (const [event, hookEntries] of Object.entries(sppHooks)) {
    existingHooks[event] = hookEntries;
  }
  settings.hooks = existingHooks;

  // Set system prompt and status line
  settings.systemPrompt = { type: "command", command: "spp hook:system-prompt" };
  settings.statusLine = { type: "command", command: "spp hook:status-line" };

  // Ensure .claude directory exists
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
  console.log("Installed Claude Code hooks in .claude/settings.json");
}

/**
 * Install VCS hook based on detected VCS type
 * Note: Only Git hooks are supported currently
 */
export function installVcsHook(projectPath: string, vcsType: VcsType): void {
  if (vcsType === "git") {
    installGitHook(projectPath);
  }
  // Mercurial does not use a post-commit hook
}

/**
 * Prompt user to select a mode type interactively
 */
async function promptForModeType(): Promise<ModeType> {
  const modeTypes = ModeTypeSchema.options;
  console.log("\nAvailable mode types:\n");

  modeTypes.forEach((modeType, index) => {
    const label = MODE_TYPE_LABELS[modeType];
    const desc = MODE_TYPE_DESCRIPTIONS[modeType];
    const defaultMarker = index === 0 ? " (default)" : "";
    console.log(`  ${index + 1}. ${label} - ${desc}${defaultMarker}`);
  });
  console.log("");

  while (true) {
    const userResponse = await promptUser(`Select a mode type [1-${modeTypes.length}, or press Enter for Weekly Goal]: `);
    if (userResponse === "") {
      return "weeklyGoal";
    }
    const choice = parseInt(userResponse, 10);
    if (choice >= 1 && choice <= modeTypes.length) {
      return modeTypes[choice - 1];
    }
    console.log(`Invalid choice: ${userResponse}. Must be in range [1, ${modeTypes.length}]`);
  }
}

/**
 * Prompt user for target percentage
 */
async function promptForTargetPercentage(): Promise<10 | 25 | 50 | 100> {
  console.log("\nTarget percentage of human-written code:\n");
  console.log("  1. 10%");
  console.log("  2. 25% (default)");
  console.log("  3. 50%");
  console.log("  4. 100%");
  console.log("");

  const percentages: (10 | 25 | 50 | 100)[] = [10, 25, 50, 100];

  while (true) {
    const userResponse = await promptUser("Select a percentage [1-4, or press Enter for 25%]: ");
    if (userResponse === "") {
      return 25;
    }
    const choice = parseInt(userResponse, 10);
    if (choice >= 1 && choice <= 4) {
      return percentages[choice - 1];
    }
    console.log(`Invalid choice: ${userResponse}. Must be in range [1, 4]`);
  }
}

/**
 * Prompt user to select a tracking mode interactively
 */
async function promptForTrackingMode(): Promise<TrackingMode> {
  const options = TrackingModeSchema.options;
  console.log("\nTracking mode (what to count for ratio calculation):\n");

  options.forEach((option, index) => {
    const label = TRACKING_MODE_LABELS[option];
    const defaultMarker = option === "commits" ? " (default)" : "";
    console.log(`  ${index + 1}. ${label}${defaultMarker}`);
  });
  console.log("");

  while (true) {
    const userResponse = await promptUser(`Select a tracking mode [1-${options.length}, or press Enter for Commits]: `);
    if (userResponse === "") {
      return "commits";
    }

    const choice = parseInt(userResponse, 10);
    if (choice >= 1 && choice <= options.length) {
      return options[choice - 1];
    }

    console.log(`Invalid choice: ${userResponse}. Must be in range [1, ${options.length}]`);
  }
}

async function promptShouldOverwriteInstall(): Promise<boolean> {
  const answer = await promptUser("An SPP installation already exists. Overwrite it? N/Y\n");
  return answer.toLowerCase() === "y";
}

/**
 * Prompt user to select VCS type
 */
async function promptForVcsType(): Promise<VcsType> {
  console.log("\nVersion control system for this repo:\n");
  console.log("  1. Git (default)");
  console.log("  2. Mercurial (hg)");
  console.log("");

  while (true) {
    const userResponse = await promptUser("Select VCS type [1-2, or press Enter for Git]: ");
    if (userResponse === "" || userResponse === "1") {
      return "git";
    }
    if (userResponse === "2") {
      return "hg";
    }
    console.log(`Invalid choice: ${userResponse}. Must be 1 or 2.`);
  }
}

export async function promptUser(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Initialize SPP in a project
 * Creates .claude-spp directory with config
 */
export async function initializeSpp(
  projectPath: string,
  options?: {
    modeType?: ModeType;
    targetPercentage?: 10 | 25 | 50 | 100;
    trackingMode?: TrackingMode;
    statsWindow?: StatsWindow;
    vcsType?: VcsType;
  }
): Promise<Config> {
  console.log([
    "",
    "                _____ ____  ____",
    "      _        / ___// __ \\/ __ \\",
    "     c -.      \\__ \\/ /_/ / /_/ /",
    "\\_   / \\      ___/ / ____/ ____/ ",
    "  \\_| ||     /____/_/   /_/      ",
    "",
    "Simian Programmer Plugin for Claude AI: For monkeys who like to code",
    ""
  ].join("\n"));

  // Check for existing installation before asking any config questions
  const sppDir = getSppDir(projectPath);
  if (fs.existsSync(sppDir)) {
    if (await promptShouldOverwriteInstall()) {
      console.log("Removing existing install...");
      fs.rmSync(sppDir, { recursive: true, force: true });
    } else {
      console.log("Aborting install...");
      return await loadConfig(projectPath);
    }
  }

  // Prompt for VCS type if not provided
  const selectedVcsType = options?.vcsType ?? await promptForVcsType();

  // Ensure spp command is installed globally (required for hooks)
  await ensureGlobalInstall();

  fs.mkdirSync(sppDir, { recursive: true });

  // Prompt for mode type if not provided
  const selectedModeType = options?.modeType ?? await promptForModeType();

  // Build config based on mode type
  const config: Config = {
    ...DEFAULT_CONFIG,
    modeType: selectedModeType,
    vcsType: selectedVcsType,
  };

  if (selectedModeType === "weeklyGoal") {
    config.targetPercentage = options?.targetPercentage ?? await promptForTargetPercentage();
    config.trackingMode = options?.trackingMode ?? await promptForTrackingMode();
  } else if (selectedModeType === "learningProject") {
    console.log("\n📚 Learning Project mode is coming soon! Using Weekly Goal as fallback.\n");
    config.modeType = "weeklyGoal";
  }

  config.statsWindow = options?.statsWindow ?? config.statsWindow;

  // For pre-existing repos with commits, set trackingStartCommit to HEAD
  const totalCommits = getTotalCommitCount(projectPath, selectedVcsType);
  if (totalCommits > 0) {
    const headCommit = getHeadCommitHash(projectPath, selectedVcsType);
    if (headCommit) {
      config.trackingStartCommit = headCommit;
    }
  }

  saveConfig(projectPath, config);

  // Update ignore file to exclude SPP files
  addToIgnoreFile(projectPath, ".claude-spp/", selectedVcsType);

  // Install VCS post-commit hook
  installVcsHook(projectPath, selectedVcsType);

  // Install Claude Code hooks (.claude/settings.json)
  installClaudeHooks(projectPath);

  return config;
}

/**
 * Check if SPP is fully initialized
 */
export function isFullyInitialized(projectPath: string): boolean {
  return isSppInitialized(projectPath);
}

/**
 * Ensure SPP is initialized, initializing if needed
 */
export async function ensureInitialized(
  projectPath: string,
  options?: {
    modeType?: ModeType;
    targetPercentage?: 10 | 25 | 50 | 100;
    trackingMode?: TrackingMode;
    statsWindow?: StatsWindow;
    vcsType?: VcsType;
  }
): Promise<Config> {
  if (!isFullyInitialized(projectPath)) {
    return initializeSpp(projectPath, options);
  }
  return loadConfig(projectPath);
}
