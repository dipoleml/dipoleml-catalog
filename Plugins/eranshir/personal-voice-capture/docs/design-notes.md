# Design Notes

## Thesis

A personal voice skill should be compiled from evidence, not guessed from a single prompt.

The loop is:

```text
source writing + generated probes + user edits -> voice rules + approved examples -> reusable SKILL.md
```

## What the skill captures

- cadence
- diction
- structure
- recurring frames
- context-specific formality
- compression level
- warmth/humor/edge
- multilingual habits
- phrases to prefer and avoid

## What the skill must not capture

- private beliefs not supplied for the current task
- commitments or approvals
- emotional positions
- facts not present in the prompt
- identity claims

## Stop condition

The process terminates when the user says it is done, or when the user accepts several consecutive examples without substantive edits. Default threshold: 5 consecutive accepted examples spanning at least 2 contexts, unless the user scoped the skill to one context.

## Storage policy

Default: derived rules and user-approved examples only. Raw source material is not retained unless explicitly requested.
