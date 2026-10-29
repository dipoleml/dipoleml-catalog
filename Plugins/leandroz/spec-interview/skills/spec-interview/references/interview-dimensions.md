# Interview dimensions

A prompt list for finding underspecified areas, not a checklist to march through. Most specs only have real ambiguity in three or four of these; spend the rounds there.

**Edge cases and failure modes** — race conditions, partial failures, network loss, conflicting state, empty states, recovery from bad data.

**Data modeling** — exact shapes and constraints, nullability, uniqueness, relationships, cascading vs soft deletes, audit trails.

**Security and permissions** — who can do what, auth boundaries, tenant isolation, input validation, rate limiting, handling of sensitive fields.

**Performance and scale** — expected volumes, acceptable latency, caching, pagination, lazy loading, what moves to background work.

**State and transitions** — the valid state machine, what triggers each transition, which transitions reverse, what happens under concurrent modification.

**Integration points** — API contracts, webhook payloads, third-party dependencies, versioning, backwards compatibility.

**UX detail** — loading states, optimistic updates, exact error copy, confirmations, keyboard access, accessibility, mobile behavior, motion.

**Migration and rollout** — feature flags, data migrations, rollback plan, compatibility with data already in production.

**Observability** — what gets logged, which metrics matter, what should alert, how someone debugs this at 3am.

**Testing** — the critical paths, and what genuinely needs unit vs integration vs end-to-end coverage.

**Tradeoffs** — where simplicity wins over flexibility, what is explicitly not being built, which debt is being accepted on purpose.
