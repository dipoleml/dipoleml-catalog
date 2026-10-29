---
version: 1
last-updated: 2026-05-07
---

# Citadel Constitution

Three-tier policy hierarchy for agent behavior. Tier 1 is the project's
normative policy: it overrides Tier 2, and Tier 2 overrides Tier 3. A policy
statement is not, by itself, a universal runtime sandbox. Mechanical coverage
depends on the installed hook, the runtime event, and the tool path named below.

The `policy-enforcer` agent reads this document to issue allow/block verdicts
for proposed actions. Orchestrators (Archon, Fleet) invoke the policy-enforcer
before Red-reversibility operations.

---

## Tier 1: Project Rules (Normative Hard Constraints)

Agents and orchestrators must not override these rules during a session. The
only way to change a Tier 1 rule is to edit this document with explicit user
confirmation. The enforcement-source column distinguishes deterministic hook
blocks from orchestrator, review, runtime, and repository controls.

| Rule ID | Rule | Applies To | Enforcement source |
|---|---|---|---|
| P-001 | Never force-push to `main` or `master` branches | all | Deterministic `external-action-gate.js` block on covered Bash tool paths; repository branch protection remains the authoritative remote backstop. |
| P-002 | Never commit `.env`, `*.pem`, `*.key`, `credentials.*`, `secrets.*` files | all | Orchestrator policy check, review, secret scanning, and repository controls. The hook's `.env` path checks do not prove that every secret shape is absent from a commit. |
| P-003 | Never delete or overwrite `.planning/telemetry/audit.jsonl` | all | Orchestrator policy and review. `governance.js` records covered calls but is an observer, not an immutable storage boundary. |
| P-004 | Never pass `--no-verify` to git commands | all | Deterministic `external-action-gate.js` block on covered Bash tool paths; repository policy and review cover other execution paths. |
| P-005 | Never modify `.claude/harness.json` during an automated campaign without explicit user confirmation | archon, fleet | Orchestrator confirmation protocol plus P-006 path protection where the protected-file hook covers the edit tool. |
| P-006 | Files listed in `harness.json.protectedFiles` may not be edited by agents | all | Deterministic `protect-files.js` block for covered Claude Code Edit/Write calls and Codex `apply_patch` calls after adapter path projection. |
| P-007 | Never push to a remote repository during a campaign without user confirmation | archon, fleet | Archon/Fleet policy-enforcer and consent protocol, runtime approvals, and repository controls. It is not a universal shell sandbox. |
| P-008 | Only current, subject-bound `passed` evidence with complete required coverage may authorize a required dependency, terminal success, delivery, or merge; timeout, malformed output, missing evidence, partial progress, exhausted retries, absent votes, and required-checkpoint failure cannot authorize them | all | Citadel evidence validators and governed Archon/Fleet lifecycle gates. External merge protection and human review remain independent controls. |

## Tier 2: Engineering Rules (Best Practices - Warn Before Proceeding)

Override acceptable when a justification is logged to the Decision Log.

| Rule ID | Rule | Applies To |
|---|---|---|
| E-001 | Shared hook state must be accessed via `harness-health-util.js` - never raw `fs` calls on harness state files | hooks |
| E-002 | New hook files must follow: read stdin JSON → process → `process.exit(0\|2)` pattern | hooks |
| E-003 | Functions with cyclomatic complexity > 10 require an explanatory comment | all |
| E-004 | CLI scripts must call `process.exit()` explicitly - never rely on implicit exit after async operations | all |
| E-005 | Agent definition files (`agents/*.md`) must have `name`, `description`, `model`, and `disallowedTools` in frontmatter | agents |
| E-006 | Skill files (`skills/*/SKILL.md`) must have `name`, `description`, `user-invocable`, `last-updated` in frontmatter | skills |

## Tier 3: Workflow Rules (Process Guardrails - Advisory)

Override acceptable and does not require logging.

| Rule ID | Rule | Applies To |
|---|---|---|
| W-001 | Every agent response must include a `---HANDOFF---` block | all |
| W-002 | Campaign files must be updated after every phase before advancing to the next | archon |
| W-003 | Scope claims in `.planning/coordination/` must be released when a campaign completes | archon |
| W-004 | Fleet agents must not read another agent's worktree working files during the same wave | fleet |
| W-005 | Held gates block only their dependent subgraph; dependency-independent reversible work may continue, and unresolved subjects are aggregated into one human escalation per run | archon, fleet |
| W-006 | Telemetry writes must include `_hash` and `_hash_v: 1` fields (see audit immutability) | all |

---

## How Policy Enforcement Works

### Automatic (hooks)
- `external-action-gate.js` deterministically blocks P-001 and P-004 matches on
  covered Bash tool paths (blocking, PreToolUse).
- `protect-files.js` enforces P-006 for covered Claude Code Edit/Write calls and
  Codex `apply_patch` calls after the adapter projects a target path (blocking,
  PreToolUse).
- `complexity-check.js` reports E-003 signals for covered .js/.ts edits
  (advisory, PostToolUse).
- `governance.js` logs covered significant actions to the audit trail
  (observing, PreToolUse).

Hooks are guardrails, not a complete security boundary. They apply only when
installed and enabled and when the runtime invokes the matching local hook.
Codex documents specialized tool paths that may not use the local function-hook
path; runtime permissions, review, and repository protections still apply.

### Spawned (policy-enforcer agent)
Archon and Fleet spawn the `policy-enforcer` agent before Red-reversibility operations:
- Before any `git push` command
- Before creating or merging pull requests
- Before modifying CI/CD configuration files
- Before operations explicitly flagged as `Red` reversibility

The policy-enforcer receives:
1. The proposed action description
2. The applicable tier rules (caller provides the relevant IDs)
3. Context (campaign slug, agent type, session state)

It returns a JSON verdict: `allow` or `block` with the rule ID and reason.
Timeout, malformed output, or an absent verdict is
`unknown/POLICY_RESULT_UNAVAILABLE`; the proposed Red operation remains held and
joins the run's single human escalation. Policy unavailability never grants
authority.

### Self-enforced (orchestrator protocol)
Orchestrators apply W-001 through W-006 as part of their own protocol.
Violations are logged to the campaign Decision Log, not hard-blocked.
