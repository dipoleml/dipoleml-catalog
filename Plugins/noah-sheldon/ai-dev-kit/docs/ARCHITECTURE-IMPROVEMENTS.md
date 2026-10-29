# Architecture Improvements

This repo already has the production surface needed to ship.
This document captures the next layer of improvements to keep the system easy to extend.

## 1. Single Source Of Truth

The current repo has multiple surfaces:

- root prompts
- plugin manifests
- OpenCode config
- installer scripts
- docs

The main goal is to keep those surfaces aligned.

Recommended rule:
- the root agent, skill, and command markdown files remain canonical
- generated or publish-target surfaces should be derived from the canonical files

## 2. Catalog Stability

The counts and file lists should stay stable enough that:

- `scripts/validate-surface.js` can catch drift
- package metadata remains publishable
- marketplace manifests stay consistent across clients

If a new command or skill is added, update the relevant docs and validation in the same change.

## 3. Prompt Quality

All prompt files should follow the same style:

- short
- direct
- explicit
- verifiable

That keeps the repo usable by other developers and reduces prompt drift.

## 4. Distribution Surfaces

Treat each target as a separate packaging contract:

- Claude marketplace
- Codex plugin
- OpenCode package/config
- Cursor/Gemini compatibility surfaces

Do not assume one surface implies another. Keep each one validated explicitly.

## 5. Operational Safety

Keep the following behaviors cheap and reliable:

- install
- doctor
- validate
- uninstall
- sync

If a change makes one of those slower or harder to reason about, it needs review.

