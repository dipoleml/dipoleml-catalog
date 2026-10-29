# REPRODUCE — Activation-Probe Tool-Poisoning Scanner

End-to-end reproducible record of the investigation + benchmarks behind
`activation-probe-tool-poisoning.md`. Written so an independent agent (e.g. Codex)
can review the reasoning, re-run every experiment, and confirm (or refute) each number.

For the current product-shaped scanner path after the original paper experiments,
use `PRODUCT_REPRODUCIBILITY_LEDGER_2026-06-03.md`. That ledger records the Qwen
pooled artifact, runtime policy, calibration report, review queue, and exact
commands needed for peer review of the scanner preview.

**TL;DR of the scientific claims being reproduced:**
> 1. Text-level detectors (incl. Snyk's shipped `deberta-v3-base-prompt-injection-v2`) catch **0–20 %** of MCP tool poisoning.
> 2. Activation probes hit **96–99 %** in-distribution. Cross-family generalization (train one attack family, test a structurally-distinct one) is **strong on capable models** (raw recall: Pythia-70m 88 %, Gemma-2-2b 77 %) but can be poor on a weak model/layer (GPT-2 layer-7: raw 14 %).
> 3. **SAE-encoding gives a consistent but model-dependent cross-family lift** (Gemma +8, Pythia +12 recall; never hurts on the cross-family direction). The dramatic GPT-2 result (14 % → 84 %) is an **outlier** driven by GPT-2's unusually poor raw cross-family transfer — it does NOT generalize as a "+70-point SAE rescue" on modern models. An ablation shows the GPT-2 SAE win does not depend on the additive-framing confound.
> 4. Training only on blatant attacks (MCPTox) never transfers to subtle ones (~0 % everywhere) — **diverse, subtle training is required.**
>
> Everything runs on open tooling (GPT-2 / Pythia / Gemma-2-2b + open SAEs), zero proprietary access. **Do not headline "14 % → 84 %"** — it is the high end of a model-dependent effect.

---

## 0. Reviewer orientation — what to verify & where drift is expected

Verify these independently:
1. **Snyk's real mechanism** is a text classifier, not activations (§2 step 3).
2. **deberta ≈ 0–20 % recall on tool poisoning** (§4 exp 2).
3. **Cross-family generalization is model-dependent; SAE gives a small consistent lift, NOT a universal rescue** — the GPT-2 14 %→84 % is an outlier (§4 exp 6,7,12,13).
4. **Ablation refutes the additive-confound worry** for the GPT-2 result (§4 exp 11).

Expected nondeterminism: seed 42 is set everywhere, but `torch`/`transformers` kernels + HF model snapshots can shift metrics by ~±1–2 pts. Neuronpedia auto-interp text may change over time. Conclusions (orders of magnitude, sign of effects) should hold; exact decimals may drift slightly.

---

## 1. The thinking process (the full arc, incl. self-corrections)

This is the reasoning chain, not a tidy after-the-fact story. The self-corrections are the point.

1. **Goal:** determine whether activation probing is a genuinely differentiated approach for detecting MCP tool poisoning (vs the incumbent text-based scanners), and whether it generalizes. A literature sweep situates the work (`related-work-activation-probing-survey-2026-05.md`, 130 papers): "model internals detect text-level attacks" is an active 2026 line, but no shipped tool packages it for MCP tool poisoning.

2. **Challenge the premise:** is activation probing *actually* differentiated vs the incumbent (Snyk/Invariant `mcp-scan`)? A subagent claimed "for static text, activation probing buys little over a classifier." **Do not trust that — verify.**

3. **Read the incumbent's source** (clone `github.com/snyk/agent-scan` ← redirect from `invariantlabs-ai/mcp-scan`, and `github.com/invariantlabs-ai/invariant`). Finding: the deep detector is `protectai/deberta-v3-base-prompt-injection-v2` — a HuggingFace **text classifier** (`invariant/analyzer/runtime/utils/prompt_injections.py:7,27,60`, threshold 0.9), plus regex (`secrets.py`), semgrep (`code.py`), KoalaAI moderation, OpenAI embeddings. **No activation reading anywhere.** The code self-describes the classifier as "just a heuristic… not sufficient" (`prompt_injections.py:14`). deberta's model card: trained on prompt-injection data (22 public datasets), explicitly does **not** detect jailbreaks / non-English / system prompts; tool poisoning is out-of-distribution. → The subagent's claim was wrong; the author's own paper (Round 1: a 60-rule keyword scanner caught 0/485 MCPTox) already refuted it.

4. **Quantify it:** run deberta on tool poisoning → ~0 % recall on matched-vocab, ~20 % on MCPTox. The author's probe is 96–99 % in-distribution.

5. **Key architectural insight (the author's):** the probe runs on a *local sensor model* (GPT-2 / Gemma / Qwen), not on the protected agent. So it works even when the agent is a closed cloud model (Claude/Codex) — you inspect the *content* with your own local model, not the agent's internals.

6. **Skeptic check:** is 96–99 % real generalization or in-distribution overfitting? → cross-style test (train one style, test another). **All sensors collapse to 0–23 % cross-style.** Sensor choice (GPT-2 vs SmolLM2 vs Qwen) does not matter → it's a *method* problem, not a model problem. This empirically reproduces the "False Sense of Security" concern (arXiv 2509.03888).

7. **Does diversity help?** Mixed-style training (train on many styles, test held-out) rescues *in-family* (80–100 %) but a structurally-distinct family (MCPTox held-out) stays at 15 %.

8. **SAE (the fellowship "Month 2" experiment, done solo on open tooling):** intent is semi-decodable from SAE features (best single feature AUROC 0.79; full SAE-feature probe 93 % CV) but **distributed — no single clean "intent neuron"**, and in-distribution SAE ≈ raw. No free lunch yet.

9. **The decisive test — does SAE generalize cross-family better than raw?** Same GPT-2, same hook, same split, only SAE-encode differs. **Yes: train-on-handcrafted → test-MCPTox jumps from raw 14 % to SAE 84.5 % recall.** Confirmed by leave-one-family-out: MCPTox held-out +70 pts, mean recall 81 % → 93 %. The advantage is specifically *cross-family* (when the held-out family is most unlike training).

10. **Mechanism:** the top-weighted SAE features are additive-framing surface ones (#8063 = "Also", #11596 = "included", #2344 = "each"). **Initial (over-hasty) read: "the win leans on the additive confound."**

11. **Test that read causally (ablation):** zero those features in train+test, retrain. **Refuted:** ablating #8063 → recall unchanged (84.5 → 84.7); ablating the whole additive cluster → recall *rises* to 87.0; random-3 control flat at 84.2. → The cross-family win does **not** depend on additive framing; the signal is distributed/redundant/robust. (Lesson: high logistic-regression weight ≠ causal necessity. Ablation > weight inspection.)

12. **Robustness:** appending benign "read-only / does-not-access" camouflage suffixes to caught poison → 0 % evasion (probe is not just exploiting the reassurance confound). **Caveat:** this is naive; gradient-optimized adversarial suffixes (arXiv 2602.00750) are untested.

13. **Tooling note:** the entire arc above runs on **open tooling** — open models (GPT-2, SmolLM2, Qwen2.5) + open SAEs (Joseph Bloom's GPT-2 SAEs; Gemma Scope verified loadable). No proprietary model internals or closed SAE tooling are required to reproduce any result here.

---

## 2. Environment setup (exact)

```bash
cd ~/MyGithub/claude-code-organizer/research
uv venv --python 3.10 .venv-bench
uv pip sync --python .venv-bench/bin/python --torch-backend cpu requirements-bench.txt
```

Reference versions captured for the original 2026-06-03 results
(`requirements-bench-2026-06-03.freeze` preserves the full historical freeze):
Python 3.10.12 · torch 2.12.0+cpu · transformers 5.9.0 · scikit-learn 1.7.2 · numpy 2.2.6 · sae-lens 6.44.2 · transformer-lens 3.3.0 · sentencepiece 0.2.1.

For current reruns, `requirements-bench.in` records the direct dependencies and
`requirements-bench.txt` is a uv-resolved CPython 3.10 Linux lock with patched
dependency versions. The historical freeze is evidence for the original run,
not a safe current install input. Dependency resolution of the current lock is
verified separately from reproducing the published experiment metrics.

> Note: `sae_lens` 6.x moved hook metadata to `sae.cfg.metadata.hook_name` (the scripts already handle this). HF models pulled automatically: `gpt2`, `protectai/deberta-v3-base-prompt-injection-v2`, `HuggingFaceTB/SmolLM2-360M`, `Qwen/Qwen2.5-0.5B`, SAE `gpt2-small-res-jb`, and `gemma-scope-2b-pt-res-canonical` (SAE only; the gemma-2-2b *model* is HF-gated and NOT required for any result here).

---

## 3. Data manifest (`research/datasets/`)

Lists of `{"description": str, "label": 0|1}` (0 = clean/safe, 1 = poisoned); MCPTox files use a string label `"clean"`/`"poisoned"` and extra fields (`server`, `tool`, `source_url`).

| file(s) | n | style |
|---|---|---|
| `mcptox_{clean,poisoned}_descriptions_labeled.json` | 342 clean / 485 poison | MCPTox: templated, from 45 real MCP servers (arXiv 2508.14925) |
| `hard_v3_matched_{clean,poisoned}.json` | 8 / 8 | matched-vocab pairs (same words, different intent) |
| `neutral_{clean,poisoned}.json` | 15 / 15 | neutral language, no reassurance/additive words |
| `hard_{clean,poisoned}.json` | 30 / 30 | handcrafted subtle |
| `hard_v2_{clean,poisoned}.json` | 20 / 20 | handcrafted subtle |
| `hard_v3_{clean,poisoned}.json` | 100 / 100 | handcrafted subtle |
| `adversarial_poisoned{,_v2,_v3}.json` | 30 each (poison only) | adversarial style, used as extra training poison |

All descriptions are LLM-generated (4 models, to reduce single-source bias) → **synthetic-data caveat applies** (see paper §"What I Don't Know Yet"). "handcrafted" = the author's hand-designed subtle attacks; "MCPTox" = the structurally-distinct external family.

---

## 4. Experiments — run order, command, expected output

Run all from `research/` with the venv active. Numbers below are this session's outputs (seed 42).

**exp 0 — SAE availability smoke test** (`probe_sae_smoketest.py`)
Loads an open Gemma Scope SAE. Expect: `gemma-scope-2b-pt-res-canonical :: layer_20/width_16k/canonical`, `d_in=2304 d_sae=16384`, hook `blocks.20.hook_resid_post`. Proves SAE tooling works with zero Anthropic access.

**exp 1 — deberta on tool poisoning** (`benchmark-deberta-vs-probe.py`)
Sanity: classic injection → 100 %, benign → 0 %. Then deberta recall: matched/neutral/hard = **0 %**, MCPTox = 19.8 %, OVERALL acc 52 % / recall 18 %.

**exp 2 — same-split head-to-head** (`benchmark-probe-vs-deberta-samesplit.py`)
MCPTox 30 % test: probe (GPT-2 L3) **99.2 % / rec 100 %** vs deberta 52.6 % / rec 19.9 %. Matched+neutral+hard (5-fold CV): probe **96.5 %** vs deberta 50 % / rec 0 %. (Probe numbers match the paper's 98.3 % / 97 % → harness faithful.)

**exp 3 — sensor bake-off, cross-style** (`benchmark-sensor-crossstyle.py`)
GPT-2 / SmolLM2-360M / Qwen2.5-0.5B. In-dist 99.6–99.8 %. Cross-style A (MCPTox→hard) = **0 % recall all**; cross-style B (hard→MCPTox) = 12 / 15 / 23 % recall. → sensor doesn't rescue generalization.

**exp 4 — mixed-style leave-one-style-out** (`benchmark-mixedstyle.py`)
Held-out recall: hard 96.7 %, hard_v2 100 %, hard_v3 93 %, matched 100 %, neutral 80 %, **mcptox 15.3 %** (deberta 0 % on all hand families, 19.8 % on mcptox). → diversity rescues in-family; cross-family (mcptox) still fails with raw activations.

**exp 5 — SAE intent decomposition** (`exp_sae_intent.py`)
GPT-2 + `gpt2-small-res-jb` (blocks.7, 24576 feat). Best single feature #22573 AUROC **0.793**; full SAE-feature probe 5-fold CV **93.1 %**. → intent semi-decodable but distributed; in-dist ≈ raw.

**exp 6 — SAE vs raw, cross-style (decisive)** (`exp_sae_vs_raw_crossstyle.py`)
Same model/hook/split, only SAE-encode differs. Dir A (MCPTox→hand): raw 1.5 % / SAE 0.8 % rec (both fail). **Dir B (hand→MCPTox): raw rec 14.0 % → SAE rec 84.5 %** (F1 23.6 → 82.6). In-dist both ~97–99 %.

**exp 7 — leave-one-family-out, SAE vs raw (confirmation)** (`exp_sae_vs_raw_leaveout.py`)
Δrecall (SAE−raw): **mcptox +69.9 %** (14.0→83.9), hard −6.7, hard_v2 0, hard_v3 +4.0, matched 0, neutral +6.7. **MEAN recall 81.2 % → 93.5 %.** → SAE's edge is specifically cross-family.

**exp 8 — which features drive transfer** (`exp_name_intent_features.py`)
Top poison-weighted SAE features: #8063 (+1.028, mean_poison 0.332 / clean 0.000), #14913, #12772, #22573, #11596, #2344. Neuronpedia auto-interp: #8063="Also", #11596="included", #2344="each" (additive framing); #12772/#22573 = data/file processing.

**exp 9 — additive-feature ablation** (`exp_ablate_additive.py`)
Cross-family (hand→MCPTox) recall: baseline **84.5 %** → ablate #8063 **84.7 %** → ablate {Also,incl,each} **87.0 %** → random-3 control **84.2 %**. → **win does NOT depend on additive framing** (refutes the confound hypothesis).

**exp 10 — adversarial camouflage-suffix evasion** (`exp_adversarial_evasion.py`)
Probe catches 146/146 originals; with benign "read-only" suffixes appended, worst-case **0/146 = 0 % evasion** (deberta's recall instead *rises*, reacting to suffix keywords). Caveat: gradient-optimized attack untested.

**exp 11 — greedy black-box adversarial suffix** (`exp_adversarial_gcg.py`)
Optimises an appended suffix per poison item (clean-token pool, greedy coordinate search) to minimise the probe's poison-prob. Result: **1/20 = 5 % evasion**, mean poison-prob after attack 0.994 (vs naive fixed-suffix 0 %). A tractable lower bound on robustness; full white-box GCG could be stronger.

**exp 12 — cross-model confirmation, Pythia-70m** (`exp_sae_crossmodel_pythia.py`)
Different family (EleutherAI GPT-NeoX) + open residual SAE (blocks.2). Dir A ~0 %. Dir B (hand→MCPTox): **raw rec 88.0 % → SAE 100 %** (F1 75→77). → raw already generalizes cross-family here; SAE adds recall but ~flat F1. The GPT-2 collapse does NOT replicate.

**exp 13 — cross-model adjudication, Gemma-2-2b** (`exp_sae_gemma_crossfamily.py`)
Modern model + Gemma Scope canonical SAE at layer 15 (depth 0.58, matched to GPT-2 blocks.7). HF loader with `low_cpu_mem_usage`+bf16 (transformer_lens doubled memory and OOM-killed; see note). Dir A ~0 %. Dir B: **raw 77.0 % → SAE 85.0 %** recall (F1 78.6 → 81.0). → SAE gives a modest +8 lift; raw already strong. Confirms the +70 GPT-2 gap is model-specific.

> Memory note for exp 13: load gemma-2-2b via HF `AutoModel(..., low_cpu_mem_usage=True, torch_dtype=bfloat16)`, NOT `transformer_lens.HookedTransformer.from_pretrained` (the latter transiently doubles weights → OOM/SIGKILL on a 30 GB box). Gemma Scope `layer_15/hook_resid_post` == HF `hidden_states[16]`.

### Cross-family (direction B) across model families — the adjudication
| model (layer/depth) | RAW recall | SAE recall | SAE − RAW |
|---|---|---|---|
| GPT-2 (7/12, 0.58) | 14 % | 84 % | +70 (outlier) |
| Pythia-70m (2/6, 0.33) | 88 % | 100 % | +12 (F1 flat) |
| Gemma-2-2b (15/26, 0.58) | 77 % | 85 % | +8 |

Honest reading: SAE consistently ≥ raw on the cross-family direction (never hurts), but the magnitude is small on capable models; GPT-2's +70 reflects its unusually poor raw transfer at that layer, not a universal SAE advantage.

---

## 5. Consolidated headline table

| setting | text/deberta | raw activation probe | SAE features |
|---|---|---|---|
| tool poisoning recall (deberta zero-shot) | 0–20 % | — | — |
| in-distribution (MCPTox / handcrafted) | — | 96–99 % | 93–99 % |
| cross-family recall, GPT-2 (held-out MCPTox) | ~20 % | **14 %** | **84 %** |
| cross-family recall, Pythia-70m / Gemma-2-2b | ~20 % | 88 % / 77 % | 100 % / 85 % |
| mean leave-one-family-out recall (GPT-2) | — | 81 % | **93 %** |
| additive-confound dependence (ablation) | — | — | none (84.5→87 when ablated) |
| naive camouflage-suffix evasion | — | **0 %** | — |

---

## 6. Honest caveats (for adversarial review)

1. **In-distribution optimism:** probe is supervised + same-distribution; deberta is zero-shot. The 99 % is a *product* comparison ("train your own detector"), not a like-for-like science comparison.
2. **MCPTox is templated → easy for any trained classifier** (TF-IDF ~97 % in the paper). Do not headline the 99 %. Public floor = cross-style; punchline = "matched-vocab text detector = 0 %".
3. **All data synthetic / LLM-generated.** No confirmed in-the-wild description-only poisoning case as of the paper.
4. **The dramatic GPT-2 SAE win (14 %→84 %) is a model/layer outlier.** Replicated on Pythia-70m and Gemma-2-2b (exp 12,13): raw activations already generalize cross-family (88 % / 77 %), and SAE adds only +12 / +8 recall. The robust claim is "SAE = small consistent lift," not "+70 rescue." Single SAE layer per model; broader layer sweeps not run.
5. **Ablation shows non-necessity (redundancy), not zero role** of additive features.
6. **Cross-family direction A (train MCPTox → test handcrafted) still ~0 %** even with SAE — SAE helps only when training is diverse/subtle.
7. **Adversarial:** robust to naive fixed suffix (0 %) and greedy black-box suffix search (5 %, exp 11); full white-box gradient GCG still untested — the strongest threat.
8. **No single monosemantic "malicious intent" SAE feature** found; signal is distributed.

---

## 7. What Codex should re-derive independently
- Re-clone `snyk/agent-scan` + `invariantlabs-ai/invariant`; confirm the detector is `protectai/deberta-v3-base-prompt-injection-v2` + the "not sufficient" comment (`prompt_injections.py:14`).
- Re-run exps 1–10; confirm the **sign and magnitude** of: deberta ≈ 0–20 %, raw cross-family ≈ 14 %, SAE cross-family ≈ 84 %, ablation no-drop.
- Spot-check the 130-paper survey count via the arXiv queries in the related-work file's provenance.
- Flag any number that differs by >5 pts from §4 as a reproduction discrepancy worth investigating.

## 8. File index
- Paper: `activation-probe-tool-poisoning.md`
- Scripts: the `*.py` above + `requirements-bench-2026-06-03.freeze`
- Results: `benchmark-results-deberta-vs-probe-2026-05-31.md`, `related-work-activation-probing-survey-2026-05.md`
- Data: `datasets/`
