# CCO monthly active-user collector

This first-party Cloudflare Worker stores at most one distinct opt-in anonymous
activity identity per CCO installation per UTC month. Delivery retries may
retransmit the identical payload, which the D1 primary key deduplicates. It
never receives harness paths, file names,
skill names, prompts, session content, credentials, IP addresses, or user-agent
strings as payload fields. Worker observability is disabled, and the code never
reads or stores request network metadata.

The client derives a different 128-bit identifier every month from a locally
generated secret. This permits unique counting within a month but deliberately
prevents cross-month user tracking and retention cohorts.

## Deploy

```sh
cd infra/metrics-worker
npx wrangler d1 migrations apply cco-metrics --remote
npx wrangler deploy
```

## Monthly matrix

```sh
./infra/metrics-worker/scripts/monthly-matrix.sh
```

The output contains the overall month matrix plus breakdowns by `app_version`
and `harness`. Counts are consenting active installations, not people, and the
endpoint is not designed as a fraud-proof billing meter.

`queries/monthly-matrix.sql` contains the same three queries for inspection or
use in another D1 client.
