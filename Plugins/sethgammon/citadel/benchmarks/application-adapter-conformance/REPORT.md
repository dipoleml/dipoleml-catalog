# Citadel adapter conformance evidence

This report separates actual-run portability from contract-only support.

| Adapter | Family | Evidence | Status | Independent outcome gate |
|---|---|---|---|---|
| claude-code-direct | frontier-coding-agent | prospective-actual-run | passed | independent repository verifier plus exact changed-path coverage |
| ollama-chat-local | open-local-model-runtime | prospective-actual-run | passed-with-observed-runtime-failure | exact canonical answer digest |
| roma-dspy-recursive-stack | open-recursive-agent-stack | prospective-actual-run | passed | exact canonical answer digest outside ROMA |
| citadel-hybrid-claude-ollama | frontier-plus-open-local-route | prospective-actual-run | passed | fresh repository fixture plus deterministic external verifier |
| codex-direct | frontier-coding-agent | contract-and-launch-failure | unknown | not reached |

Codex remains an honest unknown at the prospective actual-run layer: its public
Windows attempt failed before model work. It is not counted as a successful
runtime merely because its adapter contract and fixtures pass.
