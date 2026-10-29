# Citadel Optimizer Proof

This benchmark asks one narrow question:

> Can an open controller lower the total cost of multi-step agent work while
> preserving independently verified outcomes?

It is separate from `benchmarks/product-proof/`. The product-proof benchmark
compares bare and Citadel-assisted operation. Optimizer Proof compares economic
policies and must not rewrite, reinterpret, or reuse that frozen result.

## Frozen matrix

- 10 scenarios across Citadel, p-limit, and Nano ID
- 6 task categories
- 4 policies: always-frontier, always-cheap, prompt-only, and adaptive
- 3 repetitions per policy and scenario
- 120 completed, signed actual-run cells
- 4 holdout scenarios excluded from profile calibration
- 2 runtime families and 3 capability/cost tiers

## Actual result

The authorized subscription-backed matrix completed on 2026-07-30:

- 120/120 signed cells;
- 84 cells reached a model;
- 87 real model attempts, counted from verification receipts;
- 33 passed, 51 failed, and 36 remained unknown after setup failed before a
  model ran;
- 590.857 aggregate model-cell runtime minutes;
- `$114.575324` known list-price-normalized comparison cost, not a cash charge
  or subscription invoice;
- 0 adversarial false passes.

The engineering gate passed and the performance gate did not. Adaptive and
prompt-only each verified 6/12 held-out cells, while adaptive's descriptive
known-cost median was `$0.948231` versus prompt-only's `$0.522119`. Three
held-out cells per policy have unknown cost, so the report correctly refuses
to compute savings.

All 36 Nano ID cells failed the frozen setup command before any model call.
A zero-model replay at the pinned ref reproduces `ERROR packages field missing
or empty` under pnpm `9.12.1`; the pinned `pnpm-workspace.yaml` has no
`packages` field. These remain setup-unknown, not model failures.

The frozen matrix also exposed two record-shape limitations. Setup fallback
records report one top-level attempt despite having no verification receipt,
and adaptive escalation leaves the terminal profile in
`selected_profile_id`. Count real model attempts from receipts and read the
receipt sequence as the executed route. These limitations require a new
benchmark identity; this matrix is preserved unchanged.

Canonical artifacts:

- [`actual-runs/actual-runs.jsonl`](actual-runs/actual-runs.jsonl)
- [`actual-report.json`](actual-report.json)
- [`proof-bundle/manifest.json`](proof-bundle/manifest.json)
- [`actual-forensics/nanoid-setup.json`](actual-forensics/nanoid-setup.json)

Report:
`optimizer-report-sha256:f43285ff9254b84a49ae8e4e7c02f278716ed4c09db4e30307d7678c75420aa9`

Proof bundle:
`sha256:1822a5a8c73e570884ca8e0e38c28bdaf2d1934f8fafdb647f60ad5d337e13db`

Bundle construction canonicalizes copied text inputs to LF before hashing so
the byte-bound artifact verifies identically on Windows and Linux.

The checked-in executor set binds exact public model IDs, the reviewed
self-contained runtime adapter, and the canonical Operation Fork executor
profile for each runtime/model pair. The completed 4-run calibration proves
that the authenticated accounts can launch those exact IDs and that runtime
telemetry reports the same identity and a known normalized cost source. It does
not prove task quality or savings: all four calibration task verifiers failed.

The completed calibration remains bound to
`calibration-scenarios/`, an unchanged archive of the scenario set it actually
ran. A no-model forensic audit proved that the original `npm test` verifier for
`p-limit-cleanup-pending` failed on unrelated lint and TypeScript tooling before
task tests executed. The actual matrix was therefore re-frozen with a
task-focused AVA verifier. That verifier fails on the pinned queue bug and
passes a reference repair touching both expected artifacts.

The authorized two-run diagnostic then completed against one frontier profile
per runtime. Both model-identity and execution-receipt gates passed. Claude
changed `index.js` and all 22 task tests passed, but the original pilot record
correctly remained failed because the scenario also required an unnecessary
`test.js` edit. Codex made no patch and its verifier failed. The immutable pilot
scenario set and failed record are archived; a zero-call forensic replay binds
the false-negative classification. The future matrix narrows only that
scenario's expected artifact list to `index.js`.

## Evidence levels

`fixture-simulation` validates schemas, policy determinism, report math,
anti-tamper behavior, and the submission blockers. It is not evidence of model
quality or savings.

`actual-run` requires:

1. exact frozen models and bound executor profiles;
2. a checked-in public-random scenario selection and Ed25519 public key;
3. runner-owned verification of changed artifacts and repository tests, with
   bounded path- and secret-redacted output and patch receipts for every attempted
   verification;
4. strict cost provenance;
5. a signed raw run record.

Unknown cost remains unknown. A failed or unknown outcome still contributes its
known normalized cost and can never be counted as a saving. For the current
subscription-backed calibration, this is a comparison metric rather than an
invoice amount.

## Commands

```bash
node scripts/optimizer-benchmark.js validate
node scripts/optimizer-benchmark.js doctor
node scripts/optimizer-benchmark.js pilot-plan
node scripts/optimizer-benchmark.js selection-request
node scripts/optimizer-benchmark.js select-holdout \
  --output <external-selection.json>
node scripts/optimizer-benchmark.js matrix-plan
node scripts/optimizer-matrix-run.js --dry-run
node scripts/optimizer-matrix-run.js
node scripts/optimizer-benchmark.js plan \
  --scenario p-limit-short-clear-queue \
  --policy adaptive \
  --fixture-probe
node scripts/optimizer-benchmark.js fixture --output <raw.jsonl>
node scripts/optimizer-benchmark.js report \
  --input <raw.jsonl> \
  --output <report.json>
node scripts/optimizer-proof-bundle.js build \
  --raw <raw.jsonl> \
  --report <report.json> \
  --output <bundle-directory>
node scripts/optimizer-proof-bundle.js verify <bundle-directory>
node scripts/test-optimizer.js
```

`--fixture-probe` is visibly synthetic. A real adaptive plan requires
`--repository <checked-out-path>`.

`pilot-plan` makes no model calls. The completed plan capped the diagnostic at
2 frontier-profile CLI runs and 80 aggregate model-runtime timeout minutes.
The fixed record path and completed status prevent a duplicate pilot. Its raw
failed result, archived inputs, and zero-call forensic replay are all
digest-bound and remain excluded from performance claims.

`matrix-plan` makes no model calls. Seth Gammon approved the checked-in
authorization at `2026-07-30T20:44:02.628Z`; it caps the frozen matrix at 120
CLI cells, 162 model attempts, and 7,230 aggregate timeout-minutes. The timeout
figure is a fail-safe ceiling, not expected duration or a dollar estimate.
No matrix run predates that approval. The completed matrix used 120 CLI cells,
87 receipt-backed model attempts, and 590.857 aggregate model-cell runtime
minutes.
`optimizer-matrix-run.js` writes an intent before each cell, validates every
signed result, resumes completed cells, and refuses to retry an ambiguous cell
automatically. This prevents a crash from silently spending quota twice.

`selection-request`, `select-holdout`, `freeze-selection`, `reproduction-plan`,
`verify-reproduction`, and `freeze-reproduction` make no model calls. The
selection command reads one precommitted public beacon round from three
relays; it does not contact a human. The matrix command requires the checked-in
subscription authorization, which is now approved. The `reproduce`
command is an optional, separately quota-gated path for any third party who
independently chooses to rerun the selected scenario; it is not a submission
gate and requires no outreach. See
[`holdout/EXTERNAL_SELECTION.md`](holdout/EXTERNAL_SELECTION.md) and
[`holdout/OPTIONAL_REPRODUCTION.md`](holdout/OPTIONAL_REPRODUCTION.md).
The canonical public request is
[`holdout/external-selection-request.json`](holdout/external-selection-request.json).

## Frozen identities

- Scenario set:
  `optimizer-scenarios-sha256:602e496906f3a293203750602234ba88a55a86b9e4f54f32239264098dcebe5b`
- Archived diagnostic-pilot scenario set:
  `optimizer-scenarios-sha256:1269928412c49b9405293a0cbf814d6e62ab50988579f0fbdb1353b4c17df2b2`
- Archived calibration scenario set:
  `optimizer-scenarios-sha256:d9e0a9eab6c005ae8fdabbc69696397cecab2a0f45009b88357c989818103a7a`
- Executor set:
  `optimizer-executors-sha256:8eb2367e150c75864573e8369a481e4a13be331b8544291563ab9cf9b457d4cb`
- Metric set:
  `optimizer-metrics-sha256:bedffbda2b18d725610b0f294a8273ef908237fd957bf9e51a5af4885b123e4f`
- Pricing snapshot:
  `sha256:25b513c37e29469432a02426ef9fee93c190489cfada0548ae6c3376ec4b5ae1`

The source commits were confirmed from the public GitHub repositories on
2026-07-29 and are pinned in each scenario manifest.
