# Operation Control v2 real-workload evidence

This report imports the frozen, signed 120-cell optimizer run into the v2 outcome model. The source tasks changed and verified pinned versions of Citadel, nanoid, and p-limit. It is retrospective calibration evidence, not a prospective savings claim.

## Integrity

- Source cells: 120
- Real model attempts: 87
- Verified completions: 33
- Failed: 51
- Unknown: 36
- Source attestation verification: passed
- Raw source digest verification: passed
- Adversarial false passes: 0

## Retrospective controller decisions

| Workload category | Selected starting policy | Target status | Conservative verified-success estimate |
|---|---|---|---|
| cleanup | adaptive | meets-quality-target | 51.4% |
| context_reset | always-cheap | best-available | 3.8% |
| long_task | adaptive | meets-quality-target | 51.4% |
| parallel_work | always-cheap | best-available | 16.4% |
| safety_boundary | prompt-only | meets-quality-target | 51.4% |
| short_control | prompt-only | best-available | 29.4% |

These decisions show that the controller can learn from outcome evidence while preserving unknowns and separate economic lenses. They do not show that the selected policy would have saved money prospectively. The original performance gate remains open.

Run `npm run operation:evidence` to reproduce and verify this report.
