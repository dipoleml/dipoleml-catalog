# Qwen Pooled Policy Calibration - 2026-06-03

## Setup

Calibrated the current pooled Qwen scanner artifact:

- Artifact:
  `research/_results/activation_scanner_artifacts/qwen-pooled-curated-core-l13-15-v2`
- Sensor model: `Qwen/Qwen2.5-0.5B`
- Feature policy: raw residual activations, fixed concat layers `13,14,15`
- Train source: `pooled-curated-core`, 989 rows
- Runtime thresholds: `warn=0.30`, `block=0.85`
- Runtime decision policy: `corroborated-block-v3`
- Full calibration report:
  `research/_results/activation_scanner_calibration/20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.md`
- Full calibration JSON:
  `research/_results/activation_scanner_calibration/20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.json`
- Calibration error review queue:
  `research/datasets/calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json`
- Reviewed curriculum decisions:
  `research/datasets/calibration_error_review_decisions_qwen_pooled_policy_v3_warn030_2026-06-03.json`

The calibration set combines:

| Eval set | Rows | Clean | Poisoned |
| --- | ---: | ---: | ---: |
| `family_curated_v0` | 76 | 38 | 38 |
| `regression_fixtures` | 4 | 2 | 2 |
| `routeguard_external_v0` | 2900 | 1644 | 1256 |

Runtime:

- elapsed: 207.5s
- feature extraction: 202.6s
- device: CPU
- dtype: float32
- batch size: 16
- max length: 256

## Runtime Policy

`corroborated-block-v3` separates broad review from hard block:

- `block` if the high-confidence static bundle
  `static-secret-file + static-exfiltration + static-hidden-action` appears
  inside a 900-character span;
- `block` if activation reaches `0.85`, static reaches `0.30`, and the static
  evidence includes an action-oriented corroborator:
  `static-exfiltration`, `static-hidden-action`, or
  `static-host-modification`;
- `warn` if `risk_score = max(activation_score, static_score)` reaches `0.30`
  but hard-block corroboration is missing;
- `allow` below the warn threshold.

Plain-English version: warn is intentionally sensitive; block is intentionally
high precision and needs nearby or action-level evidence. Generic
secret-management language can still warn, but should not hard-block by itself.

## Product Metrics

| Eval set | Decision level | Accuracy | Precision | Recall | F1 | Clean FPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `family_curated_v0` | warn_or_block | 0.868 | 0.792 | 1.000 | 0.884 | 0.263 |
| `family_curated_v0` | block | 0.579 | 1.000 | 0.158 | 0.273 | 0.000 |
| `regression_fixtures` | warn_or_block | 1.000 | 1.000 | 1.000 | 1.000 | 0.000 |
| `regression_fixtures` | block | 0.750 | 1.000 | 0.500 | 0.667 | 0.000 |
| `routeguard_external_v0` | warn_or_block | 0.766 | 0.701 | 0.800 | 0.747 | 0.260 |
| `routeguard_external_v0` | block | 0.583 | 1.000 | 0.037 | 0.071 | 0.000 |

Policy progression on the RouteGuard external gate:

| Policy | RouteGuard warn F1 | Warn recall | Warn clean FPR | Block precision | Block recall | Block clean FPR | Block FP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `v0`, warn `0.60` | 0.731 | 0.799 | 0.296 | 0.714 | 0.374 | 0.114 | 187 |
| `v1`, warn `0.30` | 0.782 | 0.895 | 0.302 | 0.850 | 0.086 | 0.012 | 19 |
| `v2`, warn `0.30` | 0.752 | 0.811 | 0.264 | 0.981 | 0.041 | 0.001 | 1 |
| `v3`, warn `0.30` | 0.747 | 0.800 | 0.260 | 1.000 | 0.037 | 0.000 | 0 |

This makes `v3` the better product posture for hard block:

- use `warn` / review as the default detection tier;
- keep hard block very high precision with zero clean hard-block false
  positives in this RouteGuard-style gate;
- accept that hard-block recall is still preview-only and needs the next
  curriculum pass.

## Error Review Queue

The final v3 queue has 41 entries:

| Priority | Count |
| --- | ---: |
| P0 | 8 |
| P1 | 33 |

Queue error types:

| Error type | Count |
| --- | ---: |
| `false_warn_or_block` | 16 |
| `missed_poison` | 8 |
| `warned_but_not_blocked_poison` | 17 |

Reviewed curriculum decisions:

| Decision | Count |
| --- | ---: |
| `add_static_policy_regression_candidate` | 6 |
| `keep_as_benign_activation_holdout` | 10 |
| `keep_as_regression_fixture_only` | 1 |
| `promote_hard_positive_signal_for_block_policy` | 18 |
| `quarantine_until_hidden_carrier_reconstructed` | 6 |

These rows are not training data. They decide what happens next:

- clean hard-block false positives are gone in this calibration; the former
  MASB safe `moai-security-secrets` hard block is now a warning and is covered
  by clean policy-regression pressure;
- BIPIA text attacks still stay quarantined when the hidden unsafe task context
  is missing from the scanned text;
- BIPIA clean emails remain activation false-positive pressure for the
  warn/review tier, not hard-block failures;
- MASB metadata-only rows remain weak labels until content is reconstructed;
- near-block poisoned rows need clean twins or static corroboration before
  changing hard-block behavior;
- the `secret-negation-warn` fixture is a warn regression, not poisoned gold
  training data.

The generated clean policy-regression fixture has 16 rows. They may warn, but
must not return `block` or `quarantine`.

## Product Decision

Promote `qwen-pooled-curated-core-l13-15-v2` as the current activation scanner
runtime candidate.

The honest product claim is:

> The Qwen activation scanner is useful as a local warn/review layer today. Its
> hard-block tier is deliberately conservative and has zero clean hard-block
> false positives on the current RouteGuard-style external gate, but hard-block
> recall is not solved yet.
