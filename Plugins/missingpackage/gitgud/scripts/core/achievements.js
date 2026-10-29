/**
 * Core achievements logic for GitGud
 * Platform-agnostic functions for managing achievements and streaks
 */

const fs = require('fs');
const {
    STREAK_FILE,
    ACHIEVEMENTS_FILE,
    readFile,
    readJsonFile,
    writeFile,
    getToday,
    getYesterday
} = require('../paths');

// Achievement definitions (English)
const ACHIEVEMENT_DEFINITIONS = {
    first_task: { emoji: '🎯', name: 'First Steps', condition: stats => stats.completed >= 1 },
    five_tasks: { emoji: '✋', name: 'Getting Hands Dirty', condition: stats => stats.completed >= 5 },
    ten_tasks: { emoji: '📚', name: 'Apprentice', condition: stats => stats.completed >= 10 },
    twentyfive_tasks: { emoji: '🔨', name: 'Craftsman', condition: stats => stats.completed >= 25 },
    fifty_tasks: { emoji: '🎓', name: 'Master', condition: stats => stats.completed >= 50 },
    hundred_tasks: { emoji: '🏆', name: 'Legend', condition: stats => stats.completed >= 100 },
    streak_3: { emoji: '🔥', name: 'Three in a Row', condition: (stats, streak) => streak.current >= 3 },
    streak_7: { emoji: '📅', name: 'Perfect Week', condition: (stats, streak) => streak.current >= 7 },
    streak_14: { emoji: '💪', name: 'Two Weeks Strong', condition: (stats, streak) => streak.current >= 14 },
    streak_30: { emoji: '🥇', name: 'Golden Month', condition: (stats, streak) => streak.current >= 30 }
};

/**
 * Update streak data
 * @returns {Object} - Updated streak information
 */
function updateStreak() {
    const today = getToday();
    const yesterday = getYesterday();

    let currentStreak = 0;
    let lastCompletionDate = '';
    let bestStreak = 0;

    const streakData = readFile(STREAK_FILE, '');
    if (streakData) {
        const lines = streakData.split('\n');
        currentStreak = parseInt(lines[0]) || 0;
        lastCompletionDate = lines[1] || '';
        bestStreak = parseInt(lines[2]) || 0;
    }

    // Calculate if streak continues
    if (lastCompletionDate === today) {
        // Already completed today, streak stays
    } else if (lastCompletionDate === yesterday) {
        currentStreak++;
    } else if (!lastCompletionDate) {
        currentStreak = 1;
    } else {
        currentStreak = 1; // Reset streak
    }

    // Update best streak
    if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
    }

    // Save streak
    writeFile(STREAK_FILE, `${currentStreak}\n${today}\n${bestStreak}`);

    return {
        current: currentStreak,
        best: bestStreak,
        lastDate: today,
        isNewRecord: currentStreak === bestStreak && currentStreak > 1
    };
}

/**
 * Get current streak without updating
 * @returns {Object} - Current streak information
 */
function getCurrentStreak() {
    const streakData = readFile(STREAK_FILE, '');
    if (streakData) {
        const lines = streakData.split('\n');
        return {
            current: parseInt(lines[0]) || 0,
            lastDate: lines[1] || '',
            best: parseInt(lines[2]) || 0
        };
    }
    return {
        current: 0,
        lastDate: '',
        best: 0
    };
}

/**
 * Check and update achievements
 * @param {Object} stats - Current stats object
 * @param {Object} streak - Current streak information
 * @returns {Object} - Achievement results
 */
function checkAchievements(stats, streak) {
    const achievements = readJsonFile(ACHIEVEMENTS_FILE, []);
    const newAchievements = [];

    for (const [id, achievement] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
        if (!achievements.includes(id) && achievement.condition(stats, streak)) {
            achievements.push(id);
            newAchievements.push({
                id,
                emoji: achievement.emoji,
                name: achievement.name
            });
        }
    }

    // Save achievements if any new ones
    if (newAchievements.length > 0) {
        writeFile(ACHIEVEMENTS_FILE, JSON.stringify(achievements));
    }

    return {
        total: achievements.length,
        new: newAchievements,
        all: achievements
    };
}

/**
 * Get all achievements with their status
 * @param {Object} stats - Current stats object
 * @param {Object} streak - Current streak information
 * @returns {Array} - Array of achievement objects with status
 */
function getAllAchievements(stats, streak) {
    const achievements = readJsonFile(ACHIEVEMENTS_FILE, []);

    return Object.entries(ACHIEVEMENT_DEFINITIONS).map(([id, achievement]) => ({
        id,
        emoji: achievement.emoji,
        name: achievement.name,
        unlocked: achievements.includes(id),
        progress: getAchievementProgress(id, stats, streak)
    }));
}

/**
 * Get progress towards an achievement
 * @param {string} achievementId - Achievement ID
 * @param {Object} stats - Current stats object
 * @param {Object} streak - Current streak information
 * @returns {string} - Progress description
 */
function getAchievementProgress(achievementId, stats, streak) {
    const progressMap = {
        first_task: `${stats.completed}/1`,
        five_tasks: `${stats.completed}/5`,
        ten_tasks: `${stats.completed}/10`,
        twentyfive_tasks: `${stats.completed}/25`,
        fifty_tasks: `${stats.completed}/50`,
        hundred_tasks: `${stats.completed}/100`,
        streak_3: `${streak.current}/3 days`,
        streak_7: `${streak.current}/7 days`,
        streak_14: `${streak.current}/14 days`,
        streak_30: `${streak.current}/30 days`
    };

    return progressMap[achievementId] || '';
}

/**
 * Reset streak data
 */
function resetStreak() {
    if (fs.existsSync(STREAK_FILE)) {
        fs.unlinkSync(STREAK_FILE);
    }
}

/**
 * Reset achievements
 */
function resetAchievements() {
    if (fs.existsSync(ACHIEVEMENTS_FILE)) {
        fs.unlinkSync(ACHIEVEMENTS_FILE);
    }
}

module.exports = {
    ACHIEVEMENT_DEFINITIONS,
    updateStreak,
    getCurrentStreak,
    checkAchievements,
    getAllAchievements,
    getAchievementProgress,
    resetStreak,
    resetAchievements
};