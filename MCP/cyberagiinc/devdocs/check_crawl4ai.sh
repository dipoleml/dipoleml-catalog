#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Checking Crawl4AI container status...${NC}"

# Check if the container is running
CONTAINER_ID=$(docker ps -q -f name=devdocs-crawl4ai)
if [ -z "$CONTAINER_ID" ]; then
    echo -e "${RED}Crawl4AI container is not running!${NC}"
    
    # Check if the container exists but is stopped
    STOPPED_CONTAINER=$(docker ps -a -q -f name=devdocs-crawl4ai)
    if [ -n "$STOPPED_CONTAINER" ]; then
        echo -e "${BLUE}Found stopped Crawl4AI container. Starting it...${NC}"
        docker start devdocs-crawl4ai
        sleep 5
        
        # Check if it's running now
        CONTAINER_ID=$(docker ps -q -f name=devdocs-crawl4ai)
        if [ -z "$CONTAINER_ID" ]; then
            echo -e "${RED}Failed to start Crawl4AI container!${NC}"
            exit 1
        else
            echo -e "${GREEN}Successfully started Crawl4AI container.${NC}"
        fi
    else
        echo -e "${RED}Crawl4AI container does not exist. Please run docker-compose up -d${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Crawl4AI container is running with ID: ${CONTAINER_ID}${NC}"

# Get container IP address
CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' devdocs-crawl4ai)
echo -e "${BLUE}Crawl4AI container IP: ${CONTAINER_IP}${NC}"

# Check if the container is accessible from the host
echo -e "${BLUE}Testing connection to Crawl4AI container...${NC}"
curl -s -o /dev/null -w "%{http_code}" http://localhost:11235/health > /dev/null
HOST_CURL_STATUS=$?

if [ $HOST_CURL_STATUS -eq 0 ]; then
    echo -e "${GREEN}Crawl4AI container is accessible from host via localhost:11235${NC}"
else
    echo -e "${RED}Cannot access Crawl4AI container from host via localhost:11235${NC}"
    echo -e "${BLUE}Testing connection using container IP...${NC}"
    
    curl -s -o /dev/null -w "%{http_code}" http://${CONTAINER_IP}:11235/health > /dev/null
    IP_CURL_STATUS=$?
    
    if [ $IP_CURL_STATUS -eq 0 ]; then
        echo -e "${GREEN}Crawl4AI container is accessible via container IP: ${CONTAINER_IP}:11235${NC}"
    else
        echo -e "${RED}Cannot access Crawl4AI container via IP: ${CONTAINER_IP}:11235${NC}"
    fi
fi

# Check if the backend container can access the Crawl4AI container
echo -e "${BLUE}Testing connection from backend container to Crawl4AI container...${NC}"
docker exec devdocs-backend curl -s -o /dev/null -w "%{http_code}" http://crawl4ai:11235/health > /dev/null
BACKEND_CURL_STATUS=$?

if [ $BACKEND_CURL_STATUS -eq 0 ]; then
    echo -e "${GREEN}Backend container can access Crawl4AI container via crawl4ai:11235${NC}"
else
    echo -e "${RED}Backend container cannot access Crawl4AI container via crawl4ai:11235${NC}"
    
    # Try using the container IP
    docker exec devdocs-backend curl -s -o /dev/null -w "%{http_code}" http://${CONTAINER_IP}:11235/health > /dev/null
    BACKEND_IP_CURL_STATUS=$?
    
    if [ $BACKEND_IP_CURL_STATUS -eq 0 ]; then
        echo -e "${GREEN}Backend container can access Crawl4AI container via ${CONTAINER_IP}:11235${NC}"
        echo -e "${BLUE}Updating CRAWL4AI_URL environment variable in backend container...${NC}"
        
        docker exec -it devdocs-backend bash -c "export CRAWL4AI_URL=http://${CONTAINER_IP}:11235"
        echo -e "${GREEN}Updated CRAWL4AI_URL in backend container${NC}"
    else
        echo -e "${RED}Backend container cannot access Crawl4AI container via any method!${NC}"
    fi
fi

# Check Docker network
echo -e "${BLUE}Checking Docker network...${NC}"
docker network inspect devdocs-network

echo -e "${BLUE}Test complete.${NC}"