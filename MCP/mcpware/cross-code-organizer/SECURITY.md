# Security

## Reporting a vulnerability

Please open a private GitHub security advisory for vulnerabilities that could expose or overwrite files, execute unexpected commands, or misrepresent an MCP server's behavior. Avoid putting secrets or exploit details in a public issue.

## Local trust boundary

The dashboard listens only on `127.0.0.1`. It rejects non-local host headers and cross-site browser mutations. File preview and Markdown editing are restricted to items discovered by the active harness adapter; restore and backup paths are restricted to that harness's config and discovered project roots.

MCP security audits connect to servers already configured in the selected harness. Treat those connections like starting the configured server itself.

## Research corpus and scanner false positives

The tracked `research/` directory contains deliberately adversarial MCP descriptions and credential-exfiltration examples used to test the activation-scanner research preview. Static repository scanners can therefore flag phrases such as SSH credential paths even though those strings are inert test data. The npm package uses an explicit `files` allowlist and does not ship the research corpus.

A scanner result should be checked against executable runtime paths before it is treated as evidence that the published package is malicious. The research preview is not yet a universal hard-block security product; its current limits are documented in `research/README.md`.
