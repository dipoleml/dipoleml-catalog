#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Input and output directories
INPUT_DIR="./cleanup_results"
OUTPUT_DIR="./cleanup_results"
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}Analyzing empty folders for references in code...${NC}"

# Create analysis file
ANALYSIS_FILE="$OUTPUT_DIR/empty_folders_analysis.md"

# Start the analysis file
cat > "$ANALYSIS_FILE" << EOF
# Empty Folders Analysis

Generated on: $(date)

This document analyzes the empty folders identified in the codebase and provides recommendations for cleanup.

## Risk Assessment

| Folder Path | Type | Referenced In | Recommendation | Justification | Risk Level |
|-------------|------|--------------|----------------|---------------|------------|
EOF

# Function to check if a folder is referenced in code
check_references() {
  local folder="$1"
  local escaped_folder=$(echo "$folder" | sed 's/\./\\./g' | sed 's/\//\\\//g')
  
  # Check for references in code files
  local code_refs=$(grep -r "$escaped_folder" --include="*.{js,ts,tsx,jsx,json,md,py}" . 2>/dev/null | wc -l)
  
  # Check for references in package.json
  local pkg_refs=$(grep -r "$escaped_folder" --include="package.json" . 2>/dev/null | wc -l)
  
  # Check for references in configuration files
  local config_refs=$(grep -r "$escaped_folder" --include="*.{config.js,config.ts,config.json}" . 2>/dev/null | wc -l)
  
  local total_refs=$((code_refs + pkg_refs + config_refs))
  
  if [ "$total_refs" -gt 0 ]; then
    echo "Code"
  else
    echo "None"
  fi
}

# Function to determine if a folder is part of a virtual environment
is_venv_folder() {
  local folder="$1"
  if [[ "$folder" == *"/venv/"* ]]; then
    return 0 # true
  else
    return 1 # false
  fi
}

# Function to determine if a folder is expected at runtime
is_runtime_folder() {
  local folder="$1"
  
  # Common runtime directories
  if [[ "$folder" == *"/storage"* || 
        "$folder" == *"/logs"* || 
        "$folder" == *"/uploads"* || 
        "$folder" == *"/cache"* || 
        "$folder" == *"/temp"* || 
        "$folder" == *"/crawl_results"* ]]; then
    return 0 # true
  else
    return 1 # false
  fi
}

# Function to determine risk level
determine_risk() {
  local folder="$1"
  local referenced="$2"
  
  if is_venv_folder "$folder"; then
    echo "High"
  elif is_runtime_folder "$folder"; then
    echo "Medium"
  elif [ "$referenced" == "Code" ]; then
    echo "High"
  else
    echo "Low"
  fi
}

# Function to provide recommendation
provide_recommendation() {
  local folder="$1"
  local risk="$2"
  
  if [ "$risk" == "Low" ]; then
    echo "Remove"
  elif [ "$risk" == "Medium" ]; then
    echo "Keep with .gitkeep"
  else
    echo "Keep"
  fi
}

# Function to provide justification
provide_justification() {
  local folder="$1"
  local referenced="$2"
  local risk="$3"
  
  if is_venv_folder "$folder"; then
    echo "Part of Python virtual environment, required for development"
  elif is_runtime_folder "$folder"; then
    echo "Expected to be created and used at runtime"
  elif [ "$referenced" == "Code" ]; then
    echo "Referenced in code, may be required"
  elif [ "$folder" == "./cleanup_results" ]; then
    echo "Created by our cleanup script, needed for reports"
  else
    echo "No references found, likely safe to remove"
  fi
}

# Process completely empty directories
if [ -f "$INPUT_DIR/completely_empty_dirs.txt" ]; then
  while read -r folder; do
    referenced=$(check_references "$folder")
    risk=$(determine_risk "$folder" "$referenced")
    recommendation=$(provide_recommendation "$folder" "$risk")
    justification=$(provide_justification "$folder" "$referenced" "$risk")
    
    echo "| \`$folder\` | Empty | $referenced | $recommendation | $justification | $risk |" >> "$ANALYSIS_FILE"
  done < "$INPUT_DIR/completely_empty_dirs.txt"
fi

# Process nested empty directories
if [ -f "$INPUT_DIR/nested_empty_dirs.txt" ]; then
  while read -r folder; do
    referenced=$(check_references "$folder")
    risk=$(determine_risk "$folder" "$referenced")
    recommendation=$(provide_recommendation "$folder" "$risk")
    justification=$(provide_justification "$folder" "$referenced" "$risk")
    
    echo "| \`$folder\` | Nested Empty | $referenced | $recommendation | $justification | $risk |" >> "$ANALYSIS_FILE"
  done < "$INPUT_DIR/nested_empty_dirs.txt"
fi

# Process potentially abandoned directories
if [ -f "$INPUT_DIR/potential_abandoned_dirs.txt" ]; then
  while read -r folder; do
    referenced=$(check_references "$folder")
    risk=$(determine_risk "$folder" "$referenced")
    recommendation=$(provide_recommendation "$folder" "$risk")
    justification=$(provide_justification "$folder" "$referenced" "$risk")
    
    echo "| \`$folder\` | Potentially Abandoned | $referenced | $recommendation | $justification | $risk |" >> "$ANALYSIS_FILE"
  done < "$INPUT_DIR/potential_abandoned_dirs.txt"
fi

# Add cleanup plan section
cat >> "$ANALYSIS_FILE" << EOF

## Cleanup Plan

Based on the analysis above, here's a plan for cleaning up empty folders:

### Safe to Remove (Low Risk)

These folders have no references in code and are not expected at runtime:

EOF

# Add safe to remove folders
grep "| Low |" "$ANALYSIS_FILE" | grep "| Remove |" | sed 's/^| `/- `/' | sed 's/` |.*$/`/' >> "$ANALYSIS_FILE"

cat >> "$ANALYSIS_FILE" << EOF

### Keep with Placeholder (Medium Risk)

These folders are expected at runtime but are currently empty:

EOF

# Add medium risk folders
grep "| Medium |" "$ANALYSIS_FILE" | sed 's/^| `/- `/' | sed 's/` |.*$/`/' >> "$ANALYSIS_FILE"

cat >> "$ANALYSIS_FILE" << EOF

### Keep As Is (High Risk)

These folders are either part of the development environment or referenced in code:

EOF

# Add high risk folders
grep "| High |" "$ANALYSIS_FILE" | sed 's/^| `/- `/' | sed 's/` |.*$/`/' >> "$ANALYSIS_FILE"

cat >> "$ANALYSIS_FILE" << EOF

## Implementation Steps

1. Create a backup of the codebase before proceeding
2. Remove low-risk folders first
3. Add .gitkeep files to medium-risk folders
4. Test the application to ensure it still works
5. Document any folders that were kept intentionally empty

## Cleanup Script

A script will be created to implement these changes safely.
EOF

echo -e "${GREEN}Analysis completed!${NC}"
echo -e "${BLUE}Results saved to:${NC} $ANALYSIS_FILE"

# Create a list of safe to remove folders
grep "| Low |" "$ANALYSIS_FILE" | grep "| Remove |" | sed 's/^| `//' | sed 's/` |.*$//' > "$OUTPUT_DIR/safe_to_remove.txt"

# Create a list of folders to keep with .gitkeep
grep "| Medium |" "$ANALYSIS_FILE" | sed 's/^| `//' | sed 's/` |.*$//' > "$OUTPUT_DIR/keep_with_gitkeep.txt"

echo -e "${BLUE}Created lists:${NC}"
echo -e "  - safe_to_remove.txt"
echo -e "  - keep_with_gitkeep.txt"