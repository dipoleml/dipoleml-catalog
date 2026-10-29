# Prototype before ask

## Classify the fork first

State the fork you found in one sentence and decide what its answer depends on:

| The answer is | Settle it by | Example |
|---|---|---|
| Observable: behaviour, output, timing, layout, a failing case, a measurement | A prototype, a spike, a test, or a measurement; then continue with the observed answer and say what was run | "Does the parser accept the legacy header?" - run it. "Is the query fast enough?" - time it. "Does the layout hold at 400px?" - render it |
| A product or preference call no experiment can settle: scope, priority, authority, taste, a business rule | One plain-text numbered prompt, with the observed facts already in hand | "Should deleted rows stay visible to admins?" "Which of the two names?" |

Once per run, check whether the judge can run for the fork hint (this never prints the key); when it prints
`judge: off`, skip the fork-gate call for the rest of the run:

```bash
JUDGE=on
[ -n "${TYPESAFE_API_KEY:-}" ] || JUDGE=off
"$FLOWCTL" config get judge.enabled --json | jq -e '.value == false' >/dev/null && JUDGE=off
[ "$JUDGE" = off ] && echo "judge: off"
```

That call is yours. When the judge is on and you are unsure, you may ask for a hint on your own
sentence: `$FLOWCTL judge --preset fork-gate --state-file <fork-state.json> --json` with
`{"text": "<your fork sentence>"}`. Its `decision.value` (`observable`, `product_or_preference`,
or `host` when it is unsure) is a hint; it never removes a fork you found. Print
`fork-gate: <observable|preference> (host)`, adding `, jev hint <choice> <confidence>` when you
asked. The autonomy and one-question rules below remain binding.

## Build the prototype

- **Competing variants behind one switcher.** When the fork has two or more viable answers, build each as a variant of the same prototype behind one switcher: a toggle, flag or keypress that swaps between them, with each variant labelled. The variants are then compared in one place, under the same data and conditions. Variants behind one switcher are one artefact, so chart's one-artefact prototype rule still holds. A fork with only one viable variant gets a single prototype.
- **Open design space: prior art first.** When the variants are not yet known, gather references before building: how this repo and comparable products or libraries already solve it. Show the user a few directions, each with its source, and let them pick one; then build it, or the picked directions behind a switcher. Picking a direction is a preference call.
- **Scratch only.** Build in `.flow/tmp/experiments/` (gitignored) or another throwaway location. Nothing there is staged or shipped.

Example: a search box could refresh results on every keystroke or after a pause. Build both behind a toggle, type a 12-character query against the local index, and measure: per-keystroke refresh takes 180 ms per update and stutters, a 150 ms pause feels immediate. Report the numbers and continue with the pause.

## Rules

- An observable fork is never a question. Run the smallest experiment that discriminates the branches, record what ran, and continue.
- A product or preference fork becomes at most one plain-text numbered prompt, asked with `plain-text numbered prompt` (plain-text numbered fallback on hosts without it), only when the two routes would materially differ.
- Under any autonomy marker a product or preference fork that blocks the rest of the work stops with `NEEDS_HUMAN` and the observed facts; one that does not follows [working-rules-unattended.md](../../../references/working-rules-unattended.md): take the evidence-backed default, record it in the Decisions list (or as an open item), and continue. A prototype still runs within the working rules' limit on experiments. Choosing among gathered directions is such a fork: it stops with the references in hand.
- A prototype is evidence, never a deliverable: it is discarded or folded into the routed stage's work, and its result is named in the report.
