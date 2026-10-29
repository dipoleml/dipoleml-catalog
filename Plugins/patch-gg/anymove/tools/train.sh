#!/bin/bash
# Once per creature, step 4: teach the joint reader (DINOv2 ViT-B/14 + a heatmap head) this one creature.
# tools/train.sh CREATURE [epochs=20] [batch=20]     -> runs/CREATURE/reader.pt, log in runs/CREATURE/train.log
# About 20 min and 12 GB of GPU memory at batch 20. Prints the held-out error in layout pixels after each epoch.
set -euo pipefail
source "$(dirname "$0")/_env.sh"
need_creature "${1:-}"
$PY -m mocap.train "runs/$1/dataset" "assets/$1/rigged/rig_info.json" "runs/$1/reader.pt" "${2:-20}" "${3:-20}" \
  2>&1 | tee "runs/$1/train.log" | grep --line-buffered -E "val mean|saved|Error"
