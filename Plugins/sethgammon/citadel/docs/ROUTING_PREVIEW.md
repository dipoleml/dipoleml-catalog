# Routing Preview

`scripts/route-preview.js` is a static preflight for Citadel's `/do` entry
point. It can resolve a small exact-command contract and show generated
built-in skill candidates. It does not run the full `/do` router.

Run it from an extracted Citadel release:

```bash
node scripts/route-preview.js -- "audit the auth module and fix the highest-risk issue"
```

## What the preview does

The preview shares two deterministic inputs with `/do`:

- fully anchored exact-command definitions from `core/skills/routing.js`; and
- the generated built-in skill catalog in `core/skills/routing-table.json`.

It reports the normalized request, exact resolution or candidate evidence,
alternatives, a boundary, and a suggested verification profile. Keyword
evidence never becomes execution authority.

The preview does **not**:

- inspect active campaign or Fleet state (runtime Tier 1);
- discover custom project skills;
- run the runtime LLM semantic classifier (Tier 3); or
- invoke a command, skill, agent, or orchestrator.

This is intentionally narrower than the live `/do` protocol.

## Decision contract

An exact command can be final. Its normalized text must equal the entire
request. `status page feature`, `continue implementing auth`, and `build a
caching layer` are therefore semantic requests, not `status`, `continue`, or
`build` commands.

The exact `test`, `build`, and `typecheck` requests have an additional target
capability check. They resolve to `npm run <name>` only when the selected target
project has a non-empty `package.json#scripts.<name>` entry. Without that
evidence they remain non-final and non-executable.

Every non-final result has this safety shape:

```json
{
  "final": false,
  "selected": null,
  "suggestedRoute": "/review",
  "command": null,
  "canRunNow": false,
  "boundary": "semantic-classification-required"
}
```

`suggestedRoute` is evidence for the runtime classifier, not a selected route.
When parallel keywords match, the canonical built-in candidate is
`/fleet --quick`.

Use `--project-root` to make target capability and worktree checks explicit:

```bash
node scripts/route-preview.js --project-root /path/to/project --json -- "test"
```

## Explicit override

An operator who already knows the destination can supply a validated override:

```bash
node scripts/route-preview.js --project-root /path/to/project \
  --route /test-gen -- "generate tests for the changed files"
```

Only an installed built-in route is accepted. Aliases are canonicalized, so a
Fleet override becomes `/fleet --quick`. An override selects a route, but it
does not bypass product-bundle activation, dirty-worktree review, campaign or
parallel approval, or the selected workflow's verification contract. An
unknown override exits non-zero.

## Reading the result

For a natural-language request, expect a non-executable suggestion:

```text
Routing Preview
Input: review src/auth.ts
Suggested route: /review
Command: (none; preview is non-executable)
Boundary: semantic-classification-required
```

The live `/do` agent must then inspect runtime state and project skills,
semantically classify the request, enforce activation, and announce its final
route before it runs work.

For an exact project command, check both `final` and `capability.verified`.
Never execute a non-final result or infer a command from `suggestedRoute`.

## Public demo boundary

The hosted page is a candidate visualization generated from the same exact
definitions and built-in catalog. Because a browser page has no target-project
context, `test`, `build`, and `typecheck` remain non-final there. The page also
does not perform active-state, custom-skill, semantic, activation, or execution
steps.

The release architecture and lifecycle boundaries are summarized in
[Architecture](ARCHITECTURE.md). Release acquisition and integrity verification
are documented in [Releases](RELEASES.md).
