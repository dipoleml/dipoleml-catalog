# Won't-do close: the declined file (gated reference)

> Read from SKILL.md before closing any spec.

A spec closed **because we decided not to build it** also gets a file in `.flow/memory/declined/<concept-slug>.md`, written directly (agent prose, no flowctl verb): title, the decision in one line, short reasoning, and a `## Prior requests` list opened with today's date and where the request came from. The file already exists → append the dated line under `## Prior requests` and leave the decision as written. The entry body follows the artifact prose contract in [docs/prose.md](../../../docs/flow-next/prose.md); proceed without it when the doc is absent. Without it the concept comes back next quarter with nothing to point at, and the next planner proposes it fresh.

**Only a policy refusal earns a file.** A spec closed as superseded, merged into another spec, already implemented, or obsolete is not a decline — filing it there teaches future planners that shipped or in-flight work is rejected scope. Reopening a declined concept is the user's call alone.
