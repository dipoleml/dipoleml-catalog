# Public-goods and governance commitment

Citadel is MIT licensed. Grant-funded operation contracts, adapters, benchmark
methods, privacy-safe cells, negative results, public keys, reports,
documentation, and reconstruction commands remain public without a token,
mandatory hosted service, or proprietary evidence endpoint.

## Publication rules

- Freeze tasks, policies, metrics, gates, and verifiers before measured work.
- Publish passed, failed, unknown, interrupted, setup-failed, and adversarial cells.
- Preserve a failed benchmark under its original identity.
- Use a new identity for any post-result method change.
- Keep private signing keys and sensitive provider output outside the repository.
- Publish keys, digests, source bindings, bounded observations, and corrections.
- Keep invoice, subscription allocation, market equivalent, local energy,
  amortization, setup, and actual cash as separate cost lenses.

## Release and compatibility policy

- Version public schemas with semantic versions. A breaking field or meaning
  change requires a major contract version and a migration fixture.
- Support the preceding major contract for at least six months after a new
  major release. Deprecations appear in the changelog for two minor releases.
- A release candidate must pass adapter conformance, offline evidence
  reconstruction, installation smoke, and hosted documentation checks.
- Each release publishes a source commit, dependency lock digest, artifact
  manifest, signing-key identifier, and verification command.
- Operator signatures are described as tamper evidence under that operator's
  key, never as third-party proof of execution.

## Signing-key rotation and recovery

1. Keep the active release key encrypted and offline except while signing.
2. Keep a separately encrypted recovery key and recovery codes outside the
   repository and outside the development machine.
3. Publish active and next public-key fingerprints in the repository.
4. Rotate annually or immediately after suspected exposure. Publish a
   revocation record signed by the old key when available and the recovery key.
5. If both private keys are lost, stop signed releases, publish an unsigned
   incident notice through the protected repository, establish a new key, and
   never backfill signatures for the gap.

The repository currently proves operation-receipt signing, not this full
release-key ceremony. The ceremony is an acceptance gate before claiming
signed-release governance.

## Maintenance and continuity

- The budget reserves hosted verification and artifact availability for 12
  months after the nine-month grant period.
- Compatibility fixtures, release scripts, and migration notes must remain
  runnable by a fork without private infrastructure.
- Seth is the current sole maintainer and release authority. No successor or
  second release authority is confirmed today; the application must preserve
  that as a bus-factor risk rather than imply a team.
- If the canonical project becomes inactive, MIT licensing, public keys,
  manifests, and forkable release tooling preserve technical continuation, but
  they do not guarantee stewardship of the canonical GitHub repository.

## Public-claim policy

Values in `docs/EVIDENCE_MANIFEST.md` are generated from canonical artifacts.
Human-authored README, site, and application prose is contract-tested against
forbidden overclaims and reviewed whenever a canonical result changes. This is
the actual scope; the project does not claim every sentence is generated.
