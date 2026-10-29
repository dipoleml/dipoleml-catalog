# Datasets

## Our experiment data (included in repo)

| File | Experiment | Description |
|------|-----------|-------------|
| `adversarial_poisoned.json` | Exp 3 | 30 poisoned descriptions, MCPTox vocab removed |
| `adversarial_poisoned_v2.json` | Exp 4 | 30 poisoned, diverse writing styles (5.4% vocab overlap) |
| `adversarial_poisoned_v3.json` | — | 30 poisoned, ultra-stealthy (no security keywords) |
| `hard_clean.json` | Exp 5a (v1) | 30 safe descriptions, same-topic as poisoned |
| `hard_poisoned.json` | Exp 5a (v1) | 30 poisoned descriptions, same-topic as clean |
| `hard_v2_clean.json` | **Exp 5a** | **20 safe descriptions, same vocabulary as poisoned** |
| `hard_v2_poisoned.json` | **Exp 5a** | **20 malicious descriptions, same vocabulary as clean** |
| `hard_v3_clean.json` | **Exp 5b** | **100 safe descriptions (8 categories)** |
| `hard_v3_poisoned.json` | **Exp 5b** | **100 malicious descriptions (8 categories)** |
| `hard_v3_matched_clean.json` | — | Length-matched subset of v3 (8 pairs within 20 chars) |
| `hard_v3_matched_poisoned.json` | — | Length-matched subset of v3 |
| `neutral_clean.json` | Control test | 15 clean descriptions without reassurance patterns |
| `neutral_poisoned.json` | Control test | 15 poisoned descriptions without additive patterns |
| `hard_v2_clean_no_reassurance.json` | Control test | 20 clean descriptions, no reassurance clauses |
| `mcptox_clean_descriptions_labeled.json` | Exp 2 | 362 clean rows extracted from MCPTox servers; 342 have non-empty descriptions used by text/activation benchmarks |
| `mcptox_poisoned_descriptions_labeled.json` | Exp 2 | 485 poisoned descriptions from MCPTox, labeled |
| `family_curated_v0.json` | Product v0 data curriculum | 38 matched clean/poison pairs across 8 risk families, including accepted public Skill-Inject SKILL.md pairs with source-confirmed unsafe actions and direct `system_inventory`/bridge cases |
| `routeguard_external_v0.json` | RouteGuard-related external benchmark import | 2,900 inert rows normalized from public Skill-Inject, BIPIA, and MaliciousAgentSkillsBench sources. Skill-Inject rows are constructed `SKILL.md` carriers, BIPIA rows are external-context carriers, MASB safe/suspicious rows use fetchable package text where available, and confirmed-malicious MASB rows remain metadata-only because public malicious repo URLs are redacted. |
| `calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json` | Qwen pooled policy-aware calibration-error review queue | 41 review entries from `qwen-pooled-curated-core-l13-15-v2` under `corroborated-block-v3` with `warn=0.30`: false warn/block rows, missed poison, and near-block poisoned rows. Do not train on it directly. |
| `calibration_error_review_decisions_qwen_pooled_policy_v3_warn030_2026-06-03.json` | Reviewed calibration-error curriculum decisions | Splits the 41 queue entries into static-policy regression candidates, benign activation holdouts, BIPIA hidden-carrier quarantine rows, missed/near-block poison candidates, weak metadata quarantine, and regression-only fixtures. Do not train on it directly. |
| `calibration_review_outputs_qwen_pooled_policy_v3_2026-06-03.json` | Materialized reviewed calibration outputs | Turns the reviewed decisions into release-data buckets: static policy regression candidates, benign activation holdouts, hard-positive candidates, quarantined rows, regression-only fixtures, and manual-review leftovers. Do not train on it directly. |
| `curriculum_review_queue_v0.json` | External-row manual review queue | Generated triage queue for public rows that may become curated curriculum rows after action-level review. Do not train on it directly. |
| `curriculum_review_decisions_v0.json` | Accepted external-row decisions | Records the first 8 accepted Skill-Inject promotions into `family_curated_v0.json`; MASB suspicious rows remain weak-label candidates, not gold training data. |
| `DATA_CURRICULUM.md` | Curriculum rubric | Manual labeling rules, risk-family definitions, curriculum levels, and promotion workflow. |

## External data (auto-cloned by notebook)

| Source | Experiment | How to get |
|--------|-----------|------------|
| MCPTox-Benchmark | Exp 1-2 | `git clone https://github.com/zhiqiangwang4/MCPTox-Benchmark.git` |

The notebook `research/reproduce-experiments.ipynb` will auto-clone MCPTox if not present.

Current external-source triage lives in
`research/datasets/EXTERNAL_DATA_SOURCE_REVIEW_2026-06-02.md`.

Raw external imports should stay outside git. Prefer ignored paths such as
`datasets/hf-*` or `research/datasets/external_raw/`, then commit only small
normalized samples, source registries, schemas, and benchmark reports.

RouteGuard-related source clones used for `routeguard_external_v0.json` live
under the ignored `research/datasets/external_raw/` directory:

- `skill-inject`: `https://github.com/aisa-group/skill-inject.git`
- `BIPIA`: `https://github.com/microsoft/BIPIA.git`
- `MaliciousAgentSkillsBench`: `https://github.com/protectskills/MaliciousAgentSkillsBench.git`

MASB package-content extraction is a separate safe fetch step. It only downloads
public GitHub ZIP archives, validates ZIP paths, and reads inert text from skill
directories; it does not execute downloaded code.

```bash
research/.venv-audit/bin/python -m research.fetch_masb_skill_content \
  --max-safe 500 \
  --max-suspicious 500 \
  --timeout 30 \
  --max-archive-mb 30
```

The first full fetch over 1,000 MASB safe/suspicious candidates covered
296 unique public GitHub ZIP URLs and produced 687 content rows. The normalized
dataset currently imports 399 safe and 232 suspicious-candidate MASB content
rows. Suspicious-candidate is a weak poisoned label, not confirmed malicious
behavior. Confirmed-malicious MASB package content is not publicly fetchable
from the released CSV because the malicious repository URLs are redacted.

Regenerate the normalized inert dataset from repo root with:

```bash
research/.venv-audit/bin/python -m research.import_routeguard_sources
```

Build the manual review queue from the RouteGuard-related external rows with:

```bash
research/.venv-audit/bin/python -m research.build_curriculum_review_queue
```

Build the calibration-error review queue from the current Qwen pooled
policy-aware threshold report with:

```bash
research/.venv-audit/bin/python -m research.build_calibration_error_queue \
  --calibration research/_results/activation_scanner_calibration/20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.json \
  --output research/datasets/calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json \
  --pretty
```

Generate the reviewed decisions file from that queue. It records what can be
promoted, quarantined, or converted into policy regressions:

```bash
research/.venv-audit/bin/python -m research.build_calibration_review_decisions \
  --queue research/datasets/calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json \
  --output research/datasets/calibration_error_review_decisions_qwen_pooled_policy_v3_warn030_2026-06-03.json \
  --source-calibration research/_results/activation_scanner_calibration/20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.json \
  --decision-policy corroborated-block-v3 \
  --pretty
```

Materialize the reviewed decisions into release-data buckets:

```bash
research/.venv-audit/bin/python -m research.materialize_calibration_review_outputs \
  --pretty
```

Build the clean policy-regression fixture from the current materialized review
outputs. These rows may warn, but must not become automatic hard blocks:

```bash
research/.venv-audit/bin/python -m research.build_policy_regression_cases \
  --pretty
```

Promote the source-confirmed Skill-Inject rows that have already passed
action-level review:

```bash
research/.venv-audit/bin/python -m research.promote_skillinject_curriculum
```

## Family-aware curriculum direction

The current dataset is enough to prove that activation features can carry a
signal, but it is not enough to claim product-grade scanner coverage.

New cases should be added with explicit risk-family metadata, not just
`clean`/`poisoned` labels. The working families are:

- `instruction_chaining`
- `secret_file_access`
- `credential_forwarding`
- `network_exfiltration`
- `hidden_persistence_logging`
- `live_system_access`
- `system_inventory`
- `tool_shadowing`

Prefer matched clean/poison pairs when possible. A useful pair differs by the
dangerous behavior, not by obvious prompt-injection wording.

Use `DATA_CURRICULUM.md` as the labeling rubric. External rows are not training
truth until their unsafe action, family, label confidence, and review status are
confirmed.

Validate the curated v0 dataset before using it for a release artifact:

```bash
research/.venv-audit/bin/python -m research.validate_curated_dataset --pretty
```

`family_curated_v0.json` is intentionally labeled as curated/synthetic or
real-carrier-adapted. It is a product-training curriculum and regression gate,
not a claim of real-world incident coverage.

See `research/SCANNER_PIPELINE.md` for the retraining and release loop.
