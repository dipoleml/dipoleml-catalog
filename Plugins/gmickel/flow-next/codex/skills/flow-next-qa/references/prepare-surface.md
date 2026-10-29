# Test accounts and personas

Read from `workflow.md` §3.2 when a scenario needs an account or a fresh-user persona.

## Accounts

1. Look for a documented way first: auth-provider dev mode, a seed script (`scripts/seed-*`,
   `db/seeds/`, `supabase/seed.sql`), fixtures (`__fixtures__/`, `test-data/`), or a
   `.env.test.example`.
2. If none is documented and `NO_PROMPT=0`, ask the user in one prompt for: the auth provider or
   dev-user docs, an admin account (or permission to create one), the per-run email convention,
   and any payment or third-party test credentials a scenario needs. Offer to document the
   convention as part of the pass. Under `NO_PROMPT=1`, public scenarios still run when a target
   resolved; scenarios that cannot run without an account make the outcome BLOCKED.
3. Never guess credentials and never commit a password. Record only the email pattern and role;
   secrets travel through the chat or the user's vault. Provider test fixtures (OTP codes, test
   cards) come from the provider's docs.

## Personas

Give every fresh-user scenario its own address on the reserved `example.com` domain, which never
delivers mail:

```
qa-<persona>+run<MMDD>-<N>@example.com
```

Bump `N` for every new scenario and every retry. Reusing an address that hit an OTP or
verification failure leaves the provider in a stuck state and produces a false failure; the
`run<MMDD>` part keeps this pass clear of addresses from earlier passes. If scenarios ever run in
parallel, each agent gets its own session and its own suffix; when isolation cannot be
guaranteed, run them one after another.
