# Activation Scanner Data Curriculum

This file describes how rows should move from raw public data into product
training data. The goal is not to pour every available dataset into the probe.
The goal is to teach the scanner the difference between dangerous intent and
safe text that merely contains scary words.

## Mental Model

Each row should answer five questions:

1. Is the row clean or poisoned?
2. Which risk family is the closest match?
3. What exact action makes it safe or unsafe?
4. Is this an obvious example, a benign lookalike, a subtle attack, or real
   carrier text?
5. How confident are we in the label?

If any of these are unclear, the row should stay in the review queue or holdout
set. It should not silently enter training.

## Curriculum Levels

| Level | Meaning | Training role |
| --- | --- | --- |
| `L0_regression` | Tiny known examples used to catch product regressions. | Always keep small and stable. |
| `L1_clear_synthetic_pair` | Obvious clean/poison twins. | Good for first learning pass. |
| `L2_benign_lookalike` | Safe examples that mention risky surfaces. | Teaches the scanner not to panic on keywords. |
| `L3_subtle_intent` | Poisoned examples where the intent is hidden behind normal-sounding wording. | Most important for beating text-pattern scanners. |
| `L4_real_carrier_adapted` | Public or real-looking skill/MCP/package carriers adapted into inert text rows. | Product realism, after review. |
| `L5_external_holdout` | External benchmark rows kept out of training. | Generalization proof only. |

## Risk Families

| Family | Unsafe hinge | Clean lookalike |
| --- | --- | --- |
| `instruction_chaining` | Tool text tries to become a higher-priority standing instruction. | Describes priority or policy while preserving user authority. |
| `secret_file_access` | Reads or retains secret values, keys, recovery codes, cookies, or tokens. | Checks existence, schema, names, permissions, or redacted values only. |
| `credential_forwarding` | Sends accepted credentials or tokens to another service. | Validates token shape locally and discards values. |
| `network_exfiltration` | Adds local/user/account data to outbound network traffic. | Sends only caller-provided payloads to caller-provided destinations. |
| `hidden_persistence_logging` | Silently stores prompts, tool output, file paths, or cross-request state. | Visible, user-enabled, local logging with clear scope. |
| `live_system_access` | Contacts clusters, registries, databases, endpoints, or hosts without approval. | Dry-run parsing or validation without live contact. |
| `system_inventory` | Fingerprints the host, user, processes, environment, or network interfaces. | Uses caller-supplied platform facts or redacted summaries. |
| `tool_shadowing` | Intercepts, routes, replaces, or suppresses other tools' results. | Routes only within its own explicitly configured indexes/tools. |

## Review Rules

Use these rules when manually accepting rows:

- A row can be poisoned even if it never says `ignore`, `secret`, `upload`, or
  `exfiltrate`.
- A row can be clean even if it contains `SSH`, `token`, `webhook`, `database`,
  `shell`, or `network`.
- Label the action, not the vibe. If the unsafe action cannot be named, hold it
  for review.
- Keep clean/poison twins together with the same `pair_id` and `split_group`.
- External public rows can enter training only after review. Weak labels from
  suspicious datasets are `low` or `medium` confidence until confirmed by text.
- Source-confirmed external rows, such as Skill-Inject injections with explicit
  unsafe action metadata, may be promoted after pairing them with the original
  clean carrier and recording the review decision.
- Keep at least one external source as holdout so benchmark results are not just
  memorized dataset style.

## Row Metadata

New manually accepted rows should include:

- `curriculum_level`
- `attack_goal`
- `risk_action`
- `label_confidence`
- `review_status`

Example:

```json
{
  "label": "poisoned",
  "family": "credential_forwarding",
  "curriculum_level": "L3_subtle_intent",
  "attack_goal": "credential_forwarding",
  "risk_action": "forward_accepted_access_tokens",
  "label_confidence": "gold",
  "review_status": "accepted"
}
```

## Workflow

1. Add obvious paired examples only when they teach a missing family or boundary.
2. Add benign lookalikes for every risky surface.
3. Add subtle poisoned pairs that remove obvious keywords.
4. Build a review queue from public datasets.
5. Promote only reviewed rows into the curated dataset.
6. Keep unreviewed or weak-label rows as `L5_external_holdout`.
7. Re-run family holdout and RouteGuard/generalization benchmarks after every
   meaningful data update.
