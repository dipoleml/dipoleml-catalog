# Living Plan - Activation Scanner Product Roadmap

Last updated: 2026-06-03
Owner: Nicole + Codex
Status: active research-to-product plan

## North Star

Build a local install-time scanner for AI agent extensions: MCP servers, skills,
plugins, hooks, agent configs, and tool metadata. Before an AI harness installs
or enables new capability, the scanner reads the proposed capability and returns
a risk decision.

The product claim is not "another prompt-injection classifier." The product
claim is:

> Use a small local sensor model to inspect internal activations from tool and
> skill descriptions, then combine that signal with static checks and optional
> SAE explanations before the untrusted capability runs.

The scanner should work even when the protected agent is closed-source. We do
not need Claude/Codex internals to scan a tool description; we run our own local
sensor model over the content.

## Launch Posture

The priority is now launch-first: get the paper-backed activation scanner in
front of users, earn attention, and make the comparison with text-based scanner
families concrete.

This does not mean pretending the detector is finished. It means shipping the
methodology, reproducible benchmark, honest caveats, and a visible product path
now, then improving the dataset and probe like a pentest-updated security
product.

Public wedge:

> Existing scanner paths we source-verified look at text, rules, or text
> classifiers. CCO is adding a second signal: a local frozen sensor model plus
> activation probes for tool, MCP, skill, plugin, and hook poisoning.

Priority framing:

Nicole's activation-probe write-up is dated March 29, 2026. RouteGuard appeared
later on arXiv on April 24, 2026. Treat RouteGuard as independent corroboration
that internal signals matter for skill-poisoning defense, not as a reason to
give up the product-first claim. The defensible public line is: March paper,
open productization path, later related work validating the category.

Launch rule:

- Put the activation scanner preview in the public README.
- Keep the benchmark commands runnable from the repo root.
- Be explicit that the dashboard currently ships the static scanner, while the
  activation scanner is the research-to-product preview.
- Do not wait for the perfect dataset before publishing the pipeline.
- Do not headline same-split 99% numbers as product-grade generalization.

Launch surface completed:

- README badge and activation scanner preview section added.
- `research/README.md` added as the short public entrypoint.
- `research/PRODUCT_REPRODUCIBILITY_LEDGER_2026-06-03.md` added as the
  peer-review ledger for the product-shaped scanner path: setup, data
  reconstruction, artifact build, calibration, review queue, runtime policy,
  and claim boundaries.
- RouteGuard surface check added:
  `research/ROUTEGUARD_SURFACE_CHECK_2026-06-02.md`. Public surfaces checked on
  2026-06-02 showed no linked ScienceCast video, no CatalyzeX code, no Hugging
  Face model/dataset/Space, and no GitHub repository search hit. Treat it as
  later corroborating research, not a competing product.
- RouteGuard paper review added:
  `research/ROUTEGUARD_PAPER_REVIEW_2026-06-02.md`. The useful signal is
  category validation: skill poisoning is an instruction-carrier problem where
  internal signals beat text-only screening. The product distinction remains:
  RouteGuard needs attention/hidden states from large open-weight backbones,
  while CCO uses its own local sensor model so the protected agent can be
  closed-source.
- External-source reliability pass added:
  `research/datasets/EXTERNAL_DATA_SOURCE_REVIEW_2026-06-02.md` now separates
  public runnable benchmark/data sources from paper-only claims. `Skill-Inject`,
  `AgentDojo`, `AgentTrap`, `OpenClaw/clawhub-security-signals`,
  `yoonholee/agent-skill-malware`, and `ProtectSkills/MaliciousAgentSkillsBench`
  are higher-value evidence/import candidates than RouteGuard's standalone
  paper metrics.
- RouteGuard-related public sources were imported into inert scanner rows:
  `research/import_routeguard_sources.py` normalizes `Skill-Inject`, `BIPIA`,
  and `ProtectSkills/MaliciousAgentSkillsBench` into
  `research/datasets/routeguard_external_v0.json`. The current generated
  dataset has 2,900 rows: 1,644 clean and 1,256 poisoned across 19 styles.
  Schema smoke passed with 2,900 unique ids and 0 structural errors.
  MASB confirmed-malicious repo URLs are redacted in the public release, so
  malicious MASB remains metadata-only; public safe/suspicious MASB package
  content is now imported where fetchable.
- `research/fetch_masb_skill_content.py` added as a safe, inert MASB content
  fetcher. It downloads only public GitHub ZIP archives, checks ZIP paths,
  never executes package code, and extracts text from skill directories. The
  first full fetch over 1,000 MASB safe/suspicious candidates covered 296 unique
  URLs and produced 687 content rows; 399 safe and 232 suspicious-candidate
  content rows made it into `routeguard_external_v0.json`.
- Benchmark runner now supports `--suite routeguard-external`, which runs
  same-split, leave-one-style-out, local-train -> external, per-style transfer,
  TF-IDF baseline, raw activation, SAE, top-k/best-auto, and runtime reporting
  over the imported RouteGuard-related rows.
- Benchmark runner now suppresses repeated sklearn logistic-regression
  convergence warnings, so high-dimensional selector smoke runs do not flood
  terminal output. This does not change the classifier or benchmark metrics.
- Public quick-smoke command verified with Pythia-70M + SAE + TF-IDF from the
  repo root. Latest local report:
  `research/_results/activation_scanner_benchmark/20260601T234513Z-cross-style-pythia-70m.md`.
- That demo shows the useful launch contrast: hand-core -> MCPTox recall is
  87.2% for Pythia SAE vs 54.4% for TF-IDF, while MCPTox -> hand-core still
  fails for all methods and remains the next data-curriculum problem.
- `research/activation_scanner_demo.py` added as the first single-text JSON
  risk-object demo. It retrains from local data at runtime and is therefore a
  preview shape, not the final cached scanner package.
- `research/scanner_static.py`, `research/train_probe_artifact.py`, and
  `research/activation_scanner_core.py` added as the first cached scanner core:
  train once, save `metadata.json` plus `probe_weights.npz`, then scan new text
  without retraining.
- `research/activation_scanner_hook.py` added as the first product hook wrapper:
  it accepts MCP server maps, tool definitions, skills, hook payloads, or plain
  text; redacts secret values; emits gate JSON; and supports a long-lived
  `serve-jsonl` process for repeated scans.
- `research/benchmarks/model_registry.py` now caches tokenizer/model/SAE objects
  within a process, so the JSONL scanner can stay warm instead of rebuilding the
  local sensor runtime per request.
- `research/schemas/activation_scanner_risk.schema.json`,
  `research/fixtures/activation_scanner_regression_cases.json`, and
  `research/activation_scanner_regression.py` added as the first runtime
  contract lane. The regression runner builds a cheap lexical artifact and
  verifies output shape plus fixed clean/poison decisions.
- `activation_scanner_core.py` now exposes `scan_texts()` and `--batch-file`,
  so a set of tool descriptions can share one feature-extraction pass instead
  of cold-starting the sensor path for every item.
- Cached runtime smoke passed locally. `lexical-smoke-test` blocked the SSH
  private-key upload example and allowed the weather JSON example. Pythia SAE
  artifact `pythia-sae-core-v0` trained on pooled-core data in 13.2s of feature
  extraction, then returned `block` for the SSH credential-upload text and
  `allow` for the weather text.
- Cached contract regression now passes locally on 4 cases:
  `secret-upload-block`, `weather-json-allow`, `ssh-config-lookalike-allow`, and
  `secret-negation-warn`. The fourth fixture is important because it forces high
  static sensitive-file language without automatic hard block when the text
  explicitly negates private-key or credential access.
- `research/datasets/family_curated_v0.json`,
  `research/schemas/activation_curated_dataset.schema.json`, and
  `research/validate_curated_dataset.py` added as the first explicit product
  data-curriculum lane. It now has 32 matched clean/poison pairs across
  8 risk families. The latest accepted rows include 8 public Skill-Inject
  clean/poison SKILL.md pairs with source-confirmed unsafe actions.
- `research/datasets/DATA_CURRICULUM.md` now defines the manual labeling rubric:
  label the concrete unsafe action, separate benign lookalikes from subtle
  poisoned intent, and keep weak external labels out of training until reviewed.
- `research/build_curriculum_review_queue.py` adds a non-training review queue
  for external rows. It proposes family/level/confidence metadata and marks
  rows as `needs_review` before any promotion into curated training data.
- `research/skillinject_review_metadata.py` records source-level review
  metadata for Skill-Inject injection ids, and
  `research/promote_skillinject_curriculum.py` idempotently promotes the
  accepted Skill-Inject pairs into curated data while writing
  `research/datasets/curriculum_review_decisions_v0.json`.
- Benchmark runner now supports `--suite curated-family-holdout` so the curated
  set can run a tiny leave-one-family-out gate before larger family-aware
  benchmark work.
- Earlier curated v0 validation passed locally at 64 rows, 32 clean/poison
  pairs, 32 split groups, and 0 duplicate-text warnings after Skill-Inject
  promotion. That baseline is now superseded by the 76-row version below.
- Lexical curated-family-holdout smoke passed as a plumbing check on the
  expanded 64-row set. It still exposes the expected weak spots:
  `tool_shadowing` reached 0% recall for the cheap lexical activation lane,
  `network_exfiltration` reached 40% recall, and `system_inventory` reached
  25% recall. Do not read this as a model ranking; read it as evidence that the
  family-holdout gate is wired and those families need model/activation coverage
  plus better cases.
- `lexical-curated-v0` artifact retrained from the 64-row `family-curated-v0`
  set and calibrated with warn threshold 0.60 / block threshold 0.85. It passed
  the 3-case batch smoke: secret upload -> `block`, weather -> `allow`, SSH
  config lookalike -> `allow`. The lexical train F1 is only 63.5%, so treat it
  as a runtime/plumbing artifact, not a model-quality claim.
- The 64-row curated-family bakeoff had a first real product-curriculum winner:
  Qwen2.5-0.5B raw `best8` got 0.780 macro F1 / 0.825 macro recall, beating
  TF-IDF at 0.710 macro F1, SmolLM2 raw at 0.697, Pythia raw at 0.677, and
  Pythia SAE at 0.645. The result is recorded in
  `research/CURATED_FAMILY_BAKEOFF_2026-06-02.md`, and is now the previous
  baseline rather than the current artifact choice.
- Built `qwen-curated-family-best8-v0` as the first Qwen cached scanner
  artifact from `family-curated-v0`. It selected layers 9,11,12,13,14,15,16,18
  and passed the 3-case runtime smoke: secret upload -> `block`, weather ->
  `allow`, SSH config benign lookalike -> `allow`; batch cold-start took about
  9.02s on this Mac.
- Added six more clean/poison pairs to `family_curated_v0`: two direct
  `system_inventory` pairs and four cross-family bridge pairs that teach host
  fingerprinting through `network_exfiltration`, `hidden_persistence_logging`,
  `live_system_access`, and `credential_forwarding`. Validation now passes at
  76 rows, 38 pairs, 0 errors, and 0 warnings.
- New curated-family Qwen run:
  `research/_results/activation_scanner_benchmark/20260603T032304Z-curated-family-holdout-qwen2.5-0.5b.md`.
  Qwen raw `best3`, `best6`, and `best7` tie at 0.829 macro F1 / 0.844 macro
  recall, slightly ahead of TF-IDF at 0.823 macro F1 / 0.865 macro recall.
  There are no zero-recall families. `system_inventory` improved from Qwen zero
  recall to 0.500 recall / 0.667 F1, while TF-IDF still leads that family at
  0.667 recall / 0.800 F1.
- Built `qwen-curated-family-best3-v1` and promoted it over the older
  `best8-v0` curated-data runtime candidate. It selected layers 13,14,15,
  feature dim 2688, train F1 0.933, and passed the 3-case runtime smoke:
  secret upload -> `block`, weather -> `allow`, SSH config benign lookalike ->
  `allow`.
- Full fixed-layer RouteGuard external gate is now recorded in
  `research/ROUTEGUARD_EXTERNAL_QWEN_FIXED_LAYERS_2026-06-03.md`. With Qwen
  layers 13,14,15 concatenated, local train -> all RouteGuard external gets
  0.513 F1 / 0.415 recall / 0.673 precision, while TF-IDF gets 0.172 F1 /
  0.107 recall / 0.445 precision. Same-split Qwen also edges TF-IDF at
  0.892 F1 vs 0.887 F1. Full run elapsed 346.4s, with 236.2s transformer
  feature extraction.
- Built pooled runtime candidate
  `qwen-pooled-curated-core-l13-15-v2`. It trains on 989 pooled curated/core
  rows, freezes layers 13,14,15, has feature dim 2688, train F1 0.996, and
  passes the 4-case scanner fixture smoke.
- Single-text sanity checks passed locally: an SSH private-key upload example
  returned `block` in about 9.2s, and a weather forecast JSON example returned
  `allow` in about 8.8s.
- Threshold calibration for `qwen-pooled-curated-core-l13-15-v2` is recorded in
  `research/THRESHOLD_CALIBRATION_QWEN_POOLED_2026-06-03.md` and generated by
  `research/calibrate_scanner_thresholds.py`. On the full RouteGuard external
  set, `warn_or_block` gets 0.747 F1 / 0.800 recall / 0.260 clean FPR.
  The runtime policy `corroborated-block-v3` makes hard block deliberately
  conservative: block precision is 1.000 and clean FPR is 0.000, while block
  recall is only 0.037. Conclusion: keep Qwen as the activation runtime
  candidate for warn/review and use policy-gated hard block only as preview
  behavior, not a final universal hard-block claim.
- `research/build_calibration_error_queue.py` turns the policy-aware calibration
  top errors into
  `research/datasets/calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json`.
  `research/build_calibration_review_decisions.py` deterministically turns that
  queue into reviewed decisions. The current queue has 41 review entries: 8 P0
  and 33 P1. Reviewed decisions are static-policy regression candidates, benign
  activation holdouts, BIPIA/metadata quarantine, regression-only fixture
  handling, and hard-positive promotion only after clean twins or static
  corroboration.
- `research/materialize_calibration_review_outputs.py` now turns the reviewed
  decisions into explicit release-data buckets at
  `research/datasets/calibration_review_outputs_qwen_pooled_policy_v3_2026-06-03.json`:
  6 static-policy regression candidates, 10 benign activation holdouts, 18
  hard-positive candidates, 6 quarantined rows, 1 regression-fixture-only row,
  and 0 manual-review leftovers. This is a manifest for promotion/quarantine and
  regression work, not training data.
- `research/build_policy_regression_cases.py` now turns the 16 clean v3 review
  rows into `research/fixtures/activation_scanner_policy_regression_cases.json`;
  these cases may warn but must not hard-block or quarantine. The suite passed
  16/16 against the current Qwen pooled artifact.
- `research/activation_scanner_cli.py` added as the first product-preview CLI.
  It supports `doctor`, single-text `scan`, `batch`, hook-friendly JSON, human
  summaries, local artifact defaults, and `--fail-on` exit codes. CLI regression
  passed locally: default artifact complete, weather text `allow`, fixture batch
  decisions `block/allow/allow/warn`, and `--fail-on block` exits with code `2`
  while keeping JSON stdout parseable.
- Benchmark runner now supports `--layer-mode concat`, so we can compare best
  single-layer probes against all-selected-layers concatenated into one feature
  vector.
- Benchmark runner now supports generalized top-k layer policies: `bestN`
  supports any positive k, `best-sweep` reports best1..bestN in one run, and
  `best-auto` chooses k using train-fold CV without peeking at the final test
  set.
- Benchmark runner now supports `--per-layer`, so reports can show every fixed
  layer row alongside the train-CV-selected best layer.
- Benchmark runner now supports selector policies: plain CV,
  `leave-one-style-out`, and heuristic `leave-one-family-out`. Current
  family-aware results are evidence for label-curriculum work, not a default
  scanner policy.
- Benchmark runner now supports experimental `--with-family-routing`, where
  each heuristic risk family can choose its own layer/top-k policy and fall back
  to the global policy when the family has too little training data. Current
  Pythia/Qwen routed results did not beat global top-k, so this stays research
  scaffolding rather than product default.
- Layer selection is a benchmark-hygiene device, not the final product policy.
  Post-hoc best test layers are useful diagnostics; a releasable scanner needs
  fixed, nested-validation, top-k, concat, or family-aware layer policies that
  do not peek at the final test set.
- Latest Pythia-70M raw all-layer check:
  `research/_results/activation_scanner_benchmark/20260601T235902Z-cross-style-pythia-70m.md`.
  Train-CV selected layer 4 with 43.1% B-direction recall; the post-hoc best
  test layer was layer 5 with 52.0% recall / 55.3 F1; raw all-layer concat fell
  to 28.9% recall.

## Current Truth

These are the facts we can stand behind right now.

| Area | Current result | What it means |
| --- | --- | --- |
| Existing text detector baseline | `protectai/deberta-v3-base-prompt-injection-v2` catches classic prompt injection, but misses subtle tool poisoning: 0% recall on matched/neutral/hard sets and about 19.8% recall on MCPTox. | Text prompt-injection detectors are out-of-distribution for subtle tool-description poisoning. |
| In-distribution activation probe | GPT-2 layer-3 probe hits 99.2% accuracy and 100% recall on MCPTox same split; 96.5% accuracy and 97.7% recall on pooled small hand sets. | Activation carries a strong signal, but this is supervised and not a zero-shot science comparison. |
| Canonical Gemma 3 270M same-split regression | On MCPTox same-split, Gemma 270M raw gets 98.8% accuracy / 99.3% recall; Gemma 270M SAE and TF-IDF both hit 100% recall. | Same-split is easy and useful for regression only. It must not be the product headline. |
| Early paper matched-vocab result | Best text method was about 79.5% while activation probe stayed around 97% after length control. | Same-topic, same-vocabulary descriptions can still separate inside model activations. |
| Cross-style generalization | Raw activation transfer is model- and layer-dependent. GPT-2 chosen layer can collapse; Pythia and Gemma transfer better in some directions. | The product needs a model bakeoff and layer sweep, not a GPT-2-only story. |
| Latest canonical Pythia-70M SAE cross-style run | On hand-core -> MCPTox, Pythia-70M SAE layer 2 gets 87.2% recall / 73.6 F1 in 17.6s; same layer raw activation gets 33.4% recall / 40.4 F1; TF-IDF gets 54.4% recall / 59.1 F1. On MCPTox -> hand-core, recall is still 0%. | Pythia-70M SAE remains the strongest older cross-style lane, but it is not a universal default after the RouteGuard external run. It is not a complete detector until the MCPTox -> hand-core data gap is fixed. |
| Cached Pythia-70M SAE runtime artifact | `research.train_probe_artifact` built `pythia-sae-core-v0` from pooled-core data: 913 train rows, SAE dim 32768, logistic probe train F1 98.4%, feature extraction 13.2s. `research.activation_scanner_core` then scored new text without retraining: SSH credential-upload text got activation score 0.668 plus static 0.95 -> `block`; weather JSON text got activation score 0.154 and static 0 -> `allow`. Runtime scan cold-start was about 13.3s on this Mac because each smoke invocation loaded the model and SAE. | The product shape now exists as a cached scanner core. Next work is calibration, hook integration, warm-process/runtime batching, and better family-labeled data. |
| Cached scanner runtime contract and CLI preview | Added JSON schema, 4 regression fixtures, `research.activation_scanner_regression`, `research.activation_scanner_cli`, and `research.activation_scanner_cli_regression`. Current Qwen pooled batch CLI passed the same fixtures in one model pass: secret upload -> `block`, weather -> `allow`, SSH config benign lookalike -> `allow`, secret negation -> `warn`; latest local batch smoke was about 5.5s after cached model files were available. `--fail-on block` exits with code `2`, and JSON stdout stays parseable for hooks when stderr is separated. | The hook-facing output contract is now testable, including a policy case where high static sensitive-file language is downgraded from block to warn without corroboration. Batch scanning is the right install-time shape for many tools; a long-lived warm scanner process is still future work. |
| Curated family v0 dataset | Expanded to 76 rows: 38 clean/poison twin pairs across `instruction_chaining`, `secret_file_access`, `credential_forwarding`, `network_exfiltration`, `hidden_persistence_logging`, `live_system_access`, `system_inventory`, and `tool_shadowing`. The latest patch added 2 direct `system_inventory` pairs plus 4 cross-family bridge pairs for host fingerprinting behavior. `curriculum_review_decisions_v0.json` still records the accepted public Skill-Inject promotions. | This is now a cleaner product-training curriculum and a better family-holdout gate. It is still not real-world incident proof; weak MASB suspicious labels remain out of gold training until reviewed. |
| Curated-family model bakeoff | Latest report is `research/CURATED_FAMILY_BAKEOFF_2026-06-03.md`. On `curated-family-holdout` with `leave-one-family-out`, Qwen2.5-0.5B raw `best3`, `best6`, and `best7` tie at 0.829 macro F1 / 0.844 macro recall. TF-IDF gets 0.823 macro F1 / 0.865 macro recall. Zero-recall families are gone; Qwen `system_inventory` improved from 0 recall to 0.500 recall / 0.667 F1. | On the curated product curriculum, Qwen raw still leads by macro F1 and is now less brittle than the old `best8` run. It is not final default evidence because TF-IDF still has higher macro recall, TF-IDF still beats Qwen on `system_inventory`, and RouteGuard-style external transfer remains harder. |
| Qwen curated runtime artifact | Built `research/_results/activation_scanner_artifacts/qwen-curated-family-best3-v1`: raw Qwen2.5-0.5B, selected layers 13,14,15, feature dim 2688, train F1 0.933. Runtime fixture smoke passed: `secret-upload-block` -> `block` at activation score 0.968, `weather-json-allow` -> `allow` at 0.006, and `ssh-config-lookalike-allow` -> `allow` at 0.057. | Keep `best3-v1` as the curated-family proof artifact and hook-smoke artifact. It is now superseded for pooled runtime candidacy by `qwen-pooled-curated-core-l13-15-v2`, which uses the same fixed layers but trains on the larger pooled local data. |
| Qwen fixed-layer RouteGuard external gate | Latest full report: `research/_results/activation_scanner_benchmark/20260603T034718Z-routeguard-external-qwen2.5-0.5b.md`. Fixed concat layers 13,14,15 get same-split 0.892 F1 vs TF-IDF 0.887. Local train -> all RouteGuard external gets 0.513 F1 / 0.415 recall / 0.673 precision vs TF-IDF 0.172 F1 / 0.107 recall / 0.445 precision. Full run elapsed 346.4s; transformer feature extraction was 236.2s; report-time RSS was about 1.76 GB. | This supersedes the older Qwen layer-auto demotion. Fixed layers from the curated-family curriculum turn Qwen into the current external-transfer activation candidate. It still needs better line-level recall, broad clean-warning reduction, and warm-process runtime before release default. |
| Qwen pooled runtime artifact | Built `research/_results/activation_scanner_artifacts/qwen-pooled-curated-core-l13-15-v2`: raw Qwen2.5-0.5B, train source `pooled-curated-core`, 989 train rows, selected layers 13,14,15, feature dim 2688, train F1 0.996, artifact thresholds warn 0.30 / block 0.85. Runtime fixture smoke passed: `secret-upload-block` -> `block` at activation score 0.974, `weather-json-allow` -> `allow` at 0.000, `ssh-config-lookalike-allow` -> `allow` at 0.009, and `secret-negation-warn` -> `warn` with high static risk but low activation. | Promote this to the current activation runtime candidate for warn/review and conservative hard block. It supersedes v1 by sharply reducing hard-block false positives. |
| Qwen pooled threshold calibration | Latest report: `research/THRESHOLD_CALIBRATION_QWEN_POOLED_2026-06-03.md`, generated from full output `research/_results/activation_scanner_calibration/20260603T102832Z-qwen-pooled-l13-15-threshold-calibration.md`. Under `corroborated-block-v3`, RouteGuard external `warn_or_block` gets 0.766 accuracy / 0.701 precision / 0.800 recall / 0.747 F1 / 0.260 clean FPR. The policy-gated `block` tier gets 0.583 accuracy / 1.000 precision / 0.037 recall / 0.071 F1 / 0.000 clean FPR with 0 false blocks. | This is the current product posture: sensitive warn/review, very conservative hard block. `v3` removes the remaining clean hard-block false positive from `v2`, at the cost of a small recall/F1 drop, so hard-block recall is still not release-final. |
| Calibration error review output manifest | `research/datasets/calibration_error_review_queue_qwen_pooled_policy_v3_warn030_2026-06-03.json` has 41 entries from the Qwen pooled policy-aware calibration top errors: 8 P0 and 33 P1. `research/datasets/calibration_error_review_decisions_qwen_pooled_policy_v3_warn030_2026-06-03.json` splits them into 6 static-policy regression candidates, 10 benign activation holdouts, 6 hidden/metadata quarantine rows, 18 hard-positive candidates, and 1 regression-only fixture. `research/datasets/calibration_review_outputs_qwen_pooled_policy_v3_2026-06-03.json` materializes those into release-data buckets with 40 full source rows and 1 preview-only regression fixture. `research/fixtures/activation_scanner_policy_regression_cases.json` turns the 16 clean reviewed rows into a guardrail suite; latest run passed 16/16 with no `block`/`quarantine`. | The data curriculum loop is now executable and reproducible: calibration -> review queue -> deterministic reviewed decision -> materialized manifest -> clean policy regression -> promote, quarantine, or create hard-positive twins -> retrain pooled Qwen -> rerun policy calibration. |
| External data search | Added `research/datasets/EXTERNAL_DATA_SOURCE_REVIEW_2026-06-02.md`. Best new product-shaped candidates are OpenClaw ClawHub Security Signals, ProtectSkills MaliciousAgentSkillsBench, yoonholee agent-skill-malware, MSB, and MCPToolBenchPP. | The data gap is now narrower: we have plausible real skill/MCP carrier sources. Labels are mixed-quality weak/silver labels, so the next step is a controlled importer and clean train/eval separation, not blind data dumping. |
| RouteGuard external v0 import | Added `research/import_routeguard_sources.py` and generated `research/datasets/routeguard_external_v0.json`. Sources: public Skill-Inject SKILL.md carriers, BIPIA external-context carriers, MASB confirmed-malicious CSV metadata, and fetchable MASB safe/suspicious package text. Current dataset size is 2,900 rows: 1,644 clean / 1,256 poisoned / 19 styles. MASB content rows: 399 safe and 232 suspicious-candidate; confirmed-malicious MASB remains 157 metadata-only rows because public URLs are redacted. Structural validation passed: 2,900 unique ids, 0 errors. | We can now run RouteGuard-adjacent public sources through the scanner harness with some real MASB package text. The fairness blocker moved from "all MASB metadata-only" to "confirmed malicious MASB content is unavailable publicly, and suspicious is a weak poisoned label." |
| RouteGuard external full benchmark | Latest full Pythia raw run: `research/_results/activation_scanner_benchmark/20260602T095250Z-routeguard-external-pythia-70m.md`. Same-split: Pythia raw best-auto layers 1,2,3,4 gets 89.0 F1; TF-IDF gets 88.7 F1. Local train -> all RouteGuard external: Pythia raw best-auto layers 3,4,5,6 gets 44.0 F1; TF-IDF gets 45.8 F1. Full run elapsed 353.6s; transformer feature extraction was 24.5s; report-time RSS was about 1.33 GB. | RouteGuard external with real MASB content is a harder and more honest gate than same-split demos. Pythia raw is still competitive in-distribution but loses slightly to TF-IDF on local-to-external transfer, so it should stay a canary/default-preview rather than a claimed winner. |
| RouteGuard raw vs SAE sample | Latest sample SAE/per-layer run: `research/_results/activation_scanner_benchmark/20260602T095708Z-routeguard-external-pythia-70m.md`. On 1,000 sampled rows, same-split raw best-auto gets 91.3 F1, SAE layer 2 gets 91.3 F1, and TF-IDF gets 91.4 F1. Per-layer same-split winner is raw layer 3 at 92.6 F1. Local train -> all RouteGuard external: raw best-auto layers 3,4,5,6 gets 42.3 F1; SAE layer 2 gets 35.0 F1; TF-IDF gets 48.7 F1. | Pythia SAE is not a RouteGuard external default. It helped the older hand-core -> MCPTox gate, but this real-content external gate currently prefers raw multi-layer activation over SAE and still favors TF-IDF for local-to-external transfer. |
| SmolLM2 RouteGuard external check | Latest full SmolLM2 raw run: `research/_results/activation_scanner_benchmark/20260602T101048Z-routeguard-external-smollm2-135m.md`. Same-split raw best-auto layers 5,10,15,20 gets 88.3 F1 vs TF-IDF 88.7 F1. Local train -> all RouteGuard external gets 30.8 F1 vs TF-IDF 45.8 F1. Full run elapsed 685.3s; feature extraction was 82.5s; report-time RSS was about 1.57 GB. | SmolLM2 looked promising on a 500-row sample, but the full run regressed badly. Keep it as a comparison lane, not a product default. |
| Older Qwen2.5-0.5B RouteGuard layer-auto check | Earlier 1,000-row Qwen raw run: `research/_results/activation_scanner_benchmark/20260602T152309Z-routeguard-external-qwen2.5-0.5b.md`. Same-split raw best-auto layer 8 got 91.2 F1 vs TF-IDF 91.4 F1. Local train -> all RouteGuard external got 29.6 F1 vs TF-IDF 48.7 F1. Run elapsed 213.8s; feature extraction was 86.1s; report-time RSS was about 1.34 GB. | Historical negative result. The 2026-06-03 fixed-layer run with layers 13,14,15 supersedes this demotion and shows the failure was at least partly a bad layer-policy choice, not a blanket Qwen failure. |
| Gemma 3 270M RouteGuard external check | Latest full fixed-layer Gemma raw run: `research/_results/activation_scanner_benchmark/20260602T154544Z-routeguard-external-gemma-3-270m.md`. Concat layers 10,15,17 gets same-split 87.2 F1 vs TF-IDF 88.7 F1. Local train -> all RouteGuard external gets only 24.7 F1 vs TF-IDF 45.8 F1. Run elapsed 315.8s; feature extraction was 78.2s; report-time RSS was about 1.46 GB. The earlier 400-row smoke-small looked better at 43.9 F1, but did not hold on the full external set. | Demote Gemma 270M raw for RouteGuard real-content default/deep-scan use. It remains useful for Gemma Scope SAE plumbing and comparison, but the full fixed-layer result is weaker than Pythia raw, TF-IDF, and the smoke suggested. |
| RouteGuard per-layer sample | Latest per-layer sample run: `research/_results/activation_scanner_benchmark/20260602T082900Z-routeguard-external-pythia-70m.md`. Same-split layers 1,2,3,5,6 each reach 98.4 F1; layer 0 gets 94.4 F1. Local train -> all RouteGuard external single-layer winner is layer 3 with 43.7 F1. | Single-layer selection is not stable enough to hard-code by intuition. The scanner should keep automated layer-policy comparison and only freeze the selected policy after nested validation. |
| Latest Pythia-70M raw layer-policy run | Full raw layer sweep took 8.9s. Train-CV selected layer 4 and got 43.1% recall / 48.4 F1 on hand-core -> MCPTox; post-hoc test layer 5 got 52.0% recall / 55.3 F1; all-layer concat got 28.9% recall / 37.2 F1. | For the older cross-style lane, Pythia raw concat adds noise and SAE beats raw layer policy. RouteGuard external is different and currently prefers raw multi-layer activation over SAE. |
| Older Gemma 3 270M layer-policy run | On the older hand-core/MCPTox cross-style gate, full raw layer sweep took 27.2s. Train-CV selected layer 9 with 33.2% recall / 46.9 F1; post-hoc test layer 12 got 47.0% recall / 62.6 F1; raw all-layer concat got 49.1% recall / 59.9 F1 in 22.5s. Layer-10 SAE improved raw 38.1% recall / 52.6 F1 to 41.0% recall / 56.1 F1. | This is now historical evidence only. The harder RouteGuard full fixed-layer check demotes 270M raw for product default/deep-scan use. |
| Latest Gemma 3 1B layer-policy run | Full raw layer sweep took 78.2s. Train-CV selected layer 12 with 31.8% recall / 45.6 F1; post-hoc test layer 13 got 34.6% recall / 49.0 F1; raw all-layer concat got 62.1% recall / 70.5 F1 in 71.6s. Layer-14 SAE improved raw 21.4% recall / 33.9 F1 to 27.8% recall / 42.3 F1 but still lost to concat. | 1B raw concat is now the best heavier second-pass candidate. The 1B SAE target is not the default. |
| Layer policy reality | Different models already prefer different policies: Pythia raw best3 is the best top-k result in the full sweep, Gemma 1B raw concat helps, and Qwen2.5-0.5B still misses its strong post-hoc layer even when sweeping best1..best10. Plain `best-auto` picked transfer-weaker k values for both Pythia and Qwen. `leave-one-style-out` worsened Pythia/Qwen transfer. The first heuristic `leave-one-family-out` selector improved over style-aware for Pythia but still did not beat the plain CV sweep, and Qwen still missed layer 21. The first heuristic family-routed layer experiment picked different layers for different families, but did not improve overall transfer: Pythia routed best5 reached 45.6% recall / 50.5 F1 vs global best5 45.8% / 50.6; Qwen routed best5/best10 stayed around 21.0% recall / 33.1-33.3 F1 vs global 21.2% / 33.4. | Do not ship "one magic layer" as a principle, and do not ship heuristic family routing as default yet. Product scanner policy should compare single-layer, bestN sweeps, best-auto, concat, SAE, and true family-aware ensembles per model. Current heuristic family labels are useful scaffolding but too weak for default layer selection or routing. |
| Gemma 3 4B status | Not benchmarked yet in this repo. Hugging Face has `google/gemma-3-4b-pt`, and the local SAELens registry includes `gemma-scope-2-4b-pt-res-all`. | Promote 4B to a deep-scan/offline audit candidate, not the always-on install hook. |
| First MCPTox -> hand-core failure analysis | TF-IDF trained on MCPTox gives confusion `[[42, 1], [43, 0]]` on hand-core. Its top positive n-grams are `must`, `before`, `arguments`, `you must`, `call`, and `system`. MCPTox poison has `must` in 73.4% and `before` in 47.0%; hand poison has `private key` in 16.3%, `credential` in 14.0%, `read` in 39.5%, and `file` in 46.5%. | The failing direction is a distribution mismatch: MCPTox teaches overt instruction-chaining poison, while hand-core poison is capability-abuse/data-access poison. |
| First family-bucket analysis | Heuristic bucket reports show MCPTox poisoned examples are dominated by `instruction_chaining` (441 hits), while hand-core poisoned examples are spread across `secret_file_access` (21), `live_system_access` (8), `network_exfiltration` (8), `hidden_persistence_logging` (7), and `system_inventory` (7). | The next benchmark needs family-aware training/evaluation, not just more model size. |
| SAE result | GPT-2 has a dramatic 14% to 84% recall lift in one direction; Gemma-2-2b has a modest 78% to 86% lift; SAE does not rescue every direction. | SAE is promising for interpretability and some transfer, not magic. |
| Adversarial suffix tests | Fixed suffix: 0/146 evasion. Greedy black-box: 1/20 evasion. Bounded white-box raw-probe attack: 0/20 evasion. | Good early sign, not a robustness proof. |

Guardrail wording:

- Say "source-verified incumbent scanner paths we inspected are text/rule/classifier based."
- Do not say "every scanner in the market is definitely text-only" unless we rerun the market survey.
- Do not headline MCPTox 99%; MCPTox is templated and easy for trained classifiers.
- Do not sell SAE as a single malicious-intent neuron. The signal is distributed.
- Do not describe `family_curated_v0` as real-world incident data. It is a
  curated curriculum and release gate until real/pentest cases are added.

## Product Shape

The scanner should behave like this:

1. Input arrives: MCP server, skill, plugin, hook, config, package, or tool schema.
2. Scanner extracts text before running untrusted code: name, description, JSON schema, README, prompts, resources, install command, hooks, permissions, and network/file claims.
3. Static layer runs first: obvious secret access, shell execution, exfiltration patterns, suspicious install scripts, hidden instructions, package metadata risks.
4. Local activation layer runs next: sensor model forward pass, selected hidden-state pooling, trained probe score.
5. SAE layer runs when available: sparse features, feature contributions, short explanation candidates.
6. Output is a stable risk object:

```json
{
  "decision": "allow | warn | block | quarantine",
  "risk_score": 0.0,
  "risk_reasons": [],
  "activation_score": 0.0,
  "text_baseline_score": 0.0,
  "sae_features": [],
  "evidence_spans": [],
  "decision_policy": {
    "name": "corroborated-block-v3",
    "policy_reasons": []
  },
  "scanner_version": "",
  "model_id": ""
}
```

The first product surface is now a CLI/library scanner with JSON output:
`research.activation_scanner_cli`. UI and hook installation come after the risk
object and exit-code behavior stay stable under regression.

## Candidate Model Ladder

This is the current model plan after checking available Gemma/Gemma Scope repos
and running the cheap local small-model candidates on 2026-06-01.

| Role | Candidate | Why it is here | Gate |
| --- | --- | --- | --- |
| Legacy baseline | GPT-2 small | Reproduces the paper and old numbers. | Keep only for regression comparison. |
| MVP scanner canary | Pythia-70M deduped raw + `pythia-70m-deduped-res-sm` SAE | Tiny, fully wired, and useful for both raw and SAE checks. SAE is strong on the older hand-core -> MCPTox gate, but the real-content RouteGuard external gate prefers raw multi-layer activation over SAE, and raw still loses slightly to TF-IDF on local-to-external transfer. | Keep Pythia as the first public scanner canary/default-preview, not the final product winner. Freeze raw-vs-SAE only through benchmark-gated artifact selection. |
| Cheap raw fallback | `HuggingFaceTB/SmolLM2-135M` raw activations | Fully wired and runnable locally, but current cross-style and RouteGuard external full results are not stronger than TF-IDF or Pythia. On RouteGuard external full, same-split gets 88.3 F1 and local-to-external gets 30.8 F1 after 685.3s wall time. | Keep as a low-cost comparison model, not default. The 500-row RouteGuard sample was misleading, so full-run gates are mandatory before promotion. |
| Current activation runtime candidate, preview block policy | `Qwen/Qwen2.5-0.5B` raw activations | On `family_curated_v0`, Qwen raw `best3` leads the curated-family gate at 0.829 macro F1 / 0.844 macro recall, and `qwen-curated-family-best3-v1` passes the runtime smoke. The fixed-layer full RouteGuard external gate now also passes the real-content transfer check: layers 13,14,15 get local-train -> external 0.513 F1 vs TF-IDF 0.172. The pooled artifact `qwen-pooled-curated-core-l13-15-v2` under `corroborated-block-v3` gets RouteGuard external warn/review F1 0.747 / recall 0.800 and conservative block precision 1.000 / clean FPR 0.000 / recall 0.037. | Use Qwen fixed layers 13,14,15 as the current activation scanner candidate for warn/review and high-precision preview hard-block. Do not call it final release hard-block until broad clean warnings, BIPIA/Skill-Inject line-level recall, block recall, and warm-process runtime improve. |
| Demoted local Gemma comparison | `google/gemma-3-270m` + `gemma-scope-2-270m-pt` | Very small Gemma 3 model with Gemma Scope 2 SAEs and transcoders, but RouteGuard full fixed-layer raw concat 10,15,17 gets only 24.7 F1 on local-train -> external vs TF-IDF 45.8 and Pythia raw 44.0. | Keep for SAE plumbing/comparison and cheap Gemma regression only. Do not use as default or deep-scan raw candidate unless a new SAE/family-labeled run reverses the full external result. |
| Heavier second pass | `google/gemma-3-1b-pt` raw all-layer concat | Local-friendly enough to run, and raw concat now beats TF-IDF on hand-core -> MCPTox: 62.1% recall / 70.5 F1 in 71.6s. | Use only as optional second pass until runtime is acceptable and MCPTox -> hand-core improves. Do not use the current 1B SAE target as default. |
| Deep scan / offline audit | `google/gemma-3-4b-pt` + `gemma-scope-2-4b-pt` | 4B is large for a pre-tool hook but reasonable for explicit deep scans. Gemma Scope 2 has 4B PT SAEs, including all-layer residual-post releases. | Add to the bakeoff as an opt-in deep lane: raw layer sweep, raw concat, and a small SAE smoke before any product claim. |
| Reference / golden audit | Gemma-2-2b + Gemma Scope 2B SAE | Already benchmarked: SAE lifted hand-to-MCPTox recall from 78% to 86%. | Keep for offline comparison, not default always-on scanner. |
| Larger future audit | Gemma 3 12B or higher | More capable, still has Gemma Scope 2 coverage, but likely too heavy for normal local scanner use. | Only after the 4B deep-scan lane proves worth the extra complexity. |

Default bet right now: ship a layered MVP, not one magic model. Static checks
catch obvious poison first. Qwen2.5-0.5B raw fixed layers 13,14,15 with
`qwen-pooled-curated-core-l13-15-v2` is the current activation runtime
candidate because it now has both curated-family and full RouteGuard external
evidence. `qwen-curated-family-best3-v1` stays as the curated-family proof
artifact. Pythia-70M stays as the cheap canary plus SAE explanation/comparison
lane. Gemma 1B/4B remain optional heavier/deep-scan candidates. The release
default should use policy-gated block behavior, not a threshold-only hard block:
`corroborated-block-v3` makes hard blocks conservative enough to remove clean
hard-block false positives in the current RouteGuard-style gate, but broad clean
warnings, line-level attack recall, block recall, and warm-process runtime remain
the blocking product work.

## Benchmark Gates

Every candidate model must be evaluated on four axes:

| Gate | What we measure | Target before product default |
| --- | --- | --- |
| Detection | recall, precision, F1, benign false-positive rate | High recall on subtle poison with controlled FPR. Exact threshold set after first 270M/1B run. |
| Generalization | train/test across MCPTox, hand-written subtle sets, hard_v2/v3, neutral, deduped leave-one-family-out | Must not only win in same-split in-distribution tests. |
| Runtime | model load time, per-item scan latency, peak RAM, disk footprint | Must be reasonable on a normal laptop. Scanner cannot be heavier than the thing it protects. |
| Explanation | top SAE features, evidence spans, stability under paraphrase | Must produce useful reasons, not only a number. |

The benchmark harness should always include:

- DeBERTa text detector baseline.
- TF-IDF / lightweight text baseline where useful.
- Raw activation probe.
- SAE feature probe where SAEs exist.
- Layer sweep or justified fixed layer.
- Deduplication checks.
- Confidence intervals for small sets.
- Latency and RAM measurements.

## Roadmap

### Phase 0 - Evidence Lock

Status: mostly done.

Deliverables:

- `research/audit-report-2026-06-01.md`
- audit scripts for layer sweep, SAE ablation, white-box suffix attack, Gemma rerun
- source audit of Invariant and Snyk/agent-scan paths

Exit criteria:

- We know which claims hold, weaken, or fail.
- We have exact caveats for public/product wording.

Remaining cleanup:

- Decide whether audit artifacts should be committed as research evidence.
- Keep exact dataset inventory in the canonical benchmark report. Current
  verified row count: MCPTox clean = 362, MCPTox poisoned = 485. Current usable
  non-empty description count: MCPTox clean = 342, MCPTox poisoned = 485.

### Phase 1 - Canonical Benchmark Harness

Status: in progress.

Goal: stop creating one-off scripts. Build one benchmark runner that can compare
sensor models, text baselines, raw activations, SAE features, layers, and runtime.

Deliverables:

- `research/benchmarks/activation_scanner_benchmark.py` - created
- `research/benchmarks/model_registry.py` - created
- `research/benchmarks/datasets.py` - created
- `research/benchmarks/report_writer.py` - created
- `research/benchmarks/family_labels.py` - created
- `research/benchmarks/failure_family_analysis.py` - created
- `research/SCANNER_PIPELINE.md` - created
- output folder with timestamped JSON + Markdown summaries - created under
  `research/_results/activation_scanner_benchmark/`

Must support:

- `--model gpt2` - wired and smoke-tested
- `--model pythia-70m` - wired and smoke/full-tested
- `--model smollm2-135m` - wired and full-tested
- `--model qwen2.5-0.5b` - wired and full-tested
- `--model gemma-3-270m` - wired and smoke/full-tested
- `--model gemma-3-1b-pt` - wired and smoke/full-tested
- `--with-sae` - wired and smoke-tested for Pythia-70M, Gemma 3 270M, and Gemma 3 1B PT
- `--layer-sweep` - wired
- `--layer-mode best|bestN|best-auto|best-sweep|concat` - wired
- `--dedupe` - wired
- `--max-samples` for smoke tests - wired and smoke-tested
- `--measure-runtime` - wired

Completed smoke:

- `lexical-smoke` cross-style n=20 with TF-IDF baseline
- `lexical-smoke` MCPTox same-split n=20 with TF-IDF baseline
- `gpt2` layer-3 raw activation cross-style n=20
- `gemma-3-270m` raw activation cross-style n=20; candidate layers 4/7/10,
  about 34 seconds wall time, about 931 MB RSS at report
- `gemma-3-270m` raw+SAE cross-style n=20; SAE
  `gemma-scope-2-270m-pt-res-all/layer_10_width_16k_l0_small`, d_sae=16384,
  hidden_state_index=11, about 14 seconds wall time after cache, about 1.0 GB RSS
- full `gemma-3-270m` raw+SAE cross-style benchmark with TF-IDF baseline; about
  45 seconds wall time, about 1.68 GB RSS
- full `gemma-3-270m` MCPTox same-split raw+SAE benchmark with TF-IDF baseline;
  raw 99.3% recall, SAE 100% recall, TF-IDF 100% recall; about 40.5 seconds
  wall time, about 1.56 GB RSS
- `gemma-3-1b-pt` raw activation cross-style n=20; candidate layers 6/10/14,
  about 84 seconds wall time, about 2.07 GB RSS
- `gemma-scope-2-1b-pt` SAE load smoke; release
  `gemma-scope-2-1b-pt-res-all`, SAE id `layer_14_width_16k_l0_small`,
  d_in=1152, d_sae=16384, hook `blocks.14.hook_resid_post`
- full `gemma-3-1b-pt` raw+SAE cross-style benchmark with TF-IDF baseline;
  about 145 seconds wall time, about 2.66 GB RSS; SAE improved B-direction
  recall over raw, but stayed below 270M SAE and TF-IDF
- `pythia-70m-deduped-res-sm` SAE load smoke; SAE id
  `blocks.2.hook_resid_post`, d_in=512, d_sae=32768
- full `pythia-70m` raw+SAE cross-style benchmark with TF-IDF baseline; about
  18.5 seconds wall time; Pythia SAE reached 87.2% recall / 73.6 F1 on
  hand-core -> MCPTox, but still 0% recall on MCPTox -> hand-core
- full `pythia-70m` MCPTox same-split raw+SAE benchmark with TF-IDF baseline;
  raw 100% recall, SAE 100% recall, TF-IDF 100% recall
- full `pythia-70m` raw top-k cross-style benchmarks; best3 selected
  B-direction layers 3/4/5 and reached 48.9% recall / 53.0 F1, while best5
  selected layers 2/3/4/5/6 and dropped to 28.7% recall / 37.0 F1; A
  direction still failed
- full `pythia-70m` raw best-sweep and best-auto cross-style benchmarks; latest
  report `20260602T003141Z-cross-style-pythia-70m` confirms best3 is the best
  B-direction top-k row, while `20260602T003301Z-cross-style-pythia-70m`
  shows train-CV `best-auto` chose best2 and only reached 43.1% recall / 48.2
  F1; A direction still failed
- full `pythia-70m` raw leave-one-style-out selector benchmarks; latest reports
  `20260602T004340Z-cross-style-pythia-70m` and
  `20260602T004433Z-cross-style-pythia-70m` show style-aware best-sweep topped
  out at best7 with 28.9% recall / 37.2 F1 on hand-core -> MCPTox, while
  style-aware `best-auto` chose best1:0 and reached only 20.6% recall / 25.6
  F1; A direction still failed
- full `pythia-70m` raw leave-one-family-out selector benchmarks; latest
  reports `20260602T011238Z-cross-style-pythia-70m` and
  `20260602T011335Z-cross-style-pythia-70m` show heuristic family best-sweep
  topped out at best5 with 45.8% recall / 50.6 F1 on hand-core -> MCPTox, but
  family-aware `best-auto` chose best2:2,3 and reached only 36.1% recall /
  41.7 F1; A direction still failed
- full `pythia-70m` raw family-routed layer benchmark; latest clean report
  `20260602T025206Z-cross-style-pythia-70m` shows routed families did pick
  different layer/top-k policies, but the best routed B-direction row was best5
  at 45.6% recall / 50.5 F1, essentially tied with and slightly below global
  best5 at 45.8% recall / 50.6 F1; A direction still failed
- full `smollm2-135m` raw per-layer cross-style benchmark with TF-IDF baseline;
  train-CV selected B-direction layer 20 at 32.8% recall / 47.3 F1, while the
  best post-hoc B-direction test layer was layer 28 at 46.0% recall / 59.5 F1;
  A direction still failed
- full `smollm2-135m` raw all-layer concat cross-style benchmark; about 20.2
  seconds wall time, about 1.89 GB RSS; B-direction recall 36.7% / 51.7 F1, A
  direction still failed
- `qwen2.5-0.5b` raw RouteGuard external 1,000-row real-content smoke; latest
  report `20260602T152309Z-routeguard-external-qwen2.5-0.5b` shows same-split
  91.2 F1 vs TF-IDF 91.4, but local-train -> external only 29.6 F1 vs TF-IDF
  48.7; elapsed 213.8s, feature extraction 86.1s, about 1.34 GB RSS
- `qwen2.5-0.5b` raw fixed-layer RouteGuard external full gate with concat
  layers 13,14,15; latest report
  `20260603T034718Z-routeguard-external-qwen2.5-0.5b` shows same-split
  89.2 F1 vs TF-IDF 88.7, and local-train -> external 51.3 F1 vs TF-IDF
  17.2; elapsed 346.4s, feature extraction 236.2s, report-time RSS about
  1.76 GB
- `gemma-3-270m` raw RouteGuard external 400-row smoke-small; latest report
  `20260602T153746Z-routeguard-external-gemma-3-270m` shows same-split 84.4 F1
  vs TF-IDF 88.2, and local-train -> external 43.9 F1 vs TF-IDF 43.1 with
  selected layers 10,15,17; elapsed 140.1s, feature extraction 18.6s, about
  1.09 GB RSS. The 800-row best-auto attempt was stopped because repeated
  classifier fits were too slow/noisy for a smoke run.
- full `gemma-3-270m` raw RouteGuard external fixed-layer check with concat
  layers 10,15,17; latest report
  `20260602T154544Z-routeguard-external-gemma-3-270m` shows same-split 87.2 F1
  vs TF-IDF 88.7, but local-train -> external only 24.7 F1 vs TF-IDF 45.8;
  elapsed 315.8s, feature extraction 78.2s, about 1.46 GB RSS
- full `qwen2.5-0.5b` raw per-layer cross-style benchmark with TF-IDF baseline;
  about 39.4 seconds wall time, about 1.81 GB RSS; train-CV selected
  B-direction layer 15 at 28.0% recall / 42.0 F1, while post-hoc layer 21
  reached 61.0% recall / 71.8 F1; A direction still failed except layer 0's
  trivial all-positive behavior
- full `qwen2.5-0.5b` raw all-layer concat cross-style benchmark; about 37.3
  seconds wall time, about 2.30 GB RSS; B-direction recall 54.0% / 64.6 F1, A
  direction still failed
- full `qwen2.5-0.5b` raw top-k cross-style benchmarks; best3 selected
  B-direction layers 12/15/16 and reached 22.9% recall / 35.7 F1, while best5
  selected layers 11/12/13/15/16 and reached 21.4% recall / 33.8 F1; both
  missed post-hoc layer 21, so naive top-k CV ranking did not solve transfer
- full `qwen2.5-0.5b` raw best-sweep and best-auto cross-style benchmarks;
  latest report `20260602T003233Z-cross-style-qwen2.5-0.5b` shows best6 was
  the best B-direction top-k row at 28.5% recall / 42.1 F1, barely above
  best1; `20260602T003331Z-cross-style-qwen2.5-0.5b` shows train-CV
  `best-auto` chose best2 and fell to 26.4% recall / 40.0 F1; A direction
  still failed
- full `qwen2.5-0.5b` raw leave-one-style-out selector benchmarks; latest
  reports `20260602T004408Z-cross-style-qwen2.5-0.5b` and
  `20260602T004504Z-cross-style-qwen2.5-0.5b` show style-aware best-sweep
  topped out at best2 with 24.9% recall / 38.2 F1 on hand-core -> MCPTox,
  while style-aware `best-auto` chose best1:2 and reached only 21.6% recall /
  26.9 F1; it still missed the post-hoc strong layer 21; A direction still
  failed
- full `qwen2.5-0.5b` raw leave-one-family-out selector benchmarks; latest
  reports `20260602T011309Z-cross-style-qwen2.5-0.5b` and
  `20260602T011405Z-cross-style-qwen2.5-0.5b` show heuristic family best-sweep
  topped out at best5/best10 with 21.2% recall / 33.4 F1 on hand-core ->
  MCPTox, while family-aware `best-auto` chose best9 and reached 20.4% recall /
  32.3 F1; it still missed post-hoc layer 21; A direction still failed
- full `qwen2.5-0.5b` raw family-routed layer benchmark; latest report
  `20260602T025038Z-cross-style-qwen2.5-0.5b` shows routed best5/best10 stayed
  around 21.0% recall / 33.1-33.3 F1 on hand-core -> MCPTox, still below
  global best5/best10 at 21.2% recall / 33.4 F1; A direction still failed
- family-bucket reports for MCPTox and hand-core; latest local outputs:
  `20260601T230911Z-failure-family-mcptox.md` and
  `20260601T230911Z-failure-family-hand-core.md`
- dataset inventory check confirmed MCPTox clean rows = 362, usable clean
  descriptions = 342, poisoned descriptions = 485

Next run:

- turn the MCPTox -> hand-core failure analysis into explicit poison-family
  metadata:
  instruction-chaining, secret/file access, credential forwarding, network
  exfiltration, hidden persistence/logging, and benign lookalikes
- build a pooled training/eval curriculum that contains those families instead
  of training only on MCPTox-style overt instruction chaining
- rerun Pythia/Gemma layer sweeps or leave-one-family-out checks against that
  family-aware curriculum
- then choose the scanner MVP policy: static layer + Pythia canary + Gemma
  prefilter/second pass, or a single sensor model if evidence supports it

### Phase 2 - Model Bakeoff

Status: in progress.

Goal: choose the product default model instead of arguing by vibe.

Run matrix:

| Model | Raw | SAE | Layer sweep | Runtime |
| --- | --- | --- | --- | --- |
| GPT-2 small | yes | existing GPT-2 SAE | yes | yes |
| Pythia-70M | yes | smoke/full run done | targeted next | yes |
| Gemma 3 270M | yes | smoke/full run done | targeted next | yes |
| Gemma 3 1B PT | yes | smoke/full run done | targeted next only if justified | yes |
| Gemma 3 4B PT | not yet | SAELens registry has 4B PT releases | deep-scan bakeoff next | yes |
| Gemma-2-2b | already partial | existing 2B SAE | optional | yes |

Decision output:

- product default model
- fast prefilter model
- offline/golden audit model
- default layer policy: fixed single layer, bestN sweep/auto, concat, SAE, or
  family-aware ensemble
- whether SAE is on by default, explanation-only, or second-pass only

### Phase 3 - Scanner Core

Status: in progress.

Goal: build a usable scanner package around the winning benchmark path.

Deliverables:

- local Python package or Node wrapper for scanner execution - Python entrypoints
  created with `research/train_probe_artifact.py` and
  `research/activation_scanner_core.py`; product-preview CLI created with
  `research/activation_scanner_cli.py`
- stable JSON risk schema - first runtime shape created
- schema and regression fixtures - created
- cache for model weights and repeated scan inputs
- batch scanning for many tools - Python API and `--batch-file` CLI created
- runtime decision policy - `corroborated-block-v3` created and schema-tested
- deterministic scan report format - JSON and summary CLI formats created
- reproducibility ledger for product-shaped scanner path - created
- regression tests using known clean/poison fixtures - core contract runner and
  CLI contract runner created
- clean policy-regression fixtures - generated from v3 materialized review
  outputs and passed against the current Qwen pooled artifact

Product rule:

The scanner must never execute untrusted install scripts to inspect a package.
It reads metadata and files first. Execution, if ever needed, belongs in a
separate sandboxed inspector phase.

### Phase 4 - Hook Integration

Status: planned.

Goal: make the scanner run before risky capability is installed or enabled.

Hook targets:

- CCO internal scan action
- Codex skills and MCP config paths
- Claude/Codex hook installation flow where available
- package/skill folder scan before trust
- CI mode for repos that want to block unsafe MCP config changes

MVP behavior:

- `allow`: no warning
- `warn`: show reasons and require explicit continue
- `block`: refuse automatic install
- `quarantine`: copy/report but do not enable

### Phase 5 - Explanation Layer

Status: planned.

Goal: make activation results inspectable enough that a human can trust the
warning.

Deliverables:

- top contributing text spans
- top SAE features where available
- feature stability check across paraphrases
- short human-readable reason
- raw score + calibrated bucket

Non-goal:

- Do not claim causal circuit discovery unless we run causal interventions.

### Phase 6 - Robustness

Status: planned.

Goal: find how attackers evade the scanner before product users do.

Attack suite:

- suffix attacks
- paraphrase attacks
- style transfer attacks
- benign-padding attacks
- schema-only poisoning
- README-only poisoning
- tool-name-only poisoning
- multi-tool coordinated poisoning
- white-box attacks against raw probe and SAE probe

Pass condition:

Not "impossible to evade." The pass condition is knowing failure modes and
using layered controls so evasion is not cheap.

### Phase 7 - Release Package

Status: pulled forward into launch sprint.

Deliverables:

- product README section - created
- research landing page - created
- benchmark report with exact caveats - in progress
- CLI scanner command - created under `research.activation_scanner_cli`
- CLI regression command - created under `research.activation_scanner_cli_regression`
- hook scanner command - created under `research.activation_scanner_hook`
- hook regression command - created under `research.activation_scanner_hook_regression`
- warm JSONL process - created under `research.activation_scanner_hook serve-jsonl`
- install command
- JSON schema docs - first schema and README references created
- example hook integration
- paper/update note separating research claims from product claims

Public positioning:

> CCO adds an activation-based local sensor for MCP and agent-extension
> poisoning. Existing scanners we inspected rely on text/rules/classifiers;
> this adds a different signal before an untrusted capability runs.

## Next Action Queue

Do these in order.

1. Add clean twins/static corroboration for the 18 hard-positive candidates in
   `research/datasets/calibration_review_outputs_qwen_pooled_policy_v3_2026-06-03.json`
   before any of them become gold training rows.
2. Add more line-level Skill-Inject/BIPIA cases, MASB safe benign lookalikes,
   and natural `system_inventory` cases before the next pooled retrain.
3. Rerun pooled Qwen artifact training after the new fixtures/twins land, then
   rerun policy calibration and update the reproducibility ledger with the new
   artifact id.
4. Add a faster cached-feature benchmark profile for high-dimensional selector
   runs so Gemma/Qwen runs do not spend minutes in selector-only fitting.
5. Continue replacing heuristic primary-family buckets with explicit
   poison-family labels and benign lookalike groups. First source-confirmed
   Skill-Inject promotions are now in `family_curated_v0`; next add better
   `tool_shadowing`, `hidden_persistence_logging`, and `system_inventory`
   carriers because those remain weakest in family holdout.
6. Build an external-source registry and a non-executing importer for the next
   data queue: `yoonholee/agent-skill-malware`, OpenClaw ClawHub Security
   Signals, MCPToolBenchPP benign schemas, and MSB family metadata.
7. Build a pooled curriculum benchmark that trains/evaluates across those
   families instead of MCPTox-only.
8. Rerun leave-one-family-out and family-routed checks on curated labels, then
   compare against the current heuristic family selector, CV selector, and
   leave-one-style-out selector.
9. Add Gemma 3 4B PT as an explicit deep-scan lane, starting with a small raw
   activation smoke and one Gemma Scope 2 4B SAE load smoke.
10. Decide scanner MVP policy: static first, Qwen pooled artifact for activation
   scanner candidate, Pythia canary/SAE explanation, policy-gated hard block,
   and when heavier Gemma scans run.
11. Wire the hook wrapper into the Node CCO dashboard/security scan flow after
   the research preview is ready to move out of `research/`.
12. Add package/install documentation for users who want to run the hook scanner
   locally before enabling a new MCP server, skill, or plugin.
13. Expand regression fixtures with curated family labels and benign lookalikes.

## Update Rules

Every time we finish a meaningful task, update this file in the same turn.

Update these sections:

- `Last updated`
- `Current Truth` if evidence changed
- `Candidate Model Ladder` if model choice changed
- `Roadmap` phase statuses
- `Next Action Queue`
- `Decision Log`

Do not bury bad news. If a benchmark fails, write the failure into `Current
Truth` and change the next action.

## Decision Log

| Date | Decision | Evidence |
| --- | --- | --- |
| 2026-06-03 | Add the first hook-facing activation scanner wrapper and warm JSONL process. | `research.activation_scanner_hook` now normalizes MCP/tool/skill/hook payloads, redacts secret values before scan text is built, emits gate JSON with `max_decision` and `exit_code`, and supports `serve-jsonl` for a long-lived scanner process. `research.benchmarks.model_registry` now caches tokenizer/model/SAE objects inside a process. `research.activation_scanner_hook_regression --pretty` passed: MCP env value redaction, poisoned one-shot hook `block` with exit code `2`, and JSONL weather-tool protocol `allow`. |
| 2026-06-03 | Promote `corroborated-block-v3` as the current preview hard-block policy and add clean policy-regression guardrails. | Full calibration `20260603T102832Z-qwen-pooled-l13-15-threshold-calibration`: RouteGuard warn/review F1 0.747 / recall 0.800 / clean FPR 0.260; conservative block precision 1.000 / clean FPR 0.000 / recall 0.037 with 0 false blocks. The v3 review queue has 41 entries. `research.build_policy_regression_cases` generated 16 clean guardrail cases from the v3 materialized manifest, and `research.activation_scanner_regression --cases research/fixtures/activation_scanner_policy_regression_cases.json` passed 16/16. |
| 2026-06-03 | Create the first product-preview CLI scanner and materialize v2 review outputs. | `research.activation_scanner_cli` supports `doctor`, single `scan`, `batch`, summary/JSON output, local artifact defaults, and `--fail-on` exit codes. `research.activation_scanner_cli_regression` passed: default artifact complete, weather text `allow`, batch fixture decisions `block/allow/allow/warn`, and `--fail-on block` exit code `2`. `research.materialize_calibration_review_outputs` produced 42 rows: 8 static-policy regression candidates, 9 benign activation holdouts, 18 hard-positive candidates, 6 quarantines, 1 regression fixture, 0 manual-review leftovers, with 41/42 full source text. |
| 2026-06-03 | Historical v2 policy gate: `corroborated-block-v2` made hard block much safer but left one clean hard block. | Full calibration `20260603T093134Z-qwen-pooled-l13-15-threshold-calibration`: RouteGuard warn/review F1 0.752 / recall 0.811 / clean FPR 0.264; conservative block precision 0.981 / clean FPR 0.001 / recall 0.041 with 1 false block. The v2 review queue had 42 entries with deterministic reviewed decisions generated by `research/build_calibration_review_decisions.py`. Superseded by v3 on the same date. |
| 2026-06-03 | Historical v1 policy gate: `corroborated-block-v1` improved warn/review over v0 but still left too many clean hard blocks. | Full calibration `20260603T090842Z-qwen-pooled-l13-15-threshold-calibration`: RouteGuard warn/review F1 0.782 / recall 0.895 / clean FPR 0.302; conservative block precision 0.850 / clean FPR 0.012 / recall 0.086. The v1 review queue had 49 entries. Superseded by v2 on the same date. |
| 2026-06-03 | Historical v0 policy gate: `corroborated-block-v0` reduced clean hard blocks versus threshold-only blocking. | `research/activation_scanner_core.py` emitted `decision_policy`; `research/activation_scanner_regression.py` validated it; `research/PRODUCT_REPRODUCIBILITY_LEDGER_2026-06-03.md` recorded commands, artifacts, metrics, and claim boundaries. Earlier RouteGuard external calibration `20260603T084425Z-qwen-pooled-l13-15-threshold-calibration` kept warn/review F1 at 0.731 and changed block from threshold-only 0.636 precision / 0.243 clean FPR to policy-gated 0.714 precision / 0.114 clean FPR, with recall dropping to 0.374. Superseded by v1 and then v2 on the same date. |
| 2026-06-03 | Historical threshold reading: Qwen pooled was useful as warn/review, not threshold-only hard block. | `research/THRESHOLD_CALIBRATION_QWEN_POOLED_2026-06-03.md`: the earlier v0 calibration gave warn/review 0.731 F1 / 0.799 recall / 0.296 clean FPR, but threshold-only block was only 0.593 F1 / 0.636 precision / 0.243 clean FPR. Raising the threshold alone did not remove concentrated high-score clean false positives, especially BIPIA clean email and MASB safe rows. |
| 2026-06-03 | Historical fixed-layer Qwen result promoted layers 13,14,15 before the pooled v1/v2 artifacts. | Full fixed-layer RouteGuard external run `20260603T034718Z-routeguard-external-qwen2.5-0.5b`: Qwen layers 13,14,15 got local-train -> all external 0.513 F1 / 0.415 recall / 0.673 precision vs TF-IDF 0.172 F1 / 0.107 recall / 0.445 precision, and same-split 0.892 F1 vs TF-IDF 0.887. This justified the pooled artifact family; the current runtime artifact is v2. |
| 2026-06-03 | Promote `qwen-curated-family-best3-v1` over `best8-v0` as the curated-data runtime candidate. | Added 6 clean/poison pairs to `family_curated_v0` (4 bridge pairs plus 2 direct `system_inventory` pairs). Validation now passes at 76 rows / 38 pairs. `research/CURATED_FAMILY_BAKEOFF_2026-06-03.md` records Qwen raw `best3` at 0.829 macro F1 vs TF-IDF 0.823, with no zero-recall families. Built `qwen-curated-family-best3-v1`, selected layers 13,14,15, and passed the 3-case scanner fixture smoke. |
| 2026-06-02 | Promote Qwen2.5-0.5B raw `best8` to curated-data runtime candidate, not final default. | `research/CURATED_FAMILY_BAKEOFF_2026-06-02.md` summarizes the new curated-family bakeoff: Qwen raw `best8` gets 0.780 macro F1 / 0.825 macro recall vs TF-IDF 0.710, SmolLM2 0.697, Pythia raw 0.677, and Pythia SAE 0.645. Built `qwen-curated-family-best8-v0`, which passed the 3-case scanner fixture smoke. `system_inventory` zero recall and older RouteGuard external-transfer weakness still block final-default claims. |
| 2026-06-02 | Promote only source-confirmed Skill-Inject rows into the gold curriculum; keep weak suspicious rows out. | Added `research/skillinject_review_metadata.py` and `research/promote_skillinject_curriculum.py`. `family_curated_v0.json` now validates at 64 rows / 32 pairs / 0 duplicate warnings. `curriculum_review_decisions_v0.json` records 8 accepted Skill-Inject SKILL.md promotions. Lexical curated-family-holdout smoke ran on 64 rows; it still shows weak `tool_shadowing`, `network_exfiltration`, and `system_inventory` recall in the cheap lexical lane. |
| 2026-06-02 | Expand the curated data curriculum before another model bakeoff. | Added 8 new manual clean/poison pairs, one per risk family, with accepted curriculum metadata. Validation then passed at 48 rows / 24 pairs, and `curriculum_review_queue_v0.json` gave a balanced 60 clean / 60 poisoned external review queue so weak labels did not enter training blindly. |
| 2026-06-02 | Suppress sklearn convergence-warning spam in the benchmark runner. | Gemma 270M RouteGuard best-auto smoke repeatedly hit logistic `ConvergenceWarning` during selector fits and flooded stdout. `research/benchmarks/activation_scanner_benchmark.py` now filters that warning category without changing the classifier setup. |
| 2026-06-02 | Demote Qwen2.5-0.5B from near-term default candidate on real-content transfer, before fixed-layer rerun. | RouteGuard external 1,000-row run `20260602T152309Z-routeguard-external-qwen2.5-0.5b`: same-split raw best-auto layer 8 got 91.2 F1 vs TF-IDF 91.4, but local-train -> external got 29.6 F1 vs TF-IDF 48.7. This is now historical context; the 2026-06-03 fixed-layer 13,14,15 full run supersedes the demotion. |
| 2026-06-02 | Demote Gemma 270M raw after the full fixed-layer RouteGuard check. | The 400-row smoke-small looked plausible at 43.9 F1, but full concat layers 10,15,17 report `20260602T154544Z-routeguard-external-gemma-3-270m` got only 24.7 F1 on local-train -> all RouteGuard external vs TF-IDF 45.8 and Pythia raw 44.0. |
| 2026-06-02 | Public paper metrics are not benchmark truth until rerun or artifact-backed. | RouteGuard's tables have precision/recall/F1 consistency problems, and its public surface check found no runnable artifact. `research/datasets/EXTERNAL_DATA_SOURCE_REVIEW_2026-06-02.md` now ranks evidence by reproducibility: public repo/data first, schema-clean datasets second, runnable competitor models/products third, paper-only claims fourth. |
| 2026-06-02 | Treat RouteGuard as corroboration, not priority/product loss. | Our paper write-up is dated March 29, 2026. RouteGuard was submitted to arXiv on April 24, 2026. `research/ROUTEGUARD_SURFACE_CHECK_2026-06-02.md` found no linked ScienceCast video, CatalyzeX code, Hugging Face demo/repo, GitHub repo hit, or product/demo page. Keep the public claim scoped to March experiment plus productization path, while citing later internal-signal work as validation of the category. |
| 2026-06-02 | Use RouteGuard as category validation, not as a benchmark source of truth yet. | `research/ROUTEGUARD_PAPER_REVIEW_2026-06-02.md` found that the method supports the same internal-signal thesis, but uses Qwen3-32B / Llama3.1-8B-style open backbones with attention and hidden-state access. The rendered paper tables also show precision/recall/F1 consistency issues, so do not cite exact benchmark numbers without code or author clarification. |
| 2026-06-02 | Do not blindly dump public prompt-injection data into the scanner. Import product-shaped skill/MCP data first, with source metadata and holdout separation. | `research/datasets/EXTERNAL_DATA_SOURCE_REVIEW_2026-06-02.md` ranks OpenClaw ClawHub Security Signals, ProtectSkills MaliciousAgentSkillsBench, yoonholee agent-skill-malware, MSB, and MCPToolBenchPP as the first external-data queue; it also flags weak/silver labels, license checks, and non-executing import rules. |
| 2026-06-02 | Add a testable runtime contract before hook wiring. | Added `research/schemas/activation_scanner_risk.schema.json`, `research/fixtures/activation_scanner_regression_cases.json`, and `research/activation_scanner_regression.py`. Fast regression passed 3/3 fixtures. |
| 2026-06-02 | Add batch scanning as the install-time scanner shape. | `activation_scanner_core.py` now has `scan_texts()` and `--batch-file`. Pythia SAE batch smoke scanned 3 fixtures in one feature-extraction pass, with about 7.85s feature extraction and 13.15s cold-start total. |
| 2026-06-02 | Replace runtime-training demo with a cached probe artifact path for product work. | Added `research/train_probe_artifact.py`, `research/activation_scanner_core.py`, and `research/scanner_static.py`. Built `lexical-smoke-test` and `pythia-sae-core-v0`; cached core blocked the SSH credential-upload example and allowed the weather JSON example without retraining. |
| 2026-06-01 | Treat DeBERTa v3 prompt-injection classifier as the strongest source-verified text baseline for current repo evidence. | `benchmark-results-deberta-vs-probe-2026-05-31.md`, `audit-report-2026-06-01.md` |
| 2026-06-01 | Do not use GPT-2 as product default. Keep it as legacy baseline only. | GPT-2 is old, layer-sensitive, and not tool-native. |
| 2026-06-01 | Benchmark Gemma 3 270M and Gemma 3 1B PT next. | Both have Gemma Scope 2 SAE coverage and are plausible local sensor models. |
| 2026-06-01 | Keep SAE as product evidence/explanation candidate, not as a universal rescue claim. | Gemma showed modest lift; GPT-2 dramatic lift is layer/model-specific. |
| 2026-06-01 | Start Phase 1 with a canonical local runner before running larger models. | `research/benchmarks/activation_scanner_benchmark.py` now writes JSON/Markdown reports and passed lexical/GPT-2 smoke tests. |
| 2026-06-01 | Gemma 3 270M raw hidden states are locally runnable, but not yet a quality win. | n=20 cross-style smoke completed in about 34s / 931 MB RSS; A recall 0%, B recall 30%, too small for model choice. |
| 2026-06-01 | Gemma Scope 2 270M residual-post SAE is loadable through SAELens release names, not the README folder name. | Working pair: release `gemma-scope-2-270m-pt-res-all`, SAE id `layer_10_width_16k_l0_small`; smoke d_in=640, d_sae=16384. |
| 2026-06-01 | Canonical runner can now compare raw activation and SAE features in one report. | `--with-sae --sae gemma-scope-2-270m-pt` passed n=20 Gemma 270M cross-style smoke. |
| 2026-06-01 | Gemma 3 270M is not the default yet. | Full hand-core/MCPTox cross-style run: SAE helped B direction but still lagged TF-IDF recall; A direction failed for all methods. |
| 2026-06-01 | Treat MCPTox same-split as a regression check, not evidence of product-grade generalization. | Gemma 270M raw/SAE and TF-IDF all hit near-perfect same-split results while cross-style remains weak. |
| 2026-06-01 | Gemma 3 1B PT is locally runnable but materially heavier than 270M. | n=20 raw smoke took about 84s / 2.07 GB RSS with layers 6/10/14. |
| 2026-06-01 | Do not promote Gemma 3 1B PT as product default on current evidence. | Full cross-style run took about 145s / 2.66 GB RSS; 1B SAE B-direction recall was 27.8%, below Gemma 270M SAE and TF-IDF, with 0% A-direction recall. |
| 2026-06-01 | Promote Pythia-70M SAE to cheap canary/second-signal candidate. | Full cross-style run took about 18.5s and reached 87.2% recall / 73.6 F1 on hand-core -> MCPTox; A-direction still failed, so it is not a complete product default. |
| 2026-06-01 | The next blocker is asymmetric generalization, not model availability. | Gemma 270M, Gemma 1B, Pythia-70M, and TF-IDF all fail or nearly fail MCPTox -> hand-core while some methods work much better in the reverse direction. |
| 2026-06-01 | Fix the data curriculum before doing more large-model bakeoff. | MCPTox poison is dominated by overt `must/before/call` instruction-chaining, while hand-core poison is subtle capability abuse around private keys, credentials, file reads, and network forwarding. |
| 2026-06-01 | Add a heuristic family analyzer to guide the next benchmark split. | `research/benchmarks/failure_family_analysis.py` produced MCPTox and hand-core bucket reports; use them as scaffolding, not as final labels. |
| 2026-06-01 | Ship the methodology as a retrainable pipeline, not as a frozen final detector. | `research/SCANNER_PIPELINE.md` defines the frozen sensor model, activation-probe training, family-aware dataset loop, benchmark gates, and versioned scanner release artifacts. |
| 2026-06-01 | Pivot to launch-first positioning. | Public README now surfaces the activation scanner preview, while the roadmap keeps the dashboard static scanner and activation research preview clearly separated. |
| 2026-06-01 | Treat Pythia-70M SAE as the first public demo lane. | Re-ran the public smoke command from repo root; latest B-direction recall is Pythia SAE 87.2% vs TF-IDF 54.4%, with A-direction failure still called out. |
| 2026-06-01 | Add layer-policy benchmarking instead of assuming one layer or all layers. | `--layer-mode best|concat` is wired; first Pythia raw check shows best single layer beats all-layer concat, while SAE remains the stronger Pythia signal. |
| 2026-06-01 | Add fixed per-layer reporting to the canonical benchmark runner. | `--per-layer` now prints every selected raw layer row, which exposed post-hoc test-layer differences such as Pythia layer 5 and Gemma 270M layer 12. |
| 2026-06-01 | Add top-k layer policies to avoid forcing every model into best1 or all-layer concat. | `--layer-mode best3|best5` is wired; top-k layers are ranked using train-fold CV, concatenated, and trained as one probe. |
| 2026-06-02 | Generalize top-k layer selection instead of guessing best3 or best5 by hand. | `--layer-mode bestN` now accepts any positive k, `best-sweep` reports best1..bestN in one run, and `best-auto` chooses k by train-fold CV without using final-test labels. |
| 2026-06-02 | Keep best-sweep as a benchmark lens, but do not trust plain best-auto as the product selector yet. | Latest Pythia sweep `20260602T003141Z-cross-style-pythia-70m` found best3 as the best B-direction top-k row, but `best-auto` chose best2. Latest Qwen sweep `20260602T003233Z-cross-style-qwen2.5-0.5b` found best6 only barely above best1, while `best-auto` chose best2 and stayed weak. Next selector needs family-aware validation. |
| 2026-06-02 | Implement leave-one-style-out selector, but do not promote it as the scanner default. | `--selector leave-one-style-out` now ranks layers/k values by holding out each training style and averaging held-out F1, falling back to CV for single-style training. Latest Pythia reports `20260602T004340Z-cross-style-pythia-70m` / `20260602T004433Z-cross-style-pythia-70m` and Qwen reports `20260602T004408Z-cross-style-qwen2.5-0.5b` / `20260602T004504Z-cross-style-qwen2.5-0.5b` were weaker than the plain CV sweeps and still failed A direction. Need explicit poison-family labels for a real family-aware selector. |
| 2026-06-02 | Implement heuristic leave-one-family-out selector, but do not promote it as the scanner default. | `research/benchmarks/family_labels.py` now provides primary risk-family labels and `--selector leave-one-family-out` holds out those groups. Latest Pythia family sweep `20260602T011238Z-cross-style-pythia-70m` reached 45.8% recall / 50.6 F1 post-hoc but family `best-auto` only reached 36.1% / 41.7. Latest Qwen family sweep `20260602T011309Z-cross-style-qwen2.5-0.5b` stayed weak at 21.2% / 33.4 and family `best-auto` reached 20.4% / 32.3. |
| 2026-06-02 | Add heuristic family-routed layer experiments, but keep them out of the MVP default. | `--with-family-routing` now adds `*_family_routed` rows where each heuristic family selects layers by within-family CV when enough samples exist. Latest Pythia report `20260602T025206Z-cross-style-pythia-70m` routed best5 reached 45.6% recall / 50.5 F1 vs global best5 45.8% / 50.6. Latest Qwen report `20260602T025038Z-cross-style-qwen2.5-0.5b` routed best5/best10 stayed around 21.0% / 33.1-33.3 vs global 21.2% / 33.4. |
| 2026-06-01 | Naive top-k layer ranking is useful evidence but not enough for the scanner default. | Latest Pythia top-k reports `20260602T002353Z-cross-style-pythia-70m` and `20260602T002406Z-cross-style-pythia-70m`: best3 improved raw B-direction to 48.9% recall / 53.0 F1, while best5 fell to 28.7% recall / 37.0 F1. Latest Qwen top-k reports `20260602T002449Z-cross-style-qwen2.5-0.5b` and `20260602T002534Z-cross-style-qwen2.5-0.5b`: best3/best5 missed post-hoc layer 21 and fell to about 22% recall. Next layer selector should use family-aware or leave-one-style-out validation. |
| 2026-06-01 | Pick Pythia-70M SAE as the MVP activation-scanner default. | Latest cross-style report `20260601T235940Z-cross-style-pythia-70m`: layer-2 SAE reached 87.2% recall / 73.6 F1 in 17.6s on hand-core -> MCPTox, beating same-layer raw and TF-IDF. |
| 2026-06-01 | Promote Gemma 3 1B raw all-layer concat to optional heavier second pass. | Latest concat report `20260602T000446Z-cross-style-gemma-3-1b-pt`: 62.1% recall / 70.5 F1 in 71.6s on hand-core -> MCPTox, but MCPTox -> hand-core remains 0%. |
| 2026-06-01 | Do not promote current Gemma 3 1B SAE target. | Latest layer-14 SAE report `20260602T000710Z-cross-style-gemma-3-1b-pt`: SAE improved raw recall 21.4% -> 27.8%, but stayed far below 1B raw concat and Pythia SAE. |
| 2026-06-01 | SmolLM2-135M is useful as a cheap raw comparison, not as a default scanner. | Latest reports `20260602T001204Z-cross-style-smollm2-135m` and `20260602T001230Z-cross-style-smollm2-135m`: best post-hoc B-direction layer reached 46.0% recall / 59.5 F1, while concat reached 36.7% recall / 51.7 F1; A direction still failed. |
| 2026-06-01 | Qwen2.5-0.5B is now the strongest small raw challenger, but layer selection is the blocker. | Latest reports `20260602T001314Z-cross-style-qwen2.5-0.5b` and `20260602T001358Z-cross-style-qwen2.5-0.5b`: post-hoc layer 21 reached 61.0% recall / 71.8 F1, but train-CV selected layer 15 only reached 28.0% recall / 42.0 F1; concat reached 54.0% recall / 64.6 F1. |

## Source Pointers

Local evidence:

- `research/activation-probe-tool-poisoning.md`
- `research/SCANNER_PIPELINE.md`
- `research/benchmark-results-deberta-vs-probe-2026-05-31.md`
- `research/audit-report-2026-06-01.md`
- `research/audit_logs/`

External model sources checked on 2026-06-01:

- `https://huggingface.co/google/gemma-3-270m`
- `https://huggingface.co/google/gemma-3-1b-pt`
- `https://huggingface.co/google/gemma-3-4b-pt`
- `https://huggingface.co/google/gemma-scope-2-270m-pt`
- `https://huggingface.co/google/gemma-scope-2-1b-pt`
- `https://huggingface.co/google/gemma-scope-2-4b-pt`
