#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Crawl4AI Connection Debug Script ===${NC}"
echo -e "${BLUE}This script will help debug connection issues between the backend and Crawl4AI containers${NC}"

# Check if Docker is running
echo -e "\n${BLUE}Checking if Docker is running...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}Docker is running.${NC}"

# Check if the containers are running
echo -e "\n${BLUE}Checking if the required containers are running...${NC}"
BACKEND_RUNNING=$(docker ps -q -f name=devdocs-backend)
CRAWL4AI_RUNNING=$(docker ps -q -f name=devdocs-crawl4ai)

if [ -z "$BACKEND_RUNNING" ]; then
    echo -e "${RED}Backend container is not running.${NC}"
    exit 1
else
    echo -e "${GREEN}Backend container is running.${NC}"
fi

if [ -z "$CRAWL4AI_RUNNING" ]; then
    echo -e "${RED}Crawl4AI container is not running.${NC}"
    exit 1
else
    echo -e "${GREEN}Crawl4AI container is running.${NC}"
fi

# Get the container IPs
echo -e "\n${BLUE}Getting container IPs...${NC}"
BACKEND_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' devdocs-backend)
CRAWL4AI_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' devdocs-crawl4ai)

echo -e "Backend IP: ${GREEN}${BACKEND_IP}${NC}"
echo -e "Crawl4AI IP: ${GREEN}${CRAWL4AI_IP}${NC}"

# Check if the containers can ping each other
echo -e "\n${BLUE}Testing if backend can ping Crawl4AI...${NC}"
docker exec devdocs-backend ping -c 3 crawl4ai

# Check if the backend can reach the Crawl4AI API
echo -e "\n${BLUE}Testing if backend can reach Crawl4AI API...${NC}"
docker exec devdocs-backend curl -s -o /dev/null -w "%{http_code}" http://crawl4ai:11235/health

# Get the Crawl4AI API token from the environment
echo -e "\n${BLUE}Getting Crawl4AI API token from environment...${NC}"
API_TOKEN=$(docker exec devdocs-backend bash -c 'echo $CRAWL4AI_API_TOKEN')
echo -e "API Token: ${GREEN}${API_TOKEN}${NC}"

# Test a simple crawl request
echo -e "\n${BLUE}Testing a simple crawl request from backend to Crawl4AI...${NC}"
docker exec devdocs-backend curl -X POST \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"urls": "https://example.com"}' \
    http://crawl4ai:11235/crawl

# Check the logs
echo -e "\n${BLUE}Checking backend logs for Crawl4AI-related messages...${NC}"
docker logs devdocs-backend | grep -i crawl4ai | tail -n 20

echo -e "\n${BLUE}Checking Crawl4AI logs...${NC}"
docker logs devdocs-crawl4ai | tail -n 20

echo -e "\n${GREEN}Debug complete.${NC}"
echo -e "${BLUE}If all tests passed, the backend should be able to communicate with Crawl4AI.${NC}"
echo -e "${BLUE}If any tests failed, check the network configuration and container settings.${NC}"