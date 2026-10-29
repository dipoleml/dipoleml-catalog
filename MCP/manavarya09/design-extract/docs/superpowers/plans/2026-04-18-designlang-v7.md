# designlang v7.0 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship designlang v7.0 — MCP server + agent rules, DTCG semantic/composite tokens, multi-platform emitters (iOS/Android/Flutter/WordPress), Tailwind/stack fingerprint, CSS health audit, a11y remediation, semantic regions, and reusable component detection.

**Architecture:** Extend the existing `extractor → formatter` pipeline. Add 5 extractors, 6 formatters, and an MCP server. DTCG tokens become the new source-of-truth that all platform emitters consume. No LLM or vision deps — everything deterministic.

**Tech Stack:** Node.js 20+, ESM, Playwright, `node:test` test runner, `@modelcontextprotocol/sdk` (new).

**Spec:** `docs/superpowers/specs/2026-04-18-designlang-v7-design.md`

---

## File Structure (create / modify)

### Create
- `src/extractors/stack-fingerprint.js`
- `src/extractors/css-health.js`
- `src/extractors/semantic-regions.js`
- `src/extractors/component-clusters.js`
- `src/extractors/a11y-remediation.js`
- `src/formatters/dtcg-tokens.js`
- `src/formatters/ios-swiftui.js`
- `src/formatters/android-compose.js`
- `src/formatters/flutter-dart.js`
- `src/formatters/agent-rules.js`
- `src/mcp/server.js`
- `src/mcp/resources.js`
- `src/mcp/tools.js`
- `CHANGELOG.md`

### Modify
- `src/index.js` — wire new extractors, DTCG output, platform dispatch, agent-rules emission
- `src/formatters/wordpress.js` — extend to a full block-theme skeleton (not just tokens)
- `src/formatters/tokens.js` — keep as legacy; switch default to dtcg-tokens
- `src/extractors/accessibility.js` — expose palette + WCAG helpers for remediation reuse
- `src/extractors/scoring.js` — add cssHealth, specificity, animationCatalog dimensions
- `bin/design-extract.js` — add `--platforms`, `--emit-agent-rules`, `--tokens-legacy` flags and `designlang mcp` subcommand
- `tests/extractors.test.js` — add tests for 5 new extractors
- `tests/formatters.test.js` — add tests for 6 new formatters
- `package.json` — add `@modelcontextprotocol/sdk`; bump version to 7.0.0
- `README.md` — document v7 features
- `AGENTS.md` / `CLAUDE.md` root — mention agent rules emitter

---

## Conventions (inherited)

- ESM modules, pure functions per extractor.
- Each extractor takes raw data (`styles` array and/or `rawData.light.*`) and returns a plain object or `null` on failure.
- Tests use `node:test` + `assert/strict`. Fixture factory pattern (see `tests/extractors.test.js::makeEl`).
- Wrap each new extractor call in `safeExtract(fn, ...)` inside `src/index.js`.
- Commit after each green test. Follow existing commit style (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).

---

## Chunk 0: Preflight & dependencies

### Task 0.1: Install MCP SDK

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install dep**

```bash
cd /Users/manavaryasingh/claude-plugin/design-extract
npm install @modelcontextprotocol/sdk
```

- [ ] **Step 2: Verify install**

```bash
node -e "import('@modelcontextprotocol/sdk/server/index.js').then(m=>console.log(Object.keys(m)))"
```
Expected: output lists exports including `Server`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @modelcontextprotocol/sdk for v7 MCP server"
```

---

## Chunk 1: DTCG token formatter (foundation for emitters)

Rationale: platform emitters (iOS/Android/Flutter/WordPress/Agent rules/MCP) all consume the semantic token layer. Build this first.

### Task 1.1: Define DTCG writer

**Files:**
- Create: `src/formatters/dtcg-tokens.js`
- Test: `tests/formatters.test.js` (extend)

DTCG spec (v1): each leaf is `{ "$value": <primitive or {composite}>, "$type": "<type>", "$extensions"?: {...} }`. References use `"{path.to.token}"` syntax.

- [ ] **Step 1: Write failing tests**

Add to `tests/formatters.test.js`:

```js
import { formatDtcgTokens } from '../src/formatters/dtcg-tokens.js';

describe('formatDtcgTokens', () => {
  const minimalDesign = {
    colors: { primary: '#3b82f6', secondary: '#10b981', neutrals: ['#111','#888','#eee'], backgrounds: ['#fff'], text: ['#111'], all: [] },
    typography: { families: ['Inter'], scale: [{ size:'16px', weight:'400', lineHeight:'1.5' }] },
    spacing: { scale: ['4px','8px','16px'], base: '4px' },
    shadows: { values: ['0 1px 2px rgba(0,0,0,0.1)'] },
    borders: { radii: ['4px','8px'] },
    variables: {},
  };

  it('emits $value/$type for every leaf', () => {
    const out = formatDtcgTokens(minimalDesign);
    assert.equal(out.primitive.color.brand.primary.$value, '#3b82f6');
    assert.equal(out.primitive.color.brand.primary.$type, 'color');
  });

  it('emits semantic aliases referencing primitives', () => {
    const out = formatDtcgTokens(minimalDesign);
    assert.match(out.semantic.color.action.primary.$value, /^\{primitive\.color\.brand\.primary\}$/);
    assert.equal(out.semantic.color.action.primary.$type, 'color');
  });

  it('emits composite typography tokens', () => {
    const out = formatDtcgTokens(minimalDesign);
    const body = out.semantic.typography.body;
    assert.equal(body.$type, 'typography');
    assert.equal(body.$value.fontFamily, 'Inter');
    assert.equal(body.$value.fontSize, '16px');
  });

  it('round-trips through JSON unchanged', () => {
    const out = formatDtcgTokens(minimalDesign);
    assert.deepEqual(JSON.parse(JSON.stringify(out)), out);
  });
});
```

- [ ] **Step 2: Run → fail**

```bash
node --test tests/formatters.test.js
```
Expected: 4 failing tests, `formatDtcgTokens` not found.

- [ ] **Step 3: Implement formatter**

`src/formatters/dtcg-tokens.js`:

```js
// DTCG v1 token formatter.
// Input: design object from extractDesignLanguage.
// Output: { primitive: {...}, semantic: {...}, $metadata: {...} }

function token(value, type, extensions) {
  const t = { $value: value, $type: type };
  if (extensions) t.$extensions = extensions;
  return t;
}

function ref(path) { return `{${path}}`; }

function buildPrimitive(design) {
  const brand = design.colors.primary || design.colors.all?.[0] || '#000';
  const secondary = design.colors.secondary || null;
  const neutrals = Object.fromEntries(
    (design.colors.neutrals || []).map((v, i) => [`n${i * 100 + 100}`, token(v, 'color')])
  );
  const color = {
    brand: {
      primary: token(brand, 'color'),
      ...(secondary && { secondary: token(secondary, 'color') }),
    },
    neutral: neutrals,
    background: Object.fromEntries((design.colors.backgrounds || []).map((v, i) => [`bg${i}`, token(v, 'color')])),
    text: Object.fromEntries((design.colors.text || []).map((v, i) => [`text${i}`, token(v, 'color')])),
  };

  const spacing = Object.fromEntries(
    (design.spacing.scale || []).map((v, i) => [`s${i}`, token(v, 'dimension')])
  );

  const radius = Object.fromEntries(
    (design.borders.radii || []).map((v, i) => [`r${i}`, token(v, 'dimension')])
  );

  const shadow = Object.fromEntries(
    (design.shadows.values || []).map((v, i) => [`sh${i}`, token(v, 'shadow')])
  );

  const fontFamily = Object.fromEntries(
    (design.typography.families || []).map((v, i) => [`f${i}`, token(v, 'fontFamily')])
  );

  return { color, spacing, radius, shadow, fontFamily };
}

function buildSemantic(design, primitive) {
  const firstFontKey = Object.keys(primitive.fontFamily)[0] || 'f0';
  const firstRadiusKey = Object.keys(primitive.radius)[0] || 'r0';
  const firstShadowKey = Object.keys(primitive.shadow)[0] || 'sh0';

  const color = {
    action: {
      primary: token(ref('primitive.color.brand.primary'), 'color'),
    },
    surface: {
      default: token(ref('primitive.color.background.bg0'), 'color'),
    },
    text: {
      body: token(ref('primitive.color.text.text0'), 'color'),
    },
  };
  if (primitive.color.brand.secondary) {
    color.action.secondary = token(ref('primitive.color.brand.secondary'), 'color');
  }

  const typography = {
    body: token({
      fontFamily: design.typography.families?.[0] || 'system-ui',
      fontSize: design.typography.scale?.[0]?.size || '16px',
      fontWeight: design.typography.scale?.[0]?.weight || '400',
      lineHeight: design.typography.scale?.[0]?.lineHeight || '1.5',
    }, 'typography'),
  };

  const radius = {
    control: token(ref(`primitive.radius.${firstRadiusKey}`), 'dimension'),
  };

  const shadow = {
    elevated: token(ref(`primitive.shadow.${firstShadowKey}`), 'shadow'),
  };

  return { color, typography, radius, shadow };
}

export function formatDtcgTokens(design) {
  const primitive = buildPrimitive(design);
  const semantic = buildSemantic(design, primitive);
  return {
    $metadata: {
      generator: 'designlang',
      version: '7.0.0',
      spec: 'https://design-tokens.github.io/community-group/format/',
      source: design.meta?.url,
      generatedAt: design.meta?.timestamp,
    },
    primitive,
    semantic,
  };
}
```

- [ ] **Step 4: Run → pass**

```bash
node --test tests/formatters.test.js
```
Expected: all 4 new tests PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/formatters/dtcg-tokens.js tests/formatters.test.js
git commit -m "feat(formatters): add DTCG v1 tokens with primitive + semantic + composites"
```

### Task 1.2: Wire DTCG as default, keep legacy behind flag

**Files:** `src/index.js`, `bin/design-extract.js`

- [ ] **Step 1: Add to index.js export logic**

In `src/index.js` (after design is assembled, near where other formatters run / output spec is built) — identify the place where `*-design-tokens.json` is written. Route through `formatDtcgTokens(design)` unless `options.tokensLegacy === true`, in which case use existing `formatTokens`.

- [ ] **Step 2: Add `--tokens-legacy` CLI flag**

In `bin/design-extract.js` add:
```js
.option('--tokens-legacy', 'Emit pre-v7 flat token JSON (backward compat)')
```
Pass `tokensLegacy` down into extractor options.

- [ ] **Step 3: Run full test suite + manual smoke**

```bash
node --test tests/*.test.js
node bin/design-extract.js https://example.com -o /tmp/dl-smoke
head -50 /tmp/dl-smoke/example-com-design-tokens.json
```
Expected: tests pass; JSON shows `$metadata`, `primitive`, `semantic` keys.

- [ ] **Step 4: Commit**

```bash
git add src/index.js bin/design-extract.js
git commit -m "feat: use DTCG token format by default; legacy via --tokens-legacy"
```

---

## Chunk 2: New extractors

### Task 2.1: `stack-fingerprint` extractor

**Files:**
- Create: `src/extractors/stack-fingerprint.js`
- Test: extend `tests/extractors.test.js`

Detects framework, Tailwind, analytics, CDN, fonts host from: page HTML, script URLs, window-global signature strings already present on the crawled DOM sample, meta tags, and class-name patterns. `crawler.js` should be extended to capture `rawData.light.stack = { scripts: [...urls], metas: [...], classNameSample: [...], windowGlobals: [...] }`. Extractor is pure over that payload.

- [ ] **Step 1: Extend crawler to collect stack signals**

Modify `src/crawler.js`: inside the existing `page.evaluate()` block, also return:
```js
stack: {
  scripts: Array.from(document.scripts).map(s => s.src).filter(Boolean).slice(0, 50),
  metas: Array.from(document.querySelectorAll('meta[name],meta[property]')).map(m => ({ name: m.name||m.getAttribute('property'), content: m.content })).slice(0, 50),
  classNameSample: Array.from(document.querySelectorAll('[class]')).slice(0, 500).map(e => e.className).filter(c => typeof c === 'string'),
  windowGlobals: ['React','Vue','__NEXT_DATA__','__NUXT__','___gatsby','_remixContext','Shopify','wp'].filter(k => typeof window[k] !== 'undefined'),
}
```

- [ ] **Step 2: Write failing tests**

```js
import { extractStackFingerprint } from '../src/extractors/stack-fingerprint.js';

describe('extractStackFingerprint', () => {
  it('detects Next.js from __NEXT_DATA__', () => {
    const out = extractStackFingerprint({ windowGlobals: ['__NEXT_DATA__'], scripts: [], metas: [], classNameSample: [] });
    assert.equal(out.framework, 'next');
  });

  it('detects Tailwind from utility-heavy classNames', () => {
    const out = extractStackFingerprint({
      windowGlobals: [],
      scripts: [],
      metas: [],
      classNameSample: ['flex items-center gap-4 text-sm text-gray-600', 'px-4 py-2 rounded-md bg-blue-500', 'grid grid-cols-3 md:grid-cols-4'],
    });
    assert.equal(out.css.layer, 'tailwind');
    assert.ok(out.css.tailwind.utilities.length > 0);
  });

  it('returns unknown when nothing matches', () => {
    const out = extractStackFingerprint({ windowGlobals: [], scripts: [], metas: [], classNameSample: ['foo', 'bar'] });
    assert.equal(out.framework, 'unknown');
    assert.equal(out.css.layer, 'unknown');
  });
});
```

- [ ] **Step 3: Run → fail**

- [ ] **Step 4: Implement**

`src/extractors/stack-fingerprint.js`:

```js
const FRAMEWORK_BY_GLOBAL = {
  '__NEXT_DATA__': 'next',
  '__NUXT__': 'nuxt',
  '___gatsby': 'gatsby',
  '_remixContext': 'remix',
  'React': 'react',
  'Vue': 'vue',
  'Shopify': 'shopify',
  'wp': 'wordpress',
};

const SCRIPT_PATTERNS = [
  [/_next\/static/, 'next'],
  [/\/nuxt\//, 'nuxt'],
  [/\/astro\//, 'astro'],
  [/\/sveltekit\//, 'sveltekit'],
  [/shopify\./, 'shopify'],
  [/wp-(content|includes)/, 'wordpress'],
  [/webflow\.com/, 'webflow'],
  [/framerusercontent/, 'framer'],
];

const ANALYTICS = {
  gtag: /googletagmanager\.com|google-analytics/,
  plausible: /plausible\.io/,
  posthog: /posthog\.com/,
  segment: /segment\.(io|com)/,
  mixpanel: /mixpanel/,
  amplitude: /amplitude/,
  hotjar: /hotjar/,
  vercelInsights: /\/_vercel\/insights/,
};

const TAILWIND_UTIL = /(^|\s)(flex|grid|block|inline|hidden|text-(xs|sm|base|lg|xl|\d+xl)|text-(gray|slate|zinc|red|blue|green|amber|neutral|stone)-\d+|bg-(gray|slate|zinc|red|blue|green|amber|neutral|stone)-\d+|p[xy]?-\d+|m[xy]?-\d+|gap-\d+|rounded(-\w+)?|shadow(-\w+)?|items-(start|center|end|baseline|stretch)|justify-(start|center|end|between|around|evenly)|grid-cols-\d+|col-span-\d+)(\s|$)/;

function detectFramework(signals) {
  for (const g of signals.windowGlobals || []) {
    if (FRAMEWORK_BY_GLOBAL[g]) return FRAMEWORK_BY_GLOBAL[g];
  }
  for (const s of signals.scripts || []) {
    for (const [re, name] of SCRIPT_PATTERNS) if (re.test(s)) return name;
  }
  return 'unknown';
}

function detectTailwind(signals) {
  const classes = (signals.classNameSample || []).filter(c => typeof c === 'string');
  const hits = classes.filter(c => TAILWIND_UTIL.test(c));
  if (hits.length < Math.max(5, classes.length * 0.1)) return null;
  const utilFreq = new Map();
  for (const c of hits) {
    for (const u of c.split(/\s+/).filter(Boolean)) {
      utilFreq.set(u, (utilFreq.get(u) || 0) + 1);
    }
  }
  const topUtilities = [...utilFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100).map(([u, n]) => ({ utility: u, count: n }));
  return { detected: true, utilities: topUtilities };
}

function detectAnalytics(signals) {
  const found = [];
  for (const [name, re] of Object.entries(ANALYTICS)) {
    if ((signals.scripts || []).some(s => re.test(s))) found.push(name);
  }
  return found;
}

export function extractStackFingerprint(signals = {}) {
  const framework = detectFramework(signals);
  const tailwind = detectTailwind(signals);
  const css = { layer: tailwind ? 'tailwind' : 'unknown', tailwind: tailwind || null };
  return {
    framework,
    css,
    analytics: detectAnalytics(signals),
    detectedFrom: {
      globalCount: (signals.windowGlobals || []).length,
      scriptCount: (signals.scripts || []).length,
      classSampleSize: (signals.classNameSample || []).length,
    },
  };
}
```

- [ ] **Step 5: Wire into index.js**

In `src/index.js` add import + `design.stack = safeExtract(extractStackFingerprint, rawData.light.stack) || { framework: 'unknown', css: { layer: 'unknown' } };`

- [ ] **Step 6: Run full tests + smoke**

```bash
node --test tests/*.test.js
node bin/design-extract.js https://vercel.com -o /tmp/dl-stack
node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/dl-stack/vercel-com-design-tokens.json'))?.$metadata || 'n/a')"
```
Expected: tests pass; extraction completes.

- [ ] **Step 7: Commit**

```bash
git add src/extractors/stack-fingerprint.js src/crawler.js src/index.js tests/extractors.test.js
git commit -m "feat(extractors): add stack-fingerprint for framework + Tailwind detection"
```

### Task 2.2: `css-health` extractor

**Files:**
- Create: `src/extractors/css-health.js`
- Modify: `src/crawler.js` (start/stop CSS coverage, capture stylesheet text)
- Test: extend `tests/extractors.test.js`

Computes: specificity distribution, `!important` count, duplicate declarations, unused bytes (from Coverage API), `@keyframes` catalog (name, steps, duration, easing), vendor-prefix flags.

- [ ] **Step 1: Extend crawler with CSS coverage**

In `src/crawler.js` before `page.goto`: `await page.coverage.startCSSCoverage();`
After page settles: `const cssCoverage = await page.coverage.stopCSSCoverage();`
Serialize: `{ coverage: cssCoverage.map(c => ({ url: c.url, text: c.text, totalBytes: c.text.length, ranges: c.ranges })) }` into `rawData.light.cssCoverage`.

- [ ] **Step 2: Write failing tests**

Minimal unit tests operating on a fake coverage payload:

```js
import { extractCssHealth } from '../src/extractors/css-health.js';

describe('extractCssHealth', () => {
  const payload = [{
    url: 'https://x.com/a.css',
    text: '.a{color:red}.a{color:red}.b{color:blue !important}.c-webkit-foo{color:x}@keyframes fade{0%{opacity:0}100%{opacity:1}}',
    totalBytes: 1000,
    ranges: [{ start: 0, end: 400 }], // 60% unused
  }];

  it('counts !important', () => {
    const r = extractCssHealth(payload);
    assert.equal(r.importantCount, 1);
  });

  it('counts duplicate declarations', () => {
    const r = extractCssHealth(payload);
    assert.ok(r.duplicates >= 1);
  });

  it('reports unused bytes', () => {
    const r = extractCssHealth(payload);
    assert.equal(r.unusedBytes, 600);
    assert.equal(r.usedBytes, 400);
  });

  it('catalogs keyframes', () => {
    const r = extractCssHealth(payload);
    assert.ok(r.keyframes.some(k => k.name === 'fade'));
  });
});
```

- [ ] **Step 3: Run → fail**

- [ ] **Step 4: Implement**

`src/extractors/css-health.js`: parse text with regex (good enough without a CSS AST dep).
- `!important`: `/!important/g` count.
- Duplicates: tokenize `selector { declarations }` and count identical `prop:value` pairs occurring ≥2x per sheet.
- Unused bytes: `totalBytes − sum(range.end − range.start)`.
- Keyframes: `/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g`; steps count = number of `%` blocks inside.
- Vendor-prefix audit: count `-webkit-`, `-moz-`, `-ms-`, `-o-` occurrences.
- Specificity: for top N selectors, compute `[a,b,c]` triple (ids, classes/attr/pseudo, type).

Output shape:
```js
{
  sheets: [{ url, totalBytes, usedBytes, unusedBytes, unusedPercent }],
  usedBytes, unusedBytes, totalBytes,
  importantCount, duplicates,
  vendorPrefixes: { webkit, moz, ms, o },
  keyframes: [{ name, steps, duration?, easing? }],
  specificity: { max:[a,b,c], average:[a,b,c], distribution: [...] },
  issues: ['3 !important rules','2 duplicate declarations', ...],
}
```

- [ ] **Step 5: Wire into index.js + scoring**

In `src/index.js`:  `design.cssHealth = safeExtract(extractCssHealth, rawData.light.cssCoverage) || null;`

In `src/extractors/scoring.js` add dimensions `cssHealth` (based on unusedPercent + duplicates + !important count), keep existing dimension keys intact (backward compat).

- [ ] **Step 6: Run tests + smoke**

- [ ] **Step 7: Commit**

```bash
git add src/extractors/css-health.js src/extractors/scoring.js src/crawler.js src/index.js tests/extractors.test.js
git commit -m "feat(extractors): CSS health audit (specificity, !important, unused, keyframes)"
```

### Task 2.3: `a11y-remediation` extractor

**Files:**
- Create: `src/extractors/a11y-remediation.js`
- Modify: `src/extractors/accessibility.js` (export `contrastRatio`, `parseColor` if not already; or re-implement locally)
- Test: extend `tests/extractors.test.js`

For every failing fg/bg pair, search the extracted palette for the color minimizing ΔE (or simpler: closest in sRGB) that passes AA (4.5:1 for normal, 3:1 for large) or AAA (7:1 / 4.5:1).

- [ ] **Step 1: Write failing tests**

```js
import { remediateFailingPairs } from '../src/extractors/a11y-remediation.js';

describe('remediateFailingPairs', () => {
  it('suggests a palette color that passes AA', () => {
    const failing = [{ fg: '#777777', bg: '#ffffff', ratio: 3.5, rule: 'AA-normal' }];
    const palette = ['#000000', '#222222', '#555555', '#cccccc'];
    const out = remediateFailingPairs(failing, palette);
    assert.equal(out.length, 1);
    assert.ok(out[0].suggestion);
    assert.ok(out[0].suggestion.newRatio >= 4.5);
  });

  it('returns null suggestion when no palette color passes', () => {
    const failing = [{ fg: '#eee', bg: '#fff', ratio: 1.1, rule: 'AA-normal' }];
    const palette = ['#dedede'];
    const out = remediateFailingPairs(failing, palette);
    assert.equal(out[0].suggestion, null);
  });
});
```

- [ ] **Step 2: Run → fail**

- [ ] **Step 3: Implement**

Helpers (contrastRatio + relativeLuminance): standard WCAG formulas; short enough to inline here.

```js
function toRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relLum([r, g, b]) {
  const f = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a, b) {
  const la = relLum(toRgb(a));
  const lb = relLum(toRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const THRESHOLDS = { 'AA-normal': 4.5, 'AA-large': 3, 'AAA-normal': 7, 'AAA-large': 4.5 };

export function remediateFailingPairs(failing = [], palette = []) {
  return failing.map(p => {
    const target = THRESHOLDS[p.rule] || 4.5;
    // Try replacing fg first (typical), then bg.
    let best = null;
    for (const candidate of palette) {
      const newRatio = contrast(candidate, p.bg);
      if (newRatio >= target && (!best || newRatio > best.newRatio)) {
        best = { replace: 'fg', color: candidate, newRatio: Math.round(newRatio * 100) / 100 };
      }
    }
    return { ...p, suggestion: best };
  });
}

export { contrast as _contrast };
```

- [ ] **Step 4: Run → pass**

- [ ] **Step 5: Wire into index.js**

After `extractAccessibility`, call `remediateFailingPairs(design.accessibility.failingPairs, design.colors.all || [])` and attach as `design.accessibility.remediation`.

- [ ] **Step 6: Commit**

```bash
git add src/extractors/a11y-remediation.js src/index.js tests/extractors.test.js
git commit -m "feat(a11y): remediation suggestions — nearest palette color passing WCAG"
```

### Task 2.4: `semantic-regions` extractor

**Files:**
- Create: `src/extractors/semantic-regions.js`
- Modify: `src/crawler.js` (serialize landmark + heading + bounding info)
- Test: extend `tests/extractors.test.js`

Classifier: start with landmark role (`nav`, `main`, `header`, `footer`, `aside`). For non-landmark sections, use heuristics:
- `hero` — first `<section>` above the fold with a heading + CTA button.
- `pricing` — contains ≥3 repeated "card" subtrees and the words "price"/"/mo"/"per month" (regex on text).
- `testimonials` — repeated subtrees + `<blockquote>` or word "customer"/"said"/"testimonial".
- `cta` — section with 1–2 buttons and short copy.
- `features` — repeated icon+heading+paragraph subtrees.
- Fallback `content`.

- [ ] **Step 1: Extend crawler to capture sections**

In `page.evaluate()`:
```js
sections: Array.from(document.querySelectorAll('header, nav, main, section, footer, aside, [role="banner"], [role="contentinfo"], [role="complementary"], [role="navigation"]')).map(el => {
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role') || '',
    className: el.className || '',
    id: el.id || '',
    text: (el.innerText || '').slice(0, 2000),
    headings: Array.from(el.querySelectorAll('h1,h2,h3')).slice(0, 5).map(h => h.innerText || ''),
    buttonCount: el.querySelectorAll('button, a[role="button"], .btn, [class*="button"]').length,
    cardCount: el.querySelectorAll('article, li, [class*="card"], [class*="item"]').length,
    bounds: { x: r.x, y: r.y, w: r.width, h: r.height },
  };
})
```

- [ ] **Step 2: Write failing tests**

```js
import { extractSemanticRegions } from '../src/extractors/semantic-regions.js';

describe('extractSemanticRegions', () => {
  it('labels header as nav', () => {
    const out = extractSemanticRegions([{ tag:'header', role:'', className:'', id:'', text:'Home About', headings:[], buttonCount:3, cardCount:0, bounds:{x:0,y:0,w:1280,h:80} }]);
    assert.equal(out[0].role, 'nav');
  });

  it('labels section with CTA + heading as hero', () => {
    const out = extractSemanticRegions([{ tag:'section', role:'', className:'hero', id:'', text:'Welcome', headings:['Build better'], buttonCount:2, cardCount:0, bounds:{x:0,y:80,w:1280,h:600} }]);
    assert.equal(out[0].role, 'hero');
  });

  it('labels pricing based on cards + keyword', () => {
    const out = extractSemanticRegions([{ tag:'section', role:'', className:'', id:'', text:'Basic $9/mo Pro $29/mo Team $99/mo', headings:['Pricing'], buttonCount:3, cardCount:3, bounds:{x:0,y:0,w:1280,h:400} }]);
    assert.equal(out[0].role, 'pricing');
  });
});
```

- [ ] **Step 3: Run → fail**

- [ ] **Step 4: Implement**

```js
const KW = {
  pricing: /\b(\$\s*\d|per\s?month|\/mo\b|pricing|free|billed)/i,
  testimonials: /(customer|review|testimonial|said|“|”)/i,
  features: /(feature|benefit|why|what you get)/i,
  cta: /(get started|sign up|try free|start now|request demo|contact sales)/i,
};

function classify(s) {
  const role = (s.role || '').toLowerCase();
  const tag = (s.tag || '').toLowerCase();
  if (tag === 'nav' || role === 'navigation') return 'nav';
  if (tag === 'header' || role === 'banner') return 'nav';
  if (tag === 'footer' || role === 'contentinfo') return 'footer';
  if (tag === 'aside' || role === 'complementary') return 'sidebar';

  const cls = (s.className || '').toLowerCase();
  const id = (s.id || '').toLowerCase();
  const blob = `${cls} ${id}`;
  if (/hero/.test(blob)) return 'hero';
  if (/pricing/.test(blob) || KW.pricing.test(s.text)) return s.cardCount >= 2 ? 'pricing' : 'pricing';
  if (/testimonial|review/.test(blob) || KW.testimonials.test(s.text)) return 'testimonials';
  if (/features?|grid/.test(blob) && s.cardCount >= 3) return 'features';
  if (KW.features.test(s.text) && s.cardCount >= 3) return 'features';
  if (s.buttonCount <= 2 && s.headings.length && s.text.length < 400 && KW.cta.test(s.text)) return 'cta';
  if (s.headings.length === 1 && s.buttonCount >= 1 && s.bounds.h > 300) return 'hero';
  return 'content';
}

export function extractSemanticRegions(sections = []) {
  return sections.map(s => ({
    role: classify(s),
    tag: s.tag,
    bounds: s.bounds,
    heading: s.headings?.[0] || null,
    buttonCount: s.buttonCount,
    cardCount: s.cardCount,
    className: s.className || null,
  }));
}
```

- [ ] **Step 5: Wire into index.js** → `design.regions = safeExtract(extractSemanticRegions, rawData.light.sections) || [];`

- [ ] **Step 6: Commit**

```bash
git add src/extractors/semantic-regions.js src/crawler.js src/index.js tests/extractors.test.js
git commit -m "feat(extractors): semantic-regions classifier (nav/hero/pricing/footer/…)"
```

### Task 2.5: `component-clusters` extractor

**Files:**
- Create: `src/extractors/component-clusters.js`
- Modify: `src/crawler.js` (include DOM subtree hash signals per element)
- Test: extend `tests/extractors.test.js`

For each candidate element (buttons, cards, inputs, badges, tags) capture:
- `structuralHash` — `tag>child.tag>...` path string of first 2 levels.
- `styleVector` — ordered numeric encoding of computed-style subset (padding, bg, color, radius, border, fontSize, fontWeight).

Cluster by exact `structuralHash` + cosine similarity on `styleVector` > 0.95.

- [ ] **Step 1: Extend crawler candidates capture**

In `page.evaluate()` — augment the existing per-element serialization to include `structuralHash` and `styleVector` for buttons/links/inputs/cards.

- [ ] **Step 2: Write failing tests**

```js
import { clusterComponents } from '../src/extractors/component-clusters.js';

describe('clusterComponents', () => {
  it('collapses identical instances into one entry', () => {
    const els = Array.from({length:5}, () => ({ kind:'button', structuralHash:'button>span', styleVector:[16,8,0,0], css:{bg:'#f00'} }));
    const out = clusterComponents(els);
    assert.equal(out.length, 1);
    assert.equal(out[0].instanceCount, 5);
  });

  it('separates variants with different style vectors', () => {
    const els = [
      { kind:'button', structuralHash:'button>span', styleVector:[16,8,0,0], css:{bg:'#f00'} },
      { kind:'button', structuralHash:'button>span', styleVector:[16,8,0,0], css:{bg:'#f00'} },
      { kind:'button', structuralHash:'button>span', styleVector:[12,4,0,0], css:{bg:'#0f0'} },
    ];
    const out = clusterComponents(els);
    assert.equal(out.length, 2);
  });
});
```

- [ ] **Step 3: Run → fail**

- [ ] **Step 4: Implement**

```js
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export function clusterComponents(elements = [], { threshold = 0.95 } = {}) {
  const byKind = {};
  for (const el of elements) {
    const key = `${el.kind}|${el.structuralHash}`;
    (byKind[key] ||= []).push(el);
  }
  const out = [];
  for (const group of Object.values(byKind)) {
    const variants = [];
    for (const el of group) {
      const match = variants.find(v => cosine(v.example.styleVector, el.styleVector) >= threshold);
      if (match) { match.instanceCount++; }
      else { variants.push({ example: el, instanceCount: 1 }); }
    }
    out.push({
      kind: group[0].kind,
      structuralHash: group[0].structuralHash,
      instanceCount: group.length,
      variants: variants.map(v => ({ css: v.example.css, instanceCount: v.instanceCount })),
    });
  }
  return out;
}
```

- [ ] **Step 5: Wire into index.js**

`design.componentClusters = safeExtract(clusterComponents, rawData.light.componentCandidates) || [];`

- [ ] **Step 6: Update markdown formatter** in `src/formatters/markdown.js` — if `design.componentClusters.length`, render each as "Button — N instances, K variants" with CSS for each variant. Keep existing `components` section for back-compat until v8.

- [ ] **Step 7: Commit**

```bash
git add src/extractors/component-clusters.js src/crawler.js src/index.js src/formatters/markdown.js tests/extractors.test.js
git commit -m "feat(extractors): reusable component clustering with variant detection"
```

---

## Chunk 3: Platform emitters

Each emitter reads the **DTCG semantic layer** from `formatDtcgTokens(design)` (never the raw primitive layer directly) to stay consistent across platforms.

### Task 3.1: `ios-swiftui.js` emitter

**Files:** Create `src/formatters/ios-swiftui.js`; test in `tests/formatters.test.js`.

- [ ] **Step 1: Write failing tests**

```js
import { formatIosSwiftUI } from '../src/formatters/ios-swiftui.js';

it('emits SwiftUI Color extensions from tokens', () => {
  const tokens = { primitive: { color: { brand: { primary: { $value:'#3b82f6', $type:'color' } } } }, semantic: { color: { action: { primary: { $value:'{primitive.color.brand.primary}', $type:'color' } } } } };
  const out = formatIosSwiftUI(tokens);
  assert.match(out, /extension Color/);
  assert.match(out, /actionPrimary/);
  assert.match(out, /0x3b82f6/i);
});
```

- [ ] **Step 2: Implement**

Resolve `{primitive.x.y}` references; emit:
```
import SwiftUI
extension Color {
  static let actionPrimary = Color(hex: 0x3B82F6)
  ...
}
extension CGFloat {
  static let spacingS0: CGFloat = 4
  ...
}
```
Include a small `init(hex: UInt32)` helper at top.

- [ ] **Step 3: Run + commit**

```bash
git add src/formatters/ios-swiftui.js tests/formatters.test.js
git commit -m "feat(formatters): iOS SwiftUI emitter from DTCG semantic tokens"
```

### Task 3.2: `android-compose.js` emitter

Same pattern — produce `Theme.kt` with `val ActionPrimary = Color(0xFF3B82F6)` and `dimens.xml` + `colors.xml` files. Tests: assert key tokens present.

- [ ] Write tests → fail → implement → pass → commit: `feat(formatters): Android Compose emitter`

### Task 3.3: `flutter-dart.js` emitter

Produce `theme.dart` with a `class DesignTokens { static const Color actionPrimary = Color(0xFF3B82F6); ... }` and a `ThemeData buildTheme()` helper.

- [ ] Write tests → fail → implement → pass → commit: `feat(formatters): Flutter Dart emitter`

### Task 3.4: WordPress block theme (extend existing `wordpress.js`)

Existing file likely only emits tokens. Extend to a full skeleton.

**Files:** Modify `src/formatters/wordpress.js`.

Output is a directory, not a single file. Export a function returning:
```js
{
  'theme.json': '<string>',
  'style.css': '<string>',
  'functions.php': '<string>',
  'index.php': '<string>',
  'templates/index.html': '<string>',
}
```

Caller writes each file under `<out>/wordpress-theme/`. `theme.json` follows block-editor schema: `{ version: 3, settings: { color: { palette: [...] }, typography: { fontSizes: [...], fontFamilies: [...] }, spacing: { spacingSizes: [...] } } }`.

- [ ] Write tests (assert `theme.json` parses and has `settings.color.palette` with extracted colors; `style.css` header contains `Theme Name`)
- [ ] Implement → pass → commit: `feat(formatters): WordPress block theme skeleton with theme.json`

### Task 3.5: Wire `--platforms` dispatcher

**Files:** `src/index.js`, `bin/design-extract.js`.

- [ ] Add CLI flag `--platforms <csv>` default `web`.
- [ ] In `src/index.js` write-out phase: based on flag, call each platform emitter and write files under `<out>/<platform>/…` (or flat with suffix).
- [ ] Smoke: `designlang https://stripe.com --platforms all -o /tmp/dl-all && ls /tmp/dl-all`
- [ ] Commit: `feat: --platforms dispatcher for web/ios/android/flutter/wordpress`

---

## Chunk 4: Agent-facing layer

### Task 4.1: `agent-rules.js` emitter

**Files:** Create `src/formatters/agent-rules.js`; test in `tests/formatters.test.js`.

Produces three strings (+ file-tree descriptor): `cursor.mdc`, `claude-skill.md`, `agents.md`, `claude-md-fragment.md`. All four read the same DTCG tokens + regions + components and template them into prose.

- [ ] Write tests (assert each output contains `semantic.color.action.primary`, the source URL, and a "how to use" section).
- [ ] Implement (use template literals; no frontmatter libs needed).
- [ ] Wire flag `--emit-agent-rules` in bin; in `src/index.js` write files to `<out>/.cursor/rules/designlang.mdc`, `<out>/.claude/skills/designlang/SKILL.md`, `<out>/CLAUDE.md.fragment`, `<out>/agents.md`.
- [ ] Commit: `feat: agent rules emitter for Cursor, Claude Code, generic agents`

### Task 4.2: MCP server

**Files:**
- Create: `src/mcp/server.js`, `src/mcp/resources.js`, `src/mcp/tools.js`.
- Modify: `bin/design-extract.js` (add `mcp` subcommand).
- Test: `tests/mcp.test.js` (new).

Server reads the most recent extraction from `--output-dir` (or auto-discover latest in `./design-extract-output`), and exposes:

**Resources:**
- `designlang://tokens/primitive`
- `designlang://tokens/semantic`
- `designlang://regions`
- `designlang://components`
- `designlang://health`

**Tools:**
- `search_tokens({ query })` — substring/fuzzy over semantic+primitive names.
- `find_nearest_color({ hex, level })` — reuses `remediateFailingPairs` engine.
- `get_region({ name })` — returns a region entry.
- `get_component({ name, variant? })` — returns a cluster entry.
- `list_failing_contrast_pairs()` — returns `design.accessibility.remediation`.

- [ ] **Step 1: Write tests**

Test at the pure-logic layer (pass a fake design object into `resources.js`/`tools.js` and assert outputs). Do not start a real MCP server in CI.

```js
import { buildResources } from '../src/mcp/resources.js';
import { buildTools } from '../src/mcp/tools.js';

const fakeDesign = { /* minimal shape */ };
const tokensDtcg = { primitive: { color: { brand: { primary: { $value: '#3b82f6', $type: 'color' } } } }, semantic: { color: { action: { primary: { $value: '{primitive.color.brand.primary}', $type: 'color' } } } } };

it('resources.list includes tokens + regions', () => {
  const r = buildResources({ design: fakeDesign, tokens: tokensDtcg });
  assert.ok(r.list().find(x => x.uri === 'designlang://tokens/semantic'));
});

it('search_tokens finds semantic token', async () => {
  const t = buildTools({ design: fakeDesign, tokens: tokensDtcg });
  const result = await t.call('search_tokens', { query: 'primary' });
  assert.ok(JSON.stringify(result).includes('action.primary'));
});
```

- [ ] **Step 2: Implement**

`src/mcp/server.js` wires `@modelcontextprotocol/sdk/server/index.js` + stdio transport; delegates to `resources.js` and `tools.js` (keep transport glue thin).

- [ ] **Step 3: Add `mcp` subcommand** in `bin/design-extract.js`:

```js
program
  .command('mcp')
  .description('Launch designlang MCP server over stdio')
  .option('--output-dir <path>', 'Source extraction directory', './design-extract-output')
  .action(async (opts) => { await (await import('../src/mcp/server.js')).run(opts); });
```

- [ ] **Step 4: Manual smoke**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' | node bin/design-extract.js mcp --output-dir ./design-extract-output
```
Expected: MCP initialize response over stdout.

- [ ] **Step 5: Commit**

```bash
git add src/mcp/ bin/design-extract.js tests/mcp.test.js
git commit -m "feat(mcp): stdio MCP server exposing tokens/regions/components/tools"
```

---

## Chunk 5: Docs, changelog, release

### Task 5.1: Update README

**Files:** `README.md`.

- [ ] Add sections under "What Makes This Different":
  - 17. MCP Server (example `.cursor/rules` snippet)
  - 18. Multi-platform (iOS/Android/Flutter/WordPress) with one-line examples
  - 19. Stack Fingerprint + Tailwind mode
  - 20. CSS Health Audit
  - 21. A11y Remediation
- [ ] Update "All Features" table with new flags + command.
- [ ] Update CLI reference block.
- [ ] Commit: `docs(readme): v7 features — MCP, platforms, health, remediation, regions`

### Task 5.2: Write CHANGELOG

**Files:** Create `CHANGELOG.md`.

Include:
- Breaking: token JSON now DTCG format. Migration: pass `--tokens-legacy` or upgrade consumers.
- Additions: all 10 features listed with flag or command.
- Full migration snippet (before/after token shape).

- [ ] Commit: `docs: CHANGELOG for v7.0`

### Task 5.3: Version bump + tag + publish

- [ ] **Step 1: Bump version**

```bash
npm version 7.0.0 --no-git-tag-version
```
(creates/updates version; no auto-commit so we control the commit message.)

- [ ] **Step 2: Final verification (human-in-the-loop)**

```bash
npm test
node bin/design-extract.js https://vercel.com --platforms all --emit-agent-rules -o /tmp/dl-release-smoke
ls -R /tmp/dl-release-smoke | head -40
```
Expected: tests pass, smoke generates web + iOS + Android + Flutter + WordPress outputs + agent rules.

- [ ] **Step 3: Commit version bump**

```bash
git add package.json package-lock.json
git commit -m "chore(release): v7.0.0"
git tag v7.0.0
```

- [ ] **Step 4: Publish to npm** (REQUIRES USER APPROVAL — interactive)

```bash
npm publish --access public
```
If `npm whoami` fails, prompt user to run `npm login` first. Do not use `--no-verify` or skip 2FA.

- [ ] **Step 5: Push tags**

```bash
git push && git push --tags
```

---

## Deferred (out of scope for v7.0)

- Bidirectional Figma Variables sync
- Full JSX/Vue/Svelte component codegen
- Versioned auto-published npm token package
- Hosted shareable reports
- Website revamp + "Try it free" backend service
- CMS content-model extraction
- Storybook/Chromatic integration

## Skills referenced

- @superpowers:test-driven-development — every feature task is test-first
- @superpowers:verification-before-completion — run full suite + smoke before marking a task complete
- @superpowers:using-git-worktrees — consider a worktree if doing multiple features in parallel
