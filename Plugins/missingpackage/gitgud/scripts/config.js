#!/usr/bin/env node
/**
 * Configuration management CLI for GitGud
 */

const { USER_DATA_DIR } = require('./paths');
const { getConfig, setConfig, getConfigSchema } = require('./core/config-manager');

// ─────────────────────────────────────────────────────────────
// Width-aware box rendering (handles emoji properly)
// ─────────────────────────────────────────────────────────────
const BOX_WIDTH = 64;  // inner width between ║ and ║

/**
 * Calculate visual width of a string (emoji = 2 columns)
 */
function visualWidth(str) {
    let width = 0;
    for (const ch of str) {
        const code = ch.codePointAt(0);
        // Common emoji / wide char ranges
        if (
            (code >= 0x1F300 && code <= 0x1FAFF) || // Misc symbols, emoticons, etc.
            (code >= 0x2600 && code <= 0x27BF) ||   // Misc symbols
            (code >= 0xFE00 && code <= 0xFE0F) ||   // Variation selectors (ignore)
            (code >= 0x200D && code <= 0x200D)      // ZWJ (ignore)
        ) {
            if (code >= 0xFE00 && code <= 0xFE0F) continue; // variation selector
            if (code === 0x200D) continue; // ZWJ
            width += 2;
        } else {
            width += 1;
        }
    }
    return width;
}

/**
 * Pad (or truncate) a string to target visual width
 */
function padVisual(str, target) {
    let w = visualWidth(str);
    if (w >= target) {
        // truncate
        let out = '';
        let acc = 0;
        for (const ch of str) {
            const cw = visualWidth(ch);
            if (acc + cw > target - 1) break;
            out += ch;
            acc += cw;
        }
        return out + '…';
    }
    return str + ' '.repeat(target - w);
}

/**
 * Print a box line with proper padding
 */
function line(content = '') {
    const padded = padVisual(content, BOX_WIDTH);
    console.log(`║${padded}║`);
}

function separator() {
    console.log('╠' + '═'.repeat(BOX_WIDTH) + '╣');
}

function topBorder() {
    console.log('╔' + '═'.repeat(BOX_WIDTH) + '╗');
}

function bottomBorder() {
    console.log('╚' + '═'.repeat(BOX_WIDTH) + '╝');
}

function headerLine(text) {
    const padded = padVisual(text, BOX_WIDTH);
    console.log(`║${padded}║`);
}

// Show current configuration
function showConfig() {
    const config = getConfig();

    console.log('');
    topBorder();
    headerLine('                    ⚙️  GITGUD CONFIG');
    separator();
    line();

    const settings = [
        ['frequency', 'Requests between tasks', String(config.frequency)],
        ['daily_skips', 'Max skips per day', String(config.daily_skips)],
        ['difficulty', 'Task difficulty', config.difficulty],
        ['enabled', 'Plugin active', String(config.enabled)]
    ];

    settings.forEach(([key, desc, val]) => {
        line(`  ${key.padEnd(14)} ${val.padEnd(12)} (${desc})`);
        line();
    });

    separator();
    line('  Usage: /gg-config <setting> <value>');
    line();
    line('  Examples:');
    line('    /gg-config frequency 15');
    line('    /gg-config daily_skips 5');
    line('    /gg-config difficulty hard');
    line('    /gg-config enabled false');
    line();
    line('  Valid difficulty: easy, medium, hard, adaptive');
    separator();
    line(`  Data location: ${USER_DATA_DIR}`);
    bottomBorder();
    console.log('');
}

// Set a configuration value
function setConfigValue(key, value) {
    const result = setConfig(key, value);

    if (!result.success) {
        console.log(`❌ Error: ${result.error}`);
        if (result.validKeys) {
            console.log('');
            console.log(`Valid settings: ${result.validKeys.join(', ')}`);
        }
        process.exit(1);
    }

    console.log(`✅ ${result.message}`);
}

// Main
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        showConfig();
    } else if (args.length === 1) {
        console.log('❌ Error: please also specify a value');
        console.log('');
        console.log('Usage: /gg-config <setting> <value>');
        console.log(`Example: /gg-config ${args[0]} 10`);
        process.exit(1);
    } else if (args.length === 2) {
        setConfigValue(args[0], args[1]);
    } else {
        console.log('❌ Error: too many arguments');
        console.log('');
        console.log('Usage: /gg-config <setting> <value>');
        process.exit(1);
    }
}

main();
