# Catalog format

The DipoleML Catalog uses three layers:

1. `marketplace.json`: the marketplace entrypoint.
2. `Catalog/catalog.json`: the full item index.
3. Each item's `dipoleml.json`: the authoritative item manifest.

## Marketplace entrypoint

```json
{
  "name": "DipoleML Catalog",
  "provider": "DipoleML",
  "version": "1.0.0",
  "counts": { "mcp": 259, "plugin": 500, "skill": 1000, "total": 1759 },
  "catalog": "Catalog/catalog.json",
  "schema": "Catalog/schema.json",
  "index": "Catalog/INDEX.md",
  "license": "CC-BY-4.0"
}
```

Loaders should read `catalog`, then resolve each item by its `path`.

## Item manifest

Every item contains `dipoleml.json` at its root. Required fields:

| Field | Meaning |
|---|---|
| `schemaVersion` | Manifest schema version (`1.0`). |
| `id` | Stable ID: `<type>.<vendor>.<slug>`. |
| `type` | `mcp`, `plugin`, or `skill`. |
| `name` | Display name. |
| `slug` | URL-safe item slug. |
| `vendor` | Upstream owner or creator. |
| `description` | Marketplace description. |
| `provider` | Always `DipoleML`. |
| `source` | Upstream repository, commit, license, and license class. |
| `neutralization` | Provider migration record. |
| `logo` | Logo file, brand, source, license, and resolver provenance. |
| `entrypoints` | How to run or load the item. |
| `requirements` | Runtimes, packages, environment variables, credentials. |
| `compatibility` | DipoleML version and upstream-provider notes. |
| `files` | Manifest, readme, license, and logo filenames. |
| `quality` | Validation state and checks. |

Full JSON Schema: [`../Catalog/schema.json`](../Catalog/schema.json).

## Entrypoints

| Kind | Use |
|---|---|
| `mcp-stdio` | Spawn a local MCP server (`command`, `args`). |
| `mcp-http` | Connect to a hosted MCP endpoint (`url`, `transport`). |
| `mcp-sse` | Connect to a Server-Sent Events MCP endpoint. |
| `plugin` | Load `.dipoleml-plugin/plugin.json`. |
| `skill` | Load `SKILL.md`. |

Example MCP entrypoint:

```json
{
  "kind": "mcp-stdio",
  "command": "npx",
  "args": ["-y", "@notionhq/notion-mcp-server"]
}
```

Example hosted MCP entrypoint:

```json
{
  "kind": "mcp-http",
  "url": "https://mcp.firecrawl.dev/v2/mcp-search",
  "transport": "http"
}
```

## Runtime compatibility

Some upstream plugins reference `${CLAUDE_PLUGIN_ROOT}` in their scripts. The
generated entrypoints use `${DIPOLEML_PLUGIN_ROOT}`. The loader should set:

```text
DIPOLEML_PLUGIN_ROOT = <absolute path to the item directory>
CLAUDE_PLUGIN_ROOT   = ${DIPOLEML_PLUGIN_ROOT}   # upstream compatibility alias
```

This preserves upstream behavior without exposing provider branding in the
catalog metadata.

## Source and licensing

`source` records:

```json
{
  "repo": "makenotion/notion-mcp-server",
  "url": "https://github.com/makenotion/notion-mcp-server",
  "commit": "d221339a14fd452429cb81bec559d445364de8a6",
  "path": "",
  "license": "MIT",
  "licenseClass": "green",
  "stars": 4685,
  "archived": false,
  "vendoredAt": "2026-10-28T22:56:44Z"
}
```

- `commit` pins the reviewed snapshot.
- `license` is the SPDX identifier from the upstream project.
- `licenseClass` is `green` for redistributable permissive licenses.
- The upstream `LICENSE` and `NOTICE` files are preserved in the item directory.

## Updates

The catalog is updated by reviewing the upstream diff, re-vendoring at a new
commit, and re-running validation. It is not a background self-updater. Remote
MCP endpoints may change server-side; `npx`-based entrypoints may resolve a
newer package version unless pinned by the loader.

## Validation

An item is valid when:

- `dipoleml.json` parses and matches `Catalog/schema.json`,
- `provider` is `DipoleML`,
- the ID matches its path,
- the source commit is a 40-character SHA,
- a logo file and `logo.json` exist,
- a license file is present,
- no provider manifest remains at the item root,
- the type-specific file exists (`SKILL.md`, `.dipoleml-plugin/plugin.json`, or
  an MCP entrypoint),
- at least one entrypoint is declared.
