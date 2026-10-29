#!/usr/bin/env node
/**
 * GitGud Hook for Claude Code
 * Platform-specific entry point for Claude Code hooks
 */

const { getConfig } = require('./core/config-manager');
const { processPrompt, initializeFiles } = require('./core/task-manager');
const { getCurrentStreak } = require('./core/achievements');

// Output hook response for Claude Code
function output(additionalContext) {
    console.log(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext
        }
    }));
}

// Main function
async function main() {
    const config = getConfig();

    // Exit if disabled
    if (!config.enabled) {
        process.exit(0);
    }

    // Initialize files and reset daily skips if needed
    initializeFiles(config);

    // Read stdin (user prompt)
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk;
    }

    let userPrompt = '';
    try {
        const data = JSON.parse(input);
        userPrompt = data.prompt || '';
    } catch (e) {}

    // Process prompt and determine action
    const action = processPrompt(userPrompt, config);

    // Handle action based on type
    switch (action.type) {
        case 'skip_used':
            output(`🃏 SKIP USED!\n\nThe user chose to skip the manual task.\nSkips remaining today: ${action.data.remainingSkips}/${action.data.maxSkips}\n\nYou can proceed normally with the user's request.\nInform the user that they used a skip and how many remain.`);
            break;

        case 'skip_denied':
            output(`❌ NO SKIPS REMAINING!\n\nThe user has used all ${action.data.maxSkips} skips for today.\nThey must complete the pending task or wait until tomorrow.\n\nRemind them of the pending task and encourage them to complete it.`);
            break;

        case 'pending_task':
            output(`🎮 GITGUD ACTIVE!\n\n📋 PENDING TASK:\n${action.data.task}\n\n⛔ MANDATORY INSTRUCTIONS FOR CLAUDE:\n1. DO NOT write code for them\n2. DO NOT provide complete implementations\n3. DO NOT give copy-paste snippets\n4. You CAN ONLY:\n   - Answer conceptual questions\n   - Point to documentation to consult\n   - Confirm if an approach is correct (without code)\n   - Give high-level hints\n\n🃏 Skips available: ${action.data.remainingSkips}/${action.data.maxSkips} (user can type 'skip')\n\n✅ When done: /gg-complete\n\nRemind the user of the task and options.`);
            break;

        case 'new_task':
            output(`🎮 GITGUD - NEW CHALLENGE!\n\nRequest #${action.data.requestNumber} - Time to git gud!\n🔥 Current streak: ${action.data.currentStreak} days\n\n📋 YOUR TASK:\n${action.data.task}\n\n⛔ INSTRUCTIONS FOR CLAUDE:\n1. DON'T write code - the user must do it themselves\n2. Present the task clearly and motivationally\n3. Explain WHY this exercise is useful for the original request\n4. Suggest documentation/resources to consult\n5. Give high-level hints if requested (no code!)\n\n🃏 Skips available: ${action.data.remainingSkips}/${action.data.maxSkips} (user can type 'skip')\n✅ When done: /gg-complete\n\nPresent the challenge to the user!`);
            break;

        case 'continue':
        default:
            // No output = proceed normally
            break;
    }

    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
