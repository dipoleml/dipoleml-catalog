// designlang pack — bundle every emitter output into a single, polished
// design-system directory. One artifact a designer or dev can clone, drop
// into a project, or zip up and send to a client.
//
// Layout:
//   <host>-design-system/
//     README.md
//     LICENSE.txt
//     tokens/
//       design-tokens.json     DTCG (primitive + semantic)
//       tokens.flat.json        legacy flat
//       tailwind.config.js
//       variables.css
//       figma-variables.json
//       motion-tokens.json
//       theme.js                React theme object
//     components/
//       anatomy.tsx             typed React stubs
//     storybook/                runnable Storybook project
//     starter/                  minimal Next.js or HTML starter
//     prompts/
//       v0.txt
//       lovable.txt
//       cursor.md
//       claude-artifacts.md
//       recipes/<component>.md  …
//     extras/
//       voice.json
//       prompt-pack.md          single-file rollup

import { mkdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

import { formatDtcgTokens } from './formatters/dtcg-tokens.js';
import { formatTokens } from './formatters/tokens.js';
import { formatTailwind } from './formatters/tailwind.js';
import { formatCssVars } from './formatters/css-vars.js';
import { formatFigma } from './formatters/figma.js';
import { formatMotionTokens } from './formatters/motion-tokens.js';
import { formatReactTheme } from './formatters/theme.js';
import { formatStorybook } from './formatters/storybook.js';
import { formatAnatomyStubs } from './extractors/component-anatomy.js';
import { buildPromptPack } from './formatters/prompt-pack.js';
import { generateClone } from './clone.js';

function nameFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  } catch {
    return 'design-system';
  }
}

function host(url) {
  try { return new URL(url).hostname; } catch { return String(url || ''); }
}

function exists(p) {
  try { statSync(p); return true; } catch { return false; }
}

// Normalise emitter output to a writable string. Different formatters return
// different shapes (string, object, undefined when feature absent) — coerce
// here so callers don't have to know.
function toText(content, fallback = '') {
  if (content == null) return fallback;
  if (typeof content === 'string') return content;
  if (Buffer.isBuffer(content)) return content;
  return JSON.stringify(content, null, 2);
}

function writeFile(path, content) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, toText(content), 'utf-8');
}

function buildReadme(design, opts) {
  const meta = design.meta || {};
  const hostName = host(meta.url);
  const grade = design.score?.grade || '—';
  const overall = design.score?.overall ?? '—';
  const families = (design.typography?.families || []).map(f => (typeof f === 'string' ? f : f.name)).filter(Boolean).slice(0, 3);
  const colorCount = (design.colors?.all || []).length;
  const spacingBase = design.spacing?.base ?? '—';
  const componentLib = design.componentLibrary?.library || 'unknown';
  const stack = design.stack?.framework || 'unknown';

  return `# ${hostName} — design system pack

> Built from \`${meta.url || ''}\` on ${new Date(meta.timestamp || Date.now()).toISOString().slice(0, 10)} by [designlang](https://designlang.app) v${opts.version || ''}.

A single, polished bundle of every artifact designlang emits for ${hostName}: tokens, components, a runnable Storybook, a minimal starter, and paste-ready prompts for v0 / Lovable / Cursor / Claude Artifacts.

## At a glance

- **Grade:** ${grade} (${overall}/100)
- **Stack:** ${stack} · component library: ${componentLib}
- **Type families:** ${families.length ? families.join(', ') : '—'}
- **Palette:** ${colorCount} colors
- **Spacing base:** ${spacingBase}

## What's in this pack

\`\`\`
${nameFromUrl(meta.url || '')}-design-system/
├── README.md           ← you are here
├── LICENSE.txt
├── tokens/             ← DTCG + Tailwind + CSS vars + Figma vars + motion + theme.js
├── components/         ← typed React stubs (anatomy.tsx)
├── storybook/          ← runnable Storybook project
├── starter/            ← minimal starter app
├── prompts/            ← v0 · Lovable · Cursor · Claude Artifacts
└── extras/             ← voice fingerprint + recipe cards
\`\`\`

## Install the tokens

### Tailwind

\`\`\`js
// tailwind.config.js
import config from './tokens/tailwind.config.js';
export default config;
\`\`\`

### CSS variables

\`\`\`html
<link rel="stylesheet" href="tokens/variables.css">
\`\`\`

### Figma

In Figma → Variables panel → import \`tokens/figma-variables.json\`.

### Storybook

\`\`\`bash
cd storybook && npm install && npm run storybook
\`\`\`

## Provenance

This pack was extracted from a publicly-accessible URL and represents the *observable design language* of that site at the time of capture. Token values are inferred from computed styles — no source files were accessed. See \`LICENSE.txt\` for usage guidance.

Re-pack at any time:

\`\`\`bash
npx designlang pack ${hostName}
\`\`\`
`;
}

function buildLicense(design) {
  const hostName = host(design.meta?.url);
  const date = new Date(design.meta?.timestamp || Date.now()).toISOString().slice(0, 10);
  return `Design System Pack — Provenance
================================

Source: ${design.meta?.url || hostName}
Captured: ${date}
Tool: designlang (https://designlang.app, MIT)

The token values, type scale, spacing system, and component anatomy in
this pack were inferred from the publicly-accessible computed styles of
the source URL via a headless browser. No source files, proprietary
assets, or copyrighted media were accessed or included.

You are free to use these values as a starting point, reference, or
inspiration. The packaging itself (this README, the bundle layout, the
emitter output formats) is released under MIT by the designlang project.

Trademarks, logos, brand names, and other identifiable assets of the
source remain the property of their respective owners and are not
licensed by this pack. Do not pass off this pack as the original site's
official design system without permission.
`;
}

function buildStarter(design) {
  // Simple, dependency-free HTML starter that consumes tokens/variables.css
  // and emits a hero + button preview. The full clone (Next.js) is left as
  // an opt-in via --with-clone.
  const hostName = host(design.meta?.url);
  const families = (design.typography?.families || []).map(f => (typeof f === 'string' ? f : f.name)).filter(Boolean);
  const display = families[0] || 'system-ui';
  const heading = (design.voice?.sampleHeadings || [])[0] || `Built from ${hostName}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${hostName} starter</title>
<link rel="stylesheet" href="../tokens/variables.css">
<style>
  body {
    margin: 0;
    font-family: ${JSON.stringify(display)}, -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--color-background, #fff);
    color: var(--color-text, #111);
    line-height: 1.5;
  }
  main { max-width: 840px; margin: 0 auto; padding: 64px 32px; }
  h1 { font-size: clamp(40px, 6vw, 72px); line-height: 1.05; margin: 0 0 18px; }
  p { font-size: 18px; max-width: 56ch; color: var(--color-text-secondary, #555); }
  .cta {
    display: inline-block;
    padding: 14px 28px;
    margin-top: 28px;
    background: var(--color-primary, #0a0a0a);
    color: var(--color-on-primary, #fff);
    border-radius: var(--radius-md, 8px);
    text-decoration: none;
    font-weight: 600;
  }
  .cta:hover { opacity: 0.9; }
  .meta { margin-top: 64px; font-size: 12px; color: #888; }
  .meta a { color: inherit; }
</style>
</head>
<body>
  <main>
    <h1>${heading}</h1>
    <p>This starter is wired to the tokens in <code>tokens/variables.css</code>. Edit the variables and watch this page change. Drop in your own components and use the same tokens to keep the visual language consistent.</p>
    <a class="cta" href="#">Get started</a>
    <p class="meta">Generated by <a href="https://designlang.app">designlang</a>. Re-pack with <code>npx designlang pack ${hostName}</code>.</p>
  </main>
</body>
</html>
`;
}

function buildPromptPackDocument(design) {
  const pack = buildPromptPack(design);
  const lines = [
    '# Prompt pack',
    '',
    `Paste-ready prompts for ${host(design.meta?.url)}. Use the variant that matches your tool.`,
    '',
  ];
  for (const [name, body] of Object.entries(pack)) {
    if (name === 'recipes') continue;
    const text = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    lines.push(`## ${name}\n`, '```', text.trim(), '```\n');
  }
  if (Array.isArray(pack.recipes) && pack.recipes.length) {
    lines.push('## Recipes\n');
    for (const recipe of pack.recipes) {
      const text = typeof recipe.content === 'string' ? recipe.content : JSON.stringify(recipe.content, null, 2);
      lines.push(`### ${recipe.name || 'recipe'}\n`, text.trim(), '\n');
    }
  }
  return lines.join('\n');
}

/**
 * Build a design-system pack on disk.
 *
 * @param {object} design — full design from extractDesignLanguage()
 * @param {object} opts
 * @param {string} opts.outDir — where to write the pack
 * @param {string} opts.version — designlang version, embedded in README
 * @param {boolean} [opts.withClone=true] — include the Next.js starter
 * @returns {object} { dir, files: string[] }
 */
export function buildPack(design, opts = {}) {
  const outDir = opts.outDir;
  if (!outDir) throw new Error('pack: outDir is required');
  const written = [];

  mkdirSync(outDir, { recursive: true });

  // Top-level
  const readmePath = join(outDir, 'README.md');
  writeFile(readmePath, buildReadme(design, opts));
  written.push(readmePath);

  const licensePath = join(outDir, 'LICENSE.txt');
  writeFile(licensePath, buildLicense(design));
  written.push(licensePath);

  // tokens/
  const tokensDir = join(outDir, 'tokens');
  mkdirSync(tokensDir, { recursive: true });

  // Each formatter has a different return shape — toText() (called by
  // writeFile) handles both objects and pre-stringified JSON correctly.
  // formatDtcgTokens returns an object; formatTokens / formatFigma /
  // formatMotionTokens return JSON strings directly; formatTailwind /
  // formatCssVars / formatReactTheme return code strings.
  const tokenWrites = [
    ['design-tokens.json',   formatDtcgTokens(design)],
    ['tokens.flat.json',     formatTokens(design)],
    ['tailwind.config.js',   formatTailwind(design)],
    ['variables.css',        formatCssVars(design)],
    ['figma-variables.json', formatFigma(design)],
    ['motion-tokens.json',   formatMotionTokens(design.motion || {})],
    ['theme.js',             formatReactTheme(design)],
  ];
  for (const [name, content] of tokenWrites) {
    const p = join(tokensDir, name);
    writeFile(p, content);
    written.push(p);
  }

  // components/
  const componentsDir = join(outDir, 'components');
  mkdirSync(componentsDir, { recursive: true });
  const anatomyPath = join(componentsDir, 'anatomy.tsx');
  writeFile(anatomyPath, formatAnatomyStubs(design.componentAnatomy || []));
  written.push(anatomyPath);

  // storybook/
  const sbFiles = formatStorybook(design);
  for (const [relPath, content] of Object.entries(sbFiles)) {
    const p = join(outDir, 'storybook', relPath);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFile(p, content);
    written.push(p);
  }

  // starter/ — minimal HTML by default; full Next.js when --with-clone
  const starterDir = join(outDir, 'starter');
  if (opts.withClone) {
    try {
      generateClone(design, starterDir);
      written.push(starterDir);
    } catch (err) {
      // Clone is best-effort — fall back to HTML starter if it errors.
      mkdirSync(starterDir, { recursive: true });
      writeFile(join(starterDir, 'index.html'), buildStarter(design));
      written.push(join(starterDir, 'index.html'));
    }
  } else {
    mkdirSync(starterDir, { recursive: true });
    const starterPath = join(starterDir, 'index.html');
    writeFile(starterPath, buildStarter(design));
    written.push(starterPath);
  }

  // prompts/
  const pack = buildPromptPack(design);
  const promptsDir = join(outDir, 'prompts');
  mkdirSync(promptsDir, { recursive: true });
  for (const [name, content] of Object.entries(pack)) {
    if (name === 'recipes') continue;
    const p = join(promptsDir, name);
    writeFile(p, content);
    written.push(p);
  }
  if (Array.isArray(pack.recipes) && pack.recipes.length) {
    const recipesDir = join(promptsDir, 'recipes');
    mkdirSync(recipesDir, { recursive: true });
    for (const recipe of pack.recipes) {
      // Each recipe = { name, content }; sanitise name to a safe filename.
      const safeName = String(recipe.name || 'recipe').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
      const p = join(recipesDir, `${safeName}.md`);
      writeFile(p, recipe.content);
      written.push(p);
    }
  }

  // extras/
  const extrasDir = join(outDir, 'extras');
  mkdirSync(extrasDir, { recursive: true });
  if (design.voice) {
    const p = join(extrasDir, 'voice.json');
    writeFile(p, JSON.stringify(design.voice, null, 2));
    written.push(p);
  }
  const promptDocPath = join(extrasDir, 'prompt-pack.md');
  writeFile(promptDocPath, buildPromptPackDocument(design));
  written.push(promptDocPath);

  return { dir: outDir, files: written };
}
