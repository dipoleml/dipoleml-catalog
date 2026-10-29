---
description: Bundle every designlang output (DTCG tokens, Tailwind, shadcn, Figma vars, motion, anatomy, Storybook, prompts) into one polished design-system directory ready to zip and ship.
argument-hint: <url> [--with-clone] [--open]
---

Run the full extraction once and write every emitter output into a single, signed, layered directory.

```bash
npx designlang pack $ARGUMENTS
```

If no URL is provided, ask the user. Default output is `./<host>-design-system/`.

Layout produced:

```
<host>-design-system/
├── README.md           bespoke "Built from <host>" + grade + at-a-glance
├── LICENSE.txt         provenance + usage guidance
├── tokens/             DTCG + Tailwind + CSS vars + Figma vars + motion + theme.js
├── components/         typed React stubs (anatomy.tsx)
├── storybook/          runnable Storybook project
├── starter/            minimal HTML starter wired to tokens/variables.css
├── prompts/            v0 / Lovable / Cursor / Claude Artifacts + named recipes/*.md
└── extras/             voice.json + prompt-pack.md rollup
```

After the run:

1. Surface the headline (`X files, Y KB · ./<dir>`)
2. Read the auto-generated `README.md` and tell the user what's inside
3. Suggest next steps:
   - `cd <dir> && zip -r ../<dir>.zip .` to package for sharing
   - `cd <dir>/storybook && npm install && npm run storybook` to run the design system locally
   - Copy `tokens/tailwind.config.js` straight into a project

Use `--with-clone` to swap the minimal HTML starter for the full Next.js clone (slower; only when the user wants a runnable app).
