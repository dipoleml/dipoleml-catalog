# Compaction judgment (gated reference)

> Read from workflow.md §0.4 only when a compaction signal is present.

A signal alone is not a refusal. The question is whether evidence **relevant to this capture** is gone: proceed when the feature is fully stated in visible user turns (note `Prior compaction detected; relevant capture evidence remains visible.` in the summary warnings); treat it as incomplete when a relevant requirement is summary-only, truncated, or missing, or when the draft would have to guess. When unsure, treat it as incomplete.

If relevant evidence is incomplete AND `FROM_COMPACTED_OK` is `0`, refuse: name the markers and gaps, and tell the user to restate the missing requirements or re-run with `--from-compacted-ok` after checking the transcript holds the full intent. Interactive capture does not offer to proceed anyway; autofix exits 2.
