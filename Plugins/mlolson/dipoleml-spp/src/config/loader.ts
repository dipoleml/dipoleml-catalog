import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ConfigSchema, DEFAULT_CONFIG, type Config } from "./schema.js";

const SPP_DIR = ".claude-spp";
const CONFIG_FILE = "config.json";
const SPP_CONFIG_DIR = ".claude-spp-configs";

/**
 * Get the fallback config directory path for a project
 * Uses ~/.claude-spp-configs/<project-dirname>/.claude-spp
 */
function getFallbackSppDir(projectPath: string): string {
  const projectDirname = path.basename(path.resolve(projectPath));
  return path.join(os.homedir(), SPP_CONFIG_DIR, projectDirname, SPP_DIR);
}

/**
 * Get the path to the .claude-spp directory for a project
 * Checks local project directory first, then falls back to ~/.claude-spp-configs/<project-dirname>
 */
export function getSppDir(projectPath: string): string {
  const localDir = path.join(projectPath, SPP_DIR);

  // Check local first
  if (fs.existsSync(localDir)) {
    return localDir;
  }

  // Check fallback location
  const fallbackDir = getFallbackSppDir(projectPath);
  if (fs.existsSync(fallbackDir)) {
    return fallbackDir;
  }

  // Neither exists, return local (default for init)
  return localDir;
}

/**
 * Get the path to the config file
 */
export function getConfigPath(projectPath: string): string {
  return path.join(getSppDir(projectPath), CONFIG_FILE);
}

/**
 * Check if SPP is initialized in the project
 */
export function isSppInitialized(projectPath: string): boolean {
  return fs.existsSync(getSppDir(projectPath));
}

/**
 * Migrate old config format (mode: number) to new format (modeType + goalType)
 * Returns the migrated JSON object, or null if no migration needed
 */
function migrateOldConfig(json: Record<string, unknown>): Record<string, unknown> | null {
  // Detect old format: has `mode` as a number but no `modeType` field
  if (typeof json.mode === "number" && !("modeType" in json)) {
    const oldMode = json.mode as number;
    const migrated = { ...json };

    // Remove old field
    delete migrated.mode;

    // All old modes map to weeklyGoal with percentage target
    migrated.modeType = "weeklyGoal";

    switch (oldMode) {
      case 1: // Lazy monkey (0% human) → 10% minimum
        migrated.targetPercentage = 10;
        break;
      case 2: // Curious monkey (10% human)
        migrated.targetPercentage = 10;
        break;
      case 3: // Clever monkey (25% human)
        migrated.targetPercentage = 25;
        break;
      case 4: // Wise monkey (50% human)
        migrated.targetPercentage = 50;
        break;
      case 5: // Crazy monkey (100% human)
        migrated.targetPercentage = 100;
        break;
      default:
        migrated.targetPercentage = 25;
        break;
    }

    return migrated;
  }

  return null;
}

/**
 * Load and validate the config file
 * Returns default config if file doesn't exist
 * Throws if config is invalid
 * Auto-unpauses if pausedUntil time has passed
 * Auto-migrates old config format
 */
export function loadConfig(projectPath: string): Config {
  const configPath = getConfigPath(projectPath);

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const json = JSON.parse(raw);

    // Try migration
    const migrated = migrateOldConfig(json);
    if (migrated) {
      // Write migrated config back to disk
      const config = ConfigSchema.parse(migrated);
      saveConfig(projectPath, config);
      return config;
    }

    // Migrate pairProgramming mode to weeklyGoal
    if (json.modeType === "pairProgramming") {
      json.modeType = "weeklyGoal";
      json.targetPercentage = json.targetPercentage ?? 25;
      delete json.pairSession;
      const config = ConfigSchema.parse(json);
      saveConfig(projectPath, config);
      return config;
    }

    // Strip stale pairSession field if present
    delete json.pairSession;

    const config = ConfigSchema.parse(json);

    // Auto-unpause if pausedUntil time has passed
    if (config.pausedUntil) {
      const unpauseTime = new Date(config.pausedUntil).getTime();
      if (Date.now() > unpauseTime) {
        config.enabled = true;
        delete config.pausedUntil;
        saveConfig(projectPath, config);
      }
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save config to file
 */
export function saveConfig(projectPath: string, config: Config): void {
  const sppDir = getSppDir(projectPath);
  const configPath = getConfigPath(projectPath);

  // Ensure .claude-spp directory exists
  if (!fs.existsSync(sppDir)) {
    fs.mkdirSync(sppDir, { recursive: true });
  }

  // Validate before saving
  const validated = ConfigSchema.parse(config);

  fs.writeFileSync(
    configPath,
    JSON.stringify(validated, null, 2) + "\n",
    "utf-8"
  );
}

