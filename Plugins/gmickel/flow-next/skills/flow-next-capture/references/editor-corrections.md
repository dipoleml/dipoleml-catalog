# Editor and correction handling (gated reference)

> Read from workflow.md §4.3 / §5.6a only after an `open in editor` answer or a free-text
> correction.

Runs from §5.6a, on the saved spec (never the temporary draft). After an editor round, re-read the whole file before anything else and keep the user's edits; an edit is not approval to execute. A chat correction is appended verbatim to the evidence first (the spec's `## Conversation Evidence` when it has one, never adding the block otherwise; trim older lines with §1.1's marker, never the correction). Then edit only the affected sections through the normal write plumbing. After either kind of change, recheck findability, recompute the tally, re-judge the route if criteria changed, and run the applicable §5.0 strategy check (surface a new conflict rather than rolling back the user's file). Show only the diff and tally. There is no re-approval loop: `continue` or stopping leaves the spec as saved, deletion needs an explicit request, and a later capture still runs the duplicate/rewrite checks.
