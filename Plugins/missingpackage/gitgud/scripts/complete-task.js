#!/usr/bin/env node
/**
 * Script to mark a task as completed
 * Handles streaks and achievements
 */

const fs = require('fs');
const {
    COUNTER_FILE,
    PENDING_TASK_FILE,
    SKIPS_FILE,
    STATS_FILE,
    HISTORY_FILE,
    readFile,
    readJsonFile,
    writeFile,
    appendFile
} = require('./paths');
const { getConfig } = require('./core/config-manager');
const { updateStreak, checkAchievements, ACHIEVEMENT_DEFINITIONS } = require('./core/achievements');

function main() {
    // Check if there's a pending task
    if (!fs.existsSync(PENDING_TASK_FILE)) {
        console.log('ℹ️  No pending task to complete.');
        console.log('');
        console.log('Tasks are assigned automatically every few requests.');
        console.log('Use /gg-stats to see when your next task will appear.');
        return;
    }

    const config = getConfig();
    const TRIGGER_EVERY = config.frequency;
    const MAX_DAILY_SKIPS = config.daily_skips;

    // ============================================
    // UPDATE STREAK
    // ============================================
    const streak = updateStreak();

    // ============================================
    // UPDATE STATS
    // ============================================
    const stats = readJsonFile(STATS_FILE, { completed: 0, skipped: 0, total_assigned: 0 });
    stats.completed = (stats.completed || 0) + 1;
    writeFile(STATS_FILE, JSON.stringify(stats));

    const completed = stats.completed;
    const skipped = stats.skipped || 0;
    const total = stats.total_assigned || 0;

    // ============================================
    // CHECK ACHIEVEMENTS
    // ============================================
    const achievementResult = checkAchievements(stats, streak);

    // ============================================
    // OUTPUT
    // ============================================
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    ✅ TASK COMPLETED!                       ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Show new achievements
    if (achievementResult.new.length > 0) {
        console.log('🏅 NEW ACHIEVEMENT UNLOCKED!');
        achievementResult.new.forEach(a => console.log(`   ${a.emoji} ${a.name}`));
        console.log('');
    }

    // Streak
    console.log(`🔥 Streak: ${streak.current} days`);
    if (streak.isNewRecord) {
        console.log('   ⭐ New personal record!');
    } else {
        console.log(`   📈 Best: ${streak.best} days`);
    }
    console.log('');

    // Stats
    console.log('📊 Statistics:');
    console.log(`   Tasks completed: ${completed}`);
    console.log(`   Tasks skipped: ${skipped}`);
    if (total > 0) {
        const completionRate = Math.round((completed * 100) / total);
        console.log(`   Completion rate: ${completionRate}%`);
    }
    console.log('');

    // Next task
    const currentCount = parseInt(readFile(COUNTER_FILE, '0'));
    const nextTask = TRIGGER_EVERY - (currentCount % TRIGGER_EVERY);
    const currentSkips = parseInt(readFile(SKIPS_FILE, '0'));
    const remainingSkips = MAX_DAILY_SKIPS - currentSkips;

    console.log(`📍 Next task in: ${nextTask} requests`);
    console.log(`🃏 Skips remaining today: ${remainingSkips}/${MAX_DAILY_SKIPS}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💪 Great job! Keep it up!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Remove pending task
    fs.unlinkSync(PENDING_TASK_FILE);

    // Log completion
    appendFile(HISTORY_FILE, JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'completed',
        streak: streak.current
    }));
}

main();
