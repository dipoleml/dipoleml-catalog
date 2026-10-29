#!/bin/bash
# Download the example creatures from the GitHub release and check each file's SHA-256 (tools/examples.txt).
# tools/fetch_examples.sh [wolf] [dragon] [spider] [demon] [--readers] [--clips] [--lora]
#   by default:  every named creature's mesh, assets/<creature>/model.glb (11-15 MB each); no names = all four
#   --readers:   its trained joint reader, runs/<creature>/reader.pt (355 MB each), to skip the dataset and training
#   --clips:     one AI two-camera clip and its reference frame, to try tools/capture.sh without a fal key
#   --lora:      the wolf's MiniMax H3 LoRA (131 MB; MiniMax H3's community licence), runs/wolf/lora/
set -euo pipefail
cd "$(dirname "$0")/.."
URL=${ANYMOVE_RELEASE_URL:-https://github.com/Patch-gg/anymove/releases/download/examples-v1}
kinds=(glb); creatures=()
for a in "$@"; do
  case $a in
    --readers) kinds+=(reader) ;;
    --clips) kinds+=(clip ref) ;;
    --lora) kinds+=(lora) ;;
    *) creatures+=("$a") ;;
  esac
done
[ ${#creatures[@]} -gt 0 ] || creatures=(wolf dragon spider demon)
sum() { if command -v sha256sum > /dev/null; then sha256sum "$1" | cut -c1-64; else shasum -a 256 "$1" | cut -c1-64; fi; }
grep -v '^#' tools/examples.txt | while read -r sha size name dest; do
  kind=${name%%-*}; kind=${kind%.glb}; c=${name%.*}; c=${c#*-}; c=${c%%-*}
  [ "$name" = "$c.glb" ] && kind=glb
  [[ " ${creatures[*]} " == *" $c "* ]] || continue
  [[ " ${kinds[*]} " == *" $kind "* ]] || continue
  if [ -f "$dest" ] && [ "$(sum "$dest")" = "$sha" ]; then echo "have $dest"; continue; fi
  mkdir -p "$(dirname "$dest")"
  echo "get  $name ($((size / 1000000)) MB) -> $dest"
  curl -fL --retry 3 --progress-bar -o "$dest.part" "$URL/$name"
  [ "$(sum "$dest.part")" = "$sha" ] || { echo "checksum mismatch for $name" >&2; rm -f "$dest.part"; exit 1; }
  mv "$dest.part" "$dest"
done
