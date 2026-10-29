# Citadel Optimizer Proof Bundle

Claim status: **engineering-contract-only**

This directory contains frozen benchmark inputs, the archived calibration
scenario set, the archived diagnostic-pilot scenario set, the completed
calibration and forensic records, the bounded diagnostic-pilot plan, immutable
pilot record and forensic replay, raw run records, the derived report, and a
content-addressed manifest.

Verify from a Citadel checkout:

```bash
node scripts/optimizer-proof-bundle.js verify <bundle-directory>
```

Fixture simulations validate the evidence machinery only. They are not model
performance or cost-savings evidence.
