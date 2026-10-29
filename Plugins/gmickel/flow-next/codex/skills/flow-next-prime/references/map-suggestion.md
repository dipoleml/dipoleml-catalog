# Map suggestion (gated reference)

> Read from workflow.md only when the classification size is ~400K LOC or more and the detected stack's stacks.md Map cell is `yes`.

**DE7 `/flow-next:map` - stack-GATED via the [stacks.md](../stacks.md) Map column.** The suggestion fires ONLY when (a) no map exists yet AND (b) the detected stack's Map cell is `yes` (`none` / `partial` SUPPRESSES it and routes to the LEG3 substitute-navigation class - a generated dependency-graph artifact, a hand-written orientation map, or static analysis as the proxy verifier; never suggest `/flow-next:map` on a stack clawpatch cannot parse). It is also size-gated: below ~400K LOC recommend the orientation map + tighter loops instead of heavy index tooling (Axis 3, measured net-negative). When all gates pass, append:

> Consider: `/flow-next:map` — builds a semantic feature index for richer scope anchoring (optional).

Detection - `flowctl` is **bundled, not on `PATH`** after install, so use the same `FLOWCTL` prelude pattern as the other skills (canonical Droid+Claude fallback). Each fenced block re-declares its own vars; POSIX shell:

```bash
FLOWCTL="${CODEX_HOME:-$HOME/.codex}/scripts/flowctl"
[ -x "$FLOWCTL" ] || FLOWCTL="<plugin-root>/scripts/flowctl"   # <plugin-root> = the directory two levels above this skill's SKILL.md file (the harness gave you that file's absolute path when the skill loaded); substitute it literally
[ -x "$FLOWCTL" ] || FLOWCTL=".flow/bin/flowctl"
# Suggestion fires only when NO map exists AND the detected stack's stacks.md Map cell is `yes`.
[ -d .clawpatch ] && [ "$("$FLOWCTL" repo-map list --count 2>/dev/null)" -gt 0 ] && MAP_EXISTS=1 || MAP_EXISTS=0
# MAP_EXISTS=0 AND stacks.md Map(detected stack) == yes AND size >= ~400K LOC → append the suggestion.
```

DE7 is informational — surface as a suggestion only; do NOT include it in Phase 5 remediation prompts.
