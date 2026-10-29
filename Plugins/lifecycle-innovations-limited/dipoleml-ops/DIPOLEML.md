# DipoleML Ops

**DipoleML integration** for Lifecycle Innovations Limited. Type: `plugin`. Version: `3.12.0`.

Business operating system for DipoleML — 57 skills, 21 agents, smart daemon. Unified inbox (WhatsApp/Email/Slack/Telegram), autonomous PR merge, full-AWS monitoring, revenue (Stripe+RevenueCat), e-commerce (Shopify), marketing (Klaviyo/Meta/GA4), voice (Bland/ElevenLabs), APM (Datadog/NewRelic/OTEL), YOLO mode.

## Upstream

- Repository: https://github.com/Lifecycle-Innovations-Limited/claude-ops
- Commit: `489bebae980d89f300b45178c6c1b545692452f8`
- License: MIT (green)
- Provider manifests archived under `_upstream/provider-manifests/`

This package is vendored from the upstream project. Executable code is
unmodified; only provider metadata and manifests were normalized for DipoleML.
See `dipoleml.json` for the authoritative metadata and `LICENSE` for the
upstream license.

## Entrypoints

- plugin · .dipoleml-plugin/plugin.json

## Requirements

- runtimes: node
- packages: claude-ops-bin
- env: ANTHROPIC_API_KEY
- credentials: ANTHROPIC_API_KEY
