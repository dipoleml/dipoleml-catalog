# Zoom Plugin DipoleML

**DipoleML integration** for Zoom. Type: `plugin`. Version: `1.2.0`.

DipoleML plugin for planning, building, and debugging Zoom integrations across REST APIs, SDKs, webhooks, bots, and MCP workflows.

## Upstream

- Repository: https://github.com/zoom/zoom-plugin-claude
- Commit: `86e2592334f5fb563ed273e26035844004e66165`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-http · zoom-mcp · https://mcp.zoom.us/mcp/zoom/streamable
- mcp-http · zoom-meetings-mcp · https://mcp.zoom.us/mcp/meeting/streamable
- mcp-http · zoom-canvas-mcp · https://mcp.zoom.us/mcp/canvas/streamable
- mcp-http · zoom-chat-mcp · https://mcp.zoom.us/mcp/chat/streamable
- mcp-http · zoom-tasks-mcp · https://mcp.zoom.us/mcp/tasks/streamable
- mcp-http · zoom-revenue-accelerator-mcp · https://mcp.zoom.us/mcp/revenue_accelerator/streamable
- mcp-http · zoom-whiteboard-mcp · https://mcp.zoom.us/mcp/whiteboard/streamable
- plugin · .dipoleml-plugin/plugin.json

## Requirements

- env: ZOOM_MCP_ACCESS_TOKEN, ZOOM_MEETINGS_MCP_ACCESS_TOKEN, ZOOM_CANVAS_MCP_ACCESS_TOKEN, ZOOM_CHAT_MCP_ACCESS_TOKEN, ZOOM_TASKS_MCP_ACCESS_TOKEN, ZOOM_REVENUE_ACCELERATOR_MCP_ACCESS_TOKEN, ZOOM_WHITEBOARD_MCP_ACCESS_TOKEN, YOUR_TUNNEL_HOST
- credentials: ZOOM_MCP_ACCESS_TOKEN, ZOOM_MEETINGS_MCP_ACCESS_TOKEN, ZOOM_CANVAS_MCP_ACCESS_TOKEN, ZOOM_CHAT_MCP_ACCESS_TOKEN, ZOOM_TASKS_MCP_ACCESS_TOKEN, ZOOM_REVENUE_ACCELERATOR_MCP_ACCESS_TOKEN, ZOOM_WHITEBOARD_MCP_ACCESS_TOKEN
