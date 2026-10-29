# Contributing to the DipoleML Catalog

Thank you for helping improve the integration layer behind the **Raven Chat
App** and **DCode Agentic Harness**.

## What we accept

- **MCP servers** that implement the Model Context Protocol and expose a clear
  entrypoint.
- **Plugins** that package commands, skills, hooks, MCP connections, or
  workflow extensions.
- **Skills** with a `SKILL.md` file and a focused, reusable capability.

## Requirements

Every submission must meet the following bar:

1. **License compatibility.** The upstream repository must use one of:
   MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, CC0-1.0, or
   Unlicense. Include the upstream `LICENSE` and `NOTICE` files. Repositories
   with no license, `NOASSERTION`, share-alike, or copyleft terms are not
   accepted into the shippable marketplace.
2. **A real package.** MCP servers need a runnable entrypoint and README.
   Plugins need a provider plugin manifest. Skills need `SKILL.md`.
3. **No secrets or unsafe install hooks.** Do not include credentials, tokens,
   private keys, or code that exfiltrates data. Install scripts are reviewed.
4. **Provider-neutral packaging.** DCode, Claude, ZCode, or other provider
   branding must not appear in the marketplace metadata. Items present the
   **DipoleML** provider identity; upstream manifests are archived.
5. **A company or project logo.** Provide the brand/project logo and its source.
   A GitHub owner avatar is acceptable when no brand mark is available.
6. **Attribution.** Record the upstream repository, commit, and license. Keep
   copyright notices intact.

## How to submit

1. Open an issue with:
   - upstream repository URL,
   - integration type (MCP, plugin, or skill),
   - license,
   - one-line description,
   - logo or brand source,
   - any required environment variables or credentials.
2. Maintainers run a structural preflight: license check, entrypoint check,
   size check, and basic security review.
3. Accepted items are vendored at a pinned commit, normalized to
   `dipoleml.json`, given a logo, validated, and added to `Catalog/catalog.json`
   and the per-type indexes.
4. Updates follow the same path: review the upstream diff, re-vendor, and run
   the validation suite.

## Quality bar

An item is accepted only when:

- it validates against `Catalog/schema.json`,
- it has a resolvable logo and license file,
- it has at least one entrypoint,
- its ID and path are unique,
- it carries no active provider manifest at the item root.

## Contact

**[developer@dipoleml.com](mailto:developer@dipoleml.com)**
