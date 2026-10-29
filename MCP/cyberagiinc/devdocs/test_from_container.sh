#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing Crawl4AI connectivity from backend container...${NC}"

# Copy the test script to the backend container
echo -e "${BLUE}Copying test script to backend container...${NC}"
docker cp test_crawl4ai.py devdocs-backend:/app/test_crawl4ai.py

# Run the test script inside the backend container
echo -e "${BLUE}Running test script inside backend container...${NC}"
docker exec -it devdocs-backend python /app/test_crawl4ai.py

echo -e "${BLUE}Test complete.${NC}"