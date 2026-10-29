# RouteGuard Paper Review - 2026-06-02

Paper: [RouteGuard: Internal-Signal Detection of Skill Poisoning in LLM
Agents](https://arxiv.org/abs/2604.22888)

## Bottom line

RouteGuard is useful corroborating research for the CCO activation-scanner
direction. It argues the same core product thesis: skill/tool poisoning is not
well handled by text-only screening because benign skills are already
instruction-like. The detector needs to observe internal model signals.

It does not appear to be a public product, and its method is heavier than the
current CCO product path.

## What RouteGuard is trying to protect

RouteGuard focuses on `SKILL.md`-style skill artifacts before they execute.
The paper frames the task as pre-execution skill-poison detection:

```text
trusted system/user instructions + untrusted skill artifact
  -> frozen backbone forward pass
  -> internal attention/hidden-state features
  -> risk score
  -> block if above threshold
```

The paper explicitly says this is narrower than marketplace-wide repository
auditing or full runtime prevention. That matters for positioning: RouteGuard is
a research detector for a narrow pre-execution setup, not a full install/runtime
scanner product.

## Main idea

Their central story is good:

- A normal indirect prompt injection is often malicious text hidden inside
  evidence-like content.
- A poisoned skill is nastier because a benign skill is already supposed to
  instruct the agent.
- So the malicious instruction does not have to look anomalous; it only has to
  win the model's internal competition over what instruction to follow.
- They call this `attention hijacking`: response-time attention shifts toward
  the malicious skill span and away from trusted context.

This supports the CCO framing that text/rule scanners are missing the wrong
level of evidence.

## Method

RouteGuard uses a frozen open-weight backbone, but it needs access to internal
attention maps and hidden states.

The paper's method:

1. Split `SKILL.md` into hierarchical chunks: frontmatter, headings, paragraphs.
2. Run multiple fixed agentic probes, such as generic answer,
   invocation-decision, safe-use planning, and execution-boundary prompts.
3. Extract response-conditioned attention from response tokens back to skill
   chunks.
4. Extract hidden-state alignment between response representations, trusted
   context, and untrusted skill chunks.
5. Train/fuse two experts:
   - attention expert: detects routing concentration on untrusted chunks.
   - hidden expert: detects representation drift toward untrusted chunks.
6. Combine both with reliability-gated fusion.

The reported backbone setting is Qwen3-32B and Meta-Llama3.1-8B. This is not
cheap-hook territory. It is much closer to a heavyweight research/audit pass.

## Why it differs from CCO

| Area | RouteGuard | CCO activation scanner path |
| --- | --- | --- |
| Goal | Research detector for skill poisoning | Productized scanner for MCP, skills, plugins, hooks, tool schemas, and runtime surfaces |
| Input | Mainly `SKILL.md` | Tool/skill/plugin/hook/config text plus extracted package metadata |
| Internal access | Needs attention maps and hidden states from the scanned/frozen backbone | Uses our own small local sensor model, so protected agent can be closed-source |
| Runtime profile | Qwen3-32B / Llama3.1-8B style audit | Pythia/Gemma/Qwen small-model local scanner ladder |
| Product surface found | None found in public surface check | CCO is building CLI/library/hook JSON scanner path |
| Explanation | Attention + hidden-state experts | Static reasons + activation score + optional SAE features/evidence spans |

The important distinction: RouteGuard is closer to "if I can inspect a strong
open model's internals while it reasons over a skill, can I detect poisoning?"
CCO is closer to "can I scan untrusted capability text locally before install or
runtime use, even if the protected agent is Claude/Codex/closed-source?"

## Data and benchmarks

RouteGuard evaluates across:

- `Skill-Inject`
- `Skill-Inject` by-line and channel slices
- `MaliciousAgentSkillsBench`
- `Malicious Agent Skills in the Wild`
- `BIPIA` ordinary indirect prompt injection

This is useful for CCO because it confirms that we should import more
skill-shaped and MCP/tool-shaped data instead of just generic prompt-injection
rows.

## Result caveat

The paper claims strong results, including 0.8834 F1 on the critical
Skill-Inject channel slice.

However, the rendered tables show a numerical consistency problem: several F1
values are not derivable from the precision and recall shown in the same row,
and in some cases the F1 is higher than the listed recall. Do not use these
tables as clean public benchmark evidence without code or author clarification.

Use the paper for qualitative/category validation:

> Later independent work also finds that skill poisoning is an
> instruction-carrier problem and that internal signals beat text-only
> screening in that setting.

Do not use it as a clean product benchmark source yet.

## Product-positioning conclusion

RouteGuard strengthens the market argument but does not replace CCO.

Safe wording:

> Nicole's March 2026 activation-probe work showed early evidence that model
> internals can separate subtle MCP/tool poisoning better than text baselines.
> RouteGuard appeared later and independently supports the same broad thesis for
> skill poisoning. CCO is the productization path: a local scanner that can run
> before install or runtime use, even when the protected agent is closed-source.
