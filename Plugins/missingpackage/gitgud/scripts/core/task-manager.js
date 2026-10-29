/**
 * Core task management logic for GitGud
 * Platform-agnostic functions for processing prompts and managing tasks
 */

const fs = require('fs');
const {
    COUNTER_FILE,
    PENDING_TASK_FILE,
    SKIPS_FILE,
    LAST_SKIP_DATE_FILE,
    STATS_FILE,
    HISTORY_FILE,
    readFile,
    readJsonFile,
    writeFile,
    appendFile,
    getToday
} = require('../paths');

// Prompts that are too short or trivial to count
const TRIVIAL_PATTERNS = /^(ok|okay|thanks|thank you|thx|ty|yes|no|sure|got it|understood|perfect|great|good|nice|cool|fine|k|y|n|yep|nope|alright|right|correct|done|next)\.?!?$/i;

// Patterns that indicate skip intent
const SKIP_PATTERNS = /^(skip|\/skip|skip this|skip task|skip it|i want to skip|let me skip|can i skip|skippa|salta)$/i;

// Task categories with English tasks
const CATEGORIES = {
    security: {
        keywords: /auth|login|logout|password|token|jwt|session|security|encrypt|hash|credential|permission|role|oauth|apikey|2fa|mfa/i,
        tasks: [
            "Write a password validation function that checks security requirements (length, complexity, special characters).",
            "Implement a function to sanitize user input and prevent injection attacks.",
            "Create a helper function to verify user permissions/roles."
        ]
    },
    api: {
        keywords: /api|endpoint|route|rest|request|response|http|fetch|axios|graphql|webhook|cors/i,
        tasks: [
            "Write a validation schema/model for the request body or response of this endpoint.",
            "Implement a middleware function or decorator to handle a cross-cutting concern (logging, timing, error handling).",
            "Create a helper function to format error responses consistently."
        ]
    },
    database: {
        keywords: /database|query|sql|model|schema|migration|table|record|repository|orm|prisma|mongoose|postgres|mysql|mongo/i,
        tasks: [
            "Write a sanitization function to prevent SQL injection or validate data before insertion.",
            "Implement a helper function for paginating query results.",
            "Create a transformation function between the database model and the DTO/response."
        ]
    },
    debug: {
        keywords: /bug|debug|error|crash|broken|issue|exception|trace|not working|fails|failing/i,
        tasks: [
            "Write a test that reproduces the described bug. The test should fail before the fix and pass after.",
            "Implement a logging/debug helper function to trace data flow at this point in the code.",
            "Create a validation function that prevents this type of error in the future."
        ]
    },
    test: {
        keywords: /test|spec|assert|pytest|jest|unittest|coverage|mock|stub|spy|vitest|mocha/i,
        tasks: [
            "Write a test for a non-obvious edge case of this functionality. Think about empty inputs, null, numeric limits.",
            "Implement an integration test that verifies the interaction between multiple components.",
            "Create a fixture or factory function to generate reusable test data."
        ]
    },
    architecture: {
        keywords: /refactor|restructure|reorganize|architect|pattern|solid|abstract|interface|decouple|modular/i,
        tasks: [
            "Extract an interface/protocol that defines the contract for this component.",
            "Implement a factory or builder pattern for creating this object.",
            "Create a base class/module that can be extended for variants of this functionality."
        ]
    },
    frontend: {
        keywords: /component|react|vue|angular|svelte|nextjs|nuxt|tailwind|css|scss|sass|html|style|button|form|page/i,
        tasks: [
            "Write a reusable presentational component (button, input, card) that you could use in this feature.",
            "Implement a custom hook or composable to manage local state for this component.",
            "Create a form validation function for the input fields of this feature."
        ]
    },
    function: {
        keywords: /function|implement|create|add|write|build|make|develop/i,
        tasks: [
            "Write a related helper function that could be useful for this implementation. Think about input validation, output formatting, or common utilities.",
            "Implement a validation function for the main parameters of this feature. Consider edge cases and input types.",
            "Create a utility function that extracts/transforms the data needed for this operation."
        ]
    },
    general: {
        keywords: null,
        tasks: [
            "Write a utility function that could be useful in the context of this request.",
            "Implement a unit test for an existing related functionality.",
            "Create a data validation or transformation function relevant to this task."
        ]
    }
};

/**
 * Detect category from prompt
 * @param {string} prompt - The user's prompt
 * @returns {string} - The detected category
 */
function detectCategory(prompt) {
    for (const [category, data] of Object.entries(CATEGORIES)) {
        if (data.keywords && data.keywords.test(prompt)) {
            return category;
        }
    }
    return 'general';
}

/**
 * Get difficulty note for a task
 * @param {string} difficulty - The difficulty level
 * @returns {string} - The difficulty note
 */
function getDifficultyNote(difficulty) {
    const notes = {
        easy: "(Difficulty: EASY - basic implementation, few lines)",
        medium: "(Difficulty: MEDIUM - consider edge cases and error handling)",
        hard: "(Difficulty: HARD - robust implementation with tests, types, documentation)",
        adaptive: "(Difficulty: adapted to the context of the request)"
    };
    return notes[difficulty] || notes.adaptive;
}

/**
 * Check if prompt is too short/trivial to count
 * @param {string} prompt - The user's prompt
 * @returns {boolean} - True if trivial
 */
function isTrivialPrompt(prompt) {
    const trimmed = prompt.trim();
    // Too short (less than 10 chars) or matches trivial patterns
    return trimmed.length < 10 || TRIVIAL_PATTERNS.test(trimmed);
}

/**
 * Process user prompt and determine action
 * @param {string} prompt - The user's prompt
 * @param {Object} config - Configuration object
 * @returns {Object} - Action object with type and data
 */
function processPrompt(prompt, config) {
    const userPromptLower = prompt.toLowerCase().trim();

    // Check for skip request
    if (SKIP_PATTERNS.test(userPromptLower)) {
        return handleSkipRequest(config);
    }

    // Check if there's a pending task
    if (fs.existsSync(PENDING_TASK_FILE)) {
        return handlePendingTask(config);
    }

    // Don't count trivial prompts
    if (isTrivialPrompt(prompt)) {
        return { type: 'continue', data: null };
    }

    // Check if it's time for a new task
    return checkAndAssignTask(userPromptLower, config);
}

/**
 * Handle skip request
 * @param {Object} config - Configuration object
 * @returns {Object} - Action object
 */
function handleSkipRequest(config) {
    const currentSkips = parseInt(readFile(SKIPS_FILE, '0'));
    const remainingSkips = config.daily_skips - currentSkips;

    if (!fs.existsSync(PENDING_TASK_FILE)) {
        // No pending task - continue normally
        return { type: 'continue', data: null };
    }

    if (remainingSkips > 0) {
        // Use a skip
        writeFile(SKIPS_FILE, String(currentSkips + 1));
        fs.unlinkSync(PENDING_TASK_FILE);

        // Update stats
        const stats = readJsonFile(STATS_FILE, { completed: 0, skipped: 0, total_assigned: 0 });
        stats.skipped = (stats.skipped || 0) + 1;
        writeFile(STATS_FILE, JSON.stringify(stats));

        // Log
        appendFile(HISTORY_FILE, JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'skipped'
        }));

        return {
            type: 'skip_used',
            data: {
                remainingSkips: remainingSkips - 1,
                maxSkips: config.daily_skips
            }
        };
    }

    // No skips remaining
    return {
        type: 'skip_denied',
        data: {
            maxSkips: config.daily_skips
        }
    };
}

/**
 * Handle existing pending task
 * @param {Object} config - Configuration object
 * @returns {Object} - Action object
 */
function handlePendingTask(config) {
    const pendingTask = readFile(PENDING_TASK_FILE, '').replace(/\n/g, ' ');
    const currentSkips = parseInt(readFile(SKIPS_FILE, '0'));
    const remainingSkips = config.daily_skips - currentSkips;

    return {
        type: 'pending_task',
        data: {
            task: pendingTask,
            remainingSkips,
            maxSkips: config.daily_skips
        }
    };
}

/**
 * Check counter and assign task if needed
 * @param {string} userPromptLower - Lowercased user prompt
 * @param {Object} config - Configuration object
 * @returns {Object} - Action object
 */
function checkAndAssignTask(userPromptLower, config) {
    // Increment counter
    const currentCount = parseInt(readFile(COUNTER_FILE, '0'));
    const newCount = currentCount + 1;
    writeFile(COUNTER_FILE, String(newCount));

    // Check if it's time for a manual task
    if (newCount % config.frequency === 0) {
        return assignTask(userPromptLower, newCount, config);
    }

    // No task needed
    return { type: 'continue', data: null };
}

/**
 * Assign a new task
 * @param {string} userPromptLower - Lowercased user prompt
 * @param {number} requestNumber - Current request number
 * @param {Object} config - Configuration object
 * @returns {Object} - Action object with assigned task
 */
function assignTask(userPromptLower, requestNumber, config) {
    const category = detectCategory(userPromptLower);
    const tasks = CATEGORIES[category].tasks;
    const selectedTask = tasks[Math.floor(Math.random() * tasks.length)];
    const diffNote = getDifficultyNote(config.difficulty);

    const taskMessage = `[Category: ${category}] ${selectedTask} ${diffNote}`;
    writeFile(PENDING_TASK_FILE, taskMessage);

    // Update stats
    const stats = readJsonFile(STATS_FILE, { completed: 0, skipped: 0, total_assigned: 0 });
    stats.total_assigned = (stats.total_assigned || 0) + 1;
    writeFile(STATS_FILE, JSON.stringify(stats));

    // Log
    appendFile(HISTORY_FILE, JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'assigned',
        request_number: requestNumber,
        category,
        difficulty: config.difficulty
    }));

    const currentSkips = parseInt(readFile(SKIPS_FILE, '0'));
    const remainingSkips = config.daily_skips - currentSkips;

    // Read current streak
    let currentStreak = 0;
    const streakData = readFile(STREAK_FILE, '');
    if (streakData) {
        currentStreak = parseInt(streakData.split('\n')[0]) || 0;
    }

    return {
        type: 'new_task',
        data: {
            task: taskMessage,
            requestNumber,
            category,
            remainingSkips,
            maxSkips: config.daily_skips,
            currentStreak
        }
    };
}

/**
 * Initialize required files and reset daily skips if needed
 * @param {Object} config - Configuration object
 */
function initializeFiles(config) {
    // Initialize files if needed
    if (!fs.existsSync(COUNTER_FILE)) writeFile(COUNTER_FILE, '0');
    if (!fs.existsSync(SKIPS_FILE)) writeFile(SKIPS_FILE, '0');
    if (!fs.existsSync(STATS_FILE)) {
        writeFile(STATS_FILE, JSON.stringify({
            completed: 0,
            skipped: 0,
            total_assigned: 0
        }));
    }

    // Reset daily skips
    const today = getToday();
    const lastSkipDate = readFile(LAST_SKIP_DATE_FILE, '');
    if (lastSkipDate !== today) {
        writeFile(SKIPS_FILE, '0');
        writeFile(LAST_SKIP_DATE_FILE, today);
    }
}

module.exports = {
    CATEGORIES,
    detectCategory,
    getDifficultyNote,
    isTrivialPrompt,
    processPrompt,
    handleSkipRequest,
    handlePendingTask,
    checkAndAssignTask,
    assignTask,
    initializeFiles,
    SKIP_PATTERNS,
    TRIVIAL_PATTERNS
};