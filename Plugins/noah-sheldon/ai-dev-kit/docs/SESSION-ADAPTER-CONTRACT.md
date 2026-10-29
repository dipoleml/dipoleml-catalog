# Session Adapter Contract

This repo uses lightweight session and workflow helpers to keep long-running work inspectable.

## Purpose

Session helpers should answer three questions:

1. What is running?
2. What changed?
3. What still needs attention?

## Contract

Any session adapter or session snapshot should expose:

- a stable identifier
- the current state
- the source target or source path
- the tracked outputs
- the remaining risks or follow-ups

## Rules

- prefer JSON-serializable data
- keep adapter-specific details nested
- avoid inventing new top-level fields unless the contract changes
- use nulls for unknown scalar values and empty arrays for unknown lists

## Consumers

Consumers should treat this data as operational metadata, not product truth.
The source of truth remains the repository and its validated prompt surfaces.

