# Adversarial Reproduction Audit - 2026-06-01

Scope: audited `research/REPRODUCE.md` against the paper draft
`research/activation-probe-tool-poisoning.md`, the repo source, the reproduced
logs, and extra adversarial/methodology checks. All commands were run locally in
`/Users/nicole/Personal GitHub/cross-code-organizer` unless noted.

## Executive verdict

The reproduction is directionally honest about the main phenomenon: standard
text prompt-injection detectors perform badly on these tool-poisoning
descriptions, while simple supervised activation probes can fit and transfer
within the tested setup. But several claims need to be tightened before they
should be treated as paper-grade evidence.

The core result that holds:

- DeBERTa/Invariant-style text detectors miss most subtle tool poisoning in this
  benchmark.
- Supervised hidden-state probes get very high in-distribution scores.
- SAE features can improve cross-style transfer in some settings: strongly in
  the GPT-2 hand-trained-to-MCPTox direction, strongly for Pythia with a high
  raw baseline, and modestly for authenticated Gemma.
- Top SAE "intent" features are not individually necessary; the signal is
  distributed.
- The tested suffix attacks do not easily evade the probe.

The core result that does not hold as written:

- The broad "MCPTox training never transfers everywhere" framing is too strong.
  If embedding-layer features are allowed, raw probes can recover non-trivial
  transfer from MCPTox to hand-written attacks. If only residual-stream layers
  after embedding are counted, the collapse mostly returns.
- The GPT-2 `14% -> 84%` SAE headline is real for the chosen layer/probe setup,
  but it is layer-sensitive and should not be sold as an architecture-level
  absolute.
- Several leave-one-style-out numbers are inflated or at least contaminated by
  exact duplicate leakage across hand-crafted families.

## Environment and reproducibility

`REPRODUCE.md` asks for Python 3.10 and pinned versions. I used a local
Python 3.11 venv because the available local environment resolved there. The
actual environment installed newer packages: `torch 2.12.0`, `transformers
5.9.0`, `scikit-learn 1.8.0`, `numpy 2.4.6`, `sae-lens 6.44.2`, and
`transformer-lens 3.3.0`.

This matters for strict reproduction. The main scripts ran with these
reproduction notes:

- `sae_lens.toolkit` was absent in the installed API, though the SAE-loading
  smoke test still loaded the GPT-2 and Gemma Scope SAEs through the available
  APIs.
- `google/gemma-2-2b` initially failed with a `401 GatedRepoError` while the
  local Hugging Face CLI was not logged in. After authenticating as a gated
  Gemma-enabled Hugging Face account, I reran the Gemma experiment with the
  batched audit runner `research/audit_gemma_batched_crossfamily.py`.

Logs are in `research/audit_logs/`. The extra audit scripts added for this
review are:

- `research/audit_raw_layer_sweep.py`
- `research/audit_topk_sae_ablation.py`
- `research/audit_whitebox_gcg_raw_probe.py`
- `research/audit_gemma_batched_crossfamily.py`

## Claim-by-claim verdict

| Claim | Verdict | What the audit found |
| --- | --- | --- |
| C1. Existing scanners reduce poisoning to text classifiers / keyword-like checks | Mostly holds, with Snyk caveat | Invariant calls a Hugging Face DeBERTa text-classification pipeline with an injection threshold. The open-source Snyk client sends tool descriptions to a remote analysis API; local code does not expose activation/hidden-state logic, but the server backend is opaque. |
| C2. DeBERTa misses subtle tool poisoning | Holds | On matched/neutral/hard hand-crafted sets, DeBERTa was at 50% accuracy with 0% recall; on MCPTox, recall was about 19.8%. |
| C3. Activation probes reach 96-99% | Holds, but only as supervised/in-distribution evidence | Same-split GPT-2 probe hit 99.2% accuracy and 100% recall on MCPTox; pooled small hand sets hit 96.5% accuracy and 97.7% recall. This is not zero-shot and not directly comparable to DeBERTa as a deployed detector. |
| C4. Cross-family transfer is model-dependent; SAE helps | Mostly holds, with layer-choice caveat | Pythia reproduced strongly. Gemma reproduced a modest +8 recall SAE lift. GPT-2 chosen-layer numbers reproduce, but a raw layer sweep weakens the "raw GPT-2 collapses absolutely" story. |
| C5. No single SAE intent feature is necessary | Holds | Ablating top positive features did not collapse recall. Top-50 ablation actually raised recall, suggesting redundancy and correlation rather than a single causal neuron. |
| C6. Suffix attacks do not easily evade the probe | Holds for tested bounded attacks only | Fixed suffix attacks caused 0/146 evasion. Black-box greedy suffix caused 1/20 evasion. My bounded white-box raw-probe attack caused 0/20 evasion. This is not a full proof against stronger semantic-preserving optimization. |
| C7. MCPTox-trained probes never transfer to subtle poisoning everywhere | Fails as written | For non-embedding residual layers this is mostly true; with embedding-layer features allowed, GPT-2 and Pythia raw probes can transfer materially. The word "everywhere" should be removed. |

## Official reproduction results

### Text detector baseline

From `01_benchmark-deberta-vs-probe.log`:

- DeBERTa classic injection sanity check: 100% detection.
- Benign examples: 0 false positives in the sanity set.
- Matched subtle set: 50% accuracy, 0% recall.
- Neutral set: 50% accuracy, 0% recall.
- Hard v2 set: 50% accuracy, 0% recall.
- MCPTox: 827 examples, 52.4% accuracy, 95.0% precision, 19.8% recall,
  32.8% F1.

This supports the paper's detector-failure point, but the correct framing is:
the deployed text detector is sensitive to classic injection language and poor
on subtle tool-description poisoning.

### Same-split activation probe versus DeBERTa

From `02_benchmark-probe-vs-deberta-samesplit.log`:

- MCPTox 70/30 test split:
  - GPT-2 layer-3 probe: 99.2% accuracy, 98.6% precision, 100% recall,
    99.3% F1.
  - DeBERTa: 52.6% accuracy, 96.7% precision, 19.9% recall, 33.0% F1.
- Pooled matched/neutral/hard small sets:
  - GPT-2 probe 5-fold CV: 96.5% accuracy, 95.5% precision, 97.7% recall,
    96.6% F1.
  - DeBERTa: 50% accuracy, 0% recall, 0% F1.

This supports C3, but it is a supervised training result. The script itself
describes the comparison as deliberately unfair: the probe is trained on labels
from the evaluated distribution, while DeBERTa is used zero-shot.

### Cross-style transfer

From `03_benchmark-sensor-crossstyle.log`:

- GPT-2 train MCPTox -> hand subtle attacks: 48.8% accuracy, 0% recall.
- GPT-2 train hand subtle -> MCPTox: 45.3% accuracy, 69.9% precision,
  12.0% recall, 20.4% F1.
- SmolLM2 and Qwen2.5 showed the same qualitative pattern: near-zero recall in
  the MCPTox -> hand direction, low recall in the hand -> MCPTox direction.
- DeBERTa stayed at 0% recall on hand subtle attacks and 19.8% recall on
  MCPTox.

As an official reproduction, this supports the paper's "style shift is hard"
point.

### Mixed-style training

From `04_benchmark-mixedstyle.log`:

- Held-out MCPTox: probe recall 15.3%, F1 25.4%; DeBERTa recall 19.8%.
- Held-out hand-crafted families were much easier for the probe:
  - hard: 96.7% recall
  - hard_v2: 100% recall
  - hard_v3: 93.0% recall
  - matched: 100% recall
  - neutral: 80.0% recall

These numbers should not be cited without the duplicate-leakage caveat below.

### SAE intent and cross-style results

From `05_exp_sae_intent.log`:

- GPT-2 SAE `gpt2-small-res-jb`, layer `blocks.7.hook_resid_pre`.
- Best single SAE feature: feature `22573`, AUROC 0.793.
- Full SAE feature probe 5-fold CV accuracy: 93.1%.

From `06_exp_sae_vs_raw_crossstyle.log`:

- Train MCPTox -> hand:
  - RAW: 1.5% recall, 3.0% F1.
  - SAE: 0.8% recall, 1.5% F1.
- Train hand -> MCPTox:
  - RAW: 14.0% recall, 23.6% F1.
  - SAE: 84.3% recall, 82.5% F1.
- In-distribution scores were near ceiling for both raw and SAE probes.

From `07_exp_sae_vs_raw_leaveout.log`:

- Held-out MCPTox: raw recall 14.0%, SAE recall 84.5%.
- hard: raw recall 100%, SAE recall 90%.
- hard_v2: both 100%.
- hard_v3: raw 93%, SAE 97%.
- matched: both 100%.
- neutral: raw 80%, SAE 86.7%.

This supports "SAE can help", not "SAE always helps". It hurts held-out `hard`
and is irrelevant on already-saturated sets.

### Authenticated Gemma cross-family rerun

The original `13_exp_sae_gemma_crossfamily.log` failed because
`google/gemma-2-2b` is gated and the local Hugging Face CLI was not logged in.
After authenticating the CLI, I reran the same Gemma-2-2b layer-15 experiment
with `audit_gemma_batched_crossfamily.py`, a batched CPU runner that preserves
the same data, model, SAE, layer, and mean-pooling logic while avoiding the
single-item forward-pass bottleneck.

From `21_audit_gemma_batched_crossfamily.log`:

- Gemma Scope SAE: `gemma-scope-2b-pt-res-canonical`,
  `layer_15/width_16k/canonical`, hook `blocks.15.hook_resid_post`.
- Train MCPTox -> hand:
  - RAW: 41.1% accuracy, 2.3% recall, 4.5% F1.
  - SAE: 40.8% accuracy, 2.3% recall, 4.4% F1.
- Train hand -> MCPTox:
  - RAW: 79.5% accuracy, 78.0% recall, 79.2% F1.
  - SAE: 80.5% accuracy, 86.0% recall, 81.5% F1.

This verifies the paper's Gemma-scale point better than the earlier gated
failure: the SAE lift is real but modest in the hand -> MCPTox direction, and SAE
does not rescue the MCPTox -> hand direction.

### Adversarial suffix tests

From `10_exp_adversarial_evasion.log`:

- Original test poison descriptions caught: 146/146.
- Fixed suffix attacks kept probe recall at 100%.
- DeBERTa recall varied from 19.9% to 53.4% depending on suffix.
- Worst fixed-suffix probe evasion: 0/146.

From `11_exp_adversarial_gcg.log`:

- Greedy black-box suffix over 20 caught test-poison examples caused 1/20
  evasion, or 5%.
- The script's final printed mean poison probability is flawed: it recomputes
  `poison_prob(tok.encode(t) + [0])` instead of reporting the optimized suffix
  probabilities. The evasion count is still meaningful; the mean probability
  line is not.

From `18_audit_whitebox_gcg_raw_probe.log`:

- I added a bounded white-box coordinate attack against the raw GPT-2 layer-3
  same-split probe.
- Attack setup: 20 caught poison examples, suffix length 6, 3 coordinate
  rounds, 500 clean-token candidate pool, top-32 gradient candidates.
- Evasion: 0/20.
- Mean poison probability moved from 0.993 to 0.951, still above threshold.

This supports robustness against these toy/bounded attacks. It does not prove
robustness against full white-box SAE attacks, semantic paraphrase attacks, or
adaptive prompt/tool-description generation.

## Methodology issues found

### 1. Dataset count mismatch

`research/datasets/README.md` says MCPTox has 362 clean and 485 poison examples.
The actual dataset has 342 clean and 485 poison examples. `REPRODUCE.md` uses
the correct 342/485 count, so this is a README/documentation bug rather than a
benchmark-breaking bug.

From `14_audit_dataset_leakage_stats.log`:

- Total records across local datasets: 1283.
- MCPTox: 342 clean, 485 poison.

### 2. Small pooled same-split CV has pair leakage

`benchmark-probe-vs-deberta-samesplit.py` uses row-level `StratifiedKFold` for
the pooled matched/neutral/hard hand-crafted sets. If the clean and poison
variants are paired by construction, this leaks many opposite-label pairs across
train and test.

From `14_audit_dataset_leakage_stats.log`:

- 68/86 small pooled CV test rows, or 79.1%, have their opposite-label pair in
  train under the row-level fold simulation.

This does not invalidate the MCPTox 70/30 result, where exact duplicate leakage
was only 5/249 test examples, or 2.0%. But it makes the small pooled 96.5% CV
probe result less persuasive.

### 3. Mixed-style leave-one-style-out has duplicate leakage

`benchmark-mixedstyle.py` trains on all styles except the held-out style, but it
does not deduplicate across families. Several hand-crafted families contain
exact duplicates of each other.

From `15_audit_leaveout_duplicate_leakage.log`:

- Held-out MCPTox: 0/827 exact duplicates in train.
- Held-out hard: 0/60 exact duplicates in train.
- Held-out hard_v2: 40/40 exact duplicates in train.
- Held-out hard_v3: 48/200 exact duplicates in train.
- Held-out matched: 16/16 exact duplicates in train.
- Held-out neutral: 0/30 exact duplicates in train.

This is the biggest methodological weakness in the public reproduction. Any
leave-one-style-out result for `hard_v2`, `hard_v3`, and `matched` should be
treated as contaminated unless rerun with cross-family deduplication.

I reran a deduped mixed-style layer sweep in `16_audit_raw_layer_sweep.log`.
The deduped GPT-2 mixed-style results still show strong transfer on hand
families, but some saturated F1 scores drop:

- hard_v2: removed 48 duplicate rows; recall stayed 100%, F1 dropped to 87.0%.
- hard_v3: removed 56 duplicate rows; recall 88.0%, F1 89.3%.
- matched: removed 24 duplicate rows; recall stayed 100%, F1 dropped to 88.9%.

So the effect does not disappear, but the clean headline should use deduped
numbers.

### 4. Raw probe layer choice materially changes C4/C7

I added `audit_raw_layer_sweep.py` to test all available hidden-state layers for
GPT-2 and Pythia.

From `16_audit_raw_layer_sweep.log`:

- GPT-2, train MCPTox -> hand:
  - Best layer by F1 was embedding layer 0: 30.4% recall, 40.8% F1.
  - Residual layers 1-12 mostly stayed between 1.5% and 6.8% recall.
- GPT-2, train hand -> MCPTox:
  - Best layer by F1 was layer 11: 51.3% recall, 65.4% F1.
  - The official layer-7 style setup gave about 14-15% recall.
- Pythia, train MCPTox -> hand:
  - Best layer by F1 was embedding layer 0: 63.9% recall, 60.6% F1.
  - Residual layers 1-6 mostly stayed between 0.4% and 3.4% recall.
- Pythia, train hand -> MCPTox:
  - Best layer by F1 was layer 5: 92.8% recall, 79.5% F1.

Interpretation: if the paper's claim is specifically about residual stream
representations after embedding, the "blatant MCPTox does not transfer to
subtle poisoning" point mostly holds. If the claim is about any hidden-state
probe, C7 is false as written.

### 5. SAE ablation supports redundancy, not non-causality

I added `audit_topk_sae_ablation.py` to zero out top positive SAE features,
retrain the classifier, and compare against random ablations.

From `17_audit_topk_sae_ablation.log`:

- Baseline all-feature SAE probe: 79.0% accuracy, 84.3% recall, 82.5% F1.
- Ablate top-1 positive feature: 84.7% recall.
- Ablate additive 3 features: 85.8% recall.
- Ablate top-10 positive features: 91.5% recall.
- Ablate top-20 positive features: 92.6% recall.
- Ablate top-50 positive features: 96.7% recall.
- Random ablations of 10/20/50 features stayed around 84-85% recall.

This strongly supports C5's practical claim that the detector is not relying on
one hand-picked "intent" feature. But it does not prove the named features have
no causal role. Because the classifier is retrained/evaluated over correlated
features, removing high-weight positives can also remove confounders or shift
the decision boundary.

### 6. Feature naming is mixed, not a clean semantic proof

`08_exp_name_intent_features.log` and my Neuronpedia lookup
`19_neuronpedia_feature_lookup.log` show that the top SAE features are a mixed
bag.

Useful or plausibly relevant features:

- [GPT-2 SAE feature 12772](https://www.neuronpedia.org/gpt2-small/7-res-jb/12772):
  file-management / programming-instruction flavored.
- [Feature 22573](https://www.neuronpedia.org/gpt2-small/7-res-jb/22573):
  technical terms around data processing and control.
- [Feature 20119](https://www.neuronpedia.org/gpt2-small/7-res-jb/20119):
  verify / validation language.
- [Feature 7980](https://www.neuronpedia.org/gpt2-small/7-res-jb/7980):
  "including" / additive enumeration language.

Noisy or generic features:

- [Feature 8063](https://www.neuronpedia.org/gpt2-small/7-res-jb/8063):
  "also" / additive continuation.
- [Feature 2344](https://www.neuronpedia.org/gpt2-small/7-res-jb/2344):
  "each".
- [Feature 11596](https://www.neuronpedia.org/gpt2-small/7-res-jb/11596):
  "included".
- [Feature 14913](https://www.neuronpedia.org/gpt2-small/7-res-jb/14913):
  admiration/opinion about people.

So the SAE story should be: there are distributed activation features that
correlate with suspicious tool-intent patterns. It should not be: we found a
small set of clean, human-interpretable "malicious intent neurons".

## Source audit notes

### Invariant

The Invariant detector code at
`research/audit_sources/invariant/invariant/analyzer/runtime/utils/prompt_injections.py`
uses a Hugging Face text-classification pipeline with
`protectai/deberta-v3-base-prompt-injection-v2` and a default threshold of 0.9.
The standard-library detector wrapper in
`research/audit_sources/invariant/invariant/analyzer/stdlib/invariant/detectors/prompt_injection.py`
delegates to that analyzer.

This supports C1 for Invariant: it is not inspecting model activations or tool
runtime behavior for the benchmarked detector path.

### Snyk agent-scan

The open-source Snyk client under `research/audit_sources/agent-scan` converts
resources/prompts/tool descriptions into scan payloads, then posts the payload
to a remote Snyk analysis server. Local source search found no hidden-state,
residual-stream, SAE, `output_hidden_states`, TransformerLens, or similar
activation-inspection path in `src/agent_scan`.

This supports "the open-source client is not doing activation probing", but it
does not prove what the closed remote analysis service does internally.

## Independent answers requested by the prompt

### (i) Do text detectors fail tool poisoning?

Yes for the reproduced benchmark and the inspected Invariant/DeBERTa path.
DeBERTa is good at obvious/classic injection strings and weak on subtle
tool-description poisoning. The Snyk open-source client cannot be fully judged
because the remote backend is not in the repo.

### (ii) Do activations generalize cross-family on capable models?

Mostly, with model and layer caveats. Pythia strongly supports this. Gemma now
also supports it in the hand -> MCPTox direction, with SAE recall moving from
78.0% to 86.0%. GPT-2 supports it in selected directions and layers but is more
fragile than the headline suggests.

### (iii) Are SAE features a modest consistent lift, not a magic rescue?

Mostly yes, with one important nuance. SAE features are not a universal rescue:
they do not help MCPTox -> hand in the GPT-2 setup and can hurt some held-out
families. They help substantially in hand -> MCPTox for GPT-2, modestly for
Gemma, and strongly but with a high raw baseline for Pythia. The "modest,
model-dependent lift" framing is safer than a broad
"SAE discovers intent" framing.

### (iv) Is GPT-2 `14% -> 84%` an outlier?

Yes. The exact `14% -> 84%` result reproduces for the official GPT-2 setup, but
the raw baseline is layer-sensitive. A best-layer raw GPT-2 probe reaches 51.3%
recall in the hand -> MCPTox direction, so the true gap is smaller under a
layer-swept baseline. The paper should either justify the fixed layer choice or
report layer-swept raw baselines beside SAE baselines.

## Recommended corrections before paper/repo release

1. Rewrite C7 to remove "never" and "everywhere". Safer wording: "For
   non-embedding residual-layer probes in our selected models, MCPTox-trained
   detectors transfer poorly to subtle hand-written poisoning."
2. Mark same-split probe results as supervised/in-distribution, not directly
   comparable to zero-shot DeBERTa deployment.
3. Rerun mixed-style leave-one-style-out with cross-family deduplication and
   report deduped numbers.
4. Add layer-swept raw baselines for GPT-2 and Pythia anywhere SAE gains are
   highlighted.
5. Fix `exp_adversarial_gcg.py` so the final mean poison probability reports
   optimized suffix probabilities, not `tok.encode(t)+[0]`.
6. Fix `research/datasets/README.md` MCPTox clean count from 362 to 342.
7. Keep the Gemma claim, but cite the authenticated rerun and describe it as a
   modest +8 recall SAE lift rather than a broad rescue.
8. Reframe SAE feature names as exploratory interpretability evidence, not
   proof of a clean causal malicious-intent circuit.

## Evidence index

Official reproduction logs:

- `research/audit_logs/00_probe_sae_smoketest.log`
- `research/audit_logs/01_benchmark-deberta-vs-probe.log`
- `research/audit_logs/02_benchmark-probe-vs-deberta-samesplit.log`
- `research/audit_logs/03_benchmark-sensor-crossstyle.log`
- `research/audit_logs/04_benchmark-mixedstyle.log`
- `research/audit_logs/05_exp_sae_intent.log`
- `research/audit_logs/06_exp_sae_vs_raw_crossstyle.log`
- `research/audit_logs/07_exp_sae_vs_raw_leaveout.log`
- `research/audit_logs/08_exp_name_intent_features.log`
- `research/audit_logs/09_exp_ablate_additive.log`
- `research/audit_logs/10_exp_adversarial_evasion.log`
- `research/audit_logs/11_exp_adversarial_gcg.log`
- `research/audit_logs/12_exp_sae_crossmodel_pythia.log`
- `research/audit_logs/13_exp_sae_gemma_crossfamily.log`

Extra audit logs:

- `research/audit_logs/14_audit_dataset_leakage_stats.log`
- `research/audit_logs/15_audit_leaveout_duplicate_leakage.log`
- `research/audit_logs/16_audit_raw_layer_sweep.log`
- `research/audit_logs/17_audit_topk_sae_ablation.log`
- `research/audit_logs/18_audit_whitebox_gcg_raw_probe.log`
- `research/audit_logs/19_neuronpedia_feature_lookup.log`
- `research/audit_logs/21_audit_gemma_batched_crossfamily.log`

Extra audit scripts:

- `research/audit_raw_layer_sweep.py`
- `research/audit_topk_sae_ablation.py`
- `research/audit_whitebox_gcg_raw_probe.py`
- `research/audit_gemma_batched_crossfamily.py`
