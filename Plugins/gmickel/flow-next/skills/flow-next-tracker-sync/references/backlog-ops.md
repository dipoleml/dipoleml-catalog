# Backlog and question operations (gated reference)

> Read from steps.md §7 only for `wire list-open`, `comment-list`, `relation-list` or `question`.

Backlog enumeration uses the deterministic `wire list-open` contract and the
resolved ready lane. It returns normalized issues only. It does not create Flow
specs by itself. On Linear with `tracker.readyState` unset, `list-open` refuses
with an `unresolved`/`ready_state` error: treat that refusal as
"no ready lane configured" and fall back to Flow-ready specs - it is not an
empty board and not a transport failure.

For each returned issue, build its locator from the same normalized row
(`durable = issue.id`, `display = issue.identifier`). `list-comments` is the
read-only parked-question call:

```bash
$FLOWCTL tracker wire comment-list --locator "$LOCATOR" --json
```

It returns normalized `created_at` timestamps. Reject truncated listings.
When the same stable question id has both question and answer markers, compare
their immutable timestamps: latest question means parked; latest answer means
answered. Missing or tied chronology fails closed.

`list-relations` is the read-only dependency-ordering call:

```bash
$FLOWCTL tracker wire relation-list --locator "$LOCATOR" --json
```

Treat `class: transport`, `subtype: truncated` as a failed read and route it
through normal structured-error recovery. Never order work from a partial
dependency graph.

For `question`, the caller owns the semantic body and the four stable identity
inputs. Write only the free-prose body to a mode `0600` temporary file. The wire
verb computes the id, adds the canonical marker, lists existing comments, and
posts only when the latest round for that id is answered or no question exists:

```bash
$FLOWCTL tracker wire question --locator "$LOCATOR" \
  --subject-id "$SUBJECT_ID" --blocked-stage "$BLOCKED_STAGE" \
  --reason-code "$REASON_CODE" --question-slug "$QUESTION_SLUG" \
  --body-file "$BODY_FILE" --json
```

Before listing, flowctl takes a local claim keyed by provider, durable issue id,
and stable question id; it releases the claim after dedup/post. A concurrent
identical ask returns retryable `question_in_flight`, then deduplicates against
the winner on retry.

`SUBJECT_ID` is the spec id for a spec-backed item and the normalized durable
`issue.id` for a tracker-only item; never use the display key in the hash.
Spec-backed questions also write the returned `data.question_id` into the
matching `## Open Questions` anchor. A tracker-only question has no local
receipt or spec write. In autonomous mode, a question resumes only from the
matching answer marker. If no tracker transport exists, retain the existing
spec-only floor; a tracker-only subject has nowhere durable to park and returns
`NEEDS_HUMAN`.
