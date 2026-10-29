#!/usr/bin/env node
/**
 * GitGud Hook for Cursor IDE
 * Platform-specific entry point for Cursor hooks
 *
 * Cursor's beforeSubmitPrompt hook only supports { "continue": boolean }
 * So we write task state to a file that a Cursor Rule can read
 */

const path = require('path');
const fs = require('fs');

// Adjust path to find core modules from installed location
const scriptsPath = path.join(__dirname, '..', 'scripts');
const { getConfig } = require(path.join(scriptsPath, 'core', 'config-manager'));
const { processPrompt, initializeFiles } = require(path.join(scriptsPath, 'core', 'task-manager'));
const { PENDING_TASK_FILE } = require(path.join(scriptsPath, 'paths'));

/**
 * Main function for Cursor hook
 */
async function main() {
    const config = getConfig();

    // Exit if disabled
    if (!config.enabled) {
        // Always continue in Cursor
        console.log(JSON.stringify({ continue: true }));
        process.exit(0);
    }

    // Initialize files and reset daily skips if needed
    initializeFiles(config);

    // Read stdin (Cursor hook input)
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk;
    }

    let userPrompt = '';
    try {
        const data = JSON.parse(input);
        // Cursor format has 'prompt' field
        userPrompt = data.prompt || '';
    } catch (e) {
        // If parsing fails, just continue
        console.log(JSON.stringify({ continue: true }));
        process.exit(0);
    }

    // Process prompt and determine action
    const action = processPrompt(userPrompt, config);

    // For Cursor, we write the state to a file that the Rule can read
    // The Rule will instruct the AI based on the file's contents
    switch (action.type) {
        case 'skip_used':
            // Remove pending task file
            if (fs.existsSync(PENDING_TASK_FILE)) {
                fs.unlinkSync(PENDING_TASK_FILE);
            }
            // Write skip notification for Rule to see
            const skipMessage = `Skip used! Remaining skips today: ${action.data.remainingSkips}/${action.data.maxSkips}`;
            fs.writeFileSync(
                path.join(require('os').homedir(), '.gitgud', 'last_action'),
                skipMessage
            );
            break;

        case 'skip_denied':
            // Keep pending task, write skip denial
            const denyMessage = `No skips remaining! All ${action.data.maxSkips} skips used today.`;
            fs.writeFileSync(
                path.join(require('os').homedir(), '.gitgud', 'last_action'),
                denyMessage
            );
            break;

        case 'pending_task':
            // Task already exists in PENDING_TASK_FILE, Rule will read it
            break;

        case 'new_task':
            // Task already written to PENDING_TASK_FILE by processPrompt
            const newTaskMessage = `New task assigned! Request #${action.data.requestNumber}. Streak: ${action.data.currentStreak} days`;
            fs.writeFileSync(
                path.join(require('os').homedir(), '.gitgud', 'last_action'),
                newTaskMessage
            );
            break;

        case 'continue':
        default:
            // Clean up any last action file
            const lastActionFile = path.join(require('os').homedir(), '.gitgud', 'last_action');
            if (fs.existsSync(lastActionFile)) {
                fs.unlinkSync(lastActionFile);
            }
            break;
    }

    // Cursor hooks always return continue: true
    // The Rule will handle instructing the AI based on file state
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
}

main().catch(e => {
    // On error, always continue
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
});