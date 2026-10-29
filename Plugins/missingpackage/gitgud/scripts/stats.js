#!/usr/bin/env node
/**
 * Statistics display for GitGud
 */

const fs = require('fs');
const {
    COUNTER_FILE,
    STREAK_FILE,
    ACHIEVEMENTS_FILE,
    STATS_FILE,
    SKIPS_FILE,
    HISTORY_FILE,
    readFile,
    readJsonFile,
    readConfig
} = require('./paths');

// Box rendering helpers (width-aware for emoji / wide chars)
const INNER_WIDTH = 78;

// Heuristic display-width calculator (good enough for terminals; avoids right-border drift)
const RE_COMBINING = /[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u0898-\u089F\u08CA-\u08E1\u08E3-\u0902\u093A\u093C\u0941-\u0948\u094D\u0951-\u0957\u0962-\u0963\u0981\u09BC\u09C1-\u09C4\u09CD\u09E2-\u09E3\u0A01-\u0A02\u0A3C\u0A41-\u0A42\u0A47-\u0A48\u0A4B-\u0A4D\u0A51\u0A70-\u0A71\u0A75\u0A81-\u0A82\u0ABC\u0AC1-\u0AC5\u0AC7-\u0AC8\u0ACD\u0AE2-\u0AE3\u0B01\u0B3C\u0B3F\u0B41-\u0B44\u0B4D\u0B55-\u0B56\u0B62-\u0B63\u0B82\u0BC0\u0BCD\u0C00\u0C04\u0C3C\u0C3E-\u0C40\u0C46-\u0C48\u0C4A-\u0C4D\u0C55-\u0C56\u0C62-\u0C63\u0C81\u0CBC\u0CBF\u0CC6\u0CCC-\u0CCD\u0CE2-\u0CE3\u0D00-\u0D01\u0D3B-\u0D3C\u0D41-\u0D44\u0D4D\u0D62-\u0D63\u0D81\u0DCA\u0DD2-\u0DD4\u0DD6\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB-\u0EBC\u0EC8-\u0ECD\u0F18-\u0F19\u0F35\u0F37\u0F39\u0F71-\u0F7E\u0F80-\u0F84\u0F86-\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102D-\u1030\u1032-\u1037\u1039-\u103A\u103D-\u103E\u1058-\u1059\u105E-\u1060\u1071-\u1074\u1082\u1085-\u1086\u108D\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752-\u1753\u1772-\u1773\u17B4-\u17B5\u17B7-\u17BD\u17C6\u17C9-\u17D3\u17DD\u180B-\u180F\u1885-\u1886\u18A9\u1920-\u1922\u1927-\u1928\u1932\u1939-\u193B\u1A17-\u1A18\u1A56\u1A58-\u1A5E\u1A60\u1A62\u1A65-\u1A6C\u1A73-\u1A7C\u1A7F\u1AB0-\u1ACE\u1B00-\u1B03\u1B34\u1B36-\u1B3A\u1B3C\u1B42\u1B6B-\u1B73\u1BA1\u1BA4-\u1BA5\u1BA8-\u1BA9\u1BAB-\u1BAD\u1BE6\u1BE8-\u1BE9\u1BED\u1BEF-\u1BF1\u1C2C-\u1C33\u1C36-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE0\u1CE2-\u1CE8\u1CED\u1CF4\u1CF8-\u1CF9\u1DC0-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099-\u309A\uA66F\uA674-\uA67D\uA69E-\uA69F\uA6F0-\uA6F1\uA802\uA806\uA80B\uA825-\uA826\uA8C4-\uA8C5\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA951\uA980-\uA982\uA9B3\uA9B6-\uA9B9\uA9BC\uA9E5\uAA29-\uAA2E\uAA31-\uAA32\uAA35-\uAA36\uAA43\uAA4C\uAA7C\uAAB0\uAAB2-\uAAB4\uAAB7-\uAAB8\uAABE-\uAABF\uAAC1\uAAEC-\uAAED\uAAF6\uABE5\uABE8\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F\uFEFF\uFFF9-\uFFFB]|\u200D/g;
const RE_WIDE = /[\u1100-\u115F\u2329\u232A\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF01-\uFF60\uFFE0-\uFFE6]/;
const RE_EMOJI = /\p{Extended_Pictographic}/u;

function displayWidth(input) {
    const s = String(input ?? '');
    let w = 0;
    for (const ch of Array.from(s)) {
        if (RE_COMBINING.test(ch)) continue;
        if (RE_EMOJI.test(ch) || RE_WIDE.test(ch)) {
            w += 2;
        } else {
            w += 1;
        }
    }
    return w;
}

function padRightToWidth(input, width) {
    const s = String(input ?? '');
    const w = displayWidth(s);
    if (w >= width) return s;
    return s + ' '.repeat(width - w);
}

function truncateToWidth(input, width) {
    const s = String(input ?? '');
    if (displayWidth(s) <= width) return s;
    const ellipsis = '…';
    const target = Math.max(0, width - displayWidth(ellipsis));
    let out = '';
    let w = 0;
    for (const ch of Array.from(s)) {
        const cw = (RE_COMBINING.test(ch) ? 0 : (RE_EMOJI.test(ch) || RE_WIDE.test(ch) ? 2 : 1));
        if (w + cw > target) break;
        out += ch;
        w += cw;
    }
    return out + ellipsis;
}

function boxLine(content = '') {
    const truncated = truncateToWidth(content, INNER_WIDTH);
    return `║${padRightToWidth(truncated, INNER_WIDTH)}║`;
}

function boxSep() {
    return `╠${'═'.repeat(INNER_WIDTH)}╣`;
}

function boxTop() {
    return `╔${'═'.repeat(INNER_WIDTH)}╗`;
}

function boxBottom() {
    return `╚${'═'.repeat(INNER_WIDTH)}╝`;
}

function centerText(text, width) {
    const t = String(text ?? '');
    const w = displayWidth(t);
    if (w >= width) return truncateToWidth(t, width);
    const left = Math.floor((width - w) / 2);
    const right = width - w - left;
    return ' '.repeat(left) + t + ' '.repeat(right);
}

// Achievement names (English)
const ACHIEVEMENT_NAMES = {
    first_task: '🎯 First Steps',
    five_tasks: '✋ Getting Hands Dirty',
    ten_tasks: '📚 Apprentice',
    twentyfive_tasks: '🔨 Craftsman',
    fifty_tasks: '🎓 Master',
    hundred_tasks: '🏆 Legend',
    streak_3: '🔥 Three in a Row',
    streak_7: '📅 Perfect Week',
    streak_14: '💪 Two Weeks Strong',
    streak_30: '🥇 Golden Month'
};

function main() {
    const config = readConfig();
    const TRIGGER_EVERY = config.frequency;
    const MAX_DAILY_SKIPS = config.daily_skips;
    const DIFFICULTY = config.difficulty;

    const asciiMode = process.argv.includes('--ascii') || String(process.env.GITGUD_ASCII || '').toLowerCase() === '1';

    const currentCount = parseInt(readFile(COUNTER_FILE, '0'));
    const nextTask = TRIGGER_EVERY - (currentCount % TRIGGER_EVERY);
    const currentSkips = parseInt(readFile(SKIPS_FILE, '0'));
    const remainingSkips = MAX_DAILY_SKIPS - currentSkips;

    // Streak
    let currentStreak = 0;
    let bestStreak = 0;
    const streakData = readFile(STREAK_FILE, '');
    if (streakData) {
        const lines = streakData.split('\n');
        currentStreak = parseInt(lines[0]) || 0;
        bestStreak = parseInt(lines[2]) || 0;
    }

    // Stats
    const stats = readJsonFile(STATS_FILE, { completed: 0, skipped: 0, total_assigned: 0 });
    const completed = stats.completed || 0;
    const skipped = stats.skipped || 0;
    const total = stats.total_assigned || 0;
    const completionRate = total > 0 ? Math.round((completed * 100) / total) : 0;

    // Output
    console.log('');
    console.log(boxTop());
    console.log(boxLine(centerText(`${asciiMode ? '' : '🎮 '}GITGUD STATS`, INNER_WIDTH)));
    console.log(boxSep());
    console.log(boxLine(''));
    console.log(boxLine(`  ${asciiMode ? '' : '📈 '}ACTIVITY`));
    console.log(boxLine(`     Total requests:        ${currentCount}`));
    console.log(boxLine(`     Next task in:          ${nextTask} requests`));
    console.log(boxLine(`     Task frequency:        every ${TRIGGER_EVERY} requests`));
    console.log(boxLine(''));
    console.log(boxLine(`  ${asciiMode ? '' : '🔥 '}STREAK`));
    console.log(boxLine(`     Current streak:        ${currentStreak} days`));
    console.log(boxLine(`     Personal best:         ${bestStreak} days`));
    console.log(boxLine(''));
    console.log(boxLine(`  ${asciiMode ? '' : '📊 '}TASKS`));
    console.log(boxLine(`     Completed:             ${completed}`));
    console.log(boxLine(`     Skipped:               ${skipped}`));
    console.log(boxLine(`     Completion rate:       ${completionRate}%`));
    console.log(boxLine(''));
    console.log(boxLine(`  ${asciiMode ? '' : '⚙️  '}CONFIG`));
    console.log(boxLine(`     Difficulty:            ${DIFFICULTY}`));
    console.log(boxLine(`     Skips today:           ${remainingSkips}/${MAX_DAILY_SKIPS} remaining`));
    console.log(boxLine(''));
    console.log(boxSep());

    // Achievements
    console.log(boxLine(`  ${asciiMode ? '' : '🏆 '}ACHIEVEMENTS`));
    console.log(boxLine(''));

    const achievements = readJsonFile(ACHIEVEMENTS_FILE, []);
    if (achievements.length > 0) {
        achievements.forEach(id => {
            let name = ACHIEVEMENT_NAMES[id] || id;
            if (asciiMode) name = name.replace(/^[^\w]+/u, '').trim();
            console.log(boxLine(`     ${name}`));
        });
    } else {
        console.log(boxLine('     No achievements yet... keep going!'));
    }

    console.log(boxLine(''));
    console.log(boxSep());

    // Last tasks
    console.log(boxLine(`  ${asciiMode ? '' : '📋 '}LAST 5 TASKS`));
    console.log(boxLine(''));

    if (fs.existsSync(HISTORY_FILE)) {
        const historyContent = readFile(HISTORY_FILE, '');
        if (historyContent) {
            const lines = historyContent.split('\n').filter(l => l.trim());
            const lastFive = lines.slice(-5);

            lastFive.forEach(line => {
                try {
                    const entry = JSON.parse(line);
                    const event = (entry.event || 'assigned');
                    const category = (entry.category || '-');
                    const timestamp = (entry.timestamp || '?').substring(0, 10);
                    const info = `${event.padEnd(10)} | ${category.padEnd(12)} | ${timestamp}`;
                    console.log(boxLine(`     ${info}`));
                } catch (e) {}
            });
        } else {
            console.log(boxLine('     No tasks yet...'));
        }
    } else {
        console.log(boxLine('     No tasks yet...'));
    }

    console.log(boxLine(''));
    console.log(boxBottom());
    console.log('');
}

main();
