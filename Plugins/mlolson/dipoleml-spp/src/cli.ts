#!/usr/bin/env node
import { Command } from "commander";
import { runPreToolUseHook } from "./hooks/pre-tool-use.js";
import { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
import { initializeSpp, isFullyInitialized, promptUser } from "./init.js";
import { getHeadCommitHash } from "./vcs/index.js";
import { loadConfig, saveConfig } from "./config/loader.js";
import {
  getModeTypeName,
  getModeTypeDescription,
  ModeTypeSchema,
  MODE_TYPE_LABELS,
  MODE_TYPE_DESCRIPTIONS,
  type ModeType,
  type Config,
} from "./config/schema.js";
import { getStats, formatStats } from "./stats.js";
import { spawnWatcher, killWatcher } from "./pair/lifecycle.js";
import { getTranscript, clearTranscript, archiveTranscript, listTranscripts } from "./pair/transcript.js";
import { runWatcher } from "./pair/watcher.js";
import { runUserPromptHook, runStopHook } from "./pair/hooks.js";

const program = new Command();

program
  .name("spp")
  .description("SPP CLI - Simian Programmer Plugin for Claude - https://github.com/mlolson/claude-spp")
  .version("0.1.0");

// User commands

program
  .command("init")
  .description("Initialize SPP")
  .action(async () => {
    const config = await initializeSpp(process.cwd());
    saveConfig(process.cwd(), config);

    const modeDesc = getModeTypeDescription(config);
    const vcsType = config.vcsType ?? "git";
    const hookPath = vcsType === "git" ? ".git/hooks/post-commit" : ".hg/hgrc [hooks]";

    console.log("");
    console.log(`✅ SPP initialized with mode: ${modeDesc}`);
    console.log(`Install directory: .claude-spp/`);
    console.log(`VCS: ${vcsType}`);
    console.log(`Hook: ${hookPath}\n`);

    console.log("Analyzing repo...");
    const stats = getStats(process.cwd());
    console.log(formatStats(stats));
  });

program
  .command("mode")
  .argument("[value]", "mode type number (1-2) or name")
  .description("Show or change the current mode type")
  .action(async (value: string | undefined) => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());

    // If no argument, show current mode
    if (!value) {
      console.log(`Current mode: ${getModeTypeDescription(config)}`);
      return;
    }

    // Try to parse as number first
    const modeTypes = ModeTypeSchema.options;
    let selectedModeType: ModeType | undefined;

    const num = parseInt(value, 10);
    if (num >= 1 && num <= modeTypes.length) {
      selectedModeType = modeTypes[num - 1];
    }

    // If not a number, try by name
    if (!selectedModeType) {
      const found = modeTypes.find(
        (mt) => mt.toLowerCase() === value.toLowerCase() ||
               MODE_TYPE_LABELS[mt].toLowerCase() === value.toLowerCase()
      );
      if (found) {
        selectedModeType = found;
      }
    }

    if (!selectedModeType) {
      throw Error(`❌ Unknown mode: ${value}. Use a number 1-${modeTypes.length} or a mode name`);
    }

    // Update config
    config.modeType = selectedModeType;

    if (selectedModeType === "weeklyGoal") {
      // Prompt for percentage target
      console.log("\nTarget percentage:\n");
      console.log("  1. 10%");
      console.log("  2. 25% (default)");
      console.log("  3. 50%");
      console.log("  4. 100%");
      console.log("");
      const pctChoice = await promptUser("Select [1-4, or press Enter for 25%]: ");
      const percentages: (10 | 25 | 50 | 100)[] = [10, 25, 50, 100];
      const pctNum = parseInt(pctChoice, 10);
      config.targetPercentage = (pctNum >= 1 && pctNum <= 4) ? percentages[pctNum - 1] : 25;
    } else if (selectedModeType === "learningProject") {
      console.log("\n📚 Learning Project mode is coming soon! Using Weekly Goal as fallback.\n");
      config.modeType = "weeklyGoal";
    }

    saveConfig(process.cwd(), config);

    console.log(`✅ Mode changed to: ${getModeTypeDescription(config)}`);
  });

program
  .command("modes")
  .description("List available mode types")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());
    const modeTypes = ModeTypeSchema.options;

    console.log("Mode types:");
    for (let i = 0; i < modeTypes.length; i++) {
      const mt = modeTypes[i];
      const label = MODE_TYPE_LABELS[mt];
      const desc = MODE_TYPE_DESCRIPTIONS[mt];
      const marker = mt === config.modeType ? " <-- current" : "";
      console.log(`  ${i + 1}. ${label} - ${desc}${marker}`);
    }
    console.log("\nTo change mode: spp mode <number>");
  });

program
  .command("settings")
  .description("View and modify SPP settings")
  .action(async () => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());

    console.log("\nCurrent settings:\n");
    console.log(`  1. Mode type:        ${getModeTypeDescription(config)}`);
    if (config.modeType === "weeklyGoal") {
      console.log(`  2. Target:           ${config.targetPercentage}% human`);
      console.log(`  3. Tracking mode:    ${config.trackingMode}`);
    }
    console.log(`  4. Stats window:     ${config.statsWindow}`);
    console.log("");

    const choice = await promptUser("Enter setting number to change (or press Enter to exit): ");
    if (choice === "") return;

    const settingNum = parseInt(choice, 10);

    switch (settingNum) {
      case 1: {
        // Change mode type - redirect to mode command
        const modeTypes = ModeTypeSchema.options;
        console.log("\nMode types:");
        modeTypes.forEach((mt, i) => {
          console.log(`  ${i + 1}. ${MODE_TYPE_LABELS[mt]} - ${MODE_TYPE_DESCRIPTIONS[mt]}`);
        });
        const modeChoice = await promptUser(`\nSelect [1-${modeTypes.length}]: `);
        const modeNum = parseInt(modeChoice, 10);
        if (modeNum >= 1 && modeNum <= modeTypes.length) {
          config.modeType = modeTypes[modeNum - 1];
          if (config.modeType === "learningProject") {
            console.log("\n📚 Learning Project mode is coming soon! Using Weekly Goal as fallback.\n");
            config.modeType = "weeklyGoal";
          }
        }
        break;
      }
      case 2: {
        if (config.modeType === "weeklyGoal") {
          const pctChoice = await promptUser("Percentage (10, 25, 50, 100): ");
          const pct = parseInt(pctChoice, 10);
          if (pct === 10 || pct === 25 || pct === 50 || pct === 100) {
            config.targetPercentage = pct;
          }
        }
        break;
      }
      case 3: {
        if (config.modeType === "weeklyGoal") {
          const tmChoice = await promptUser("Tracking mode - 1. Commits, 2. Lines: ");
          if (tmChoice === "1") config.trackingMode = "commits";
          else if (tmChoice === "2") config.trackingMode = "lines";
        }
        break;
      }
      case 4: {
        const swChoice = await promptUser("Stats window - 1. Last 24 hours, 2. Last 7 days, 3. All time: ");
        if (swChoice === "1") config.statsWindow = "oneDay";
        else if (swChoice === "2") config.statsWindow = "oneWeek";
        else if (swChoice === "3") config.statsWindow = "allTime";
        break;
      }
    }

    saveConfig(process.cwd(), config);
    console.log(`\n✅ Settings updated: ${getModeTypeDescription(config)}`);
  });

program
  .command("stats")
  .option("--json", "Output as json")
  .description("Show SPP status and statistics")
  .action((opts) => {
    const stats = getStats(process.cwd());
    if (opts.json) {
      console.log(JSON.stringify(stats, null, 2));
    } else {
      console.log(formatStats(stats));
    }
  });

program
  .command("pause")
  .description("Pause SPP for 24 hours (Claude writes freely)")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }
    const config = loadConfig(process.cwd());
    config.enabled = false;
    config.pausedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    saveConfig(process.cwd(), config);
    console.log("⏸️  SPP enforcement paused for 24 hours. Claude may write code freely.");
    console.log("   Run 'spp resume' to resume SPP enforcement immediately.");
  });

program
  .command("resume")
  .description("Resume SPP tracking")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }
    const config = loadConfig(process.cwd());
    config.enabled = true;
    delete config.pausedUntil;
    saveConfig(process.cwd(), config);
    console.log("▶️  SPP resumed. Coding enforcement is active.");
  });

program
  .command("reset")
  .description("Reset tracking to start from current commit")
  .action(async () => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const answer = await promptUser("This will reset tracking to start from the current commit. All previous stats will be cleared. Are you sure? (y/N): ");
    if (answer.toLowerCase() !== "y") {
      console.log("Reset cancelled.");
      return;
    }

    const headCommit = getHeadCommitHash(process.cwd());
    if (!headCommit) {
      console.error("❌ Could not get current commit hash.");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());
    config.trackingStartCommit = headCommit;
    saveConfig(process.cwd(), config);

    console.log(`✅ Tracking reset. Stats will now start from commit ${headCommit.substring(0, 7)}.`);
  });

program
  .command("drive")
  .description("Toggle drive mode (human writes code, Claude assists)")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }
    const config = loadConfig(process.cwd());
    config.driveMode = !config.driveMode;
    saveConfig(process.cwd(), config);
    if (config.driveMode) {
      clearTranscript(process.cwd());
      const pid = spawnWatcher(process.cwd());
      console.log("🚙 Drive mode enabled. Claude cannot write code.");
      console.log("   You're in the driver's seat - Claude will assist but not code.");
      console.log(`   File watcher started (PID: ${pid})`);
      console.log("   Run 'spp drive' again to toggle off.");
    } else {
      killWatcher(process.cwd());
      const archived = archiveTranscript(process.cwd());
      console.log("🚙 Drive mode disabled. Normal SPP enforcement resumed.");
      if (archived) {
        console.log("   Transcript archived. Run /coach to review your session.");
      }
    }
  });

// Transcript command
program
  .command("transcript")
  .description("Show current transcript or list archived transcripts")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());
    const archives = listTranscripts(process.cwd());

    // Active drive mode: show live transcript, then mention archives
    if (config.driveMode) {
      const transcript = getTranscript(process.cwd());
      if (transcript) {
        console.log(transcript);
      } else {
        console.log("No changes recorded yet for this turn.");
      }
      if (archives.length > 0) {
        console.log(`\n${archives.length} archived transcript(s) in transcripts/`);
      }
      return;
    }

    // No active session: list archived transcripts
    if (archives.length === 0) {
      console.log("No archived transcripts found.");
      return;
    }

    console.log("Archived transcripts:\n");
    for (const entry of archives) {
      const dateStr = entry.date.toLocaleString();
      console.log(`  ${entry.filename}  (${dateStr})`);
      console.log(`    ${entry.path}`);
    }
    console.log(`\n${archives.length} transcript(s) total.`);
  });

// Internal commands

program
  .command("watcher:start")
  .argument("<projectPath>", "project path to watch")
  .description("Start file watcher (internal, called as background process)")
  .action((projectPath: string) => {
    runWatcher(projectPath);
  });

// Hook commands (called by Claude Code)

program
  .command("hook:pre-tool-use")
  .description("Pre-tool-use hook (internal, reads JSON from stdin)")
  .action(async () => {
    await runPreToolUseHook();
  });

program
  .command("hook:system-prompt")
  .description("Output system prompt injection (internal)")
  .action(() => {
    console.log(generateSystemPrompt(process.cwd()));
  });

program
  .command("hook:status-line")
  .description("Output status line for Claude Code (internal)")
  .action(() => {
    console.log(generateStatusLine(process.cwd()));
  });

program
  .command("hook:user-prompt")
  .description("UserPromptSubmit hook — record human question to transcript (internal)")
  .action(async () => {
    await runUserPromptHook();
  });

program
  .command("hook:stop")
  .description("Stop hook — record Claude response to transcript (internal)")
  .action(async () => {
    await runStopHook();
  });

program.parseAsync();
