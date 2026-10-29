# Skill Development Guide

Skills are the canonical prompt surface in this repo.
They should be short, specific, and useful without extra context.

## What A Skill Is

A skill is a focused playbook for one task family, framework, or workflow.
Good skills give the model enough structure to act without turning into a long essay.

## Required Shape

Each skill should have:

- a clear `name` in frontmatter
- a one-line `description`
- a narrow scope
- a short workflow
- a verification section

Recommended sections inside `SKILL.md`:

1. `When to Use`
2. `Core Focus`
3. `Workflow`
4. `Checks`
5. `Anti-Patterns`

## Writing Rules

- Keep the prompt direct.
- Prefer steps over prose.
- Include concrete outputs.
- Call out what not to do.
- Keep any code examples minimal and runnable.

## Good Skill Criteria

- one task family, not ten
- clear activation conditions
- explicit verification step
- no dependency on hidden external context
- no duplicate coverage with another skill unless the overlap is intentional

## Bad Skill Criteria

- vague broad prompt
- multiple unrelated workflows
- marketing copy
- commands disguised as a skill
- duplicated guidance already covered by a rule or another skill

## Suggested Workflow

1. Start from the smallest useful job.
2. Write the skill as if another developer will use it with no extra explanation.
3. Add a verification step that proves the work is complete.
4. Run the surface validator after adding the skill.
5. Update the command-agent map if the skill is now used by a command.

## Review Checklist

- Is the skill narrow?
- Does the prompt match the repo's short, direct style?
- Does it avoid overlapping with an existing skill?
- Does it tell the model how to verify success?
- Does it reference real repo files or real workflows?

