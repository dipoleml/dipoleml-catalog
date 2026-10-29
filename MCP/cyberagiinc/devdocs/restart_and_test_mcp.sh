#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Restarting Docker containers with new MCP configuration...${NC}"

# Stop existing containers
echo -e "${BLUE}Stopping existing containers...${NC}"
docker-compose down

# Start containers with the new configuration
echo -e "${BLUE}Starting containers with new configuration...${NC}"
docker-compose up -d --build

# Wait for containers to start
echo -e "${BLUE}Waiting for containers to start...${NC}"
sleep 10

# Check if MCP container is running
echo -e "${BLUE}Checking if MCP container is running...${NC}"
if ! docker ps | grep -q devdocs-mcp; then
  echo -e "${RED}MCP container is not running.${NC}"
  echo -e "Check docker logs:"
  docker-compose logs mcp
  exit 1
fi

echo -e "${GREEN}MCP container is running.${NC}"

# Note about on-demand execution model
echo -e "\n${YELLOW}=== MCP Server On-Demand Execution Model ===${NC}"
echo -e "${YELLOW}The MCP server uses an on-demand execution model by design.${NC}"
echo -e "${YELLOW}It is not expected to run continuously inside the container.${NC}"
echo -e "${YELLOW}Instead, Claude will start a new instance each time it needs to interact with it.${NC}"
echo -e "${YELLOW}This is more efficient as it only consumes resources when needed.${NC}"

# Run the health check script
echo -e "\n${BLUE}Running MCP health check...${NC}"
./check_mcp_health.sh

# Display instructions for testing
echo -e "\n${YELLOW}=== Testing MCP Server with Claude ===${NC}"
echo -e "1. The MCP settings file is already correctly configured:"
echo -e "   ${BLUE}~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json${NC}"
echo -e "   or"
echo -e "   ${BLUE}~/Library/Application Support/Claude/claude_desktop_config.json${NC}"

echo -e "\n${BLUE}2. Restart Claude or VSCode to apply any changes${NC}"
echo -e "${BLUE}3. Test the MCP connection in Claude by asking it to list markdown files:${NC}"
echo -e "   ${GREEN}\"List all markdown files available in the MCP server\"${NC}"
echo -e "\n${YELLOW}Note: Each time Claude interacts with the MCP server, it will start a new instance.${NC}"
echo -e "${YELLOW}This is normal and by design. The health check will not show a continuously running process.${NC}"