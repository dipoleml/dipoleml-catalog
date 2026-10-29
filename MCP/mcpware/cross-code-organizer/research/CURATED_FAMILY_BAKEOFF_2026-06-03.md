# Curated Family Bakeoff - 2026-06-03

Same-day follow-up: the later fixed-layer RouteGuard external-transfer gate
promoted `qwen-pooled-curated-core-l13-15-v0` as the current runtime candidate.
This report remains the curated-family proof for why layers `13,14,15` became
the Qwen policy. See
`research/ROUTEGUARD_EXTERNAL_QWEN_FIXED_LAYERS_2026-06-03.md`.

## Question

After adding system-inventory bridge pairs, does Qwen still lead the curated
family gate, and can we promote a smaller artifact than the earlier `best8`
candidate?

## Data Change

`family_curated_v0` moved from 64 rows / 32 pairs to 76 rows / 38 pairs.

Added rows:

- 2 direct `system_inventory` clean/poison pairs.
- 4 bridge clean/poison pairs across `network_exfiltration`,
  `hidden_persistence_logging`, `live_system_access`, and
  `credential_forwarding`.

The bridge rows matter because `curated-family-holdout` removes the entire test
family during training. To improve held-out `system_inventory`, the training
set needs other families that teach host fingerprinting as a toxic action.

Validation passed with 76 rows, 38 pairs, 0 errors, and 0 warnings.

## Setup

- Dataset: `family_curated_v0`
- Size: 76 rows, 38 matched clean/poison pairs, 8 risk families
- Suite: `curated-family-holdout`
- Selector: `leave-one-family-out`
- Layer policy: `best-sweep`, `--top-k-max 10`
- Text baseline: TF-IDF logistic regression
- Runtime setting: local CPU, `max_length=256`

Report:

```text
research/_results/activation_scanner_benchmark/20260603T032304Z-curated-family-holdout-qwen2.5-0.5b.md
```

Runtime:

- Full report elapsed: 69.7s
- Feature extraction: 13.7s
- Report-time RSS: about 800 MB

## Results

| Candidate | Policy | Macro F1 | Macro recall | Macro precision | Min F1 | Zero-recall families |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Qwen2.5-0.5B raw | `best3` | 0.829 | 0.844 | 0.870 | 0.667 | none |
| Qwen2.5-0.5B raw | `best6` | 0.829 | 0.844 | 0.870 | 0.667 | none |
| Qwen2.5-0.5B raw | `best7` | 0.829 | 0.844 | 0.870 | 0.667 | none |
| TF-IDF baseline | `tfidf` | 0.823 | 0.865 | 0.809 | 0.667 | none |
| Qwen2.5-0.5B raw | `best8` | 0.791 | 0.823 | 0.824 | 0.667 | none |

The best activation policies are now slightly ahead of TF-IDF on macro F1, but
TF-IDF still has higher macro recall. Keep TF-IDF in every benchmark report.

## System Inventory Fix

Before the bridge rows, Qwen had zero recall on held-out `system_inventory`.

After the bridge rows:

| Candidate | System-inventory precision | System-inventory recall | System-inventory F1 |
| --- | ---: | ---: | ---: |
| Qwen raw `best3` | 1.000 | 0.500 | 0.667 |
| Qwen raw `best8` | 1.000 | 0.500 | 0.667 |
| TF-IDF | 1.000 | 0.667 | 0.800 |

This is progress, not closure. The zero-recall hole is gone, but TF-IDF still
does better on this family, so the next curriculum patch should add more
natural host-fingerprint examples and benign inventory tools.

## Current Artifact

Built artifact:

```text
research/_results/activation_scanner_artifacts/qwen-curated-family-best3-v1
```

Artifact metadata:

- Sensor model: `qwen2.5-0.5b`
- Feature kind: raw activation
- Train source: `family-curated-v0`
- Selected layers: `13,14,15`
- Feature dimension: 2,688
- Train F1: 0.933
- Selection score: 0.847
- Warn threshold: 0.60
- Block threshold: 0.85

Regression fixture smoke:

| Fixture | Decision | Activation score |
| --- | --- | ---: |
| `secret-upload-block` | `block` | 0.968 |
| `weather-json-allow` | `allow` | 0.006 |
| `ssh-config-lookalike-allow` | `allow` | 0.057 |

Batch feature extraction took about 9.34s on this Mac in a cold-start CLI run.

## Product Call

Promote `qwen-curated-family-best3-v1` over the older
`qwen-curated-family-best8-v0` for the curated-data runtime candidate.

Why:

- Same top macro F1 as `best6` and `best7`.
- Smaller feature vector than `best6`, `best7`, or `best8`.
- No zero-recall family in the current curated-family holdout.
- Runtime fixture smoke still has the right block/allow behavior.

Same-day update:

- The RouteGuard-style real-content rerun is now complete.
- Fixed Qwen layers 13,14,15 beat TF-IDF on full local-train -> external
  transfer.
- `qwen-pooled-curated-core-l13-15-v0` is now the current runtime candidate.

Still blocked before release-default:

- TF-IDF still has higher recall overall and better `system_inventory` F1.
- Threshold calibration, MASB safe false positives, and line-level attack recall
  still need work.
- The data is still mostly curated/synthetic plus source-confirmed public
  carriers, not real incident telemetry.
