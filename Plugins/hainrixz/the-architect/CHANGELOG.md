# Changelog

All notable changes to The Architect are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as scoped in
[VERSIONING.md](VERSIONING.md) — read that first if you are wondering why a directory rename is a
MAJOR bump in a repo with no code.

## [Unreleased]

Nothing yet.

---

## [2.6.0] — 2026-10-17

A full-repo correctness pass, read area by area by parallel reviewers, every fix re-checked by
independent code, fact and security reviews that tried to refute it. Every runtime-track pin was
re-verified live. No declared path, command, section number or `tasks.json` field changed.

### Added

- **Validator findings #38–#40 (BLOCKER) with Sweeps 28–30.** Three writer rules claimed validator
  enforcement that did not exist: the §19.6 resolution-convention matrix (#38), a runtime check of
  something erased at runtime (#39), and a step drawing its contract from a `NOT APPLICABLE` section
  (#40). `blueprint-validator` now has 40 findings and Sweeps 0–30.
- **Four CI checks.** Every scanned path exists; manifest versions agree and the CHANGELOG carries the
  release (heading and link); shape "No if" edges are reciprocal and every capability sits in some
  shape's Core table; every version-scan pattern compiles **and** matches a positive canary while
  known-clean strings stay clean.
- **Registry rows** for `claude-api` and `/abogado-del-diablo` — both were referenced and neither was
  listed — and the missing second install line for `/last30days`.
- **Agent frontmatter for current Claude Code.** `blueprint-validator` runs on `opus` at
  `effort: high`; the validator and `stack-researcher` set `omitClaudeMd: true` so a user's
  CLAUDE.md cannot colour an independent audit; `blueprint-writer` gains `Edit` for fix loops.
- GitHub social preview card (`assets/social-preview.jpg`) and the image check (resolves, used,
  alt text) — landed after 2.5.0.

### Changed

- **Expected-failure gates use the strict form** `status=0; cmd || status=$?; test "$status" -eq N`.
  The previous recommendation, `cmd; test $? -eq N`, aborts under `set -e` before `test` runs, and a
  mid-block `! cmd` fails silently under `set -e`. Finding #36 now files both. Strict gates need a
  `Bash(test:*)` allow entry, which the §19.3 skeleton carries. **Bundles from 2.5.0 that use the
  old forms will draw #36 from `/architect-audit`.**
- **Claude Code renamed the Task tool to Agent.** Dispatch text and `allowed-tools` say Agent, and the
  plugin-namespaced subagent types (`the-architect:*`) are named.
- **The emission mode is derived and announced everywhere**, never asked — seven passages still
  described a question Phase 4 forbids.
- **MCP:** the current revision (2026-07-28) is stateless with `server/discover`; blueprints build
  dual-era for hosts that still send `initialize`, and the gates prove both.
- **Claude API guidance** matches today's platform: non-default sampling parameters are rejected,
  cache prefixes run tools → system → messages, refusals are HTTP 200 with `stop_reason: "refusal"`,
  forced tool choice is rejected on some models, thinking blocks are replayed unmodified. Model IDs
  and prices still defer to the `claude-api` skill.
- **Runtime tracks re-verified 2026-10-17**, all five. New majors landed for pnpm, Vitest, Stripe, the
  Expo SDK and React Native, the Python `anthropic` and `openai` SDKs (now on `httpx2`), Go, Echo,
  Bubble Tea and Pest — the numbers live in `knowledge/runtime-tracks/`, as always.
- **Table names are plural everywhere**, with `auth.md` owning users, organizations, memberships,
  invitations and API keys, and `audit_events` as the audit table.
- The worked Step 7 example (template and README) now obeys the template's own caps and gates on
  replayed fixtures; live `stripe trigger` runs moved to the launch checklist.
- Settings guidance: one allow entry per subcommand of a compound command, never a bare
  interpreter or package runner, and deny rules are not a sandbox.
- CI: `actions/checkout@v7` without persisted credentials, a job timeout, and a manifest check that
  fails instead of skipping when the CLI cannot be fetched.

### Fixed

- **Phase 4 asked before overwriting an existing blueprint only after the writer had already
  saved over it.** The check now runs in Step 3, before anything is written.
- `ts-node`: better-auth 1.7 keys accounts on `(providerId, accountId)` — an `issuer` column
  existed only in 1.7.0–1.7.2. Prisma is pinned exactly because npm `latest` is an RC;
  `@vitejs/plugin-react-oxc` is gone (deprecated, rejects the current Vite major).
- `go`: `go mod init` writes the full toolchain version; the documented "previous minor" default was
  reverted in a patch release. `mobile-native`: the Node-floor claim named the wrong React Native release, and
  gesture-handler 3 is now the SDK pin.
- Apple's US-storefront external-purchase exception; guideline 4.8 stated accurately; Auth.js is
  maintained by the Better Auth team and new projects start on Better Auth.
- `availability-engine` and `realtime-voice` were unreachable (in no shape's Core table).
- Build steps that needed a live IdP, production, or a human now run against stubs or move to the
  launch checklist; manual-check escape hatches in `verify` are gone.
- CHANGELOG entries for 2.0.1 through 2.5.0, which shipped without them.

### Security

- The agent-loop replay copy, kept unredacted so thinking blocks replay intact, is encrypted at rest,
  decryptable only by the loop worker, and purged when the run can no longer resume.
- `/architect-audit` no longer pre-approves Bash and disallows Write/Edit, matching its read-only
  claim.
- The pack smoke test installs into temp directories outside the repo, never globally.

---

## [2.5.0] — 2026-07-28

Seventh build cycle under the strict-literal protocol: 13/13 steps, **zero deviations**, §20.1 gate
passed, working product tested from the installed package.

### Added

- **Rule P — expected output is reconciled twice.** Any byte-exact golden file or expected-output
  example must agree with the blueprint's own data model, and must not quote a message only the
  pinned runtime could produce. Writer obligation plus validator finding #35 / Sweep 25.
- **Rule Q — a gate must fail for the right reason.** A gate whose pass condition is "any non-zero
  exit" is satisfied by a usage error, so a gate must distinguish the expected failure code from a
  usage error (`cmd; test $? -eq N` in this release's examples). Finding #36 / Sweep 26.
- **Rule R — the ignore file precedes the command it governs.** An ignore file or governing config
  written after the command it changes is a finding (BLOCKER when the effect, such as git tracking,
  is irreversible). Finding #37 / Sweep 27.
- `knowledge/shapes/cli-library-mcp.md`: declaring the public surface (step 2) is now separated from
  freezing it (a drift-check gate, only once the modules exist).

### Changed

- `blueprint-validator`: 37 findings, Sweeps 0–27.

---

## [2.4.0] — 2026-07-28

Fifth build cycle, strict-literal protocol: 14/14 steps, 0 blocked, §20.1 gate passed. Rules K–N
verified live.

### Added

- **Rule O — a Verify may not depend on what its own Checkpoint produces.** Steps run
  `Do → Done when → Verify → Checkpoint`, so a Verify that asserts a clean tree, a tracked file, or
  its own tag can never pass. Move the assertion into the Checkpoint, or restate it without commit
  state. Validator finding #34 / Sweep 24; the same assertion inside §20.1 or a Checkpoint block is
  exempt.
- Phase 4 Step 6, run 5: plain filesystem I/O is named as a clean pass for the data-layer smoke test.

### Changed

- The task-splitting threshold is one number everywhere: 5 files or 6 acceptance criteria.
- `blueprint-validator`: 34 findings, Sweeps 0–24.

### Fixed

- Phase 4 Step 6: run 3's "step 1 only" scope no longer contradicts run 5, which expects the
  intervening steps.

---

## [2.3.0] — 2026-07-28

Fourth build cycle, with the builder held strictly literal for the first time: 7/14 steps, one
blocking defect — two blueprint-emitted files disagreed about where the executable lands.

### Added

- **Rule K — emitted artifacts form a system.** Any value stated in two artifacts (path, entry
  point, name, port) must be cross-checked. Validator finding #30 / Sweep 20.
- **Rule L — fail fast.** The first step that produces an executable must run it, not only build it.
  Finding #31 / Sweep 21.
- **Rule M — a bundle inside the project is part of the tool surface.** Every emitted config must
  exclude the bundle path. Finding #32 / Sweep 22.
- **Rule N — a guard must not itself fail.** A guard must exit 0 on the path it guards against (the
  no-clobber copy behaved differently on BSD and GNU). Finding #33 / Sweep 23.
- **`checkpoint` field in `tasks.json`** (required) and a Checkpoint line in the epic task block, so a
  bundle-mode builder that resumes from `tasks.json` sees the rollback tag.

### Changed

- **Phase 4 Step 6 smoke test grew from 3 runs to 7:** place the bundle in the tree, run bootstrap
  twice (both exit 0), implement step 1 from the blueprint's own content and gate it, run what the
  build produces, exercise the data layer, run the formatter.
- Writer rules now name the validator finding that enforces each one.
- `blueprint-validator`: 33 findings, Sweeps 0–23. Bundles generated by 2.2.0 or earlier have no
  `checkpoint` field and will draw findings from `/architect-audit`; `/architect-next` does not read
  the field and still resumes them.

### Fixed

- Step 6 run 2 was unsatisfiable as written: it asked for step 1's Verify after a bootstrap that
  never does step 1's work.

---

## [2.2.0] — 2026-07-27

Third build cycle: 14/14 steps and a working product, but a literal builder stopped at step 3. One
root cause — how a plain script invocation reaches TypeScript source — produced both hard stops.

### Added

- **Rule F — one resolution convention, every loader.** Decided once and reconciled against the app,
  tests, scripts and build.
- **Rule G — a Verify exits 0 when the step is correct.** A documented error path is wrapped so the
  line itself exits 0.
- **Rule H — a check must be possible in the medium it runs in** (no runtime check for type-only
  exports).
- **Rule I — the workspace copy must be safe to re-run.**
- **Rule J — a NOT APPLICABLE section cannot carry a contract.**
- `knowledge/runtime-tracks/ts-node.md`: the import-specifier and compiler-option table that settles
  TypeScript source resolution across all four execution contexts.

### Changed

- `cli-library-mcp` no longer hard-requires a container; the pack-and-install path is documented.
- Phase 4 Step 6: a data layer that needs no service is a clean pass, not a blocked run; the
  formatter now runs over `workspace/`.
- Who authors the package manifest is decided by the blueprint, not left to the writer.
- `SKILL.md` rule 6: the obligation is the live registry check; dispatching `stack-researcher` is the
  means. A missing Task tool no longer blocks generation.
- Validator Sweep 12 is split: the static half stays in the validator, the executable half is handed
  by name to the main thread's smoke test.

---

## [2.1.0] — 2026-07-27

Hardening from two zero-context generate-then-build tests, both of which falsified the
self-containment promise. The defect class: the generator specified that a file exists, never that
its content works.

### Added

- **Rules A–E**, each a writer obligation and a validator finding: (A) an emitted config loads every
  module the gates import; (B) every tool that reads env vars is given a way to load them; (C) never
  assert a count you did not make; (D) bootstrap creates what the checkpoints need (`git init`);
  (E) a file the blueprint calls committed is not gitignored.
- Phase 4 smoke test reaches the data layer: bootstrap, step 1's Verify, and the first Verify that
  touches the database. A blocked run must say so instead of skipping.
- Subagent fallback: Phase 4 degrades gracefully when the Task tool is unavailable.
- README: "Pick your path: quick or full" and the Phase 4 duration estimate (EN and ES).
- CI: retired-v1-constructs denylist over the runtime instruction surface.

### Changed

- **The bundle-vs-single-file choice is derived from the step count and announced, not asked** —
  12 or more steps gets a bundle, 11 or fewer a single file. An explicit user preference still wins.
- Acceptance-criterion identity between `tasks.json` and epics is compared after stripping emphasis.
- `blueprint-validator`: 29 findings, Sweeps 0–19, applying in both emission modes.
- CI: the pin guard scans the whole repo except `knowledge/runtime-tracks/` and catches image tags
  and comparator ranges; the mode-parity check compares full rule bodies and per-rule path tokens.

---

## [2.0.1] — 2026-07-27

### Fixed

- **The plugin could not be installed from the marketplace.** Both manifests failed
  `claude plugin validate`: `marketplace.json` `plugins[0].author` is now an object, `plugin.json`
  `repository` is now a string URL, and the unrecognized `engines`, `metadata.homepage` and
  `metadata.website` fields are gone.

---

## [2.0.0] — 2026-07-27

The Architect ships as a Claude Code plugin, the knowledge base is split on three axes so it stops
rotting, and every build step a blueprint emits now has a definition of done.

### Added

- **Plugin distribution.** Install without cloning:

  ```
  /plugin marketplace add Hainrixz/the-architect
  /plugin install the-architect@soyenriquerocha
  ```

  Marketplace name is `soyenriquerocha`; plugin name is `the-architect`. Surface lives in
  `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
- **`skills/architect/SKILL.md`** — the plugin-mode entrypoint. Auto-activates on intent in English
  and Spanish ("design my app", "diseña mi app", "what stack should I use", "hazme un blueprint").
- **Six slash commands** in `commands/`:

  | Command | What it does |
  |---|---|
  | `/architect` | Full interview, DISCOVERY through GENERATE |
  | `/architect-quick` | Three questions, smart defaults, same confirmation gate |
  | `/architect-brownfield` | Reads an existing repo and blueprints a change or migration |
  | `/architect-next` | Resume protocol — hands the builder the next unblocked task from `tasks.json` |
  | `/architect-refresh` | Re-verifies every pin in an existing blueprint against live registries |
  | `/architect-audit` | Runs `blueprint-validator` over an existing blueprint or bundle |

- **Three bundled subagents** in `agents/`:
  - `stack-researcher` — verifies every version against live package registries *before* it is
    written into a blueprint. Its report for the current session outranks any cached file.
  - `blueprint-writer` — sole author of blueprint files. The main thread never writes them.
  - `blueprint-validator` — audits the written blueprint; nothing is presented until it returns PASS.
- **`knowledge/shapes/` — 14 shapes**, up from 6 archetypes. New: `agent-app`,
  `generative-media-app`, `ecommerce-storefront`, `cli-library-mcp`, `browser-extension`,
  `desktop-app`, `automation-bot-integration`, `data-pipeline-analytics`.
- **`knowledge/runtime-tracks/` — 5 tracks**: `ts-node`, `python`, `go`, `rails-laravel`,
  `mobile-native`. The only files in the repo permitted to contain a version number.
- **`knowledge/capabilities/` — 18 capabilities**, up from 8 building blocks. New: `agent-loop`,
  `ai-llm-integration`, `credit-metering`, `payments-rails`, `realtime-voice`, `sync-and-collab`,
  `availability-engine`, `enterprise-readiness`, `accessibility`, `observability`.
- **Acceptance criteria on every build step.** Written in EARS form — *WHEN `<trigger>` THE SYSTEM
  SHALL `<observable response>`* — and paired with a **runnable verify command that must exit 0**
  plus a **git checkpoint**. This is the anti-drift fix: v1 build steps had no definition of done,
  so an autonomous builder had no stopping condition and no way to tell a finished step from a
  half-finished one.
- **Brownfield mode.** Point The Architect at an existing repo instead of an idea. It maps the code,
  then blueprints the change or the migration — including a parity-and-cutover plan and a rollback
  per step. Not just from-scratch builds anymore.
- **Two output modes, chosen in Phase 4.**
  - *Bundle* — `./blueprints/<project-slug>/` containing `blueprint.md`, `tasks.json`, `epics/`, and
    a `workspace/` directory the builder copies wholesale into the target project root.
  - *Single file* — `./blueprints/<project-slug>-blueprint.md`, everything inline, resume is manual.
- **`tasks.json`** — a machine-readable task DAG, the substrate `/architect-next` uses to survive a
  build that spans many sessions.
- **New templates**: `templates/tasks-schema.md`, `templates/epic-template.md`.
- **`questions/phase-4-generate.md`** — generation is now a written seven-step procedure instead of
  improvised in the skill file.
- **`knowledge/stack-compatibility.md`** — known-bad combinations, checked before a stack is locked.
- **Pin provenance in every blueprint** — package, version, source URL, date checked. A package that
  was not researched says so rather than implying a verification that never happened.
- **`CHANGELOG.md`, `VERSIONING.md`, `CONTRIBUTING.md`, `SECURITY.md`.**

### Changed

- **BREAKING — the knowledge base was reorganized onto three axes.** v1 hardcoded a stack table into
  every archetype file, so refreshing one framework meant editing 13 files and each one drifted at
  its own rate. v2 separates *what it is* from *what it is written in* from *what it does*:

  | Axis | Directory | Answers | Version pins |
  |---|---|---|---|
  | Shape | `knowledge/shapes/` | What is it? | Never |
  | Runtime track | `knowledge/runtime-tracks/` | What is it written in? | **Only here** |
  | Capability | `knowledge/capabilities/` | What does it do? | Never |

  Refreshing a framework now edits one file.

- **BREAKING — paths moved.** `knowledge/archetypes/*` → `knowledge/shapes/*`;
  `knowledge/building-blocks/*` → `knowledge/capabilities/*`, with these renames:

  | v1 | v2 |
  |---|---|
  | `archetypes/content-platform.md` | `shapes/content-community-platform.md` |
  | `building-blocks/auth-patterns.md` | `capabilities/auth.md` |
  | `building-blocks/database-patterns.md` | `capabilities/database.md` |
  | `building-blocks/deployment-patterns.md` | `capabilities/deployment.md` |
  | `building-blocks/api-design-patterns.md` | `capabilities/api-design.md` |
  | `building-blocks/frontend-stacks.md` | `capabilities/frontend-architecture.md` |
  | `building-blocks/testing-patterns.md` | `capabilities/testing.md` |
  | `building-blocks/styling-systems.md` | `capabilities/styling.md` |
  | `building-blocks/state-management.md` | `capabilities/state-management.md` (content rewritten) |

- **BREAKING — the blueprint section contract went from 16 sections to 20.** All 20 headings appear
  in every blueprint; a section that does not apply says `NOT APPLICABLE — <reason>` under its
  heading rather than being deleted, because downstream tooling indexes by number. New sections
  include Security & Secrets (14), Accessibility (15), Observability & Cost (16), Model Routing (17),
  Agent Workspace (19), and Acceptance Gate, Risks & Decision Log (20). **The generated `CLAUDE.md`
  moved from Section 15 to Section 19.1.**
- **BREAKING — blueprints are written to the user's current working directory** (`./blueprints/`),
  never into this repo and never into the plugin cache. The plugin cache is not a writable workspace.
- **BREAKING — the phase model is now a five-state machine** with an explicit confirmation gate:
  `DISCOVERY → DEEP DIVE → ARCHITECTURE →(user confirms)→ GENERATE`, plus `BROWNFIELD` as an
  alternate entry that skips DISCOVERY and merges into ARCHITECTURE.
- **Version pins are verified live, not recalled.** `stack-researcher`'s report for the current
  session is authoritative; `knowledge/runtime-tracks/<track>.md` is a dated cache and the fallback
  for anything the researcher could not resolve, with its caveats carried into the blueprint
  verbatim. Never write a pin from memory.
- **Classification is now bidirectional.** Every shape's "No if" list points at the shape you
  actually want, and every confusable pair points back — so briefs stop funnelling into `saas-webapp`
  by default. `saas-webapp.md` is the declared sink and carries exits to all 13 other shapes.
- **`CLAUDE.md` is now explicitly the clone-mode entrypoint.** Cloning still works exactly as it did
  in v1. Plugin and clone are dual, supported modes reading the same `questions/`, `templates/` and
  `knowledge/` files — the interview flow is never duplicated between them.
- The generated target-project `CLAUDE.md` guidance is **under 200 lines** (was described as 120).

#### If you are coming from v1

1. **Your existing blueprints still work.** A v1 blueprint is a standalone `.md`; nothing in this
   release reaches into it. Keep building from it.
2. **Run `/architect-audit <path>` on it if you plan to keep using it.** It will FAIL — v1 blueprints
   have no acceptance criteria. That is the expected result, not a bug, and the report tells you
   which steps have no definition of done.
3. **Run `/architect-refresh <path>` before starting an old build.** Pins written months ago have
   drifted; this re-verifies each one against the live registry and reports what moved and what
   breaks.
4. **If you cloned, `git pull` is enough** — `CLAUDE.md` still boots The Architect.
5. **If you forked or edited `knowledge/archetypes/` or `knowledge/building-blocks/` locally,
   your edits will not merge.** Those directories are gone. Port each change into the axis it
   belongs to: project-type material into `knowledge/shapes/`, cross-cutting decisions into
   `knowledge/capabilities/`, and anything with a version number in it into
   `knowledge/runtime-tracks/`.
6. **Update any script or doc that reads `output/<project>-blueprint.md`** — output now lands in
   `./blueprints/` relative to wherever you ran the command.

### Deprecated

- **The v1 blueprint format** (16 sections, no acceptance criteria, no verify commands) is
  deprecated as an input. `/architect-audit` and `/architect-refresh` still read it, and will keep
  reading it through the 2.x line, but nothing produces it anymore. Regenerate rather than patch if
  a v1 blueprint is going to an autonomous builder.

### Removed

- **`knowledge/archetypes/`** (6 files) — superseded by `knowledge/shapes/`.
- **`knowledge/building-blocks/`** (8 files) — superseded by `knowledge/capabilities/`.
- **`output/` as the blueprint destination.** Generated work no longer lands inside this repo.
- **`.claude/commands/` is never emitted into a generated workspace**, in either output mode. A slash
  command only fires when a human types it, and an autonomous builder types nothing — emitting one
  produced a workflow that silently never ran. Repeatable project workflows are emitted as
  `.claude/skills/<name>/SKILL.md` instead.

### Fixed

- **Staleness.** One framework refresh used to mean editing every archetype that mentioned it, so in
  practice most of them stayed wrong. Pins now live in exactly one place and are re-verified against
  the registry at generation time.
- **Drift.** Build steps with no observable completion condition let an autonomous builder run past a
  broken step or stall on a finished one. Every step now carries EARS acceptance criteria, a verify
  command, and a checkpoint, and is sized to one sitting.
- **Unreachable shapes.** 20 of 60 classification edges were one-way, so the interview reliably
  resolved to about 8 of the 14 shapes. Reciprocity is now required in both directions for every
  confusable pair.
- **Orphaned capability.** Booking and scheduling briefs landed on `saas-webapp` and silently lost
  `capabilities/availability-engine.md`. The classifier now carries booking, scheduling, and
  appointment language, and the shape links the capability.
- **Un-checkable acceptance criteria.** A "done when" that waits on a store review queue, a
  certificate authority, or a human reviewer cannot terminate inside an autonomous build — the
  builder either stalls forever or self-certifies. Anything requiring an external party moved to a
  post-build launch checklist, clearly separated from the build order.
- **Turn-scoped tool grants.** `allowed-tools` in the skill front matter clears the moment the user
  sends their next message, so it could never cover a multi-turn interview. The skill no longer
  assumes a standing grant.

### Security

- Added [SECURITY.md](SECURITY.md) with a private reporting route and the threat model that actually
  applies to a prompt repo: injection through a contributed knowledge file, a malicious install
  command in the skills registry, and a blueprint that instructs a builder to do something harmful.
- Blueprints gained a dedicated **Security & Secrets** section (14), covering secret handling, env
  var boundaries, and what must never be committed. v1 had no equivalent section.
- Pin provenance (source URL + date checked) is recorded per package, so an unverified or
  typosquatted dependency cannot enter a build looking like a verified one.

---

## [1.0.0] — 2026-07-27

First public release.

### Added

- `CLAUDE.md` — the meta-agent prompt that turns a Claude Code session into The Architect, running a
  four-phase workflow: Discovery, Deep Dive, Architecture, Generate.
- `knowledge/archetypes/` — 6 project archetypes: SaaS/web app, marketing site, mobile app,
  API/backend, internal tool, content platform.
- `knowledge/building-blocks/` — 8 cross-cutting decision guides: auth, database, deployment, API
  design, frontend stacks, testing, styling, state management.
- `knowledge/skills-registry.md` — Claude Code skills mapped to workflow phases and blueprint
  sections, with licenses, star counts, and install commands.
- `knowledge/stack-compatibility.md` — what works together and what does not.
- `templates/blueprint-template.md` — the 16-section blueprint skeleton, with Build Order as the
  load-bearing section.
- `templates/claude-md-template.md` — the target project's `CLAUDE.md`.
- `questions/phase-1-discovery.md`, `questions/phase-2-branches.md`,
  `questions/phase-3-confirmation.md`.
- Bilingual EN/ES `README.md`; MIT `LICENSE`.

### Changed

- Branding corrected throughout: `iia.com` → `tododeia.com`.

### Fixed

- **Skill references were wrong in the initial commit and are now verified.** Every star count,
  license, and install command in `knowledge/skills-registry.md` was read from the live GitHub API
  or the upstream repo's own README — nothing estimated.
- **Removed skills that do not exist**: `/deep-research`, `/seo-audit`, `/pdf-design`, `/shadcn-ui`,
  `/chrome-bridge-automation`, `/web-reader`, `/humanizer`.
- **Corrected invocation forms.** A leading `/` means a real slash command; no slash means the skill
  auto-activates and must be named in prose. Writing `/ui-ux-pro-max`, `/frontend-design` or
  `/playwright-cli` is a silent no-op — nothing runs and the workflow quietly skips the step.
- **No skill is a hard dependency.** Every reference degrades gracefully: if a skill is absent, fall
  back to the knowledge base or built-in `WebSearch`/`WebFetch`, note it in one line, and keep going.
- Corrected the `pdf` skill's description — it does extraction, manipulation, and forms, not visual
  design.

[Unreleased]: https://github.com/Hainrixz/the-architect/compare/v2.6.0...HEAD
[2.6.0]: https://github.com/Hainrixz/the-architect/compare/v2.5.0...v2.6.0
[2.5.0]: https://github.com/Hainrixz/the-architect/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/Hainrixz/the-architect/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/Hainrixz/the-architect/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/Hainrixz/the-architect/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/Hainrixz/the-architect/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/Hainrixz/the-architect/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/Hainrixz/the-architect/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/Hainrixz/the-architect/releases/tag/v1.0.0
