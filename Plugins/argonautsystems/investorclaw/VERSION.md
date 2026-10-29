# InvestorClaw Version Management

**Canonical version**: `4.0.0` (this repo, distribution shell).

The InvestorClaw repo is the v4.x distribution shell — a thin shell around the
substrate repos that hold the actual code. It tracks its own version
independently from the substrates.

## Versioning across the v4.x stack

| Repo | Role | Versioning | Source of truth |
|---|---|---|---|
| **`InvestorClaw`** (this) | Distribution shell + cobol harness | semver, set in CHANGELOG | `CHANGELOG.md`, this file |
| **`ic-engine`** | Portfolio math + analyzers | semver, set in `pyproject.toml` | `argonautsystems/ic-engine` |
| **`mnemos-ic-runtime`** | Container runtime + SKILL.md | image tag (`X.Y.Z-cpu`) | `mnemos-os/mnemos-ic-runtime` |
| **`clio`** | AI primitives | semver | `argonautsystems/clio` |

A new version of this distribution shell does not require an engine bump or
runtime bump (and vice versa). The shell's job is to track which versions
are tested-together and the install URL pointing at the runtime.

## Accessing version info at runtime

```bash
# This repo's version
head -5 CHANGELOG.md

# Engine version (running container)
docker exec ic-engine python3 -c "import ic_engine; print(ic_engine.__version__)"

# Image tag
docker inspect ic-engine --format '{{.Config.Image}}'

# MCP server version (via tools/list)
curl -s -X POST http://localhost:18090/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"probe","version":"1"},"capabilities":{}}}' \
  | grep -o '"version":"[^"]*"' | head -1
```

## Bumping the distribution shell version

1. Append entry to `CHANGELOG.md` describing what's tracked.
2. Update this `VERSION.md` if the canonical version line changes.
3. Tag with `git tag -a vX.Y.Z` and push to argonas + gitlab + github.
4. Update README.md "Status" table if the engine/image versions changed.

The shell version SHOULD bump when:

- The cobol regression spec changes (new prompts, different verdict)
- The README install instructions change (new image registry, new compose URL)
- The substrate repo URLs change (new namespace, new mirrors)

The shell version does NOT need to bump for routine engine fixes — those
ship as new image tags from `mnemos-ic-runtime`.
