# Publishing designlang to the MCP registry

This document is the checklist for listing the `designlang mcp` stdio server on the public registries.

## 1. Smithery (smithery.ai)

`smithery.yaml` and `smithery.dockerfile` at the repo root already describe the server.

```bash
# From the repo root
npx @smithery/cli publish
```

## 2. Official MCP registry (modelcontextprotocol/servers)

Open a PR against https://github.com/modelcontextprotocol/servers with an entry in `servers.json`:

```json
{
  "name": "designlang",
  "description": "Exposes live design-token extraction as MCP resources + tools (regions, components, tokens, contrast remediation).",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "designlang", "mcp"],
  "url": "https://github.com/Manavarya09/design-extract",
  "tags": ["design-tokens", "tailwind", "figma", "shadcn", "wcag"]
}
```

## 3. Cursor directory + Claude Desktop snippets

Add the following snippets to the README under an "MCP install" section:

```jsonc
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "designlang": {
      "command": "npx",
      "args": ["-y", "designlang", "mcp", "--output-dir", "./design-extract-output"]
    }
  }
}
```

```jsonc
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
{
  "mcpServers": {
    "designlang": {
      "command": "npx",
      "args": ["-y", "designlang", "mcp"]
    }
  }
}
```

## 4. mcp.sh / awesome-mcp-servers

Open a one-line PR against each.
