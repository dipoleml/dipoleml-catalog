# Code Review Principles

Adapted from Matt Pocock's `code-review` skill at commit
`2ab958093e83e0ec752e6c1c5932da465bf23e0c`. Licensed under the MIT License;
see `LICENSE-Matt-Pocock.txt`.

Use engineering judgment. These principles are not a checklist, report template,
or limit on what may be found.

- Establish the actual change, requested outcome, repository rules, and relevant
  surrounding behavior before judging the work. Do not invent requirements.
- Look broadly for material defects: incorrect behavior, regressions, security or
  data-integrity failures, unsafe failure handling, requirement gaps, scope creep,
  and maintainability problems that create concrete present-day cost.
- Evaluate interfaces as caller contracts, including invariants, ordering, errors,
  configuration, side effects, and operational behavior where relevant.
- Prefer simple, local designs. Flag duplication, scattered responsibility,
  leaky or shallow abstractions, and speculative generality only when the current
  change provides concrete evidence of harm.
- Judge tests by observable behavior at stable seams. Expected results should be
  independent of the implementation. Mock external boundaries, not owned internals.
- Follow repository-specific decisions over generic advice. Do not report issues
  already enforced mechanically unless that enforcement is failing.
- Report material, actionable findings first. Ground each in repository evidence,
  identify its impact and location, and distinguish verified defects from
  uncertainty. Suggest the smallest sufficient fix and a focused way to verify it.
- Do not request optional polish, broad rewrites, or future-proofing unrelated to
  the requested outcome. If no material finding remains, say so directly.

Choose the investigation method, priorities, and report structure that best fit
the change. Report any important issue even when it does not fit a principle above.
