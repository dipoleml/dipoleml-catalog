#!/bin/bash

# GitGud Installer for Cursor IDE
# This script installs GitGud for use with Cursor IDE

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "   GitGud Installer for Cursor IDE   "
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js (v14 or later) from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo -e "${YELLOW}⚠️  Node.js version is too old (v$NODE_VERSION)${NC}"
    echo "Please upgrade to Node.js v14 or later"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v) detected"

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if we're running from a GitGud repository directory
if [ -f "$SCRIPT_DIR/cursor/gitgud-hook.js" ] && [ -d "$SCRIPT_DIR/cursor/rules" ]; then
    # Running from existing GitGud directory (development or custom installation)
    GITGUD_INSTALL_DIR="$SCRIPT_DIR"
    RUNNING_FROM_REPO=true
    echo "Detected GitGud repository at: $GITGUD_INSTALL_DIR"
else
    # Standard installation - will clone from GitHub
    GITGUD_INSTALL_DIR="$HOME/.gitgud-cursor"
    RUNNING_FROM_REPO=false
fi

GITGUD_DATA_DIR="$HOME/.gitgud"
CURSOR_HOOKS_FILE="$HOME/.cursor/hooks.json"
CURSOR_RULES_DIR="$HOME/.cursor/rules"
REPO_URL="https://github.com/MissingPackage/gitgud.git"

# Step 1: Clone or update the GitGud repository (skip if running from repo)
echo ""
echo "Step 1: Installing GitGud..."

if [ "$RUNNING_FROM_REPO" = true ]; then
    echo -e "${GREEN}✓${NC} Using existing GitGud installation at $GITGUD_INSTALL_DIR"
    echo "  (Running from repository - skipping clone/update)"
else
    if [ -d "$GITGUD_INSTALL_DIR" ]; then
        echo "Updating existing GitGud installation..."
        cd "$GITGUD_INSTALL_DIR"
        git pull origin main || {
            echo -e "${YELLOW}⚠️  Could not update. Continuing with existing version.${NC}"
        }
    else
        echo "Cloning GitGud repository..."
        git clone "$REPO_URL" "$GITGUD_INSTALL_DIR" || {
            echo -e "${RED}❌ Failed to clone repository${NC}"
            echo "Please check your internet connection and try again"
            exit 1
        }
    fi
    echo -e "${GREEN}✓${NC} GitGud files installed to $GITGUD_INSTALL_DIR"
fi

# Step 2: Create data directory
echo ""
echo "Step 2: Setting up data directory..."

if [ ! -d "$GITGUD_DATA_DIR" ]; then
    mkdir -p "$GITGUD_DATA_DIR"
    echo -e "${GREEN}✓${NC} Created data directory at $GITGUD_DATA_DIR"
else
    echo -e "${GREEN}✓${NC} Data directory already exists at $GITGUD_DATA_DIR"
fi

# Step 3: Install hook
echo ""
echo "Step 3: Installing Cursor hook..."

# Create .cursor directory if it doesn't exist
mkdir -p "$(dirname "$CURSOR_HOOKS_FILE")"

# Backup existing hooks.json if it exists
if [ -f "$CURSOR_HOOKS_FILE" ]; then
    cp "$CURSOR_HOOKS_FILE" "$CURSOR_HOOKS_FILE.backup.$(date +%Y%m%d%H%M%S)"
    echo "Backed up existing hooks.json"
fi

# Merge hook configuration
if [ -f "$CURSOR_HOOKS_FILE" ]; then
    # Parse and merge with existing hooks.json
    node -e "
    const fs = require('fs');
    const path = require('path');

    let config = {};
    try {
        config = JSON.parse(fs.readFileSync('$CURSOR_HOOKS_FILE', 'utf8'));
    } catch (e) {
        config = { version: 1, hooks: {} };
    }

    if (!config.hooks) config.hooks = {};
    if (!config.hooks.beforeSubmitPrompt) config.hooks.beforeSubmitPrompt = [];

    // Check if GitGud hook already exists
    const gitgudHook = { command: 'node $GITGUD_INSTALL_DIR/cursor/gitgud-hook.js' };
    const exists = config.hooks.beforeSubmitPrompt.some(h =>
        h.command && h.command.includes('gitgud-hook.js')
    );

    if (!exists) {
        config.hooks.beforeSubmitPrompt.push(gitgudHook);
        console.log('Added GitGud hook');
    } else {
        console.log('GitGud hook already exists');
    }

    fs.writeFileSync('$CURSOR_HOOKS_FILE', JSON.stringify(config, null, 2));
    "
else
    # Create new hooks.json
    cat > "$CURSOR_HOOKS_FILE" << EOF
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      {
        "command": "node $GITGUD_INSTALL_DIR/cursor/gitgud-hook.js"
      }
    ]
  }
}
EOF
fi

echo -e "${GREEN}✓${NC} Cursor hook installed"

# Step 4: Prepare Cursor Rule Template
echo ""
echo "Step 4: Preparing Cursor Rule Template..."

# Create the .cursorrules template (without YAML frontmatter)
RULE_TEMPLATE="$GITGUD_INSTALL_DIR/cursor/rules/gitgud.cursorrules"
if [ -f "$GITGUD_INSTALL_DIR/cursor/rules/gitgud.mdc" ]; then
    # Convert .mdc to .cursorrules format by removing YAML frontmatter
    sed '/^---$/,/^---$/d' "$GITGUD_INSTALL_DIR/cursor/rules/gitgud.mdc" > "$RULE_TEMPLATE"
elif [ ! -f "$RULE_TEMPLATE" ]; then
    echo -e "${RED}❌ No rule template found${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Rule template prepared"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  IMPORTANT: Cursor Rules Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Cursor does NOT support global rules that apply automatically."
echo "You MUST manually add GitGud rules to EACH project where you want it active."
echo ""
echo "For each project, run ONE of these commands from the project root:"
echo ""
echo "  Option 1: Create new .cursorrules file"
echo -e "  ${BLUE}cp $RULE_TEMPLATE .cursorrules${NC}"
echo ""
echo "  Option 2: Append to existing .cursorrules"
echo -e "  ${BLUE}cat $RULE_TEMPLATE >> .cursorrules${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Would you like to add the rule to the CURRENT directory? [y/N]: " ADD_RULE

if [[ "$ADD_RULE" =~ ^[Yy]$ ]]; then
    if [ -f ".cursorrules" ]; then
        echo "Found existing .cursorrules file."
        read -p "Append GitGud rules to it? [y/N]: " APPEND_RULE
        if [[ "$APPEND_RULE" =~ ^[Yy]$ ]]; then
            echo "" >> .cursorrules
            echo "# ═══ GitGud Rules ═══" >> .cursorrules
            cat "$RULE_TEMPLATE" >> .cursorrules
            echo -e "${GREEN}✓${NC} GitGud rules appended to .cursorrules"
        else
            echo -e "${YELLOW}Skipped adding rules to preserve existing configuration${NC}"
        fi
    else
        cp "$RULE_TEMPLATE" .cursorrules
        echo -e "${GREEN}✓${NC} Created .cursorrules in current directory"
    fi
else
    echo -e "${YELLOW}➜ Remember to manually add rules to each project where you want GitGud!${NC}"
fi

# Step 5: Test installation
echo ""
echo "Step 5: Testing installation..."

node "$GITGUD_INSTALL_DIR/cursor/gitgud-hook.js" <<< '{"prompt":"test"}' > /dev/null 2>&1 && {
    echo -e "${GREEN}✓${NC} Hook test successful"
} || {
    echo -e "${YELLOW}⚠️  Hook test failed - please check Node.js installation${NC}"
}

# Step 6: Create command aliases
echo ""
echo "Step 6: Setting up commands..."

# Detect user's primary (login) shell and pick the right RC file.
# NOTE: This script runs under bash, so $BASH_VERSION is NOT a reliable signal of the user's shell.
detect_login_shell() {
    local user_name shell_path
    user_name="${USER:-$(id -un 2>/dev/null || echo '')}"
    shell_path=""

    if command -v getent >/dev/null 2>&1 && [ -n "$user_name" ]; then
        shell_path="$(getent passwd "$user_name" 2>/dev/null | cut -d: -f7)"
    fi

    # macOS fallback
    if [ -z "$shell_path" ] && command -v dscl >/dev/null 2>&1 && [ -n "$user_name" ]; then
        shell_path="$(dscl . -read "/Users/$user_name" UserShell 2>/dev/null | awk '{print $2}')"
    fi

    # Environment fallback
    if [ -z "$shell_path" ]; then
        shell_path="${SHELL:-}"
    fi

    echo "$shell_path"
}

shell_rc_for_shell() {
    local shell_name
    shell_name="$(basename "${1:-}")"
    case "$shell_name" in
        zsh)  echo "$HOME/.zshrc" ;;
        bash) echo "$HOME/.bashrc" ;;
        fish) echo "$HOME/.config/fish/config.fish" ;;
        *)    echo "$HOME/.profile" ;;
    esac
}

PRIMARY_SHELL_PATH="${GITGUD_SHELL:-$(detect_login_shell)}"
DEFAULT_SHELL_RC="$(shell_rc_for_shell "$PRIMARY_SHELL_PATH")"
SHELL_RC="${GITGUD_SHELL_RC:-$DEFAULT_SHELL_RC}"

PRIMARY_SHELL_NAME="$(basename "${PRIMARY_SHELL_PATH:-unknown}")"

echo "Detected primary shell: ${PRIMARY_SHELL_NAME} (${PRIMARY_SHELL_PATH:-unknown})"
echo "Will update: $SHELL_RC"
echo "Tip: override with GITGUD_SHELL_RC=/path/to/rc ./install-cursor.sh"
echo "Would you like to add GitGud commands to your shell?"
read -p "Add commands? [y/N]: " ADD_COMMANDS

if [[ "$ADD_COMMANDS" =~ ^[Yy]$ ]]; then
    # Ensure RC file exists
    mkdir -p "$(dirname "$SHELL_RC")" 2>/dev/null || true
    touch "$SHELL_RC" 2>/dev/null || true

    # Remove old aliases if they exist
    sed -i.bak '/# GitGud commands for Cursor/,/# End GitGud commands/d' "$SHELL_RC" 2>/dev/null || true

    # Add new aliases
    if [ "$PRIMARY_SHELL_NAME" = "fish" ]; then
        cat >> "$SHELL_RC" << EOF

# GitGud commands for Cursor
alias gg-complete "node $GITGUD_INSTALL_DIR/scripts/complete-task.js"
alias gg-stats "node $GITGUD_INSTALL_DIR/scripts/stats.js"
alias gg-config "node $GITGUD_INSTALL_DIR/scripts/config.js"
alias gg-reset "node $GITGUD_INSTALL_DIR/scripts/reset.js"
# End GitGud commands
EOF
    else
        cat >> "$SHELL_RC" << EOF

# GitGud commands for Cursor
alias gg-complete="node $GITGUD_INSTALL_DIR/scripts/complete-task.js"
alias gg-stats="node $GITGUD_INSTALL_DIR/scripts/stats.js"
alias gg-config="node $GITGUD_INSTALL_DIR/scripts/config.js"
alias gg-reset="node $GITGUD_INSTALL_DIR/scripts/reset.js"
# End GitGud commands
EOF
    fi

    echo -e "${GREEN}✓${NC} Commands added to $SHELL_RC"
    echo "Run 'source $SHELL_RC' or restart your terminal to use them"
else
    echo "You can manually run commands from: $GITGUD_INSTALL_DIR/scripts/"
fi

# Done!
echo ""
echo "======================================"
echo -e "${GREEN}✓ GitGud installation complete!${NC}"
echo "======================================"
echo ""
echo "Available commands:"
echo "  gg-complete - Mark current task as complete"
echo "  gg-stats    - View your statistics"
echo "  gg-config   - Configure GitGud settings"
echo "  gg-reset    - Reset data (use with caution)"
echo ""
echo "GitGud will assign a coding task every 10 requests."
echo "Complete tasks to maintain your streak!"
echo ""
echo -e "${YELLOW}⚠️  REMINDER: GitGud rules must be added to EACH project!${NC}"
echo "To verify setup in any project, run:"
echo -e "  ${BLUE}node $GITGUD_INSTALL_DIR/cursor/validate-cursor.js${NC}"
echo ""
echo "To uninstall, run: $GITGUD_INSTALL_DIR/uninstall-cursor.sh"
