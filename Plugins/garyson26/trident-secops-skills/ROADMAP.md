# Roadmap

This roadmap captures likely future improvements for Trident SecOps Skills.

## Near term

- Add examples for each skill under a dedicated examples document.
- Extend `scripts/validate.sh` to also check Markdown links, JSON manifests,
  and URL consistency, so one command covers everything.
- Add CI that runs `scripts/validate.sh` on every pull request.
- Add more SOC query examples for common SIEM platforms.
- Add more DevSecOps examples for GitHub Actions, GitLab CI, Kubernetes, and
  Terraform.

## Medium term

- Add optional `references/` files for complex skills where extra depth is
  useful but should not bloat `SKILL.md`.
- Add safe report templates for offensive security, SOC triage, malware
  analysis, and DevSecOps reviews.
- Add multilingual examples for Indonesian and English security documentation.
- Add a packaged release workflow for `.skill` archives if Gemini CLI package
  support is desired.

## Long term

- Split highly specialized domains into additional focused skills if usage
  shows the current skills are too broad.
- Add automated tests for skill activation descriptions.
- Publish versioned releases and changelog entries for every change.
- Add community contribution templates and issue templates.

