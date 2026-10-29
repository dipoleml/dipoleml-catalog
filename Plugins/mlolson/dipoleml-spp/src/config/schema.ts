import { z } from "zod";

/**
 * Mode types for SPP
 */
export const ModeTypeSchema = z.enum(["weeklyGoal", "learningProject"]);
export type ModeType = z.infer<typeof ModeTypeSchema>;

/**
 * Allowed percentage targets for weekly goal mode
 */
export const PercentageOptionSchema = z.union([
  z.literal(10), z.literal(25), z.literal(50), z.literal(100)
]);

/**
 * Stats window options for filtering commit history
 */
export const StatsWindowSchema = z.enum(["oneDay", "oneWeek", "allTime"]);
export type StatsWindow = z.infer<typeof StatsWindowSchema>;

/**
 * Tracking mode options - what to count for ratio calculation
 */
export const TrackingModeSchema = z.enum(["commits", "lines"]);
export type TrackingMode = z.infer<typeof TrackingModeSchema>;

/**
 * VCS type options
 */
export const VcsTypeSchema = z.enum(["git", "hg"]);
export type VcsType = z.infer<typeof VcsTypeSchema>;

/**
 * Human-readable labels for tracking modes
 */
export const TRACKING_MODE_LABELS: Record<TrackingMode, string> = {
  commits: "Commits",
  lines: "Lines of code",
};

/**
 * Human-readable labels for stats windows
 */
export const STATS_WINDOW_LABELS: Record<StatsWindow, string> = {
  oneDay: "Last 24 hours",
  oneWeek: "Last 7 days",
  allTime: "All time",
};

/**
 * Get cutoff date for a stats window
 * @returns Date for filtering or null for allTime (no filter)
 */
export function getStatsWindowCutoff(window: StatsWindow): Date | null {
  const now = new Date();
  switch (window) {
    case "oneDay":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "oneWeek":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "allTime":
      return null;
  }
}

/**
 * Main configuration schema for .claude-spp/config.json
 */
export const ConfigSchema = z.object({
  // Whether SPP is enabled for this project
  enabled: z.boolean().default(true),

  // Mode type
  modeType: ModeTypeSchema.default("weeklyGoal"),

  // Weekly goal settings
  targetPercentage: PercentageOptionSchema.default(25),
  trackingMode: TrackingModeSchema.default("commits"),
  statsWindow: StatsWindowSchema.default("oneWeek"),

  // ISO timestamp when SPP pause expires (set by pause command)
  pausedUntil: z.string().optional(),

  // VCS commit hash of the last commit to exclude from tracking
  trackingStartCommit: z.string().optional(),

  // VCS type (git or hg) - auto-detected if not set
  vcsType: VcsTypeSchema.optional(),

  // Drive mode - blocks Claude from writing code without affecting ratio targets
  driveMode: z.boolean().default(false),

  // PID of the file watcher process (used by drive mode)
  watcherPid: z.number().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  enabled: true,
  modeType: "weeklyGoal",
  targetPercentage: 25,
  trackingMode: "commits",
  statsWindow: "oneWeek",
  driveMode: false,
};

/**
 * Human-readable labels for mode types
 */
export const MODE_TYPE_LABELS: Record<ModeType, string> = {
  weeklyGoal: "Weekly Goal",
  learningProject: "Learning Project",
};

/**
 * Descriptions for mode types
 */
export const MODE_TYPE_DESCRIPTIONS: Record<ModeType, string> = {
  weeklyGoal: "Set a weekly human coding target (% of code)",
  learningProject: "Coming soon - placeholder for future learning features",
};

/**
 * Get display name for a mode type
 */
export function getModeTypeName(modeType: ModeType): string {
  return MODE_TYPE_LABELS[modeType];
}

/**
 * Get a description of the current mode including goal type and target
 */
export function getModeTypeDescription(config: Config): string {
  switch (config.modeType) {
    case "weeklyGoal":
      return `Weekly Goal (${config.targetPercentage}% human, ${config.trackingMode})`;
    case "learningProject":
      return "Learning Project (coming soon)";
  }
}

/**
 * Get the target human ratio for weekly goal mode
 * Returns the ratio (0-1) for weeklyGoal mode, or 0 for other modes
 */
export function getTargetRatio(config: Config): number {
  if (config.modeType === "weeklyGoal") {
    return config.targetPercentage / 100;
  }
  return 0;
}
