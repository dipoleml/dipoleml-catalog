# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | ✅ |

## Reporting a Vulnerability

If you find a vulnerability, report it **privately** to the maintainer before publishing details publicly.

- **Email:** noahsheldon06@gmail.com
- **Response time:** within 48 hours
- **Status updates:** every 7 days until resolved
- **Target fix time:** 30 days from report

## Scope

The following are in scope for security reports:

- Plugin manifests (`.claude-plugin/`, `.codex-plugin/`, `.gemini/`, `.opencode/`)
- Install scripts (`install.sh`, `install.ps1`)
- Automation hooks (`hooks/`)
- MCP configurations (`mcp-configs/`, `.mcp.json`)
- Validation scripts (`scripts/`)
- Shell commands in skills, agents, and commands

## Security Expectations

### Code Quality

- Validate external input in scripts and hooks
- Avoid shell interpolation from untrusted strings
- Never hardcode secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Keep default plugin configuration conservative

### Dependency Management

- Audit new dependencies for known CVEs before adding
- Pin dependency versions — no floating `*` or `latest`
- Review lock files for unexpected changes
- Monitor for deprecated or unmaintained packages

### Data Handling

- No PII in logs, error messages, or telemetry
- API responses don't over-expose internal data
- Database queries use parameterized statements — no raw SQL with user input
- File operations use path validation — no directory traversal

### Authentication & Authorization

- Never bypass auth checks in hooks or automation
- Use least privilege — explicit allowlists over denylists
- Token scopes are minimal — read-only where possible
- Expired or revoked tokens are rejected

## Out of Scope

- Third-party dependencies (report upstream)
- Infrastructure outside this repository
- Social engineering attacks
- Physical security

## Security Review Process

When changes touch auth, secrets, or external input:

1. Flag the change with a **SECURITY** label in the PR
2. Request review from the `security-reviewer` agent
3. Do not merge until the security review passes
4. Document any security-relevant decisions in the PR description
