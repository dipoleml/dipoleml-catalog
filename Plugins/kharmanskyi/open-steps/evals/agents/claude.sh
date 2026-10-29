#!/usr/bin/env bash
# The runner for Claude Code: one measured run, as evals/run.sh asks for it.
#
# Every runner in this folder takes the same three arguments and is started
# inside a throwaway git repository:
#   evals/agents/<agent>.sh ARM MODEL PROMPT
# ARM is plain, with or without; MODEL is whatever the tool calls a model; the
# stream goes to stdout, errors to stderr. The scorer's contract for that
# stream is in evals/README.md, "Measuring another agent". This file is the
# reference: Claude Code writes the shape the scorer reads, so here nothing
# needs converting.
set -u
arm="$1" model="$2" prompt="$3"
# Headless, nobody answers a permission prompt: a call no rule allows is
# denied on the spot, and the stream's result line lists it under
# permission_denials. Two rules shape every run here.
#
# Deny, every run: the two tools that reach the other Claude sessions on this
# machine. A bare tool name in a deny rule takes the tool out of the model's
# view, so a run asked "how are the other sessions doing?" still picks
# os-check-work but cannot list or message anyone (#37).
#
# Allow, quality arms only: the Skill tool, so the "with" arm really runs with
# the pack loaded. Before this every Skill call was denied and both arms
# answered unaided (#36). The messy-report prompt picks os-say-simple, which
# needs no other tool. The activation and off-topic runs ("plain") get no
# allow: the scorer counts the call, made before it is denied, and that count
# is the measurement.
#
# Positional parameters, not an array: macOS ships bash 3.2, where an empty
# array under `set -u` kills the shell without a word. The tool lists take any
# number of names, so they go before --model, which ends them; after the
# prompt they would swallow it.
set -- --disallowedTools SendMessage ListAgents
case "$arm" in
  with)    set -- "$@" --allowedTools Skill ;;
  # The "without" arm turns every skill off, so the same agent answers unaided.
  without) set -- "$@" --allowedTools Skill --disable-slash-commands ;;
esac
exec claude -p "$@" --model "$model" \
  --max-turns 12 --output-format stream-json --verbose "$prompt"
