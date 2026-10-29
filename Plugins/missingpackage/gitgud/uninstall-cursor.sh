#!/bin/bash

# GitGud Uninstaller for Cursor IDE
# This script removes GitGud from Cursor IDE

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "  GitGud Uninstaller for Cursor IDE  "
echo "======================================"
echo ""

# Define paths
GITGUD_INSTALL_DIR="$HOME/.gitgud-cursor"
GITGUD_DATA_DIR="$HOME/.gitgud"
CURSOR_HOOKS_FILE="$HOME/.cursor/hooks.json"
CURSOR_RULES_DIR="$HOME/.cursor/rules"

# Step 1: Remove hook from Cursor
echo "Step 1: Removing Cursor hook..."

if [ -f "$CURSOR_HOOKS_FILE" ]; then
    # Remove GitGud hook from hooks.json
    node -e "
    const fs = require('fs');

    try {
        const config = JSON.parse(fs.readFileSync('$CURSOR_HOOKS_FILE', 'utf8'));

        if (config.hooks && config.hooks.beforeSubmitPrompt) {
            config.hooks.beforeSubmitPrompt = config.hooks.beforeSubmitPrompt.filter(h =>
                !h.command || !h.command.includes('gitgud-hook.js')
            );

            fs.writeFileSync('$CURSOR_HOOKS_FILE', JSON.stringify(config, null, 2));
            console.log('Removed GitGud hook from hooks.json');
        }
    } catch (e) {
        console.error('Could not remove hook:', e.message);
    }
    "
else
    echo "No hooks.json found"
fi

echo -e "${GREEN}✓${NC} Hook removal complete"

# Step 2: Remove Cursor Rule
echo ""
echo "Step 2: Removing Cursor Rules..."

# Remove global rule
if [ -f "$CURSOR_RULES_DIR/gitgud.mdc" ]; then
    rm "$CURSOR_RULES_DIR/gitgud.mdc"
    echo -e "${GREEN}✓${NC} Removed global rule"
fi

# Check for project rule
if [ -f ".cursor/rules/gitgud.mdc" ]; then
    echo "Found project-specific rule in current directory"
    read -p "Remove project rule? [y/N]: " REMOVE_PROJECT
    if [[ "$REMOVE_PROJECT" =~ ^[Yy]$ ]]; then
        rm ".cursor/rules/gitgud.mdc"
        echo -e "${GREEN}✓${NC} Removed project rule"
    fi
fi

# Step 3: Remove shell aliases
echo ""
echo "Step 3: Removing shell aliases..."

# In multi-shell setups the installer may have touched a different RC file than
# the shell running this script. We remove the block from a set of common RC files.
remove_block_from_file() {
    local file="$1"
    if [ -f "$file" ]; then
        sed -i.bak '/# GitGud commands for Cursor/,/# End GitGud commands/d' "$file" 2>/dev/null && {
            echo -e "${GREEN}✓${NC} Removed commands from $file"
            return 0
        } || {
            return 1
        }
    fi
    return 1
}

RC_CANDIDATES=(
    "${GITGUD_SHELL_RC:-}"
    "$HOME/.zshrc"
    "$HOME/.bashrc"
    "$HOME/.profile"
    "$HOME/.config/fish/config.fish"
)

found_any=0
for rc in "${RC_CANDIDATES[@]}"; do
    [ -n "$rc" ] || continue
    if remove_block_from_file "$rc"; then
        found_any=1
    fi
done

if [ "$found_any" -eq 0 ]; then
    echo "No GitGud commands block found in common shell RC files."
fi

# Step 4: Ask about data
echo ""
echo "Step 4: Data management..."
echo ""
echo -e "${YELLOW}Your GitGud data is stored in: $GITGUD_DATA_DIR${NC}"
echo "This includes your streak, achievements, and statistics."
echo ""
read -p "Do you want to DELETE all GitGud data? [y/N]: " DELETE_DATA

if [[ "$DELETE_DATA" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Warning: This will permanently delete all your GitGud progress!${NC}"
    read -p "Are you sure? Type 'DELETE' to confirm: " CONFIRM

    if [ "$CONFIRM" = "DELETE" ]; then
        rm -rf "$GITGUD_DATA_DIR"
        echo -e "${GREEN}✓${NC} Deleted all GitGud data"
    else
        echo "Data deletion cancelled"
    fi
else
    echo "Your data has been preserved in $GITGUD_DATA_DIR"
    echo "You can manually delete it later if needed"
fi

# Step 5: Remove installation directory
echo ""
echo "Step 5: Removing GitGud installation..."

if [ -d "$GITGUD_INSTALL_DIR" ]; then
    rm -rf "$GITGUD_INSTALL_DIR"
    echo -e "${GREEN}✓${NC} Removed GitGud installation directory"
else
    echo "Installation directory not found"
fi

# Done!
echo ""
echo "======================================"
echo -e "${GREEN}✓ GitGud has been uninstalled${NC}"
echo "======================================"
echo ""

if [ -d "$GITGUD_DATA_DIR" ]; then
    echo "Note: Your data is still available in $GITGUD_DATA_DIR"
    echo "You can reinstall GitGud later to continue your streak!"
fi

echo ""
echo "Thanks for using GitGud! Keep coding! 💪"