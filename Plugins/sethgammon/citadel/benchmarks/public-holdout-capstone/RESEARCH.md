# Why this capstone is the relevant test

Observed and checked: 2026-08-02. External facts below link to their primary sources; interpretations are labeled.

## The funder’s actual request

Sentient’s open product request asks for automatic choice of the cheapest execution path across models, agents, tools, and calls, including costs outside token counts. Its grants page emphasizes open, community-owned AGI infrastructure. The capstone therefore tests a complete verified operation and releases the method, controller, evidence, failures, and reproducer rather than presenting a private model-routing demo.

- [Sentient product requests](https://sentient.foundation/product-requests)
- [Sentient grants](https://sentient.foundation/grants)

## What is already table stakes

RouteLLM provides open model-routing techniques and serving integrations. OpenRouter’s Auto Router chooses a model from a changing pool. Interpretation: “we pick a model” is not a differentiated claim. Citadel has to show an operation-level economic decision that includes attempted paths, external verification, recovery, non-token costs, and an offline-reconstructable receipt.

- [LMSYS RouteLLM](https://github.com/lm-sys/RouteLLM)
- [OpenRouter Auto Router](https://openrouter.ai/docs/guides/routing/routers/auto-router)

## The emerging research bar

SWE-Router conditions routing on partial weak-model trajectories and evaluates on held-out SWE tasks. Interpretation: static lexical rules and author-selected toy tasks are no longer persuasive evidence for a learned controller. Citadel’s answer is not to claim a better routing model without evidence; it is to run a prospective, public-random, outside-authored operation trial with a frozen calibration/holdout boundary and model-external verdicts.

- [SWE-Router paper](https://arxiv.org/abs/2607.00053)

## Why SWE-bench-Live/MultiLang

Microsoft describes SWE-bench-Live as a continuously updated set of real GitHub issues with executable containerized tests. The May 2026 MultiLang release contains 743 tasks from 381 repositories across six languages. Its evaluator supports pinned instance IDs and prediction patches, and its documentation recommends running gold patches three times because environment validity can change. It also estimates 4 CPUs and 16 GB RAM for one instance, with some repositories requiring more. This is why Citadel separates gold/environment validity from model failure and reports the actual gold-valid denominator on the frozen runner class.

- [Microsoft SWE-bench-Live repository and evaluator](https://github.com/microsoft/SWE-bench-Live)
- [SWE-bench-Live MultiLang dataset](https://huggingface.co/datasets/SWE-bench-Live/MultiLang)

## Public infrastructure boundary

GitHub states that standard GitHub-hosted Actions runners are free for public repositories. Its current standard Linux runner reference lists 2 CPUs, 8 GB RAM, and 14 GB SSD for the ordinary hosted class. Interpretation: this is a useful no-cash remote Docker verifier, but it is below Microsoft’s estimated memory envelope. The protocol therefore requires three gold passes on that exact class and calls unresolved capacity/setup cases `unknown`; it does not count them as model defects.

- [GitHub Actions billing and public-repository usage](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [GitHub-hosted runner specifications](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

## Remaining claim boundary

Even a passing result would establish evidence on the selected JavaScript/TypeScript repair population, three model tiers, one local workstation, one hosted verifier class, and one prospective run. It would not prove universal savings, cash profit, production reliability, or superiority over every router. The differentiator being tested is narrower and technically meaningful: whether an open controller can make a precommitted economic path decision for a complete operation and leave enough signed evidence for an outsider to reconstruct why it was or was not justified.
