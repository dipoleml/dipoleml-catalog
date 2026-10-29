#!/bin/bash

# Usage: ./scripts/check-for-ejs-duplicates.sh <directory>
# Examples:
# ./scripts/check-for-ejs-duplicates.sh frameworks/react-cra
# ./scripts/check-for-ejs-duplicates.sh frameworks/solid

# Check if directory parameter is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <directory>"
  exit 1
fi

# The directory to search in
DIR="$1"

# Find all files that do NOT have .ejs extension
find "$DIR" -type f ! -name "*.ejs" | while read -r file; do
  # Get the directory and filename
  file_dir=$(dirname "$file")
  file_name=$(basename "$file")
  
  # Check if a .ejs version exists in the same directory
  ejs_file="${file_dir}/${file_name}.ejs"
  
  if [ -f "$ejs_file" ]; then
    echo "Found matching pair: $file has corresponding $ejs_file"
  fi
done