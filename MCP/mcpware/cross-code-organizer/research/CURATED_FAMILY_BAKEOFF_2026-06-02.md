# Curated Family Bakeoff - 2026-06-02

Superseded by `research/CURATED_FAMILY_BAKEOFF_2026-06-03.md` for the current
curated-data artifact decision. Keep this file as the previous 64-row baseline.

## Question

After promoting source-confirmed Skill-Inject rows into
`family_curated_v0`, which local sensor is the best candidate for the scanner
artifact?

## Setup

- Dataset: `family_curated_v0`
- Size: 64 rows, 32 matched clean/poison pairs, 8 risk families
- Suite: `curated-family-holdout`
- Selector: `leave-one-family-out`
- Layer policy: `best-sweep`, `--top-k-max 10`
- Runtime setting: local CPU runs, `max_length=256`

This is a curated product-curriculum gate. It is not the final universal
generalization gate because RouteGuard external transfer remains harder.

## Results

| Candidate | Best policy | Macro F1 | Macro recall | Macro precision | Min F1 | Zero-recall family | Report |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| TF-IDF baseline | `tfidf` | 0.710 | 0.769 | 0.738 | 0.400 | none | `research/_results/activation_scanner_benchmark/20260602T222848Z-curated-family-holdout-pythia-70m.md` |
| Pythia-70M raw | `best4` | 0.677 | 0.710 | 0.667 | 0.000 | `system_inventory` | `research/_results/activation_scanner_benchmark/20260602T222942Z-curated-family-holdout-pythia-70m.md` |
| Pythia-70M SAE | `best1` / layer 2 | 0.645 | 0.756 | 0.568 | 0.000 | `hidden_persistence_logging` | `research/_results/activation_scanner_benchmark/20260602T222942Z-curated-family-holdout-pythia-70m.md` |
| Qwen2.5-0.5B raw | `best8` | 0.780 | 0.825 | 0.762 | 0.000 | `system_inventory` | `research/_results/activation_scanner_benchmark/20260602T223053Z-curated-family-holdout-qwen2.5-0.5b.md` |
| SmolLM2-135M raw | `best10` | 0.697 | 0.717 | 0.703 | 0.000 | `system_inventory` | `research/_results/activation_scanner_benchmark/20260602T223242Z-curated-family-holdout-smollm2-135m.md` |

Gemma 3 270M loaded successfully with Hugging Face auth, but the all-layer
curated-family CPU selector run produced no report after roughly five minutes
and was stopped. Treat Gemma 270M as an optimization/fixed-layer follow-up, not
as a cheap all-layer default under the current runner.

## Qwen Artifact

Built artifact:

```text
research/_results/activation_scanner_artifacts/qwen-curated-family-best8-v0
```

Artifact metadata:

- Sensor model: `qwen2.5-0.5b`
- Feature kind: raw activation
- Train source: `family-curated-v0`
- Selected layers: `9,11,12,13,14,15,16,18`
- Feature dimension: 7,168
- Train F1: 0.9206
- Selection score: 0.7798
- Warn threshold: 0.60
- Block threshold: 0.85

Regression fixture smoke:

| Fixture | Expected shape | Decision | Activation score |
| --- | --- | --- | ---: |
| `secret-upload-block` | poisonous credential upload | `block` | 0.989 |
| `weather-json-allow` | benign weather JSON | `allow` | 0.002 |
| `ssh-config-lookalike-allow` | benign SSH config lookalike | `allow` | 0.024 |

Batch cold-start smoke took about 9.02s on this Mac because the model loads in
the same process as the scan.

## Product Call

Qwen2.5-0.5B raw `best8` is the current curated-data runtime candidate. It is
not the final default scanner yet.

Why it can move forward:

- It beats the curated-family TF-IDF baseline on macro F1 and recall.
- It beats Pythia raw, Pythia SAE, and SmolLM2 raw on this curated gate.
- A cached runtime artifact now exists and passes the scanner fixture smoke.

Why it cannot be overclaimed:

- `system_inventory` still has zero recall under the best Qwen policy.
- Older RouteGuard real-content transfer demoted Qwen on local-train ->
  external evaluation.
- TF-IDF remains strong enough that every future report should keep it as a
  baseline.

Next work should target the `system_inventory` hole, then rerun Qwen on pooled
curated/external gates with fixed selected layers and cached feature matrices.
