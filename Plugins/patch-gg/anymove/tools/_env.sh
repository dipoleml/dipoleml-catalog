# Shared by the tools/*.sh scripts: run from the repo root, find Python and Blender.
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [ -n "${PYTHON:-}" ]; then PY=$PYTHON; elif [ -x .venv/bin/python ]; then PY=.venv/bin/python; else PY=python3; fi
BLENDER=${BLENDER:-blender}
need_creature() {
  [ -n "${1:-}" ] && [ -f "assets/$1/creature.json" ] || { echo "no assets/${1:-<creature>}/creature.json" >&2; exit 1; }
  export MOCAP_CREATURE=assets/$1
}
