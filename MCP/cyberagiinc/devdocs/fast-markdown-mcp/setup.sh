#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Fast Markdown MCP Server and DevDocs dependencies...${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Check if python3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}python3 is not installed. Please install Python 3 first.${NC}"
    exit 1
fi

# Store the root directory path
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo -e "${BLUE}Project root directory: ${ROOT_DIR}${NC}"

# Go to project root directory (DevDocs)
cd "$ROOT_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found in ${ROOT_DIR}${NC}"
    exit 1
fi

# Install npm dependencies
echo -e "${BLUE}Installing npm dependencies...${NC}"
npm install

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo -e "${RED}Error: backend directory not found in ${ROOT_DIR}${NC}"
    exit 1
fi

# Install Python backend dependencies
echo -e "${BLUE}Installing Python backend dependencies...${NC}"
if [ -f "backend/requirements.txt" ]; then
    cd backend
    pip install -r requirements.txt
    cd "$ROOT_DIR"
else
    echo -e "${RED}Error: requirements.txt not found in backend directory${NC}"
    exit 1
fi

# Create virtual environment for MCP server if it doesn't exist
cd "fast-markdown-mcp"
if [ ! -d "venv" ]; then
    echo -e "${BLUE}Creating virtual environment for MCP server...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install MCP server dependencies
echo -e "${BLUE}Installing MCP server dependencies...${NC}"
pip install -e .

# Create markdown storage directory if it doesn't exist
STORAGE_DIR="$ROOT_DIR/storage/markdown"
if [ ! -d "$STORAGE_DIR" ]; then
    echo -e "${BLUE}Creating markdown storage directory...${NC}"
    mkdir -p "$STORAGE_DIR"
fi

# Get the absolute path of the storage directory
STORAGE_PATH="$STORAGE_DIR"

# Create or update Claude Desktop config
CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

mkdir -p "$CONFIG_DIR"

# Create or update config file
if [ -f "$CONFIG_FILE" ]; then
    # Backup existing config
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
fi

# Get absolute path to the Python executable in the virtual environment
VENV_PYTHON="$(pwd)/venv/bin/python"

# Create new config with our server
cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "fast-markdown": {
      "command": "${VENV_PYTHON}",
      "args": [
        "-m", "fast_markdown_mcp.server",
        "${STORAGE_PATH}"
      ],
      "env": {
        "PYTHONPATH": "$(pwd)/src"
      }
    }
  }
}
EOF

# Make start script executable
cd "$ROOT_DIR"
if [ -f "start.sh" ]; then
    chmod +x start.sh
else
    echo -e "${RED}Warning: start.sh not found in ${ROOT_DIR}${NC}"
fi

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${BLUE}Installed:${NC}"
echo "- npm dependencies"
echo "- Python backend dependencies"
echo "- MCP server dependencies"
echo -e "${BLUE}Configured:${NC}"
echo "- Markdown storage directory: $STORAGE_PATH"
echo "- Claude Desktop config: $CONFIG_FILE"
echo -e "${BLUE}Next steps:${NC}"
echo "1. Start all services with: ${GREEN}./start.sh${NC}"
echo "2. Restart Claude Desktop"
echo -e "${GREEN}Your DevDocs environment is ready!${NC}"
echo -e "${BLUE}The start script will:${NC}"
echo "- Start the Next.js frontend (http://localhost:3000)"
echo "- Start the FastAPI backend (http://localhost:24125)"
echo "- Start the MCP server"
echo "- Open the application in your default browser"
echo "- Log all output to the ./logs directory"
echo -e "${BLUE}To stop all services, press Ctrl+C${NC}"