# Policy GUI

`gui` starts a token-guarded local web dashboard where the user reviews blocked activity, edits
and saves their policy (safety preset, per-rule overrides, allow/deny paths), tests a command
against the draft, and manages rulebooks — all against the active home's policy file.

## Sub-features

- `gui-launch` serves the dashboard on a random localhost port with a per-launch token.
- `gui-activity` renders the audit trail as a filterable feed.
- `gui-tester` "Test a command" explains a command against the current policy draft.
- `gui-policy-save` persists edits to `.cc-safety-net/policy.json`.
- `gui-project-draft` drafts a shareable project policy from `#project-draft-enter` on `#policy`
  (leave undriven unless it changed — "Review and apply" writes `.cc-safety-net/policy.json` into
  the chosen directory, which defaults to the GUI's cwd).

## How to get to it (user POV)

- Run `npx cc-safety-net gui` (opens the browser; verification uses `--no-open` and the printed
  URL).
- Sidebar views by hash, with their labels: `#overview` (Overview), `#activity` (Activity),
  `#policy` (Protections), `#rules` (Custom rules), `#integrations` (Agents), `#settings`
  (Settings).

## Driving it with ccsn-isolated

Preconditions:

- Baseline, plus audit entries from [hook-protection.md](./hook-protection.md) so Activity has
  content.
- GUI launched per SKILL.md Launch; `URL` and `TOKEN` parsed from `$EVIDENCE/gui.log`
  (`TOKEN=${URL##*token=}`, `ORIGIN=${URL%%/\?*}`).

- **Auth gate.** Run `curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/api/policy"`. It prints
  `403`; with `?token=$TOKEN` it prints `200`.
- **Page loads.** Open `$URL` in the browser harness and screenshot to
  `$EVIDENCE/gui-overview.png`; the sidebar shows the six views and `#status-card` shows the
  preset summary (e.g. `Standard preset · … command rules on`) instead of `Loading…`.
- **Activity feed.** Navigate to `$URL#activity` (or click `a[data-nav="activity"]`). The
  `#activity-feed` list shows the `git reset --hard` deny; screenshot to
  `$EVIDENCE/gui-activity.png`. API equivalent: `curl -s "$ORIGIN/api/activity?token=$TOKEN"`.
- **Tester.** On `#policy`, click `#tester-open` ("Test a command") to open the
  `#tester-dialog` modal, fill `#tester-input` with `git reset --hard`, click `#tester-run`;
  `#tester-result` reads `Blocked by git.reset-hard. …`. API equivalent: `POST
  /api/policy/explain` with `{"command": …, "policy": <GET /api/policy .policy>}`.
- **Policy save.** On `#policy`, change one setting (e.g. click the Strict preset, an
  `input[name="safety-level"]` radio) — `#save` stays hidden in `#policy-savebar` until something
  changes — click `#save`, then prove the mutation outside the page:
  `cat "$CCSN_VERIFY_HOME/.cc-safety-net/policy.json"` into `$EVIDENCE/policy-after-save.json`
  shows the new value, and `./ccsn-isolated status` reflects it.
- **Teardown.** `kill $GUI_PID`; confirm `curl -s -o /dev/null "$ORIGIN"` now fails to connect.

## Gotchas

- The token is minted per launch and required on every request; POSTs additionally need the
  `x-cc-safety-net-token` header — a 403 usually means a stale URL from a previous launch.
- Never click Integrations install/uninstall: it executes real install actions against the
  machine's coding CLIs.
- The GUI edits the policy of the home it inherited — launching without `ccsn-isolated` edits the
  user's real policy.
- Loading the page already reaches the network and the machine: the Overview fetches the npm
  registry (update check) and the GitHub API (star count), and `/api/integrations` runs host CLI
  version probes from the real `PATH`. All are reads. Only clicking "Star on GitHub" writes (it
  runs `gh api` with the user's login); leave it undriven.
- The page's own "Saved" status is not proof; read the policy file or `status` output back.
