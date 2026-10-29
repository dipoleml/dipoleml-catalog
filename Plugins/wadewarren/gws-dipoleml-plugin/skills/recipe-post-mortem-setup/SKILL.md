---
name: recipe-post-mortem-setup
version: 1.0.0
description: "Create a Google Docs post-mortem, schedule a Google Calendar review, and notify via Chat."
metadata:
  openclaw:
    category: "recipe"
    domain: "engineering"
    requires:
      bins: ["gws"]
      skills: ["gws-docs", "gws-calendar", "gws-chat"]
---

# Set Up Post-Mortem

> **PREREQUISITE:** Load the following skills to execute this recipe: `gws-docs`, `gws-calendar`, `gws-chat`

Create a Google Docs post-mortem, schedule a Google Calendar review, and notify via Chat.

## Steps

1. Create post-mortem doc: `gws docs documents create --json '{"title": "Post-Mortem: [Incident]"}'`
2. Write the template (use DOC_ID from step 1): `gws docs +write --document DOC_ID --text '## Summary

## Timeline

## Root Cause

## Action Items'`
3. Schedule review meeting: `gws calendar +insert --summary 'Post-Mortem Review: [Incident]' --attendee team@company.com --start '2026-03-16T14:00:00' --end '2026-03-16T15:00:00'`
4. Notify in Chat: `gws chat +send --space spaces/ENG_SPACE --text '🔍 Post-mortem scheduled for [Incident].'`

