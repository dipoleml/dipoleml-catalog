# Holdout policy

Holdouts are declared in the frozen scenario manifests and repeated in
`freeze.json`. They may be evaluated by a calibrated policy, but their outcomes
must never be passed to `learnCapabilityProfiles()`.

Before actual runs, a future public-randomness beacon committed after the
runner and method are public selects one of the already frozen holdouts. The
selection source, round, method, and record digest are frozen before the local
matrix. The exact request and selection workflow is in
[`EXTERNAL_SELECTION.md`](EXTERNAL_SELECTION.md).

Clean hosted verification is the second automated gate. The proof bundle
contains the selection request and record, matrix authorization, signed raw
runs, and report inputs; a clean runner rebuilds and verifies them without
trusting the producing workspace. A separately signed third-party rerun is
supported but optional. No outreach is required. The optional workflow is in
[`OPTIONAL_REPRODUCTION.md`](OPTIONAL_REPRODUCTION.md).

Current holdout selection: **`citadel-short-executor-proof`**, selected by
precommitted drand round `6333716` and bound by selection digest
`sha256:234e805981ef070475960905f65243fa01fbfffa7b7e7babf39ee3dc982f3de1`.

The exact machine-bound request is
[`external-selection-request.json`](external-selection-request.json). It
produced the checked-in
[`../external-selection.json`](../external-selection.json) record before any
local matrix run. No human selector was required.

Current optional third-party rerun: **none; not a blocker**.
