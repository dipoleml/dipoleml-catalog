# `--memory` entry (gated reference)

> Read from create-and-finalize.md only under `--memory`.

After successful creation or update, optionally write a grounded `knowledge/architecture-patterns` memory
entry under `--memory`, with tag `spec-<SPEC_ID>` as its idempotency key; skip if that tag already exists.
Its prose follows [docs/prose.md](../../docs/flow-next/prose.md) when present. Memory failure is non-fatal; never write by default or in dry-run.
