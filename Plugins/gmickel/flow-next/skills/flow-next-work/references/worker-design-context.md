# Worker design context (gated reference)

> **Read by the worker only when the task spec contains a `Design context` heading** (`##` or `###`; worker.md Phase 1.5).

**If the task spec contains a `Design context` heading:**

Read `DESIGN.md` (path noted in design context section). Focus on:
- Color tokens referenced in the task's design context
- Component patterns relevant to what you're building
- Do's and Don'ts that apply to this specific UI change

Use design tokens from DESIGN.md, not hard-coded values. If a color, spacing, or component pattern is in the design system, reference it rather than inventing new values.

If DESIGN.md is missing or the path is wrong, note it and proceed — design context is advisory, not blocking.
