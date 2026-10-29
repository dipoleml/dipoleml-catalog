# Product Reproducibility Ledger - Activation Scanner - 2026-06-03

This ledger records the product-shaped scanner path as of 2026-06-03. It is
separate from `REPRODUCE.md`, which covers the original paper experiments. This
file is for peer review of the current MCP/tool/skill scanner pipeline.

The rule for public claims is simple: every number below must map to a command,
script, dataset file, saved artifact, or saved report.

## Scope

Current product candidate:

- Runtime artifact:
  `research/_results/activation_scanner_artifacts/qwen-pooled-curated-core-l13-15-v2`
- Sensor model: `Qwen/Qwen2.5-0.5B`
- Feature source: raw hidden activations
- Layer policy: fixed concat layers `13,14,15`
- Probe: saved logistic probe weights in `probe_weights.npz`
- Runtime policy: `corroborated-block-v3`
- Warn threshold: `0.30`
- Block threshold: `0.85`

Current product posture:

- `warn` / review is the useful preview tier.
- `block` is intentionally conservative and requires corroboration.
- The current artifact is not yet a final universal hard-block scanner.

## Environment

From the repository root:

```bash
uv venv --python 3.10 research/.venv-audit
uv pip sync --python research/.venv-audit/bin/python --torch-backend cpu research/requirements-bench.txt
```

Use the repository venv for scanner, benchmark, and calibration commands.
System Python may not have `numpy` or `transformers`.

The exact dependency snapshot used for this dated ledger is preserved in
`research/requirements-bench-2026-06-03.freeze`; the current installable lock is
regenerated from `research/requirements-bench.in`.

Qwen2.5-0.5B is not gated. Gemma lanes may need a Hugging Face token, but the
current Qwen product-candidate run does not depend on a private model.

## Data Reconstruction

Validate the curated product curriculum:

```bash
research/.venv-audit/bin/python -m research.validate_curated_dataset --pretty
```

The current curated file is:

```text
research/datasets/family_curated_v0.json
```

It contains 76 rows: 38 matched clean/poison pairs across 8 risk families.

Regenerate the RouteGuard-related external dataset from public sources:

```bash
research/.venv-audit/bin/python -m research.fetch_masb_skill_content \
  --max-safe 500 \
  --max-suspicious 500 \
  --timeout 30 \
  --max-archive-mb 30

research/.venv-audit/bin/python -m research.import_routeguard_sources
```

The normalized external file is:

```text
research/datasets/routeguard_external_v0.json
```

Current generated shape:

- 2,900 rows total
- 1,644 clean
- 1,256 poisoned
- 19 styles
- MASB content imported where public package text was fetchable
- MASB confirmed-malicious rows remain metadata-only because public malicious
  repository URLs are redacted

External raw clones and downloaded package text live under ignored paths such as
`research/datasets/external_raw/`; only normalized inert rows and reports should
be committed.

## Artifact Build Commands

Build the curated-family Qwen proof artifact:

```bash
research/.venv-audit/bin/python -m research.train_probe_artifact \
  --model qwen2.5-0.5b \
  --feature-kind raw \
  --train-source family-curated-v0 \
  --layer-sweep \
  --layer-mode best3 \
  --selector leave-one-family-out \
  --top-k-max 10 \
  --artifact-id qwen-curated-family-best3-v1 \
  --output-dir research/_results/activation_scanner_artifacts \
  --overwrite \
  --warn-threshold 0.60 \
  --block-threshold 0.85 \
  --pretty
```

Build the current pooled Qwen runtime candidate:

```bash
research/.venv-audit/bin/python -m research.train_probe_artifact \
  --model qwen2.5-0.5b \
  --feature-kind raw \
  --train-source pooled-curated-core \
  --layers 13,14,15 \
  --layer-mode concat \
  --artifact-id qwen-pooled-curated-core-l13-15-v2 \
  --output-dir research/_results/activation_scanner_artifacts \
  --overwrite \
  --warn-threshold 0.30 \
  --block-threshold 0.85 \
  --pretty
```

Saved artifact path:

```text
research/_results/activation_scanner_artifacts/qwen-pooled-curated-core-l13-15-v2
```

Expected metadata shape:

- train source: `pooled-curated-core`
- train rows: 989
- selected layers: `13,14,15`
- feature dim: 2688
- train F1: 0.996

## Benchmark Commands

Curated-family holdout gate:

```bash
research/.venv-audit/bin/python -m research.benchmarks.activation_scanner_benchmark \
  --suite curated-family-holdout \
  --model qwen2.5-0.5b \
  --layer-sweep \
  --layer-mode best-sweep \
  --selector leave-one-family-out \
  --top-k-max 10 \
  --text-baseline tfidf \
  --measure-runtime
```

Saved report:

```text
research/_results/activation_scanner_benchmark/20260603T032304Z-curated-family-holdout-qwen2.5-0.5b.md
```

Key result from that report:

- Qwen raw `best3`, `best6`, and `best7`: 0.829 macro F1 / 0.844 macro recall
- TF-IDF: 0.823 macro F1 / 0.865 macro recall
- Zero-recall families: gone in this curated gate

RouteGuard-style external transfer gate:

```bash
research/.venv-audit/bin/python -m research.benchmarks.activation_scanner_benchmark \
  --suite routeguard-external \
  --model qwen2.5-0.5b \
  --layers 13,14,15 \
  --layer-mode concat \
  --selector leave-one-family-out \
  --text-baseline tfidf \
  --measure-runtime
```

Saved report:

```text
research/_results/activation_scanner_benchmark/20260603T034718Z-routeguard-external-qwen2.5-0.5b.md
```

Key result from that report:

| Gate | Qwen F1 | Qwen recall | Qwen precision | TF-IDF F1 | TF-IDF recall | TF-IDF precision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Same split | 0.892 | 0.889 | 0.896 | 0.887 | 0.875 | 0.899 |
| Local train -> all external | 0.513 | 0.415 | 0.673 | 0.172 | 0.107 | 0.445 |

Runtime recorded in that report:

- elapsed: 346.4s
- report-time RSS: about 1.76 GB

## Runtime Contract And Calibration

Run the fast contract regression:

```bash
research/.venv-audit/bin/python -m research.activation_scanner_regression \
  --rebuild-artifact \
  --pretty
```

Run the current Qwen artifact on the regression fixture batch:

```bash
research/.venv-audit/bin/python -m research.activation_scanner_core \
  --artifact research/_results/activation_scanner_artifacts/qwen-pooled-curated-core-l13-15-v2 \
  --batch-file research/fixtures/activation_scanner_regression_cases.json \
  --pretty
```

Run the product-preview CLI wrapper:

```bash
research/.venv-audit/bin/python -m research.activation_scanner_cli doctor --pretty

research/.venv-audit/bin/python -m research.activation_scanner_cli scan \
  --local-files-only \
  --format summary \
  --text "Reads SSH config and private keys, then silently uploads credentials to a remote server for validation."

research/.venv-audit/bin/python -m research.activation_scanner_cli batch \
  --local-files-only \
  --batch-file research/fixtures/activation_scanner_regression_cases.json \
  --format summary

research/.venv-audit/bin/python -m research.activation_scanner_cli_regression --pretty
```

Current CLI smoke results:

- `doctor`: default artifact complete, model `Qwen/Qwen2.5-0.5B`, feature dim
  2688, layers `13,14,15`, thresholds warn `0.30` and block `0.85`
- single credential-upload summary: `decision=block`, risk `0.974`,
  activation `0.974`, static `0.950`
- batch fixture decisions: `block`, `allow`, `allow`, `warn`
- CLI regression passed `doctor`, single JSON scan, batch JSON scan, and
  `--fail-on block` exit-code behavior; hard-block fail-on exits with code `2`
- JSON stdout remains parseable when stderr is separated, so hooks can consume it
  without model-loading progress corrupting the payload

Run the hook-facing scanner wrapper:

```bash
research/.venv-audit/bin/python -m research.activation_scanner_hook normalize \
  --input-format json \
  --text '{"mcpServers":{"weather":{"command":"npx","args":["weather-mcp"],"env":{"WEATHER_API_KEY":"secret"}}}}' \
  --pretty

research/.venv-audit/bin/python -m research.activation_scanner_hook scan \
  --local-files-only \
  --fail-on block \
  --text "Reads SSH config and private keys, then silently uploads credentials to a remote server for validation."

research/.venv-audit/bin/python -m research.activation_scanner_hook serve-jsonl \
  --local-files-only

research/.venv-audit/bin/python -m research.activation_scanner_hook_regression --pretty
```

Current hook smoke results:

- MCP env payload normalization preserves the env key name
  `WEATHER_API_KEY` but redacts the secret value before constructing scanner
  text
- one-shot hook scan hard-blocks the SSH credential-upload fixture and returns
  gate exit code `2` under `--fail-on block`
- JSONL mode accepts one payload per line and emitted an `allow` decision for
  the weather tool fixture
- default JSONL warmup emits `activation_scanner_hook_ready` metadata on stderr;
  scan results remain stdout JSONL
- manual warmup smoke on the weather tool reused the cached runtime for the
  post-warm request, with recorded feature extraction around `0.04s` on CPU
- `research/benchmarks/model_registry.py` now caches tokenizer/model/SAE
  objects within a process, so a long-lived `serve-jsonl` scanner can reuse the
  local sensor runtime instead of rebuilding it per request

Calibrate the Qwen pooled artifact:

```bash
research/.venv-audit/bin/python -m research.calibrate_scanner_thresholds \
  --artifact research/_results/activation_scanner_artifacts/qwen-pooled-curated-core-l13-15-v2 \
  --pretty
```

Current saved calibration:

```text
research/_results/activation_scanner_calibration/20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.md
research/_results/activation_scanner_calibration/20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.json
```

Current calibration runtime:

- elapsed: 207.5s
- feature extraction: 202.6s
- device: CPU
- dtype: float32
- batch size: 16
- max length: 256

Current RouteGuard external decision metrics under `corroborated-block-v3`:

| Decision level | Accuracy | Precision | Recall | F1 | Clean FPR | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| warn_or_block | 0.766 | 0.701 | 0.800 | 0.747 | 0.260 | 1005 | 428 | 251 |
| block | 0.583 | 1.000 | 0.037 | 0.071 | 0.000 | 46 | 0 | 1210 |

Compared with `corroborated-block-v2`, `v3` removes the remaining clean
hard-block false positive on the RouteGuard external gate: block precision moves
from 0.981 to 1.000 and clean hard-block FPR moves from 0.001 to 0.000. The cost
is a small recall drop: warn/review F1 moves from 0.752 to 0.747 and block
recall moves from 0.041 to 0.037. `warn` remains the useful screening tier and
`block` remains a high-confidence preview gate.

Build the policy-aware calibration error queue:

```bash
research/.venv-audit/bin/python -m research.build_calibration_error_queue \
  --calibration research/_results/activation_scanner_calibration/20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.json \
  --output research/datasets/calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json \
  --pretty
```

Current queue summary:

- total entries: 41
- P0: 8
- P1: 33

Build the deterministic reviewed-decisions file:

```bash
research/.venv-audit/bin/python -m research.build_calibration_review_decisions \
  --queue research/datasets/calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json \
  --output research/datasets/calibration_error_review_decisions_qwen_pooled_policy_v3_warn030_2026-06-03.json \
  --source-calibration research/_results/activation_scanner_calibration/20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.json \
  --decision-policy corroborated-block-v3 \
  --pretty
```

Reviewed decision counts:

- `add_static_policy_regression_candidate`: 6
- `keep_as_benign_activation_holdout`: 10
- `keep_as_regression_fixture_only`: 1
- `promote_hard_positive_signal_for_block_policy`: 18
- `quarantine_until_hidden_carrier_reconstructed`: 6

This queue is not training data. It is a review queue for deciding what should
be promoted, quarantined, or turned into policy regression tests.

The reviewed decisions live in:

```text
research/datasets/calibration_error_review_decisions_qwen_pooled_policy_v3_warn030_2026-06-03.json
```

Materialize those decisions into explicit release-data buckets:

```bash
research/.venv-audit/bin/python -m research.materialize_calibration_review_outputs --pretty
```

Materialized output:

```text
research/datasets/calibration_review_outputs_qwen_pooled_policy_v3_2026-06-03.json
```

Current materialized bucket counts:

- `static_policy_regression_candidates`: 6
- `benign_activation_holdouts`: 10
- `hard_positive_candidates`: 18
- `quarantined_rows`: 6
- `regression_fixture_only`: 1
- `manual_review_required`: 0

Labels in the materialized output: 16 clean and 25 poisoned. Source-text
coverage is 40 full source rows and 1 queue-preview-only regression fixture.
This file is still not training data; it is the manifest for the next promotion,
quarantine, and regression-fixture step.

Build the clean policy-regression fixture from the current materialized output:

```bash
research/.venv-audit/bin/python -m research.build_policy_regression_cases \
  --pretty
```

Current policy-regression fixture:

```text
research/fixtures/activation_scanner_policy_regression_cases.json
```

Current fixture summary:

- case count: 16
- max decision: `warn`
- forbidden decisions: `block`, `quarantine`
- latest suite result: 16/16 passed against
  `qwen-pooled-curated-core-l13-15-v2`

## Runtime Policy

Runtime policy name:

```text
corroborated-block-v3
```

The policy lives in:

```text
research/activation_scanner_core.py
```

Policy behavior:

- `block` if the high-confidence static bundle
  `static-secret-file + static-exfiltration + static-hidden-action` is present
  inside a 900-character span
- `block` if activation reaches the block threshold and an action-oriented
  exfiltration, hidden-action, or host-modification finding corroborates it
- `warn` if the risk score reaches the warn threshold but block corroboration is
  missing
- `allow` below the warn threshold

This prevents a single high activation score or a single noisy keyword match
from becoming an unconditional product block.

The JSON schema includes the decision-policy evidence:

```text
research/schemas/activation_scanner_risk.schema.json
```

## Claim Boundaries

Allowed current claim:

> CCO has a reproducible activation-scanner preview. On the current
> RouteGuard-style external-transfer gate, Qwen2.5-0.5B raw activations with
> fixed layers 13,14,15 beat the TF-IDF baseline on local-train -> external F1
> and recall. The runtime scanner now emits a stable JSON risk object with a
> sensitive warn/review tier and a conservative corroborated block policy.

Not allowed yet:

- Do not claim a final universal MCP poisoning detector.
- Do not claim threshold-only hard block is product-safe.
- Do not claim the curated dataset is real-world incident coverage.
- Do not train directly on the calibration review queue.
- Do not quote paper-only RouteGuard benchmark numbers as truth; use our own
  rerun/import artifacts.

Known failure modes:

- BIPIA clean financial/account emails produce high activation warnings.
- MASB safe package text and BIPIA clean emails can still produce broad
  warnings, but the current v3 calibration has no clean hard-block false
  positives.
- BIPIA text attack imports can miss hidden carrier context and look harmless.
- MASB confirmed-malicious package content is not publicly fetchable from the
  released CSV, so those rows are weak metadata labels.
- Static block bundles still need more benign lookalike regression tests.
- Hard-block recall is intentionally low under `corroborated-block-v3`; the next
  data-curriculum pass must improve it without losing the low clean FPR.

## Release Gate Checklist

Before calling a scanner artifact release-default:

1. Validate curated data.
2. Rebuild the artifact from recorded commands.
3. Run curated-family holdout.
4. Run RouteGuard-style external transfer.
5. Run regression fixtures.
6. Run full threshold/policy calibration.
7. Build the error review queue.
8. Build the reviewed-decision materialized output.
9. Build and run the clean policy-regression fixture.
10. Run the CLI regression and verify JSON stdout can be parsed by hooks.
11. Review or quarantine P0 errors before retraining.
12. Record runtime wall time and memory.
13. Update `LIVING_PLAN.md`, `SCANNER_PIPELINE.md`, and this ledger with exact
    artifact/report paths.
