# Named technical comparison

Observed 2026-08-01 from the linked primary documentation. Citadel is not a
replacement for any system below. The relevant question is whether composing
them already produces Citadel's claimed contract.

| System | Documented unit and strength | What Citadel adds at the seam |
|---|---|---|
| [Sentient ROMA](https://github.com/sentient-agi/ROMA) | Recursive agent execution, DAG scheduling, tools, prompt optimization, and cost tracking across LLM calls | The published ROMA adapter binds a declared operation policy to configured and observed module identities, a model-external exact-answer verdict, every failed attempt, cost lenses, and one signed receipt chain. ROMA is the external-stack adoption proof, not a competitor displaced by Citadel. |
| [LiteLLM](https://docs.litellm.ai/) | A unified provider interface and proxy with routing, retries, fallbacks, budgets, and per-call/project spend tracking | Citadel can consume LiteLLM observations, but its decision unit is the verified operation: tools, artifacts, retries, verifier work, unknown costs, and terminal outcome. The documented LiteLLM router interface does not itself bind those fields into a failure-preserving operation receipt. |
| [RouteLLM](https://github.com/lm-sys/RouteLLM) | A strong/weak model router with calibrated cost-quality thresholds and request-level evaluation | Citadel does not claim a better call classifier. It asks whether a route minimized total cost after tools, failures, recovery, and outcome verification. RouteLLM is a candidate controller or baseline inside that wider contract. |
| [OpenTelemetry GenAI conventions](https://opentelemetry.io/docs/specs/semconv/) | Standard names for model, agent, tool, usage, duration, error, and evaluation telemetry | Citadel should emit and ingest these conventions. Telemetry describes observations; Citadel additionally reconciles them against the predeclared policy and freezes a terminal verdict and receipt. |
| [Langfuse](https://langfuse.com/docs/observability/overview) | LLM traces containing generations, tools, token use, latency, cost, scores, datasets, and evaluations | Langfuse can supply rich observations and scores. Citadel adds a local, versioned control contract in which missing identity or cost can block an economic claim and failed attempts remain part of the operation total. |
| [Harbor](https://github.com/harbor-framework/harbor) | Reproducible agent/model evaluation across container environments and public benchmark datasets | Harbor is a strong candidate funded-study harness. Citadel adds the runtime policy/receipt layer used inside and outside benchmark runs; Harbor supplies broader task populations and environments Citadel currently lacks. |

## Why not just compose them?

That composition is exactly the funded implementation strategy. Citadel's
claim is not that routing, tracing, orchestration, or evaluation are absent.
The missing public contract is one versioned object that binds:

```text
declared operation policy
+ observed model, runtime, topology, tools, and artifacts
+ every attempt and applicable cost lens
+ deterministic verdict outside the routed model
+ terminal passed, failed, or unknown state
+ operator-signed, tamper-evident receipt chain
```

The signature proves artifact integrity under the operator's key; it does not
prove the operator could not fabricate the original execution. Offline
reconstruction validates internal consistency and source binding; it is not
third-party replication.

## Defensible novelty

Citadel's contribution is the binding and failure semantics across existing
systems. A cheaper failed call is not a saving. A trace without a declared
policy cannot establish policy compliance. A benchmark score that drops failed
attempt cost cannot establish operation economics. An operator receipt with no
model-external verifier cannot establish completion.

The current evidence proves that the rejection path works. It does not yet
prove that Citadel finds the cheapest path on representative tool-using work;
that external-validity question is the center of the proposed study.
