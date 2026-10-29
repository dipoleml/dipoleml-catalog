# Public-random holdout selection

Citadel selects one already-frozen holdout without asking another person and
without exposing performance results.

The checked-in request commits, before the beacon round exists, to:

- the frozen scenario-set and ordered holdout IDs;
- League of Entropy drand mainnet chain hash and public key;
- round `6333716`, expected at `2026-07-30T20:15:00.000Z`;
- three public relay URLs;
- an exact deterministic selection rule.

The canonical request is
[`external-selection-request.json`](external-selection-request.json).

## Recorded result

Round `6333716` was observed at `2026-07-30T20:15:31.940Z`. All three
committed relays agreed, the pinned official client verified the BLS signature,
and the frozen rule selected index `0`:
`citadel-short-executor-proof`. The checked-in record is
[`../external-selection.json`](../external-selection.json), with digest
`sha256:234e805981ef070475960905f65243fa01fbfffa7b7e7babf39ee3dc982f3de1`.

## Selection procedure

After the committed round time:

```bash
node scripts/optimizer-benchmark.js select-holdout \
  --output external-selection.json
```

The command makes no model calls. It fetches the exact round from all three
committed relays and fails unless:

- every response has the exact drand beacon fields;
- all three responses are identical;
- the round equals `6333716`;
- `randomness` equals `sha256(signature)`;
- the output path does not already exist.

Citadel then hashes the request ID, a line feed, and the beacon randomness,
interprets the result as an unsigned 256-bit big-endian integer, and reduces it
modulo four. The resulting index selects from the ordered frozen holdout list.

Review and freeze the selection:

```bash
node scripts/optimizer-benchmark.js freeze-selection \
  --input external-selection.json \
  --output freeze.selection-candidate.json
```

The candidate may change only `external_scenario`. It binds the selection
method, record digest, round date, and public beacon URL.

## Verification boundary

Relay agreement and the signature-to-randomness hash are checked locally. The
request also pins the drand chain hash and public key so the BLS signature can
be independently verified with the official drand client:

```bash
npm install --no-save --package-lock=false --ignore-scripts drand-client@1.4.2
node scripts/optimizer-drand-verify.js \
  --input external-selection.json
```

The repository test workflow performs that pinned BLS verification on a clean
GitHub-hosted runner as soon as the selection record is checked in. No person
has to be recruited or trusted as the selector.
