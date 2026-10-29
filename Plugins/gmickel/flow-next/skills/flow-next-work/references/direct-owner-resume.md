# Direct-owner resume admission (gated reference)

> Read from phases.md Phase 1 only when the spec has `no_plan: true` and exactly one task,
> marked `implicit_owner: true`, and that owner reads `in_progress`.

**Direct-owner resume admission (both modes):** for the sole implicit-owner shape
(phases.md Phase 1's direct-route review gate), fetch `$FLOWCTL show <owner-id> --json` after reading the parent spec.
If that owner is `in_progress`, admit it for resume only with a matching actor
claim and positive evidence identifying its ended prior invocation (terminal host
session/process record or explicit user confirmation). Read any carried host
context for the owner ID and evidence reference; these are context, not target
arguments. Resolve that reference and verify it identifies the current actor/claim
and its ended prior invocation. Missing, inaccessible, ambiguous or mismatched
evidence stops with `NEEDS_HUMAN` before claims or dispatch. Age, silence and an
empty ready list prove nothing. `flowctl start` refuses an `in_progress` task held
by this same actor unless `--reclaim` is passed (a second run on one clone shares
the actor string, so a plain start cannot tell itself from a crash resume); the
admission above is the evidence check that licenses the flag, and 3b passes it
only for an owner admitted here. Retain the input's `SINGLE_TASK_MODE` or `SPEC_MODE`
and carry the admitted owner to 3a.
