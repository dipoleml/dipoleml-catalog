# Boot probe (gated reference)

> Read from workflow.md only when a surface could boot into a long-running process (web service/app, desktop app, server or worker); when unsure, read it.

A tier-3 "runs" claim requires an **executed** boot probe - it is the SOLE evidence source for
BS3 and for AO3 (parseable ready line + deterministic port). Rules:

- **Ready-signal gate.** Run the boot probe **only when a cheap ready signal is detectable** - a
  health endpoint, a dev-server ready line - and always **time-bounded (~60s)**. If no ready
  signal is detectable, the tier is recorded **"not probed"**, never failed.
- **External-SaaS gate.** A ready line + bound port is **NOT tier 3** when the backend of record
  is a cloud service requiring interactive auth (Convex/Firebase-class repos boot a nonfunctional
  shell). Report **"tier 3 gated on <service> credentials"** - never fabricate a pass.
- **Not-probed-on-this-host.** A surface whose boot cannot run here (platform/toolchain/license)
  is "not probed on this host", never ❌ and never ✅.

```bash
ROOT="${ROOT:-.}"
run_bounded() { _limit="$1"; shift; _mark=$(mktemp); python3 -c 'import os,sys; getattr(os,"setsid",int)(); os.execvp(sys.argv[1],sys.argv[1:])' "$@" & _pid=$!; ( sleep "$_limit"; echo fired > "$_mark"; kill -TERM -- -"$_pid" || kill -TERM "$_pid"; sleep 2; kill -KILL -- -"$_pid" || kill -KILL "$_pid" ) >/dev/null 2>&1 & _watch=$!; wait "$_pid" 2>/dev/null; _rc=$?; if [ -s "$_mark" ]; then wait "$_watch" 2>/dev/null; echo "TIMEOUT: exceeded ${_limit}s"; _rc=124; else kill "$_watch" 2>/dev/null; fi; rm -f "$_mark"; return "$_rc"; }
# Boot only behind a detected ready signal; capture the ready line + bound port as evidence.
BOOT_OUT="$(mktemp)"
run_bounded 60 sh -c 'cd "$0" && <stacks.md dev/boot command>' "$ROOT" > "$BOOT_OUT" 2>&1
grep -aiE '(ready|listening|started).*[0-9]{2,5}' "$BOOT_OUT" | head -3   # the full output stays in $BOOT_OUT
```

The boot probe's ready line + port also feed AO3; BS3 never triggers a second long-lived run
(non-mutating rule 5).
