# RouteGuard Public Surface Check - 2026-06-02

Purpose: decide whether RouteGuard weakens the CCO activation-scanner product
claim, or whether it is later corroborating research.

## Checked surfaces

| Surface | Result |
| --- | --- |
| arXiv paper | `2604.22888`, submitted April 24, 2026. |
| ScienceCast | `https://sciencecast.org/api/v1/arxiv/paper/2604.22888/casts` returned `[]`; no linked ScienceCast video was found. |
| CatalyzeX | `https://www.catalyzex.com/api/code?src=arxiv&paper_arxiv_id=2604.22888` returned `{}`; no linked implementation was found. |
| Hugging Face paper/repos | `https://huggingface.co/api/papers/2604.22888?field=comments` returned paper-not-found; `https://huggingface.co/api/arxiv/2604.22888/repos` returned empty `models`, `datasets`, and `spaces`. |
| Hugging Face Spaces search | Searches for `RouteGuard`, `2604.22888`, and `Skill-Inject TaskTracker` returned no matching Spaces. |
| GitHub repository search | Repository searches for `RouteGuard Skill Poisoning LLM Agents`, `Skill-Inject TaskTracker RouteGuard`, and `Internal-Signal Detection Skill Poisoning` returned zero repositories. |
| PDF text | No public project URL, product page, demo link, or video link was found in the extracted PDF text. |

## What the paper appears to be

RouteGuard is a later April 2026 research paper that supports the same broad
technical direction: skill poisoning is not well handled by text-only filters,
and internal model signals are useful.

The paper proposes a frozen-backbone detector using response-conditioned
attention and hidden-state alignment, with hierarchical chunking, multi-probe
observation, and reliability-gated late fusion.

Its setup is narrower than a marketplace scanner or full runtime prevention:
the PDF describes the task as pre-execution skill-poison detection and says that
this is intentionally narrower than marketplace-wide repository auditing or full
runtime prevention. Its limitations also say the experiments are pre-execution
detection studies rather than full live-agent prevention deployments.

## Product implication

No public RouteGuard product surface was found:

- no video to download,
- no public code implementation linked from arXiv/CatalyzeX/GitHub search,
- no Hugging Face model, dataset, or Space linked to the paper,
- no product/demo page found in the paper surface.

So RouteGuard should be treated as corroborating research, not priority loss.
It strengthens the public argument that internal-signal detection matters for
skill/tool poisoning.

Safe public positioning:

> Nicole's March 2026 activation-probe experiment came first in this repo and
> showed that model internals can separate subtle MCP/tool poisoning better than
> text baselines on controlled data. RouteGuard appeared later as independent
> research support for the same broad direction. CCO is the productization path:
> a local scanner for MCP, skills, plugins, hooks, and tool descriptions before
> install or runtime use.
