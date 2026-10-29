---
name: spec-check
description: Audit GWT acceptance test specs for implementation leakage. Optionally provide a specific file path.
---

Audit acceptance test specifications for implementation leakage.

Invoke the `spec-guardian` agent to review spec files.

If a file path was provided as an argument, review only that file.
If no argument was provided, review all `.txt` files in `specs/`.

**Target:** $ARGUMENTS
