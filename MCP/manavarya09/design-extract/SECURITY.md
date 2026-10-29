# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 11.x    | :white_check_mark: |
| 10.x    | :white_check_mark: (critical only) |
| < 10    | :x:                |

Only the latest minor of each supported major receives fixes.

## Reporting a vulnerability

**Please don't open a public issue.** Use GitHub's private vulnerability reporting instead:

👉 <https://github.com/Manavarya09/design-extract/security/advisories/new>

What to include:

- A description of the issue and its impact.
- A minimal repro (URL being extracted, CLI flags, OS + Node version).
- Suggested severity and, if you have one, a proposed fix.

### What to expect

- Acknowledgement within **72 hours**.
- A triage verdict (accepted / needs info / out of scope) within **7 days**.
- Public disclosure coordinated with you after a fix ships — usually as part of a patch release.

## Scope

In scope:

- The `designlang` CLI and all subcommands (`extract`, `clone`, `ci`, `studio`, `replay`, `mcp`, etc.).
- The MCP server (`src/mcp/server.js`).
- The hosted extractor website (`website/`) when used at its canonical URL.
- The Figma, Chrome, Raycast, and VS Code extensions shipped in this repo.

Out of scope:

- Vulnerabilities that require the user to run `designlang` against a page **they themselves control** (i.e. self-owned XSS in content they feed us).
- Denial of service via crafted sites that simply take a long time to extract — we already time-bound Playwright operations.
- Browser-level shadow-DOM opacity (closed shadow roots are unreachable by web platform design, not a designlang bug).

Thanks for taking the time to report responsibly.
