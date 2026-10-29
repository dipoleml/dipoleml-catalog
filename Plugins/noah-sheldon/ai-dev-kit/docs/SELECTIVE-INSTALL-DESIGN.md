# Selective Install Design

This repo is intended to be installed and consumed as a plugin-oriented surface.

## Goal

Keep the distribution package useful without forcing every consumer to load every surface.

## Design

- the root repo is the canonical source
- marketplace and plugin manifests point back to the canonical tree
- install tooling should remain deterministic
- target-specific adapters should stay separate from core repo content

## Practical Rule

If a surface is needed for shipping, keep it in the repo.
If a surface is only needed for one client, keep it isolated in that client adapter.

## Validation

Every selective-install path should still pass:

- manifest validation
- prompt surface validation
- package validation

