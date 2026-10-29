# RouteGuard External Qwen Fixed-Layer Gate - 2026-06-03

## Question

Do the Qwen layers selected by the curated-family gate survive a harder
RouteGuard-style external-transfer check?

The older Qwen RouteGuard run used automatic layer selection and failed badly on
local-train -> external transfer. This run freezes the curated artifact layers
instead: `13,14,15`, concatenated into one raw-activation feature vector.

## Setup

- Sensor model: `Qwen/Qwen2.5-0.5B`
- Feature: raw activation
- Layers: `13,14,15`
- Layer policy: fixed `concat`
- Selector field in runner: `leave-one-family-out`
- Text baseline: TF-IDF logistic regression
- Local train pool: MCPTox + hand-core + `family_curated_v0`
- External set: `routeguard_external_v0`

Reports:

```text
research/_results/activation_scanner_benchmark/20260603T034112Z-routeguard-external-qwen2.5-0.5b.md
research/_results/activation_scanner_benchmark/20260603T034718Z-routeguard-external-qwen2.5-0.5b.md
```

The full external dataset has 2,900 rows: 1,644 clean and 1,256 poisoned.

## Results

| Gate | Qwen F1 | Qwen recall | Qwen precision | TF-IDF F1 | TF-IDF recall | TF-IDF precision | Call |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| RouteGuard same split, full | 0.892 | 0.889 | 0.896 | 0.887 | 0.875 | 0.899 | Qwen slightly wins by F1 and recall. |
| Local train -> all RouteGuard external, full | 0.513 | 0.415 | 0.673 | 0.172 | 0.107 | 0.445 | Qwen clearly beats TF-IDF on external transfer. |
| Local train -> all RouteGuard external, 1,000-row sample | 0.506 | 0.390 | 0.720 | 0.205 | 0.124 | 0.590 | Sample direction matches the full run. |

This reverses the older Qwen demotion from the 2026-06-02 1,000-row
`best-auto` run, where Qwen got 0.296 F1 and TF-IDF got 0.487 F1 on
local-train -> external transfer. The difference is not "Qwen magically got
better"; the fixed layers `13,14,15` selected by the curated-family curriculum
are a better scanner policy than the old automatic layer-8 policy for this gate.

## Runtime

Full run:

- Wall time: 346.4s
- Transformer feature extraction: 236.2s
- Report-time RSS: about 1.76 GB
- Feature dimension: 2,688

This is acceptable for a local install-time or explicit deep scan, but still too
slow for a per-token runtime hook unless the scanner runs warm and batches many
tool texts together.

## Pooled Artifact

Built after the external-transfer gate:

```text
research/_results/activation_scanner_artifacts/qwen-pooled-curated-core-l13-15-v0
```

Artifact metadata:

- Train source: `pooled-curated-core`
- Train rows: 989
- Clean / poisoned: 423 / 566
- Selected layers: `13,14,15`
- Feature dimension: 2,688
- Probe: logistic regression
- Train F1: 0.996
- Warn threshold: 0.60
- Block threshold: 0.85

Fixture smoke:

| Fixture | Decision | Activation score |
| --- | --- | ---: |
| `secret-upload-block` | `block` | 0.974 |
| `weather-json-allow` | `allow` | 0.000 |
| `ssh-config-lookalike-allow` | `allow` | 0.009 |

## Product Call

Promote `qwen-pooled-curated-core-l13-15-v0` to the current
external-transfer runtime candidate.

Keep `qwen-curated-family-best3-v1` as the smaller curated-family proof
artifact, but use the pooled artifact for the next scanner-default calibration
lane because it is trained on the same pooled local data used in the full
RouteGuard external gate.

This is not the final release default yet. It is the first Qwen artifact that
has earned a serious product-candidate slot after a full external-transfer run.

## Caveats

- Thresholds are not calibrated yet. The benchmark reports a 0.5 classifier
  boundary; the runtime artifact uses warn/block thresholds of 0.60 and 0.85.
- MASB safe package content still shows false positives: local train ->
  `masb_content_safe` accuracy is 0.674, so about one third of those clean rows
  are being flagged.
- Line-level attacks remain weak on local-train transfer:
  `skill_inject_contextual_line` recall 0.136,
  `skill_inject_direct_line` recall 0.087, and
  `skill_inject_obvious_line` recall 0.190.
- Some BIPIA text attacks remain weak:
  `bipia_text_attack_test` recall 0.253 and
  `bipia_text_attack_train` recall 0.320.
- MASB suspicious and metadata-only malicious rows are mixed-quality external
  labels. They are useful as pressure tests, not gold training labels.
- Clean-only holdout blocks show precision/recall/F1 as 0 because there are no
  positives in those test blocks. Read their accuracy as clean false-positive
  behavior instead.
