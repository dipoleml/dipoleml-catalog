# Security Policy

## Reporting a vulnerability

Email **[developer@dipoleml.com](mailto:developer@dipoleml.com)** with the subject
`[SECURITY] DipoleML Catalog`. Do not open a public issue for an unreported
vulnerability.

Please include:

- the affected item ID and path,
- the upstream repository and commit,
- a description of the issue and its impact,
- reproduction steps or a proof of concept,
- any suggested remediation.

We will acknowledge the report, investigate, and coordinate a fix or removal.

## Scope

This repository contains:

- catalog metadata and indexes,
- vendored third-party source code,
- plugin and skill instructions,
- logos and documentation.

Security-relevant reports include malicious install hooks, credential
exfiltration, prompt-injection payloads, unsafe shell execution, exposed
secrets, and supply-chain risks in an included item.

## Upstream vulnerabilities

If a vulnerability is in an upstream project, report it to that project as
well. We can remove or pin an affected item from the catalog while the
upstream fix is prepared.

## Secrets

The catalog must never contain live credentials. If you find a secret in an
item, report it privately and do not reproduce it in a public issue.
