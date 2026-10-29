# External Data Source Review - 2026-06-02

This note records the current external-data search for the activation scanner
product lane. The goal is not to pour every public dataset into training. The
goal is to find sources whose text surface looks like the scanner's real input:
MCP tools, agent skills, plugin bundles, hook/config text, tool descriptions,
JSON schemas, and runtime memory/tool artifacts.

## Import rule

Treat every external source as untrusted raw evidence until it passes these
checks:

- License is compatible with the intended use.
- Raw files stay out of git.
- No package, skill, hook, script, or bundled code is executed during import.
- Converted rows keep source metadata: `source`, `source_url`, `license`,
  `source_label`, `source_split`, `family`, `pair_id`, `split_group`, and
  `import_notes`.
- Weak scanner labels stay separate from human-curated labels.
- Holdout/eval splits are never mixed into probe training.

## Evidence reliability ladder

Do not trust paper metrics just because the paper is polished. Rank evidence by
what can be inspected and rerun:

| Tier | Evidence type | Current examples | How to use |
| --- | --- | --- | --- |
| 1 | Public repo plus runnable benchmark/data | [Skill-Inject](https://github.com/aisa-group/skill-inject), [AgentDojo](https://github.com/ethz-spylab/agentdojo) | Strongest benchmark/eval sources. Still rerun locally before quoting numbers. |
| 2 | Public dataset with schema, license, and raw rows | [OpenClaw/clawhub-security-signals](https://huggingface.co/datasets/OpenClaw/clawhub-security-signals), [zhmzm/AgentTrap](https://huggingface.co/datasets/zhmzm/AgentTrap), [yoonholee/agent-skill-malware](https://huggingface.co/datasets/yoonholee/agent-skill-malware), [ProtectSkills/MaliciousAgentSkillsBench](https://huggingface.co/datasets/ProtectSkills/MaliciousAgentSkillsBench) | Good training/eval candidates after license and label-quality checks. |
| 3 | Product or model surface we can run/compare | [Snyk Agent Scan](https://github.com/snyk/agent-scan), [OpenAI Guardrails prompt injection check](https://openai.github.io/openai-guardrails-js/ref/checks/prompt_injection_detection/), [ProtectAI DeBERTa v2](https://huggingface.co/protectai/deberta-v3-base-prompt-injection-v2), [Meta Prompt Guard](https://huggingface.co/meta-llama/Prompt-Guard-86M) | Competitor baselines. Do not treat their self-reported metrics as truth until rerun on our splits. |
| 4 | Paper with no public artifact or unresolved numeric issues | [RouteGuard](https://arxiv.org/abs/2604.22888) | Category validation only. Do not quote exact benchmark numbers yet. |
| 5 | Blogs, news, social posts, marketing pages | Security writeups and product pages | Source-hunting only; never training truth. |

## Highest-priority sources

| Priority | Source | Why it matters | Caveat |
| --- | --- | --- | --- |
| A | [Skill-Inject](https://github.com/aisa-group/skill-inject) | Public benchmark/repo for skill-file attacks, with 202 injection-task pairs, 44 skill definitions, contextual and obvious injections, and multiple safety policy conditions. Closest public eval shape for `SKILL.md` poisoning. | Dynamic harmful-action benchmark. Convert skill text and labels into scanner rows without executing skills or relying on claimed ASR numbers. |
| A | [OpenClaw/clawhub-security-signals](https://huggingface.co/datasets/OpenClaw/clawhub-security-signals) | Closest current shape to the product: `skill_md_content`, `skill_bundle_content`, registry-style verdicts, static findings, VirusTotal fields, SkillSpector fields, and an `eval_holdout` split. MIT. Dataset Viewer size API confirmed 67,453 rows across train/validation/test/eval_holdout. | Silver-standard labels, not human ground truth. `suspicious` means review-needed, not automatically malicious. |
| A | [ProtectSkills/MaliciousAgentSkillsBench](https://huggingface.co/datasets/ProtectSkills/MaliciousAgentSkillsBench) | Direct agent-skill security labels with sources, skill names, classifications, and attack-pattern strings. MIT. | Dataset card reports 98,380 total skills and 157 malicious samples, but Dataset Viewer size API currently reports a config-size failure. Import from raw files carefully instead of assuming viewer parquet is clean. |
| A- | [yoonholee/agent-skill-malware](https://huggingface.co/datasets/yoonholee/agent-skill-malware) | Small, direct skill-malware text corpus: `id`, `skill_name`, `content`, `label`. MIT. Dataset Viewer size API confirmed 347 rows and first rows expose full `SKILL.md` text. Useful for first importer smoke tests. | Small dataset, likely not enough as a main benchmark alone. |
| A- | [zhmzm/AgentTrap](https://huggingface.co/datasets/zhmzm/AgentTrap) | Agent-skill package benchmark with tasks, malicious/benign skill packages, taxonomy metadata, manifests, SHA-256 hashes, and archives. Useful for product-shaped package scanning. | License is `other`; inspect terms before release/training. Dataset Viewer first-rows currently hits a schema `CastError`, so use raw archives only after review. Skill packages must be imported as inert text only. |
| A- | [DongsenZhang/MSB](https://huggingface.co/datasets/DongsenZhang/MSB) | MCP security benchmark metadata with agent tasks, attack tasks, attack types, and case manifests. MIT. Good for family taxonomy and generating realistic MCP carriers. | Not a plain text classifier dataset without converting cases into scanner input rows. |
| A- | [MCPToolBench/MCPToolBenchPP](https://huggingface.co/datasets/MCPToolBench/MCPToolBenchPP) | Realistic benign MCP tool schemas, tool dictionaries, queries, and function-call labels. Good hard-negative carrier pool. | No license was visible through the API check; verify before releasing derived artifacts. |
| B+ | [npow/memshield-bench](https://huggingface.co/datasets/npow/memshield-bench) | Memory poisoning benchmark with `content`, `label`, `paired_id`, `attack_type`, `difficulty`, domain, OWASP, and MITRE metadata. Good for runtime memory/tool-response scanner extensions. | CC-BY-SA-4.0. Keep license implications explicit if used for training. |
| B | [dmilush/shieldlm-prompt-injection](https://huggingface.co/datasets/dmilush/shieldlm-prompt-injection) | Broad prompt-injection rows with binary/category/intent labels and context metadata. MIT. Useful for hard negatives and general prompt-injection coverage. | Not specifically MCP/tool/skill poisoning. |
| B | [cyberec/Prompt-injection-dataset](https://huggingface.co/datasets/cyberec/Prompt-injection-dataset) | Apache-2.0 prompt-injection corpus with categories, severity, tags, and hard-negative examples. | Support data only; do not let classic prompt-injection wording dominate the product benchmark. |

## Benchmark-only or later sources

| Source | Use | Reason |
| --- | --- | --- |
| [deepset/prompt-injections](https://huggingface.co/datasets/deepset/prompt-injections) | Baseline comparison | Popular classic text prompt-injection dataset, Apache-2.0, but only `text` and `label`. |
| [wambosec/prompt-injections](https://huggingface.co/datasets/wambosec/prompt-injections) | Baseline comparison | MIT and has categories/goals, but examples are mostly classic prompt-injection style. |
| [zachz/prompt-injection-benchmark](https://huggingface.co/datasets/zachz/prompt-injection-benchmark) | Baseline comparison | MIT, simple benchmark rows; useful sanity check, not product-core data. |
| [AgentDojo](https://github.com/ethz-spylab/agentdojo) | Dynamic benchmark | NeurIPS 2024 benchmark with realistic tool-using agent tasks and prompt-injection test cases. Strong eval source, but not a direct static scanner training source. |
| [BIPIA](https://github.com/microsoft/BIPIA) | Indirect prompt-injection eval | Microsoft benchmark across Web QA, Email QA, Table QA, Summarization, and Code QA. Useful for runtime/tool-output extension, less direct for install-time skill scanning. |
| [HarmfulSkillBench](https://github.com/TrustAIRLab/HarmfulSkillBench) | Later eval | Relevant harmful skill benchmark, but access and use need separate review. |

## Competitor and related-defense sources

These are useful for positioning and baselines, but they are not ground-truth
labels for our scanner:

| Source | Type | Product relevance |
| --- | --- | --- |
| [Snyk Agent Scan](https://github.com/snyk/agent-scan) | Open scanner/product CLI | Important direct competitor for MCP, skills, prompt injection, tool poisoning, tool shadowing, toxic flows, malware payloads, and secrets. It uses local checks plus Snyk API validation, so compare against it separately from fully local baselines. |
| [Invariant Guardrails](https://github.com/invariantlabs-ai/invariant) | Agent trace/policy guardrail | Good runtime/policy baseline. It can run local policies and includes prompt-injection detectors, but it is trace/policy oriented rather than activation-signal scanning. |
| [OpenAI Guardrails prompt injection detection](https://openai.github.io/openai-guardrails-js/ref/checks/prompt_injection_detection/) | LLM-based runtime guardrail | Strong product comparison for tool-call and tool-output alignment, but it depends on an LLM call and is not local activation probing. |
| [ProtectAI DeBERTa v3 prompt injection v2](https://huggingface.co/protectai/deberta-v3-base-prompt-injection-v2) | Text classifier model | Current strongest simple text-classifier baseline to keep rerunning on our splits. It is explicitly English prompt-injection classification, not tool/skill intent probing. |
| [Meta Prompt Guard 86M](https://huggingface.co/meta-llama/Prompt-Guard-86M) | Small text classifier model | Useful CPU-friendly classifier baseline for injection/jailbreak labels. Good counterpoint to our local sensor-model runtime budget. |
| [ClawGuard](https://arxiv.org/abs/2604.11790) | Runtime boundary enforcement paper/code | Useful design comparison: deterministic tool-call enforcement versus pre-install scanner. |
| [MCP-SandboxScan](https://arxiv.org/abs/2601.01241) | Runtime sandbox/provenance paper | Useful complement for dynamic execution evidence. Different lane from activation scanning; may become a deep-scan companion. |
| [DataFilter](https://arxiv.org/abs/2510.19207) | Prompt-injection defense model/code | Useful black-box LLM defense baseline with released model/code, but not specifically MCP/skill installation scanning. |

## Immediate import queue

1. Build a tiny external-source registry file with the A/A- sources and their
   license/source metadata.
2. Import `Skill-Inject` as the first public skill-file attack eval source,
   converting only inert text and labels into scanner rows.
3. Import a small, non-executable sample from `yoonholee/agent-skill-malware`
   first because it is small and schema-clean.
4. Import `OpenClaw/clawhub-security-signals` as the first real product-shaped
   weak-label benchmark. Keep `eval_holdout` untouched.
5. Import `AgentTrap` after license review, preserving package/file manifests.
6. Import `MCPToolBenchPP` benign tool schemas as hard negatives if license is
   acceptable.
7. Use `MSB` to map benchmark cases into our risk-family taxonomy.
8. Add `memshield-bench` only as a separate memory-poisoning/runtime-extension
   family because its share-alike license may affect release packaging.

## Product-claim note

The source search also found [RouteGuard](https://arxiv.org/abs/2604.22888).
This is an April 2026 paper on internal-signal detection of skill poisoning in
LLM agents. It does not erase our priority: the paper write-up in this repo is
dated March 29, 2026, and the CCO lane is a productization path, not just a
related-work note.

Use RouteGuard as corroborating evidence that the market/research direction is
real: later independent work also argues that skill poisoning needs internal
signals rather than text-only filtering.

Do not use RouteGuard's exact benchmark numbers in public claims yet. The PDF
tables contain precision/recall/F1 consistency problems, and no public code,
dataset, demo, or product surface was found in the 2026-06-02 surface check.
That makes RouteGuard a useful thesis validator, not a benchmark authority.

Follow-up surface check:
`research/ROUTEGUARD_SURFACE_CHECK_2026-06-02.md` found no linked ScienceCast
video, CatalyzeX implementation, Hugging Face model/dataset/Space, GitHub repo
search hit, or public product/demo page for RouteGuard. That makes it later
research validation, not evidence of an existing competing product.

The public claim should be precise:

> CCO is building a local activation-signal scanner for untrusted tool, MCP,
> skill, plugin, and hook text, and comparing that activation signal against
> text/rule baselines.

Safe stronger wording:

> Nicole's March 2026 activation-probe experiment showed that model internals
> can separate subtle MCP/tool poisoning better than text baselines on controlled
> data. CCO turns that method into a local scanner product path: scan untrusted
> capability text before install or runtime use with static checks, a frozen
> sensor model, activation probes, and optional SAE explanations.

Do not claim that no other research uses internal signals for skill-poisoning
detection. Claim product positioning and timing carefully: earlier March
experiment, open productization path, and a later April paper that strengthens
the case for the same broad direction.
