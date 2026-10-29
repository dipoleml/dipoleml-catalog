# Operation Control v2 prospective result

A preregistered real-runtime integration cell passed against public Citadel commit `4a02265c206d992b556fc1b38c3c9487ced880d8`. The controller invoked Claude Code, reconciled the exact requested model and direct topology, required a real change to the declared test file, and accepted the outcome only after an independent repository verifier passed.

## Published attempts

| Cell | Result | What the report establishes |
|---|---|---|
| Codex via WindowsApps executable | Failed | Launch failed in 353 ms; no model or work was observed. |
| Claude in the restricted sandbox | Failed | Runtime exited nonzero after 185640 ms; no model or verified work was observed. A separate diagnostic saw provider `ConnectionRefused`; raw provider output is intentionally not published or treated as report proof. |
| Claude against a fresh public-only clone | Passed | Exact model/topology match, required artifact changed, and independent verifier exited zero. |

Infrastructure failures were retained rather than discarded or relabeled.

## Successful cell

- Runtime/model: Claude Code / `claude-opus-5`
- Topology: `direct`
- Model work duration: 307836 ms
- Independent verifier: exit 0 in 230 ms
- Artifact coverage: passed; the changed-path digest exactly equals the required-path digest
- Actual cash: unknown
- Marginal cash: unknown
- Market-equivalent telemetry: $0.704256
- Offline report verification: passed
- Report digest: `sha256:87cd8dfed9ca5c74735aeeebe4b1b515272cc141093b9ff2af77ef0840691dcb`

The published patch changes only `scripts/test-executor-profiles.js` and adds a regression proving that missing model telemetry remains unknown even when other telemetry and a receipt are trusted.

## Claim boundary

This proves end-to-end integration and honest control/evidence handling on one preregistered real task. It does not prove savings, comparative performance, or broad reliability. Aggregate Claude output did not expose individual tool-call identity, so call-by-call tool provenance is also not claimed. The comparative performance gate remains open.

Run `npm run operation:prospective` to verify every report digest, history binding, gate, published patch, freeze, and privacy rule offline.
