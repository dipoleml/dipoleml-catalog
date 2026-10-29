# Rule config

`rule` manages the rule config the analyzer reads: rulebook sources, transparent command wrappers,
and community shell tools the hook should analyze like a built-in shell. Config lives in
`rules/rule.json` under the user home (`--global`) or the project's `.cc-safety-net/`.

## Sub-features

- `rule-tool` declares extra command tools (`rule tool add|remove|list`); the hook then analyzes
  their calls like the host's own shell tool.
- `rule-wrapper` trusts a transparent command wrapper (`rule wrapper add|remove|list`).
- `rule-list` prints active sources, rules, overrides, and wrappers.
- `rule-verify` validates every rule config in scope.
- `rule-sources` adds, removes, and updates rulebook sources (`rule add|remove|update`; leave
  undriven unless it changed — remote sources fetch from GitHub).

## How to get to it (user POV)

- Run `npx cc-safety-net rule <subcommand>` in the project; `rule --help` lists them.

## Driving it with ccsn-isolated

Preconditions:

- Baseline, plus `cd "$WS"`: without `--global`, project-scope commands write
  `$WS/.cc-safety-net/rules/rule.json`. Never run them from the repo.
- Run [explain-trace.md](./explain-trace.md) first, or from a different directory: the project
  config these recipes create changes what explain reads from `$WS`.

- **Declared tool.** Run `… rule tool add ops_bash`. It prints `Added command tool: ops_bash` and
  `Scope: user (…/.cc-safety-net/rules/rule.json)`; `… rule tool list` prints `[user] ops_bash`.
  Prove the effect on the hook: a Claude Code payload with `"tool_name":"ops_bash"` and
  `"command":"git reset --hard"` through `hook --coding-cli` denies with `Rule: git.reset-hard`.
- **Wrapper.** Run `… rule wrapper add rtk`; `… rule wrapper list` prints `rtk`, and
  `$WS/.cc-safety-net/rules/rule.json` holds `"transparent_wrappers": ["rtk"]`.
- **List and verify.** `… rule list` shows the wrapper under `Transparent wrappers (1)` and
  `Issues: (none)`; `… rule verify` ends with `All configs valid.` and exits 0.

## Gotchas

- Scopes differ by subcommand: `rule tool add` defaults to user scope (`--project` for project),
  while `rule wrapper add` writes the project config under the cwd (`--global` for user).
- `rule verify` is not read-only: it adds a missing `$schema` key to each config it checks.
