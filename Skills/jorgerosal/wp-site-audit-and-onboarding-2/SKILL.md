---
name: wp-site-audit-and-onboarding
description: WordPress site and codebase onboarding review for Codex. Use when inheriting a repo, classifying an unfamiliar WordPress stack, mapping architectural hotspots, or deciding which WordPress review skill should run next.
---

# Codex WordPress Site Audit and Onboarding

## Purpose

Use this skill when Codex should first understand a WordPress codebase before diving into plugin, theme, security, performance, WooCommerce, headless, or migration details.

## Focus Areas

- classify the stack shape quickly
- identify major custom code surfaces
- surface architectural and operational risk signals
- recommend the next 2–5 specialist WordPress reviews
- note important unknowns rather than pretending the repo is fully understood

## Workflow

1. Determine the audit target and whether it covers the full repo or only one surface.
2. Classify the project: plugin, theme, blocks, WooCommerce, REST, headless, ACF-heavy, multisite, Bedrock, builder-heavy, or mixed.
3. Summarize the major code, build, test, and deploy surfaces.
4. Report the highest-value onboarding findings with severity and file/surface references.
5. Route follow-up work into the most relevant specialist WordPress skills.

## Reference Files

Load only the references you need from:

- `../../claude-skills/wp-site-audit-and-onboarding/references/stack-detection-and-signals.md`
- `../../claude-skills/wp-site-audit-and-onboarding/references/audit-checklist.md`
- `../../claude-skills/wp-site-audit-and-onboarding/references/routing-and-followups.md`
- `../../claude-skills/wp-site-audit-and-onboarding/references/sample-onboarding-output.md`

## Output

- Start with project classification and architecture snapshot
- Group findings by `CRITICAL`, `WARNING`, and `INFO`
- Include file or surface references where possible
- End with a prioritized next-review sequence and any residual unknowns
