/**
 * Shared paths module for GitGud
 * Uses ~/.gitgud/ for persistent cross-platform data storage
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Plugin root (for reading default config)
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.dirname(__dirname);

// User data directory: ~/.gitgud/
const USER_DATA_DIR = path.join(os.homedir(), '.gitgud');

// Ensure user data directory exists
if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

// Config file in user directory (persists across plugin updates)
const CONFIG_FILE = path.join(USER_DATA_DIR, 'config.json');

// State files
const COUNTER_FILE = path.join(USER_DATA_DIR, 'request_counter');
const PENDING_TASK_FILE = path.join(USER_DATA_DIR, 'pending_task');
const SKIPS_FILE = path.join(USER_DATA_DIR, 'daily_skips');
const LAST_SKIP_DATE_FILE = path.join(USER_DATA_DIR, 'last_skip_date');
const STREAK_FILE = path.join(USER_DATA_DIR, 'streak_data');
const ACHIEVEMENTS_FILE = path.join(USER_DATA_DIR, 'achievements.json');
const STATS_FILE = path.join(USER_DATA_DIR, 'stats.json');
const HISTORY_FILE = path.join(USER_DATA_DIR, 'task_history.jsonl');

// Default configuration
const DEFAULT_CONFIG = {
    frequency: 10,
    daily_skips: 3,
    difficulty: 'adaptive',
    enabled: true
};

// Helper functions
function readFile(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8').trim();
        }
    } catch (e) {}
    return defaultValue;
}

function readJsonFile(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) {}
    return defaultValue;
}

function writeFile(filePath, content) {
    fs.writeFileSync(filePath, String(content));
}

function writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function appendFile(filePath, content) {
    fs.appendFileSync(filePath, content + '\n');
}

function readConfig() {
    return { ...DEFAULT_CONFIG, ...readJsonFile(CONFIG_FILE, {}) };
}

function writeConfig(config) {
    writeJsonFile(CONFIG_FILE, config);
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

module.exports = {
    PLUGIN_ROOT,
    USER_DATA_DIR,
    CONFIG_FILE,
    COUNTER_FILE,
    PENDING_TASK_FILE,
    SKIPS_FILE,
    LAST_SKIP_DATE_FILE,
    STREAK_FILE,
    ACHIEVEMENTS_FILE,
    STATS_FILE,
    HISTORY_FILE,
    DEFAULT_CONFIG,
    readFile,
    readJsonFile,
    writeFile,
    writeJsonFile,
    appendFile,
    readConfig,
    writeConfig,
    getToday,
    getYesterday
};
