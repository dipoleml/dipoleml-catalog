# Policy proposals

`policy check` validates a proposed policy file and prints its diff against the current policy;
`policy apply` writes it after the user confirms in a terminal. An agent can draft a proposal,
but only a person at a TTY can apply it.

## Sub-features

- `policy-check` prints the scope, the proposal path, and each changed key.
- `policy-apply` refuses without a terminal; with one, it asks `[y/N]` before writing.

## How to get to it (user POV)

- Run `npx cc-safety-net policy check proposal.json` (add `--global` for the user policy instead
  of the project one), then `npx cc-safety-net policy apply proposal.json` in a terminal.

## Driving it with ccsn-isolated

Preconditions:

- Baseline, plus `cd "$WS"`; without `--global` the target is `$WS/.cc-safety-net/policy.json`.
- A proposal: `jq '.safety.level="paranoid"' "$CCSN_VERIFY_HOME/.cc-safety-net/policy.json" > "$EVIDENCE/proposal.json"`
  (the user policy exists once the GUI has saved; otherwise write a policy JSON by hand).

- **Check.** Run `… policy check "$EVIDENCE/proposal.json" --global`. It prints
  `Scope: user (…/policy.json)`, `Changes (1):`, and `safety.level: <old> -> paranoid`; exit 0.
- **Apply refusal.** Run `… policy apply "$EVIDENCE/proposal.json" --global < /dev/null`. It
  prints the same diff, then `policy apply confirms interactively; run this yourself in a
  terminal:`, and exits 1. Read the policy file back: it is unchanged.

## Gotchas

- The confirmed apply needs a real TTY on stdin and stdout, which this harness never has. Report
  it as unreachable with that prerequisite rather than faking a TTY.
