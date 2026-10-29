# Cross-clone repository memory

Citadel normally keeps project state inside the repository. Cross-clone memory
is an optional local SQLite store for people who use disposable clones and want
completed lessons to follow another clone of the same repository.

It is disabled by default, requires Node.js 22.13 or newer, and makes no network
requests.

## Enable it

From the repository:

```bash
citadel memory enable
```

Enabling registers an opaque repository key and immediately snapshots the
durable files already present. Check it at any time:

```bash
citadel memory status
```

The store is user-level, not repository-level:

- Windows: `%LOCALAPPDATA%\Citadel\repository-memory.sqlite3`
- macOS: `~/Library/Application Support/Citadel/repository-memory.sqlite3`
- Linux: `${XDG_STATE_HOME:-~/.local/state}/citadel/repository-memory.sqlite3`

`CITADEL_MEMORY_DB` can override the path for testing or managed environments.

## What crosses clones

Only durable, human-readable knowledge is eligible:

- `.planning/campaigns/completed/**/*.md`
- `.planning/postmortems/**/*.md`
- `.planning/research/**/*.md`
- `.planning/discoveries/**/*.md`
- `.planning/intake/**/*.md`, excluding `_TEMPLATE.md`
- `.citadel/project.md`

Citadel deliberately excludes active campaigns, fleet and worktree state,
coordination claims, locks, telemetry, screenshots, consent, runtime settings,
credentials, and hook configuration. Each file is limited to 2 MiB and each
sync to 50 MiB.

The fetch URL for `origin` is normalized so HTTPS and SSH clones of the same
remote share an identity. Citadel stores only its SHA-256 digest, never the raw
remote URL or clone path as identity metadata. A repository without a portable
network `origin` receives a path-scoped identity and does not claim cross-clone
restoration.
Eligible documents are stored verbatim, so their content may itself contain
paths, URLs, or other private project context.

## Automatic behavior

When enabled:

1. Durable file edits are captured after a successful write.
2. Session end performs a full durable-state sync as a fallback.
3. Session start restores missing durable files into another clone with the
   same repository identity.

Automatic restore never overwrites an existing different file. It reports the
conflict and leaves local content unchanged. Inspect or retry explicitly:

```bash
citadel memory restore
citadel memory restore --force
```

`--force` is intentionally manual. Every distinct content digest remains in
the version table, so replacing the current copy does not erase older lessons.
List or recover a specific version explicitly:

```bash
citadel memory versions --path .planning/research/topic/REPORT.md
citadel memory restore-version \
  --path .planning/research/topic/REPORT.md \
  --sha256 FULL_DIGEST
```

`restore-version` also refuses to replace different local content unless
`--force` is supplied. A successful recovery makes that digest the current
stored copy while retaining all other versions.

## Manual control and removal

```bash
citadel memory sync
citadel memory disable
citadel memory purge --confirm PURGE
```

`disable` stops automatic sync and restore but preserves existing records.
`purge` deletes every stored file version for the current repository. Neither
command changes application files or contacts a remote service.

On older Node.js releases, the rest of Citadel continues to work and the memory
command returns an explicit unavailable status. Node 22.13 is the first release
where `node:sqlite` is available without an experimental command-line flag. This
avoids adding a native SQLite dependency or installer-time download to Citadel's
core.
