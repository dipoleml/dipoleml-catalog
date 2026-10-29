#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Output directory for results
OUTPUT_DIR="./cleanup_results"
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}Starting empty folder detection...${NC}"

# Directories to exclude from search
EXCLUDE_DIRS=(
  "node_modules"
  ".git"
  "dist"
  "build"
  "coverage"
)

# Build the exclude pattern for find command
EXCLUDE_PATTERN=""
for dir in "${EXCLUDE_DIRS[@]}"; do
  EXCLUDE_PATTERN="$EXCLUDE_PATTERN -not -path \"*/$dir/*\""
done

# Function to check if a directory should be excluded
should_exclude() {
  local dir="$1"
  for exclude in "${EXCLUDE_DIRS[@]}"; do
    if [[ "$dir" == *"/$exclude/"* || "$dir" == *"/$exclude" ]]; then
      return 0 # true, should exclude
    fi
  done
  return 1 # false, should not exclude
}

# Find completely empty directories
echo -e "${BLUE}Finding completely empty directories...${NC}"
find . -type d -empty -not -path "*/\.*" | while read -r dir; do
  if ! should_exclude "$dir"; then
    echo "$dir" >> "$OUTPUT_DIR/completely_empty_dirs.txt"
  fi
done

# Count results
if [ -f "$OUTPUT_DIR/completely_empty_dirs.txt" ]; then
  empty_count=$(wc -l < "$OUTPUT_DIR/completely_empty_dirs.txt")
  echo -e "${GREEN}Found $empty_count completely empty directories${NC}"
else
  echo -e "${GREEN}No completely empty directories found${NC}"
  empty_count=0
fi

# Find directories with only placeholder files
echo -e "${BLUE}Finding directories with only placeholder files...${NC}"
find . -type d -not -path "*/\.*" | while read -r dir; do
  if should_exclude "$dir"; then
    continue
  fi
  
  # Count all files (excluding hidden)
  file_count=$(find "$dir" -maxdepth 1 -type f -not -name ".*" | wc -l)
  
  # Count placeholder files
  gitkeep_count=$(find "$dir" -maxdepth 1 -type f -name ".gitkeep" | wc -l)
  empty_gitignore=0
  
  # Check if .gitignore exists and is empty or near-empty
  if [ -f "$dir/.gitignore" ]; then
    gitignore_lines=$(grep -v '^#' "$dir/.gitignore" | grep -v '^$' | wc -l)
    if [ "$gitignore_lines" -le 1 ]; then
      empty_gitignore=1
    fi
  fi
  
  # If the only files are placeholders
  placeholder_count=$((gitkeep_count + empty_gitignore))
  if [ "$file_count" -eq 0 ] && [ "$placeholder_count" -gt 0 ]; then
    echo "$dir" >> "$OUTPUT_DIR/placeholder_only_dirs.txt"
  fi
done

# Count results
if [ -f "$OUTPUT_DIR/placeholder_only_dirs.txt" ]; then
  placeholder_count=$(wc -l < "$OUTPUT_DIR/placeholder_only_dirs.txt")
  echo -e "${GREEN}Found $placeholder_count directories with only placeholder files${NC}"
else
  echo -e "${GREEN}No directories with only placeholder files found${NC}"
  placeholder_count=0
fi

# Find nested empty directories (directories that contain only empty subdirectories)
echo -e "${BLUE}Finding nested empty directories...${NC}"
find . -type d -not -path "*/\.*" | while read -r dir; do
  if should_exclude "$dir"; then
    continue
  fi
  
  # Skip if this is a root directory
  if [ "$dir" = "." ]; then
    continue
  fi
  
  # Check if directory contains any files
  file_count=$(find "$dir" -mindepth 1 -type f | wc -l)
  
  # If no files, check if it contains only empty subdirectories
  if [ "$file_count" -eq 0 ]; then
    # Get all subdirectories
    subdirs=$(find "$dir" -mindepth 1 -maxdepth 1 -type d)
    
    # If there are subdirectories
    if [ -n "$subdirs" ]; then
      all_empty=true
      
      # Check each subdirectory
      for subdir in $subdirs; do
        # If subdirectory is not empty
        if [ -n "$(find "$subdir" -mindepth 1)" ]; then
          all_empty=false
          break
        fi
      done
      
      # If all subdirectories are empty
      if [ "$all_empty" = true ]; then
        echo "$dir" >> "$OUTPUT_DIR/nested_empty_dirs.txt"
      fi
    fi
  fi
done

# Count results
if [ -f "$OUTPUT_DIR/nested_empty_dirs.txt" ]; then
  nested_count=$(wc -l < "$OUTPUT_DIR/nested_empty_dirs.txt")
  echo -e "${GREEN}Found $nested_count nested empty directories${NC}"
else
  echo -e "${GREEN}No nested empty directories found${NC}"
  nested_count=0
fi

# Find potentially abandoned feature directories
# (directories with very few files compared to their structure)
echo -e "${BLUE}Finding potentially abandoned feature directories...${NC}"
find . -type d -not -path "*/\.*" | while read -r dir; do
  if should_exclude "$dir"; then
    continue
  fi
  
  # Skip if this is a root directory
  if [ "$dir" = "." ]; then
    continue
  fi
  
  # Count subdirectories
  subdir_count=$(find "$dir" -mindepth 1 -type d | wc -l)
  
  # Count files
  file_count=$(find "$dir" -type f -not -name ".*" | wc -l)
  
  # If there are multiple subdirectories but very few files
  if [ "$subdir_count" -gt 3 ] && [ "$file_count" -lt 3 ]; then
    echo "$dir" >> "$OUTPUT_DIR/potential_abandoned_dirs.txt"
  fi
done

# Count results
if [ -f "$OUTPUT_DIR/potential_abandoned_dirs.txt" ]; then
  abandoned_count=$(wc -l < "$OUTPUT_DIR/potential_abandoned_dirs.txt")
  echo -e "${GREEN}Found $abandoned_count potentially abandoned directories${NC}"
else
  echo -e "${GREEN}No potentially abandoned directories found${NC}"
  abandoned_count=0
fi

# Generate a summary report
echo -e "${BLUE}Generating summary report...${NC}"
cat > "$OUTPUT_DIR/empty_folders_report.md" << EOF
# Empty Folders Detection Report

Generated on: $(date)

## Summary

| Category | Count |
|----------|-------|
| Completely Empty Directories | $empty_count |
| Directories with Only Placeholder Files | $placeholder_count |
| Nested Empty Directories | $nested_count |
| Potentially Abandoned Directories | $abandoned_count |
| **Total** | $((empty_count + placeholder_count + nested_count + abandoned_count)) |

## Details

### Completely Empty Directories

Directories that contain no files or subdirectories:

EOF

if [ -f "$OUTPUT_DIR/completely_empty_dirs.txt" ]; then
  cat "$OUTPUT_DIR/completely_empty_dirs.txt" | sed 's/^/- `/' | sed 's/$/`/' >> "$OUTPUT_DIR/empty_folders_report.md"
else
  echo "None found." >> "$OUTPUT_DIR/empty_folders_report.md"
fi

cat >> "$OUTPUT_DIR/empty_folders_report.md" << EOF

### Directories with Only Placeholder Files

Directories that contain only .gitkeep or empty .gitignore files:

EOF

if [ -f "$OUTPUT_DIR/placeholder_only_dirs.txt" ]; then
  cat "$OUTPUT_DIR/placeholder_only_dirs.txt" | sed 's/^/- `/' | sed 's/$/`/' >> "$OUTPUT_DIR/empty_folders_report.md"
else
  echo "None found." >> "$OUTPUT_DIR/empty_folders_report.md"
fi

cat >> "$OUTPUT_DIR/empty_folders_report.md" << EOF

### Nested Empty Directories

Directories that contain only empty subdirectories:

EOF

if [ -f "$OUTPUT_DIR/nested_empty_dirs.txt" ]; then
  cat "$OUTPUT_DIR/nested_empty_dirs.txt" | sed 's/^/- `/' | sed 's/$/`/' >> "$OUTPUT_DIR/empty_folders_report.md"
else
  echo "None found." >> "$OUTPUT_DIR/empty_folders_report.md"
fi

cat >> "$OUTPUT_DIR/empty_folders_report.md" << EOF

### Potentially Abandoned Directories

Directories with complex structure but very few files:

EOF

if [ -f "$OUTPUT_DIR/potential_abandoned_dirs.txt" ]; then
  cat "$OUTPUT_DIR/potential_abandoned_dirs.txt" | sed 's/^/- `/' | sed 's/$/`/' >> "$OUTPUT_DIR/empty_folders_report.md"
else
  echo "None found." >> "$OUTPUT_DIR/empty_folders_report.md"
fi

cat >> "$OUTPUT_DIR/empty_folders_report.md" << EOF

## Next Steps

1. Review each category of empty folders
2. Determine which folders can be safely removed
3. Create a cleanup plan based on the risk assessment
4. Execute the cleanup in phases, starting with low-risk folders

For more details, see the [Empty Folders Cleanup Plan](../../docs/general/empty_folders_cleanup_plan.md).
EOF

echo -e "${GREEN}Empty folder detection completed!${NC}"
echo -e "${BLUE}Results saved to:${NC} $OUTPUT_DIR/"
echo -e "${BLUE}Summary report:${NC} $OUTPUT_DIR/empty_folders_report.md"