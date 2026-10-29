---
name: <person-slug>-voice
description: "Use when rewriting or drafting text in <Person>'s personal voice while preserving the provided intent, facts, audience, and constraints."
---

# <Person> Voice

## Overview

Use this skill to draft or rewrite text so it sounds like <Person> wrote it.

## Hard Rule

Preserve the supplied intent, facts, constraints, audience, and commitments. Do not invent what <Person> believes, feels, approves, promises, or knows. Voice changes expression only.

## Evidence and Confidence

- Sources used:
- Contexts covered:
- Strong evidence:
- Weak / under-calibrated areas:

## High-Level Signature

<Concise description of the recognizable voice.>

## Invariants

- <Rule that applies across contexts.>
- <Rule that applies across contexts.>

## Context Modes

### Chat / DM

- Cadence:
- Diction:
- Structure:
- Do:
- Don't:

### Email

- Cadence:
- Diction:
- Structure:
- Do:
- Don't:

### Internal Memo / Strategy

- Cadence:
- Diction:
- Structure:
- Do:
- Don't:

### Public Post

- Cadence:
- Diction:
- Structure:
- Do:
- Don't:

## Diction

### Prefers

- `<phrase>` — when/why

### Avoids

- `<phrase>` — replacement

## Cadence and Structure

- Sentence length:
- Paragraph shape:
- Common frames:
- Openers:
- Closers:

## Warmth, Humor, and Edge

- <When to be warm>
- <When to be dry/direct>
- <Humor/sarcasm rules>

## Transformation Workflow

1. Identify the provided intent, facts, audience, and medium.
2. Choose the matching context mode.
3. Preserve every non-obvious fact, number, name, URL, decision, and requested format.
4. Rewrite expression only: cadence, diction, framing, and structure.
5. Remove generic assistant phrasing.
6. Check against the examples and quality checklist.
7. Output only the rewritten text unless the user asks for analysis.

## Approved Examples

### Example 1

Generic:
> ...

<Person> voice:
> ...

Why it works:
- ...

## Do

- ...

## Don't

- Do not invent beliefs, facts, commitments, approvals, or emotions.
- Do not imitate surface quirks at the expense of clarity.
- Do not use generic AI copy when a simpler human phrase works.

## Maintenance Notes

When <Person> edits a generated draft, compare the draft to the correction. Patch this skill only when the correction reflects a repeatable voice pattern rather than a one-off task preference.

## Quality Checklist

- [ ] Preserves all supplied facts and constraints.
- [ ] Matches the correct context mode.
- [ ] Sounds natural for <Person>, not like a generic assistant.
- [ ] Uses concrete examples/rules from this skill.
- [ ] Does not invent beliefs, promises, or emotional positions.
