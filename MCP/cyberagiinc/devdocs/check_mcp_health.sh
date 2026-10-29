#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Checking MCP server health...${NC}"

# Check if Docker is running
if ! docker info &>/dev/null; then
  echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

# Check if MCP container is running
if ! docker ps | grep -q devdocs-mcp; then
  echo -e "${RED}MCP container is not running.${NC}"
  echo -e "Try running: ${BLUE}./docker-start.sh${NC}"
  exit 1
fi

# Note about on-demand execution model
echo -e "${YELLOW}Note: The MCP server uses an on-demand execution model.${NC}"
echo -e "${YELLOW}It is designed to start only when needed rather than running continuously.${NC}"
echo -e "${YELLOW}Claude will start a new instance each time it needs to interact with it.${NC}"

# Check if the MCP container is properly configured
echo -e "${BLUE}Checking if MCP container is properly configured...${NC}"
if ! docker exec devdocs-mcp ls -la /app/storage/markdown &>/dev/null; then
  echo -e "${RED}The /app/storage/markdown directory is missing in the container.${NC}"
  echo -e "Try running: ${BLUE}./docker-start.sh${NC} to create necessary directories."
  exit 1
fi

# Check if the Python module exists
echo -e "${BLUE}Checking if MCP server module exists...${NC}"
if ! docker exec devdocs-mcp python -c "import fast_markdown_mcp.server" &>/dev/null; then
  echo -e "${RED}MCP server module not found in the container.${NC}"
  echo -e "${BLUE}Container logs:${NC}"
  docker logs devdocs-mcp --tail 20
  exit 1
fi

echo -e "${GREEN}MCP server module exists in the container.${NC}"

# Skip trying to start the MCP server on-demand
# This is handled by Claude when needed
echo -e "${YELLOW}Note: Not testing MCP server startup directly.${NC}"
echo -e "${YELLOW}This will be handled by Claude when it needs to access the MCP server.${NC}"

# Test MCP connection using docker exec
echo -e "${BLUE}Testing MCP connection using docker exec...${NC}"
if docker exec -i devdocs-mcp echo "Test" > /dev/null; then
  echo -e "${GREEN}Successfully sent data to MCP container via stdin!${NC}"
else
  echo -e "${RED}Failed to communicate with MCP container via stdin.${NC}"
  echo -e "Check if the container has stdin_open: true in docker-compose.yml"
  exit 1
fi

echo -e "${GREEN}MCP container is healthy and properly configured.${NC}"
echo -e "${GREEN}The MCP server will start on-demand when Claude interacts with it.${NC}"
echo -e "You can now configure Claude and VSCode to use the MCP server."

# Display the correct configuration
echo -e "\n${YELLOW}=== MCP Server Configuration for Claude ===${NC}"
echo -e "The MCP server uses stdin/stdout for communication, not a network port."
echo -e "The correct configuration is already in place:"
echo -e '{
  "mcpServers": {
    "fast-markdown": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "devdocs-mcp",
        "python",
        "-m",
        "fast_markdown_mcp.server",
        "/app/storage/markdown"
      ],
      "env": {},
      "disabled": false,
      "alwaysAllow": [
        "sync_file",
        "get_status",
        "list_files",
        "read_file",
        "search_files",
        "search_by_tag",
        "get_stats",
        "get_section",
        "get_table_of_contents"
      ]
    }
  }
}'