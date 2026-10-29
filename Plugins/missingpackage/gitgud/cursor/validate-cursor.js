#!/usr/bin/env node
/**
 * Validates GitGud setup for Cursor IDE
 * Checks if all components are properly installed and configured
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const NC = '\x1b[0m'; // No Color

/**
 * Validates if a path exists and is accessible
 * @param {string} filePath - Path to validate
 * @param {string} description - Description for output
 * @returns {boolean} - True if valid
 */
function validatePath(filePath, description) {
    try {
        if (fs.existsSync(filePath)) {
            console.log(`${GREEN}✓${NC} ${description}: ${filePath}`);
            return true;
        } else {
            console.log(`${RED}✗${NC} ${description}: Not found at ${filePath}`);
            return false;
        }
    } catch (e) {
        console.log(`${RED}✗${NC} ${description}: Cannot access ${filePath}`);
        return false;
    }
}

/**
 * Validates JSON file structure
 * @param {string} filePath - Path to JSON file
 * @param {string} description - Description for output
 * @param {Function} validator - Validation function
 * @returns {boolean} - True if valid
 */
function validateJson(filePath, description, validator) {
    if (!fs.existsSync(filePath)) {
        console.log(`${RED}✗${NC} ${description}: File not found`);
        return false;
    }

    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (validator(content)) {
            console.log(`${GREEN}✓${NC} ${description}: Valid`);
            return true;
        } else {
            console.log(`${RED}✗${NC} ${description}: Invalid structure`);
            return false;
        }
    } catch (e) {
        console.log(`${RED}✗${NC} ${description}: Invalid JSON - ${e.message}`);
        return false;
    }
}

/**
 * Validates hook configuration
 * @param {Object} hooks - Hooks configuration object
 * @returns {boolean} - True if GitGud hook is present
 */
function validateHooks(hooks) {
    if (!hooks.hooks || !hooks.hooks.beforeSubmitPrompt) {
        return false;
    }

    return hooks.hooks.beforeSubmitPrompt.some(hook =>
        hook.command && hook.command.includes('gitgud-hook.js')
    );
}

/**
 * Checks if current directory has Cursor rules configured
 * @returns {Object} - Validation result
 */
function validateProjectRules() {
    const cwd = process.cwd();
    const possiblePaths = [
        path.join(cwd, '.cursorrules'),
        path.join(cwd, '.cursor', 'rules', 'gitgud.mdc'),
        path.join(cwd, '.cursor', 'rules', 'gitgud.cursorrules')
    ];

    for (const rulePath of possiblePaths) {
        if (fs.existsSync(rulePath)) {
            const content = fs.readFileSync(rulePath, 'utf8');
            if (content.includes('GitGud') || content.includes('pending_task')) {
                return {
                    valid: true,
                    path: rulePath,
                    message: `Found GitGud rules at: ${rulePath}`
                };
            }
        }
    }

    return {
        valid: false,
        message: 'No GitGud rules found in current project'
    };
}

/**
 * Detect GitGud installation directory
 * @returns {string} - Path to GitGud installation
 */
function detectInstallDir() {
    // Check if we're running from a repo directory
    const scriptDir = __dirname;
    const parentDir = path.dirname(scriptDir);

    if (fs.existsSync(path.join(parentDir, 'cursor', 'gitgud-hook.js'))) {
        // Running from repo
        return parentDir;
    }

    // Check standard location
    const standardDir = path.join(os.homedir(), '.gitgud-cursor');
    if (fs.existsSync(standardDir)) {
        return standardDir;
    }

    // Try to extract from hooks.json
    const hooksFile = path.join(os.homedir(), '.cursor', 'hooks.json');
    if (fs.existsSync(hooksFile)) {
        try {
            const hooks = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
            if (hooks.hooks && hooks.hooks.beforeSubmitPrompt) {
                const gitgudHook = hooks.hooks.beforeSubmitPrompt.find(h =>
                    h.command && h.command.includes('gitgud-hook.js')
                );
                if (gitgudHook) {
                    // Extract path from command
                    const match = gitgudHook.command.match(/node\s+(.+)\/cursor\/gitgud-hook\.js/);
                    if (match) {
                        return match[1];
                    }
                }
            }
        } catch (e) {}
    }

    return null;
}

/**
 * Main validation function
 */
function main() {
    console.log('\n====================================');
    console.log('   GitGud Cursor Setup Validator   ');
    console.log('====================================\n');

    let allValid = true;

    // 1. Check installation directory
    console.log(`${BLUE}1. Installation Directory${NC}`);
    const installDir = detectInstallDir();

    if (installDir) {
        console.log(`${GREEN}✓${NC} GitGud installation: ${installDir}`);
    } else {
        console.log(`${RED}✗${NC} GitGud installation: Not found`);
        console.log(`  Expected locations:`);
        console.log(`  - ${path.join(os.homedir(), '.gitgud-cursor')}`);
        console.log(`  - Or run from GitGud repository`);
        allValid = false;
    }
    console.log();

    // 2. Check data directory
    console.log(`${BLUE}2. Data Directory${NC}`);
    const dataDir = path.join(os.homedir(), '.gitgud');
    allValid = validatePath(dataDir, 'GitGud data') && allValid;
    console.log();

    // 3. Check hook configuration
    console.log(`${BLUE}3. Cursor Hook Configuration${NC}`);
    const hooksFile = path.join(os.homedir(), '.cursor', 'hooks.json');
    allValid = validateJson(hooksFile, 'Cursor hooks', validateHooks) && allValid;
    console.log();

    // 4. Check hook script
    console.log(`${BLUE}4. Hook Script${NC}`);
    if (installDir) {
        const hookScript = path.join(installDir, 'cursor', 'gitgud-hook.js');
        allValid = validatePath(hookScript, 'GitGud hook script') && allValid;
    } else {
        console.log(`${RED}✗${NC} Cannot check hook script - no installation found`);
        allValid = false;
    }
    console.log();

    // 5. Check for pending task
    console.log(`${BLUE}5. Task Status${NC}`);
    const pendingTaskFile = path.join(dataDir, 'pending_task');
    if (fs.existsSync(pendingTaskFile)) {
        const task = fs.readFileSync(pendingTaskFile, 'utf8').trim();
        console.log(`${YELLOW}⚠${NC} Pending task found:`);
        console.log(`  ${task}`);
    } else {
        console.log(`${GREEN}✓${NC} No pending task`);
    }

    const counterFile = path.join(dataDir, 'request_counter');
    if (fs.existsSync(counterFile)) {
        const counter = parseInt(fs.readFileSync(counterFile, 'utf8').trim()) || 0;
        const configFile = path.join(dataDir, 'config.json');
        let frequency = 10; // default
        if (fs.existsSync(configFile)) {
            try {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
                frequency = config.frequency || 10;
            } catch (e) {}
        }
        const nextIn = frequency - (counter % frequency);
        console.log(`  Request counter: ${counter}`);
        console.log(`  Next task in: ${nextIn} requests`);
    }
    console.log();

    // 6. Check project rules
    console.log(`${BLUE}6. Project Rules (Current Directory)${NC}`);
    const rulesResult = validateProjectRules();
    if (rulesResult.valid) {
        console.log(`${GREEN}✓${NC} ${rulesResult.message}`);
    } else {
        console.log(`${YELLOW}⚠${NC} ${rulesResult.message}`);
        if (installDir) {
            console.log(`  To fix: Copy rules to your project:`);
            console.log(`  ${BLUE}cp ${path.join(installDir, 'cursor', 'rules', 'gitgud.cursorrules')} .cursorrules${NC}`);
        }
        allValid = false;
    }
    console.log();

    // 7. Check rule template exists
    console.log(`${BLUE}7. Rule Template${NC}`);
    if (installDir) {
        const ruleTemplate = path.join(installDir, 'cursor', 'rules', 'gitgud.cursorrules');
        if (!fs.existsSync(ruleTemplate)) {
            // Try .mdc format
            const mdcTemplate = path.join(installDir, 'cursor', 'rules', 'gitgud.mdc');
            if (fs.existsSync(mdcTemplate)) {
                console.log(`${YELLOW}⚠${NC} Rule template found but in .mdc format`);
                console.log(`  Converting to .cursorrules format...`);

                // Convert .mdc to .cursorrules
                let content = fs.readFileSync(mdcTemplate, 'utf8');
                // Remove YAML frontmatter if present
                content = content.replace(/^---[\s\S]*?---\n*/m, '');

                const cursorrulePath = path.join(installDir, 'cursor', 'rules', 'gitgud.cursorrules');
                fs.writeFileSync(cursorrulePath, content);
                console.log(`${GREEN}✓${NC} Created .cursorrules template`);
            } else {
                console.log(`${RED}✗${NC} No rule template found`);
                allValid = false;
            }
        } else {
            console.log(`${GREEN}✓${NC} Rule template available`);
        }
    } else {
        console.log(`${RED}✗${NC} Cannot check rule template - no installation found`);
        allValid = false;
    }
    console.log();

    // Summary
    console.log('====================================');
    if (allValid) {
        console.log(`${GREEN}✓ All checks passed!${NC}`);
        console.log('\nGitGud is properly configured for Cursor.');
        console.log('Remember to copy the rules to each project where you want GitGud active.');
    } else {
        console.log(`${YELLOW}⚠ Some issues found${NC}`);
        console.log('\nPlease address the issues above for GitGud to work properly.');
        console.log('You may need to re-run the installer or manually fix the configuration.');
    }
    console.log('====================================\n');

    process.exit(allValid ? 0 : 1);
}

// Run validation
main();