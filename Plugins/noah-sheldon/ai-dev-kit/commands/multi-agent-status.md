---
description: Show the status of all multi-agent workflows — backlog, in progress, review, blocked, completed
argument-hint: [--all | --backlog | --in-progress | --review | --blocked | --completed | <feature-name>]
---

# /multi-agent-status

Show the real-time status of the multi-agent project manager and all active workflows.

## Usage

```
/multi-agent-status              # Show summary of all workflows
/multi-agent-status --backlog    # Show queued features waiting for agents
/multi-agent-status --in-progress # Show currently running workflows
/multi-agent-status --review     # Show workflows in validation loop
/multi-agent-status --blocked    # Show blocked workflows and reasons
/multi-agent-status --completed  # Show completed/merged workflows today
/multi-agent-status <feature-name>  # Show detailed status of one feature
```

## What It Shows

### Default (Summary)

```
═══════════════════════════════════════════════════════════
  MULTI-AGENT PROJECT MANAGER STATUS — 2026-04-12 14:32
═══════════════════════════════════════════════════════════

  BACKLOG: 2  |  IN PROGRESS: 3  |  IN REVIEW: 1  |  BLOCKED: 1  |  COMPLETED TODAY: 2

  ┌──────────────────────┬────────────┬───────┬──────────┐
  │ Feature              │ Stage      │ Agents│ Progress │
  ├──────────────────────┼────────────┼───────┼──────────┤
  │ semantic-caching     │ micro-tasks│   5   │  8/12    │
  │ deploy-pipeline      │ loop×12    │   8   │  gate: eval  │
  │ ml-eval-harness      │ research   │   3   │  1/4     │
  ├──────────────────────┼────────────┼───────┼──────────┤
  │ user-auth-redesign   │ blocked    │   0   │  WAITING │
  │ docs-overhaul        │ backlog    │   0   │  QUEUED  │
  └──────────────────────┴────────────┴───────┴──────────┘

  AGENT UTILIZATION: 16/35 (46%)
  LOOP PASS RATE TODAY: 4/5 (80%)
═══════════════════════════════════════════════════════════
```

### Backlog (--backlog)

Features waiting for agent capacity:

```
  BACKLOG (2 features):

  1. docs-overhaul
     Source: docs/features/docs-overhaul/spec.md
     Priority: 4/10 (tech debt)
     Estimated agents needed: 2 (backend-1, test-1)
     Waiting for: agent capacity (currently at 46% utilization)
     Queued since: 2026-04-12 12:00

  2. api-versioning-v2
     Source: docs/features/api-versioning-v2/spec.md
     Priority: 3/10 (backlog)
     Estimated agents needed: 3 (backend-1, backend-2, test-1)
     Status: QUEUED — no blockers, waiting for next cycle
```

### In Progress (--in-progress)

Currently active workflows with micro-task progress:

```
  IN PROGRESS (3 workflows):

  1. semantic-caching
     Source: docs/features/semantic-caching/spec.md
     Micro-tasks: 8/12 completed
     Active agents: backend-1, backend-2, test-1, frontend-1, infra-1
     Current stage: Parallel execution
     Blocking: MT-008 (waiting for MT-004)
     ETA: ~2 cycles

  2. deploy-pipeline
     Source: docs/features/deploy-pipeline/spec.md
     Micro-tasks: 10/10 completed
     Active agents: 8 (quality wave)
     Current stage: Validation loop (iteration 12/30)
     Failing gates: eval_quality (Pass@k: 0.72, target: 0.85)

  3. ml-eval-harness
     Source: Git Issue #47
     Micro-tasks: 1/4 completed
     Active agents: repo-cartographer, dependency-auditor, historical-reviewer
     Current stage: Research wave
```

### In Review (--review)

Workflows in the validation loop:

```
  IN REVIEW / VALIDATION LOOP (1 workflow):

  1. deploy-pipeline
     Gates passing: code_quality ✓, test_coverage ✓, security ✓, documentation ✓, operations ✓
     Gates failing: functionality ✗ (eval Pass@k: 0.72 < 0.85)
     Loop iteration: 12/30
     Last fix attempt: 2026-04-12 14:15 — improved from 0.68 to 0.72
     Next attempt: Routing to ml-engineer for approach review
```

### Blocked (--blocked)

Workflows that cannot proceed and why:

```
  BLOCKED (1 workflow):

  1. user-auth-redesign
     Source: docs/features/user-auth-redesign/spec.md
     Blocker: NEEDS_HUMAN_INPUT
     Reason: Spec is missing required details about OAuth provider selection.
             The spec mentions "use OAuth" but doesn't specify which provider
             (Google, GitHub, Okta, custom).
     Waiting for: Human to update docs/features/user-auth-redesign/spec.md
                  with OAuth provider decision
     Retry count: 0 (human review, not agent retry)
     Action needed: Update the feature spec or respond with a decision.
```

### Completed (--completed)

Successfully merged features today:

```
  COMPLETED TODAY (2 features):

  1. docs-overhaul — merged at 11:45
     Micro-tasks: 6/6 completed
     Loop iterations: 2
     Agents used: backend-1, test-1
     Quality gates: ALL PASSED
     PR: #51

  2. api-versioning — merged at 13:12
     Micro-tasks: 8/8 completed
     Loop iterations: 7
     Agents used: backend-1, backend-2, test-1, test-2
     Quality gates: ALL PASSED
     PR: #52
```

### Feature Detail (<feature-name>)

```
  FEATURE: semantic-caching
  Source: docs/features/semantic-caching/spec.md
  Status: IN PROGRESS — Micro-task execution
  Started: 2026-04-12 13:00
  Elapsed: 1h 32m

  Micro-task Progress:
    ✓ MT-001 Create cache/__init__.py          (backend-1) DONE
    ✓ MT-002 Create CacheEntry dataclass        (backend-2) DONE
    ✓ MT-003 Implement Redis cache store        (backend-1) DONE
    ✓ MT-004 Implement FAISS lookup             (backend-2) DONE
    ✓ MT-005 Tests for CacheEntry               (test-1) DONE
    ✓ MT-006 Tests for cache store              (test-1) DONE
    ✓ MT-007 Tests for FAISS lookup             (test-1) DONE
    ✓ MT-010 Cache hit indicator UI             (frontend-1) DONE
    ⧗ MT-008 Integrate cache into /v1/chat      (backend-1) WORKING
    ⧗ MT-009 Integration tests                  (test-2) WORKING
    ⧗ MT-011 Component test                     (test-2) WAITING for MT-010
    ⧗ MT-012 Cache metrics                      (infra-1) WAITING for MT-008

  Active Agents: backend-1, backend-2, test-1, test-2, frontend-1, infra-1
  Blocking Issues: None
  Validation Loop: Not yet started (micro-tasks in progress)
```

## How It Works

The command reads `.workflow/dashboard.md` and `.workflow/*/status.json` files that the multi-agent-project-manager agent maintains every 60 seconds. If the project manager has not written a status yet, it will trigger an initial scan.
