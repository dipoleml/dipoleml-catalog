import { loadConfig, isSppInitialized } from "../config/loader.js";
import { calculateRatio, isRatioHealthy } from "../stats.js";
import { getTargetRatio, getModeTypeDescription, getStatsWindowCutoff, type TrackingMode } from "../config/schema.js";
import { getLineCounts, getLineCountsWithWindow, getRecentCommitsClassified } from "../vcs/index.js";

/**
 * Calculate how many more commits/lines the human needs to reach the target ratio
 */
function calculateCatchUp(humanValue: number, claudeValue: number, targetRatio: number): number {
  const total = humanValue + claudeValue;
  if (targetRatio >= 1) {
    // 100% human target - can never catch up if Claude has written anything
    return claudeValue;
  }
  return Math.ceil((targetRatio * total - humanValue) / (1 - targetRatio));
}

/**
 * Generate the SPP system prompt injection
 */
export function generateSystemPrompt(projectPath: string): string {

  if (!isSppInitialized(projectPath)) {
    return "";
  }
  const config = loadConfig(projectPath);

  // If SPP is disabled, return empty
  if (!config.enabled) {
    return "";
  }

  const modeDescription = getModeTypeDescription(config);

  const lines: string[] = [
    "<spp>",
    "# Simian Programmer Plugin Active",
    "",
    "You are operating in Simian Programmer mode. This mode helps the human maintain their programming skills",
    "by ensuring they write a minimum percentage of the code themselves.",
    "Help your human friend level up and stay sharp.",
    "",
    "## Current Status",
    "",
    `- **Mode:** ${modeDescription}`,
  ];

  if (config.modeType === "weeklyGoal") {
    const lineCounts = getLineCounts(projectPath);
    const trackingMode: TrackingMode = config.trackingMode ?? "commits";
    const humanValue = trackingMode === "commits" ? lineCounts.humanCommits : lineCounts.humanLines;
    const claudeValue = trackingMode === "commits" ? lineCounts.claudeCommits : lineCounts.claudeLines;
    const unit = trackingMode === "commits" ? "commits" : "lines";

    const currentRatio = calculateRatio(humanValue, claudeValue);
    const targetRatio = getTargetRatio(config);
    const isHealthy = isRatioHealthy(humanValue, claudeValue, targetRatio);

    lines.push(`- **Target ratio:** ${(targetRatio * 100).toFixed(0)}% human-written code`);
    lines.push(`- **Current ratio:** ${(currentRatio * 100).toFixed(0)}% human (${humanValue} ${unit}) / ${(100 - currentRatio * 100).toFixed(0)}% Claude (${claudeValue} ${unit})`);
    lines.push(`- **Status:** ${isHealthy ? "✅ Healthy" : "⚠️ Below target"}`);

    if (!isHealthy) {
      const needed = calculateCatchUp(humanValue, claudeValue, targetRatio);
      lines.push("");
      lines.push("## ⚠️ NOTICE");
      lines.push("");
      lines.push("The human coding ratio is below the target.");
      lines.push(`The human needs to write **${needed} more ${unit}** to get back to a healthy ratio.`);
      lines.push("You will be hard blocked from writing code (except .md files).");
      lines.push("Instead of writing code, use the spp-human-task skill to help the human complete the coding task.");
    }
  } else {
    // learningProject
    lines.push(`- **Status:** Coming soon`);
  }

  if (config.driveMode) {
    lines.push("");
    lines.push("## 🐵 Human is driving (drive mode)");
    lines.push("");
    lines.push("Drive mode is active. The human is writing code.");
    lines.push("You will be hard blocked from writing code (except .md files).");
    lines.push("Use the spp-human-task skill to help the human complete the coding task.");
    lines.push("Toggle off with `spp drive`.");
  }

  lines.push("");
  lines.push("A note on SPP tracking:");
  lines.push("SPP tracks commits in VCS history (git or mercurial), within a window and/or after a starting commit.");
  lines.push("Commits that include 'Co-authored by: Claude...' in the message are counted as Claude commits.");
  lines.push("Commits without that phrase are counted as human commits.");
  lines.push("Therefore, if asked to commit human authored code, don't include the 'Co-authored by: Claude...' phrase");
  lines.push("Also, if you write code, ask the user if they would like to commit it and DO include the 'Co-authored by: Claude' phrase");
  lines.push("This way, SPP tracking will work properly");

  lines.push("</spp>");

  return lines.join("\n");
}

/**
 * Calculate how many Claude commits/lines can be added before hitting the target ratio.
 * Positive = ahead (Claude commits remaining), negative = behind (human commits needed).
 */
function calculateAheadBehind(humanValue: number, claudeValue: number, targetRatio: number): number {
  const total = humanValue + claudeValue;
  if (total === 0) return 0;

  if (targetRatio >= 1) {
    return -claudeValue;
  }

  const claudeCommitsRemaining = humanValue * (1 - targetRatio) / targetRatio - claudeValue;
  return Math.floor(claudeCommitsRemaining);
}

/**
 * Generate a compact status line for the prompt
 */
export function generateStatusLine(projectPath: string): string {
  if (!isSppInitialized(projectPath)) {
    return "";
  }

  const config = loadConfig(projectPath);

  if (!config.enabled) {
    return "";
  }

  // If drive mode is active, show drive mode message
  if (config.driveMode) {
    return `🚙 Drive mode active. Claude cannot write code. Toggle with \`spp drive\``;
  }

  // Get emoji history for recent commits (shared across all modes)
  const statsWindow = config.statsWindow ?? "oneWeek";
  const statsWindowCutoff = getStatsWindowCutoff(statsWindow);
  const recentCommits = getRecentCommitsClassified(projectPath, {
    since: statsWindowCutoff,
    afterCommit: config.trackingStartCommit,
    limit: 15,
  });
  const emojiHistory = recentCommits
    .map((c) => (c.isClaude ? "🤖" : "🐵"))
    .join(" > ");

  if (config.modeType === "weeklyGoal") {
    const lineCounts = getLineCountsWithWindow(projectPath, {
      since: statsWindowCutoff,
      afterCommit: config.trackingStartCommit,
    });
    const trackingMode: TrackingMode = config.trackingMode ?? "commits";
    const humanValue = trackingMode === "commits" ? lineCounts.humanCommits : lineCounts.humanLines;
    const claudeValue = trackingMode === "commits" ? lineCounts.claudeCommits : lineCounts.claudeLines;
    const unit = trackingMode === "commits" ? "commits" : "lines";
    const total = humanValue + claudeValue;

    if (total === 0) {
      return "⚪ SPP: no commits yet";
    }

    const targetRatio = getTargetRatio(config);
    const claudeRemaining = calculateAheadBehind(humanValue, claudeValue, targetRatio);

    const statusEmoji = claudeRemaining <= 0 ? "🔴" : claudeRemaining < 4 ? "⚠️" : "🟢";
    const statusText = claudeRemaining > 0
      ? `Claude can write ${claudeRemaining} more ${unit}`
      : `Human needs to write ${Math.abs(claudeRemaining)} more ${unit}`;

    return `${statusEmoji} ${statusText} ${emojiHistory} ...`;
  }

  // learningProject
  return `📚 Learning project (coming soon)`;
}
