# Existing repo-root spec file (gated reference)

> Read from workflow.md Step 4a only when `HITS>=1` (a repo-root `SPEC.md` or `spec.md` exists).

**2. `HITS=1` (one file: a single name, OR a case-insensitive FS where both names resolve to one inode)** — capture whichever filename actually exists into `EXISTING` (no prompt). Both the read-for-compare and the overwrite target route through `EXISTING` so lowercase `spec.md` repos do not silently fall back to a missing `SPEC.md`:

```bash
EXISTING=$(ls -1 SPEC.md spec.md 2>/dev/null | head -1)
```

Fall through to the byte-compare re-setup gate below.

**3. `HITS=2` (case-sensitive FS with both distinct files)** — prefer uppercase + print a stderr warning, then fall through to the byte-compare gate against `SPEC.md`:

```bash
echo "warn: both SPEC.md and spec.md exist at repo root; preferring uppercase. Unusual setup likely from cross-platform sync." >&2
EXISTING=SPEC.md
```

**Re-setup byte-compare gate** (when a repo-root spec file exists from a prior `/flow-next:setup`-`Copy template` and the user may have edited it). Read both sides via `EXISTING` and normalize before comparing:

```bash
# Normalize: strip trailing newlines + replace CRLF with LF
USER_CONTENT=$(cat "$EXISTING" | tr -d '\r')
CANONICAL_CONTENT=$(cat "${PLUGIN_ROOT}/templates/spec.md" | tr -d '\r')
# Strip trailing newlines from both
USER_NORM=$(printf '%s' "$USER_CONTENT")
CANONICAL_NORM=$(printf '%s' "$CANONICAL_CONTENT")
```

Or in Python:

```python
def normalize(b: bytes) -> bytes:
    return b.replace(b"\r\n", b"\n").rstrip(b"\n")
identical = normalize(user_bytes) == normalize(canonical_bytes)
```

Then:

- **Identical** (after normalization): no-op. Skip the write — re-running setup must not bump mtime on unchanged files.
**Ask the user via plain text.** Render the options below as a numbered list `1.` … `N.`, followed by a final option `N+1. Other — type your own answer`. Print the question, then the numbered list, then **stop and wait for the user's next message before continuing**. Parse the reply as: a bare number `1`–`N+1` → that option; the literal text of an option label → that option; free text after `Other` → custom answer.

- **Customized** (any deviation after normalization): **the file is never replaced without an explicit answer** — a customized `SPEC.md` overwritten silently has broken this. Ask the user via `plain-text numbered prompt`:
  - **header**: `Spec file`
  - **question**: `Overwrite the customized <repo-root>/$EXISTING? It exists and differs from the canonical template shipped with this plugin version (CRLF and trailing newlines ignored). Overwriting replaces your edits. Keeping skips this file (you can manually merge later via diff against \`${PLUGIN_ROOT}/templates/spec.md\`).`
  - **options**:
    - `Keep mine (Recommended)` — leave `<repo-root>/$EXISTING` unchanged. Print the path to the canonical template so the user can diff manually.
    - `Overwrite with canonical` — replace `<repo-root>/$EXISTING` (same filename — do NOT rename lowercase `spec.md` to uppercase `SPEC.md` here; preserve the user's casing) with the bundled template content. Repo customization is lost.
    - `abort` — exit cleanly. Earlier steps (Step 1 `flowctl init`, and Step 2b's leftover cleanup if you accepted it) may already have run; init is idempotent and safe to leave, and a completed cleanup means the instruction-file snippet has NOT yet been refreshed - finish setup (or re-run it) before relying on direct `flowctl` instructions in CLAUDE.md/AGENTS.md. No `<repo-root>/$EXISTING` write; Step 4b onward skipped. Re-run `/flow-next:setup` later to complete setup.

**Note:** Setup writes uppercase `SPEC.md` only on the **fresh-seed** path (`HITS=0` `Copy template`). Never seed lowercase `spec.md` from scratch. The lowercase entry in the cascade is read-only at discovery time — present only for users who deliberately created lowercase. On the **re-setup overwrite** path above, preserve the user's existing filename casing via `$EXISTING` (so a lowercase `spec.md` stays lowercase after `Overwrite with canonical`).
