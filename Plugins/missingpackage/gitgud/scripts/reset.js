#!/usr/bin/env node
/**
 * Reset tool for GitGud
 */

const fs = require('fs');
const {
    USER_DATA_DIR,
    COUNTER_FILE,
    PENDING_TASK_FILE,
    SKIPS_FILE,
    STREAK_FILE,
    ACHIEVEMENTS_FILE,
    STATS_FILE,
    HISTORY_FILE,
    writeFile
} = require('./paths');

function showHelp() {
    console.log('');
    console.log('GitGud - Reset Tool');
    console.log('');
    console.log('Usage: /gg-reset [option]');
    console.log('');
    console.log('Options:');
    console.log('  counter    Reset only the request counter');
    console.log('  stats      Reset statistics (keeps achievements)');
    console.log('  all        Reset everything (counter, stats, achievements, streak)');
    console.log('  help       Show this message');
    console.log('');
    console.log(`Data location: ${USER_DATA_DIR}`);
    console.log('');
}

function resetCounter() {
    writeFile(COUNTER_FILE, '0');
    if (fs.existsSync(PENDING_TASK_FILE)) {
        fs.unlinkSync(PENDING_TASK_FILE);
    }
    console.log('✅ Counter reset to 0');
}

function resetStats() {
    writeFile(STATS_FILE, JSON.stringify({ completed: 0, skipped: 0, total_assigned: 0 }));
    writeFile(SKIPS_FILE, '0');
    console.log('✅ Statistics reset');
}

function resetAll() {
    resetCounter();
    resetStats();
    writeFile(ACHIEVEMENTS_FILE, '[]');
    console.log('✅ Achievements reset');

    if (fs.existsSync(STREAK_FILE)) {
        fs.unlinkSync(STREAK_FILE);
    }
    console.log('✅ Streak reset');

    if (fs.existsSync(HISTORY_FILE)) {
        fs.unlinkSync(HISTORY_FILE);
    }
    console.log('✅ History cleared');
    console.log('');
    console.log('🔄 Full reset completed!');
}

function main() {
    const args = process.argv.slice(2);
    const option = args[0] || 'help';

    switch (option) {
        case 'counter':
            resetCounter();
            break;
        case 'stats':
            resetStats();
            break;
        case 'all':
            resetAll();
            break;
        case 'help':
        default:
            showHelp();
            break;
    }
}

main();
