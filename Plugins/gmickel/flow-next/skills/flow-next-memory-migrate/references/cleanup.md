# Phase 4: cleanup mechanics (gated reference)

> Read from workflow.md Phase 4 only when the run is interactive and the user picked option 1
> (rename originals) at the Phase 3 cleanup gate.

### 4.1 — When to run

- **Interactive mode + user picked option 1** in the Phase 3 cleanup gate.
- **Autofix mode** — never. Surface as recommendation in the Phase 3 report instead. Originals stay in place.

### 4.2 — Create `_migrated/` directory + self-ignoring gitignore

```bash
mkdir -p "$MIGRATED_DIR"

# Self-ignoring directory pattern: write `.gitignore: *` on first cleanup.
# This is the standard pattern (used by node_modules tooling, __pycache__, etc.).
# Avoids requiring the user to update the top-level .gitignore.
GITIGNORE_PATH="$MIGRATED_DIR/.gitignore"
if [[ ! -f "$GITIGNORE_PATH" ]]; then
  printf '*\n' > "$GITIGNORE_PATH"
fi
```

The `.gitignore` content is just `*` — every file in `_migrated/` is ignored by git, including the `.gitignore` itself. Standard self-ignoring pattern.

### 4.3 — Rename each migrated original

For each filename whose entries were all written and verified in this run (not already in
`ALREADY_MIGRATED`). A file with any skipped or failed entry stays in place, named in the report,
so its unmigrated lessons are not hidden in the ignored `_migrated/` directory:

```bash
mv "$MEMORY_DIR/$filename" "$MIGRATED_DIR/${filename}.bak"
```

Use `mv`, not `cp + rm`. Preserves filesystem inode for any reflinks.

### 4.4 — Bounds on the rename

- **Do not `git rm`** the originals. Rename only — leaves them on disk for the user to inspect.
- **Do not delete `_migrated/`** on subsequent runs. The presence of `<filename>.bak` is what Phase 0's idempotency check uses to skip already-migrated files.
- **Do not commit** the rename automatically. The skill itself doesn't commit — the user runs `git status` post-migration and decides. The `.gitignore: *` ensures the renamed `.bak` files won't accidentally get committed.

### 4.5 — Report cleanup outcome

Append to the Phase 3 report:

```
Cleanup
-------
Renamed: <list of originals → _migrated/.../*.bak>
Created: .flow/memory/_migrated/.gitignore (self-ignoring; first run only)
```

### Done when

- All migrated originals renamed (interactive + user consented).
- `_migrated/.gitignore` exists with content `*` if any rename happened.
- Cleanup outcome logged in the report.
