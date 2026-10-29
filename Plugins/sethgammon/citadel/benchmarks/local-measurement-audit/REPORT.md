# Local measurement arithmetic audit

| Study | Cells | Attempts | Average-power × wall-time check | Maximum error |
|---|---:|---:|---|---:|
| sentient-readiness | 72 | 75 | passed | 4.98e-10 kWh |
| sentient-readiness-v2 | 72 | 84 | passed | 5e-10 kWh |

- Duration means client request/attempt wall time, not provider-only model time.
- Human-intervention count is operator-declared, not instrumented telemetry.
- Raw 500 ms power samples were not retained; sample count and average watts were.
- This audit checks arithmetic consistency, not calibration of `nvidia-smi` or
  whole-system energy completeness.

Report: `sha256:a521decd95cf3ed4d7a7e6a8a062c9ced40932df2b465352b1142036ec6fe78a`
