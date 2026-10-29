// Open Props (https://open-props.style) custom properties from an extraction.
// Names follow the library's own: --brand-N, --size-N, --font-sans,
// --radius-N, --shadow-N, so the file drops into an Open Props project.

const FALLBACK = {
  sans: 'system-ui, sans-serif',
  serif: 'serif',
  mono: 'ui-monospace, monospace',
};

// Names and values come from the page being extracted, so they are untrusted:
// a stray `;`, `}` or `/*` would break out of the declaration.
const SAFE_FONT_NAME = /^[\w .-]+$/;
// Allowlists check short tokens against anchored patterns with no nested
// quantifiers, and cap the input first, so hostile input can't backtrack.
const MAX_VALUE_LENGTH = 300;
const HEX_RE = /^#[0-9a-f]{3,8}$/i;
const COLOR_FN_RE = /^(?:rgb|hsl)a?\([\d\s.,%/-]{1,60}\)$/i;
const KEYWORD_RE = /^[a-z]{3,30}$/i;
const LENGTH_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%)?$/;

const isColor = (t) => HEX_RE.test(t) || COLOR_FN_RE.test(t) || KEYWORD_RE.test(t);

// Split on commas and spaces that are not inside parentheses.
function tokens(value) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')' && --depth < 0) return null;
    if (depth === 0 && (ch === ' ' || ch === ',')) {
      if (cur) out.push(cur);
      if (ch === ',') out.push(',');
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return depth === 0 ? out : null;
}

function safeColor(v) {
  if (typeof v !== 'string' || v.length > MAX_VALUE_LENGTH) return null;
  const t = v.trim();
  return isColor(t) ? t : null;
}

function safeShadow(v) {
  if (typeof v !== 'string' || v.length > MAX_VALUE_LENGTH) return null;
  const t = v.trim();
  const parts = tokens(t);
  if (!parts || !parts.length || parts[0] === ',' || parts[parts.length - 1] === ',') return null;
  const ok = parts.every((p) => p === ',' || p.toLowerCase() === 'inset' || LENGTH_RE.test(p) || isColor(p));
  return ok ? t : null;
}

function fontStack(name, kind) {
  if (typeof name !== 'string' || !SAFE_FONT_NAME.test(name)) return null;
  const quoted = /\s/.test(name) ? `'${name}'` : name;
  return `${quoted}, ${FALLBACK[kind]}`;
}


export function formatOpenProps(design) {
  const colors = design.colors || {};
  const vars = [];
  const add = (name, value) => { if (value != null && value !== '') vars.push(`    --${name}: ${value};`); };
  const section = (title) => { if (vars.length) vars.push(''); vars.push(`    /* ${title} */`); };

  const brand = [colors.primary, colors.secondary, colors.accent].filter(Boolean);
  if (brand.length) {
    section('Brand');
    brand.forEach((c, i) => add(`brand-${i + 1}`, safeColor(c.hex)));
  }

  const gray = (colors.neutrals || []).slice(0, 10);
  if (gray.length) {
    section('Neutrals');
    gray.forEach((c, i) => add(`gray-${i}`, safeColor(c.hex)));
  }

  const fonts = design.typography?.families || [];
  if (fonts.length) {
    section('Typography');
    const used = new Set();
    for (const f of fonts) {
      const kind = /mono|code/i.test(f.name) ? 'mono' : /serif/i.test(f.name) && !/sans/i.test(f.name) ? 'serif' : 'sans';
      const stack = fontStack(f.name, kind);
      if (!stack || used.has(kind)) continue;
      used.add(kind);
      add(`font-${kind}`, stack);
    }
  }

  const spacing = (design.spacing?.scale || []).slice(0, 15);
  if (spacing.length) {
    section('Spacing');
    spacing.forEach((px, i) => add(`size-${i + 1}`, `${px}px`));
  }

  const radii = (design.borders?.radii || []).filter((r) => typeof r.value === 'number');
  if (radii.length) {
    section('Radius');
    radii.forEach((r, i) => add(`radius-${i + 1}`, `${r.value}px`));
  }

  const shadows = design.shadows?.values || [];
  if (shadows.length) {
    section('Shadows');
    shadows.slice(0, 6).forEach((s, i) => add(`shadow-${i + 1}`, safeShadow(s.raw)));
  }

  return ['@layer base {', '  :root {', ...vars, '  }', '}', ''].join('\n');
}
