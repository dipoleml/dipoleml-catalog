#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if a task ID is provided
if [ -z "$1" ]; then
    echo -e "${RED}Please provide a task ID as an argument${NC}"
    echo -e "Usage: ./view_result.sh <task_id>"
    
    # List available results
    echo -e "\n${BLUE}Available results:${NC}"
    if [ -d "crawl_results" ]; then
        for file in crawl_results/*.json; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                task_id="${filename%.json}"
                echo -e "  ${GREEN}$task_id${NC}"
            fi
        done
    else
        echo -e "  ${RED}No results found${NC}"
    fi
    exit 1
fi

TASK_ID=$1
JSON_FILE="crawl_results/${TASK_ID}.json"
MD_FILE="crawl_results/${TASK_ID}.md"

# Check if the JSON file exists
if [ ! -f "$JSON_FILE" ]; then
    echo -e "${RED}Result file not found: $JSON_FILE${NC}"
    exit 1
fi

# Display basic information
echo -e "${BLUE}Task ID: ${GREEN}$TASK_ID${NC}"

# Extract and display information from the JSON file
if command -v jq &> /dev/null; then
    # If jq is available, use it to parse the JSON
    echo -e "\n${BLUE}Title:${NC} $(jq -r '.title // "No title"' "$JSON_FILE")"
    echo -e "${BLUE}URL:${NC} $(jq -r '.url // "No URL"' "$JSON_FILE")"
    
    # Count links
    INTERNAL_LINKS=$(jq -r '.links.internal | length // 0' "$JSON_FILE")
    EXTERNAL_LINKS=$(jq -r '.links.external | length // 0' "$JSON_FILE")
    echo -e "${BLUE}Links:${NC} $INTERNAL_LINKS internal, $EXTERNAL_LINKS external"
    
    # Show some internal links
    if [ "$INTERNAL_LINKS" -gt 0 ]; then
        echo -e "\n${BLUE}Some internal links:${NC}"
        jq -r '.links.internal[0:5] | .[] | "  - " + .text + " (" + .href + ")"' "$JSON_FILE"
        if [ "$INTERNAL_LINKS" -gt 5 ]; then
            echo -e "  ${BLUE}...and $(($INTERNAL_LINKS - 5)) more${NC}"
        fi
    fi
else
    # If jq is not available, use grep to extract some information
    echo -e "\n${BLUE}Basic information:${NC}"
    echo -e "  ${RED}Install jq for better JSON parsing${NC}"
    grep -o '"title":"[^"]*"' "$JSON_FILE" | head -1 | sed 's/"title":"//;s/"//'
fi

# Check if the markdown file exists
if [ -f "$MD_FILE" ]; then
    echo -e "\n${BLUE}Markdown content preview:${NC}"
    head -n 20 "$MD_FILE"
    echo -e "\n${BLUE}...${NC}"
    echo -e "${GREEN}Full markdown content available in: $MD_FILE${NC}"
else
    echo -e "\n${RED}Markdown file not found: $MD_FILE${NC}"
fi

# Provide options for viewing the full content
echo -e "\n${BLUE}Options for viewing the full content:${NC}"
echo -e "  1. ${GREEN}View JSON:${NC} cat $JSON_FILE | less"
echo -e "  2. ${GREEN}View Markdown:${NC} cat $MD_FILE | less"
echo -e "  3. ${GREEN}Open in browser:${NC} Use the DevDocs UI at http://localhost:3001"