# MCP Ssh Manager

**DipoleML integration** for Bvisible. Type: `mcp`. Version: `4.0.1`.

MCP server for SSH: let DipoleML, Codex and any MCP client run commands, transfer files and manage servers over SSH, with human approval, an encrypted vault and a live audit trail. Desktop app and CLI included.

## Upstream

- Repository: https://github.com/bvisible/mcp-ssh-manager
- Commit: `803af3ef69a1e3dcd227ea30f42fba4e6e8a02a4`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- mcp-stdio · npx -y mcp-ssh-manager
- mcp-stdio · node src/index.js
- mcp-stdio · npx -y mcp-ssh-manager
- mcp-stdio · node cli/ssh-manager.js

## Requirements

- runtimes: node >=18.0.0, python3
- packages: mcp-ssh-manager
- env: KEYPATH, SSH_SERVER_BASTION_HOST, SSH_SERVER_BASTION_KEYPATH, SSH_SERVER_PRIVATE_HOST
- credentials: KEYPATH, SSH_SERVER_BASTION_KEYPATH
