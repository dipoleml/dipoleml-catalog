# Optional third-party rerun

Citadel's submission gate does not require the repository owner to recruit
another person. Public-random holdout selection, signed raw matrix records, a
digest-bound proof bundle, and clean hosted rebuilds are the required
verification path.

The commands below remain available if an unprompted third party independently
chooses to rerun the selected holdout. That rerun is additional evidence, not a
prerequisite.

## Inspect the bounded plan

From the exact public commit containing the frozen selection:

```bash
node scripts/optimizer-benchmark.js reproduction-plan
```

This makes no model calls. It reports the selected scenario, one adaptive
repetition, and the maximum call/runtime envelope.

## Produce an optional signed record

Use a fresh Ed25519 key that differs from the local matrix signer:

```bash
openssl genpkey -algorithm Ed25519 -out optional-reproduction-private.pem

node scripts/optimizer-benchmark.js reproduce \
  --signing-key optional-reproduction-private.pem \
  --reproduced-by <public-identity> \
  --source <https-public-source> \
  --output optional-reproduction.json \
  --acknowledge-external-quota
```

The acknowledgement is mandatory because this command consumes the
reproducer's own model quota. It runs only the public-random selected scenario,
uses the frozen adaptive policy and executor profiles, refuses to overwrite its
output, and keeps the private key outside the repository.

## Verify without model calls

```bash
node scripts/optimizer-benchmark.js verify-reproduction \
  --input optional-reproduction.json
```

If a repository owner elects to preserve this optional evidence, they may run
`freeze-reproduction` and check in the verified record. Its absence does not
block matrix execution, report claims, proof-bundle verification, or grant
submission.
