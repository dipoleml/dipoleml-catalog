# CCO repository review — 2026-09-11

## Conclusion

CCO still has a defensible product role, but the role is narrower and stronger than “one more settings screen” or “antivirus for MCP.” The durable position is a local, cross-harness configuration control plane:

1. inventory every instruction, skill, memory, plugin, hook, MCP server, and config layer;
2. explain which scope and source made it active;
3. measure duplicate or unnecessary context;
4. edit, quarantine, move, restore, or convert it safely;
5. apply the same hygiene model across harnesses.

Official harness UIs now expose more of their own skills and plugins, so a single-harness inventory alone is not enough. Cross-harness provenance, conflict detection, token hygiene, safe editing, backup, and portability remain differentiated.

## Repository state at review time

- Last source commit before this review: 2026-06-06 (3 months 5 days).
- Latest npm release: 0.19.3 on 2026-04-28 (4 months 14 days).
- Baseline tests before changes: 132 unit and 121 E2E.
- Current tests after changes: 182 unit and 215 E2E, 397 total.
- Dependency audit before changes: 8 advisories (4 high, 3 moderate, 1 low).
- Dependency audit after changes: 0 advisories.
- Package dry run excludes local experimental `session-distiller-v2` through `v5` files.

## Changes made in this review

- Added an inventory-first OpenCode adapter for global and project JSON/JSONC config, AGENTS instructions, agents, commands, compatible skill roots, MCP servers, npm/local plugins, tools, and themes.
- Integrated the community DeepSeek Harness adapter after hardening its capability flags, path allowlists, environment overrides, project scope, and official top-level skill discovery rules.
- Added a source-labelled All Memories scope and local Markdown body search across Claude projects.
- Added complete Markdown editing in the detail panel for editable skills, memories, agents, commands, and instructions.
- Added stale-write protection: per-file server queues and expected-content checks return HTTP 409 instead of overwriting a newer edit.
- Bound the dashboard to `127.0.0.1`, rejected non-local host headers and cross-site mutations, limited request bodies to 1 MiB, and restricted file reads/writes to scanned items and adapter-approved roots.
- Fixed Windows/external-project path handling by allowing discovered project roots instead of all of HOME.
- Marked Codex system skills, cached plugins, and Claude plugin-provided skills as locked.
- Honored custom `$CODEX_HOME` roots and added Codex custom agents, nested local-memory artifacts, explicit skill enablement state, plugin-provided skills, user/project/inline/plugin hook configuration, hook scripts, and standalone profile inventory.
- Migrated MCP tools to the current registration API and supplied read-only, destructive, idempotent, and open-world annotations.
- Fixed issue #35's unquoted YAML `argument-hint`.
- Rebuilt Session Distiller's resume graph, restricted it to Claude's active branch across compact boundaries, and added exact-snapshot, malformed-input, concurrency, branch, and real-resume verification.
- Updated MCP and Playwright dependencies, synchronized package metadata, corrected privacy disclosures, and documented the research-corpus false-positive boundary.
- Added Harness Doctor with an adapter-aware Effective Context Map, explainable hygiene score, fingerprinted reversible repair, copy-only skill migration, and disabled-by-default local aggregate metrics.

## Issue triage

| Issue | Assessment | Action |
|---|---|---|
| #37 malware report | The reported credential strings come from deliberately adversarial research fixtures, not the npm runtime. The repository nevertheless mixes product and security-research surfaces, which harms scanner reputation. | Added `SECURITY.md`; recommend moving activation research and datasets to a separate repository before the next public push. |
| #35 Copilot CLI skill parsing | Reproducible YAML parsing bug. | Fixed by quoting `argument-hint`. |
| #33 Windows “Invalid or disallowed path” | The old guard both over-allowed HOME and under-allowed valid projects on another drive. | Replaced with adapter/discovered-scope allowlists and scanned-item checks. |
| #32 CLI-Anything/Kreuzberg | Feature proposal, not a defect. | Keep as input to the portability/automation roadmap; do not add a dependency without a concrete workflow. |
| #27 cross-project memory search | Strong fit with the product thesis. | Implemented a source-labelled aggregate view and local body search in v0.20. |
| #17 underscore path resolution | Already covered by current regression tests. | Close after the reviewed changes are shipped. |
| #4 Empirica integration | Optional integration, not core. | Defer until the control-plane model is stable. |

## Pull-request triage

- PR #34 contains the same one-line `argument-hint` quoting fix applied in this review.
- PR #36 was integrated with follow-up hardening: unsupported sessions are capability-gated, HOME is no longer a safe root, DSH path overrides and project scope are honored, and skill discovery follows the upstream top-level-only format while excluding user DSH `.system` entries.

## Why the opportunity still exists

Codex now has local memories, AGENTS discovery, skills, plugins, hooks, project config, permission profiles, and richer plugin catalogs. These are separate surfaces with different scopes and loading rules. OpenCode also merges global, project, `.opencode`, compatible skill, plugin, MCP, and instruction sources. More native customization increases the need for provenance and cleanup even when the native UI improves.

Relevant current documentation:

- [Codex changelog](https://developers.openai.com/codex/changelog)
- [Codex memories](https://developers.openai.com/codex/customization/memories)
- [Codex config reference](https://developers.openai.com/codex/config-file/config-reference)
- [Codex AGENTS.md discovery](https://developers.openai.com/codex/agent-configuration/agents-md)
- [Codex skills](https://developers.openai.com/codex/build-skills)
- [Codex plugins](https://developers.openai.com/codex/build-plugins)
- [Codex hooks](https://developers.openai.com/codex/hooks)
- [OpenCode config](https://opencode.ai/docs/config/)
- [OpenCode skills](https://opencode.ai/docs/skills/)

## Recommended product sequence

### 1. Effective Context Map

For every project, show the exact ordered sources that reach the model: mandatory instructions, discovered skills, MCP tool descriptions, plugin metadata, hooks, and deferred/on-demand content. Label each source as always loaded, advertised, on demand, or inactive. This should become the main screen and the basis for honest token estimates.

### 2. Hygiene recommendations

Detect duplicated instructions, overlapping skills, broken references, unreachable MCP servers, stale paths, conflicting rules, oversized always-loaded files, and plugin-provided items shadowed by local copies. Every finding should have evidence and a reversible action.

### 3. Unified search and editing

Index body content across projects and harnesses, not only names and descriptions. Keep the editor source-aware: user files editable, managed/system/plugin-cache files read-only, and concurrent changes rejected rather than overwritten.

### 4. Cross-harness portability

Add previewable conversions between skill and instruction formats. Preserve unsupported fields, show a semantic diff, and never silently claim two harnesses have identical behavior.

### 5. Separate research from product distribution

Move the 34 MB tracked activation-scanner research corpus to a dedicated research repository or release artifact. Keep only the runtime scanner contract, a small regression fixture, and links in CCO. This reduces clone weight and prevents adversarial training strings from dominating malware scans of the product repository.

## Product language

“Harness antivirus” is memorable but too narrow and creates a claim burden the activation preview cannot yet meet. “The local control panel that shows what your coding agents load, what it costs, what conflicts, and how to clean it up” matches the implemented value. The master-cleaner metaphor works well for onboarding; the technical promise should remain evidence-based and reversible.
