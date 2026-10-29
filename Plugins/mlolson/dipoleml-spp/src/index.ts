// Configuration
export { loadConfig, saveConfig, isSppInitialized, getSppDir } from "./config/loader.js";
export {
  ConfigSchema,
  DEFAULT_CONFIG,
  getTargetRatio,
  getModeTypeName,
  getModeTypeDescription,
  type Config,
  type ModeType,
} from "./config/schema.js";

export {
  calculateRatio,
  isRatioHealthy,
} from "./stats.js";

// VCS History (Git and Mercurial)
export {
  getLineCounts,
  clearCache,
  getProvider,
  type LineCounts,
  type VcsType,
  type VcsProvider,
} from "./vcs/index.js";

// Initialization
export { initializeSpp, isFullyInitialized, ensureInitialized } from "./init.js";

// Commands
export { getStats, formatStats, type StatsResult } from "./stats.js";

// Hooks
export { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";

// Pair programming
export { getTranscript, clearTranscript, archiveTranscript } from "./pair/transcript.js";
export { spawnWatcher, killWatcher, isWatcherRunning } from "./pair/lifecycle.js";
