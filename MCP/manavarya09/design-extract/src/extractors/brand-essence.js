// designlang brand-essence — synthesize a brand's personality from the
// already-extracted design language.
//
// Pure function, no browser. Given the assembled `design` object it returns
// an `essence`: four personality axes, the nearest of twelve Jungian
// archetypes, a handful of adjectives, a one-line positioning statement, and
// the evidence behind every call. Every number traces back to a real
// extracted value — no LLM, no vibes. Missing inputs degrade to neutral.
//
// Mirrors the pure-synthesizer pattern of dark-mode-pair.js: design in,
// derived object out, attached to `design.essence`.

// ── Colour helpers ─────────────────────────────────────────────

function hexToRgb(hex) {
  if (!hex) return null;
  const s = String(hex).trim().replace(/^#/, '');
  const full = s.length === 3 ? s.split('').map(c => c + c).join('') : s.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }) {
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
      case gN: h = (bN - rN) / d + 2; break;
      default: h = (rN - gN) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s, l };
}

function relLum(rgb) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}

function contrastRatio(a, b) {
  const la = relLum(a), lb = relLum(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const clamp = (n, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, n));
const round2 = n => Math.round(n * 100) / 100;

// Average the components that actually had data; null if none did.
function meanPresent(parts) {
  const vals = parts.filter(p => p != null && Number.isFinite(p));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ── Signal readers ─────────────────────────────────────────────

function familyName(f) {
  if (!f) return '';
  if (typeof f === 'string') return f;
  return f.name || f.family || '';
}

function brandColors(design) {
  const c = design.colors || {};
  return [c.primary, c.secondary, c.accent]
    .map(x => (x && x.hex) ? hexToRgb(x.hex) : null)
    .filter(Boolean);
}

// Hue of the first chromatic brand colour (0..360), or null if all grey.
function brandHue(design) {
  for (const rgb of brandColors(design)) {
    const { h, s } = rgbToHsl(rgb);
    if (s > 0.15) return h;
  }
  return null;
}

// Mean saturation (0..1) of chromatic brand colours.
function brandSaturation(design) {
  const sats = brandColors(design).map(rgb => rgbToHsl(rgb).s).filter(s => s > 0.05);
  return sats.length ? sats.reduce((a, b) => a + b, 0) / sats.length : null;
}

function medianRadius(design) {
  const radii = (design.borders?.radii || [])
    .map(r => (typeof r === 'object' ? r.value : r))
    .filter(n => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (!radii.length) return null;
  return radii[Math.floor(radii.length / 2)];
}

function medianDurationMs(design) {
  const ms = (design.motion?.durations || [])
    .map(d => (typeof d === 'number' ? d : (d?.ms ?? parseDuration(d?.value ?? d))))
    .filter(n => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (!ms.length) return null;
  return ms[Math.floor(ms.length / 2)];
}

function parseDuration(v) {
  if (typeof v !== 'string') return NaN;
  const m = v.match(/([\d.]+)\s*(ms|s)?/);
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  return m[2] === 's' ? n * 1000 : n;
}

function maxFontWeight(design) {
  const ws = (design.typography?.weights || [])
    .map(w => (typeof w === 'object' ? (w.weight ?? w.value) : w))
    .map(w => parseInt(w, 10))
    .filter(n => Number.isFinite(n) && n >= 100);
  return ws.length ? Math.max(...ws) : null;
}

function hasBounce(design) {
  const m = design.motion || {};
  const feel = String(m.feel || '').toLowerCase();
  if (/bounc|playful|spring|elastic|snappy/.test(feel)) return true;
  if (m.spring) return true;
  const eases = (m.easings || []).map(e => String(typeof e === 'string' ? e : (e?.value || e?.label || '')).toLowerCase());
  return eases.some(e => /spring|bounce|elastic|back|overshoot/.test(e));
}

// Classify the display typeface: 'serif' | 'sans' | 'mono' | null.
function typefaceClass(design) {
  const name = familyName((design.typography?.families || [])[0]).toLowerCase();
  if (!name) return null;
  if (/mono|consol|courier|jetbrains|space mono|plex mono|fira code|menlo/.test(name)) return 'mono';
  if (/serif|georgia|times|playfair|garamond|merriweather|\blora\b|freight|tiempos|canela|cardo|spectral|recoleta/.test(name)) return 'serif';
  return 'sans';
}

function materialEra(design) {
  const label = String(design.materialLanguage?.label || '').toLowerCase();
  if (!label) return null;
  if (/glass|aurora|gradient|holograph|neumorph|frosted/.test(label)) return 0.8;
  if (/flat|minimal|clean|swiss/.test(label)) return 0.2;
  if (/material/.test(label)) return 0.3;
  if (/skeuomorph|textured|emboss/.test(label)) return -0.3;
  if (/editorial|print|classic|vintage|retro|brutal/.test(label)) return -0.8;
  return null;
}

function lightestBg(design) {
  const bgs = (design.colors?.backgrounds || []).map(hexToRgb).filter(Boolean);
  if (!bgs.length) return { r: 255, g: 255, b: 255 };
  return bgs.reduce((best, rgb) => relLum(rgb) > relLum(best) ? rgb : best, bgs[0]);
}

// ── Axes ───────────────────────────────────────────────────────

function computeAxes(design) {
  const hue = brandHue(design);
  const sat = brandSaturation(design);
  const primaryHex = design.colors?.primary?.hex || design.colors?.accent?.hex || null;

  // warmth — hue position, dampened by saturation so greys stay neutral.
  let warmth = 0, warmthReading = 'no chromatic brand colour — neutral temperature';
  if (hue != null) {
    const raw = Math.cos((hue - 40) * Math.PI / 180);
    warmth = clamp(raw * Math.min(1, (sat || 0) * 1.5));
    warmthReading = `${primaryHex || 'brand hue'} at ${hue}° reads ${warmth >= 0 ? 'warm' : 'cool'}`;
  }

  // energy — tempo, roundness, saturation, bounce.
  const ms = medianDurationMs(design);
  const radius = medianRadius(design);
  const energy = meanPresent([
    ms != null ? clamp((350 - ms) / 250) : null,            // fast → +
    radius != null ? clamp((radius - 12) / 12) : null,       // round → +
    sat != null ? clamp(sat * 2 - 1) : null,                 // saturated → +
    hasBounce(design) ? 0.6 : null,
  ]) ?? 0;
  const energyReading = [
    radius != null && `${radius}px median radius`,
    ms != null && `${ms}ms median motion`,
    hasBounce(design) && 'springy easing',
  ].filter(Boolean).join(', ') || 'little motion or shape signal';

  // weight — type weight, brand/surface contrast, saturation.
  const maxW = maxFontWeight(design);
  const ratio = primaryHex ? contrastRatio(hexToRgb(primaryHex), lightestBg(design)) : null;
  const weight = meanPresent([
    maxW != null ? clamp((maxW - 600) / 200) : null,
    ratio != null ? clamp((Math.min(ratio, 12) - 4) / 4) : null,
    sat != null ? clamp(sat * 2 - 1) : null,
  ]) ?? 0;
  const weightReading = [
    maxW != null && `heaviest weight ${maxW}`,
    ratio != null && `${ratio.toFixed(1)}:1 brand contrast`,
  ].filter(Boolean).join(', ') || 'no strong assertiveness signal';

  // era — typeface class + material language.
  const tc = typefaceClass(design);
  const tcVal = tc === 'serif' ? -0.7 : tc === 'mono' ? 0.8 : tc === 'sans' ? 0.4 : null;
  const era = meanPresent([tcVal, materialEra(design)]) ?? 0;
  const eraReading = [
    tc && `${tc} display face`,
    design.materialLanguage?.label && `${design.materialLanguage.label} material`,
  ].filter(Boolean).join(', ') || 'no typeface or material signal';

  return {
    warmth: { value: round2(warmth), reading: warmthReading },
    energy: { value: round2(energy), reading: energyReading },
    weight: { value: round2(weight), reading: weightReading },
    era: { value: round2(era), reading: eraReading },
  };
}

// ── Archetypes ─────────────────────────────────────────────────

// [warmth, energy, weight, era] canonical fingerprints + signature words.
const ARCHETYPES = [
  { name: 'Innocent', fp: [0.4, 0.2, -0.4, -0.2], words: ['optimistic', 'pure'] },
  { name: 'Everyman', fp: [0.2, -0.1, -0.3, -0.1], words: ['approachable', 'grounded'] },
  { name: 'Hero', fp: [0.2, 0.4, 0.8, 0.1], words: ['courageous', 'driven'] },
  { name: 'Outlaw', fp: [-0.1, 0.5, 0.9, 0.4], words: ['rebellious', 'raw'] },
  { name: 'Explorer', fp: [-0.1, 0.3, 0.2, 0.3], words: ['adventurous', 'independent'] },
  { name: 'Creator', fp: [0.3, 0.4, 0.4, 0.6], words: ['imaginative', 'expressive'] },
  { name: 'Ruler', fp: [-0.2, -0.3, 0.7, -0.1], words: ['authoritative', 'premium'] },
  { name: 'Magician', fp: [-0.2, 0.4, 0.3, 0.7], words: ['visionary', 'transformative'] },
  { name: 'Lover', fp: [0.9, 0.1, 0.3, -0.2], words: ['sensual', 'refined'] },
  { name: 'Caregiver', fp: [0.6, -0.2, -0.2, -0.2], words: ['nurturing', 'reassuring'] },
  { name: 'Jester', fp: [0.7, 0.9, 0.2, 0.3], words: ['fun', 'irreverent'] },
  { name: 'Sage', fp: [-0.3, -0.6, -0.2, 0.1], words: ['thoughtful', 'knowledgeable'] },
];

function dist(a, b) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

function pickArchetype(axes) {
  const fp = [axes.warmth.value, axes.energy.value, axes.weight.value, axes.era.value];
  const ranked = ARCHETYPES
    .map(a => ({ a, d: dist(fp, a.fp) }))
    .sort((x, y) => x.d - y.d);
  const top = ranked[0];
  return {
    name: top.a.name,
    confidence: round2(clamp(1 - top.d / 2.5, 0, 1)),
    runnerUp: ranked[1].a.name,
    words: top.a.words,
  };
}

// ── Adjectives & copy ──────────────────────────────────────────

const POLES = {
  warmth: { pos: 'warm', neg: 'cool' },
  energy: { pos: 'kinetic', neg: 'composed' },
  weight: { pos: 'bold', neg: 'understated' },
  era: { pos: 'modern', neg: 'timeless' },
};

function pickAdjectives(axes, archetype) {
  const out = [];
  // Strongest-leaning axes first.
  const ordered = Object.entries(axes).sort((a, b) => Math.abs(b[1].value) - Math.abs(a[1].value));
  for (const [key, axis] of ordered) {
    if (Math.abs(axis.value) >= 0.25) out.push(axis.value > 0 ? POLES[key].pos : POLES[key].neg);
  }
  for (const w of archetype.words) {
    if (out.length >= 5) break;
    if (!out.includes(w)) out.push(w);
  }
  return out.slice(0, 5);
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function hostOf(design) {
  const url = design.meta?.url;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return String(url || 'This brand'); }
}

function buildPositioning(design, axes, archetype, adjectives) {
  const host = hostOf(design);
  const adjList = adjectives.length >= 2
    ? `${adjectives.slice(0, -1).join(', ')} and ${adjectives[adjectives.length - 1]}`
    : (adjectives[0] || 'distinctive');
  const primary = design.colors?.primary?.hex || design.colors?.accent?.hex;
  const display = familyName((design.typography?.families || [])[0]);
  const feel = design.motion?.feel;

  let anchor = '';
  if (primary && display) anchor = `anchored on ${primary} and ${display}`;
  else if (primary) anchor = `anchored on ${primary}`;
  else if (display) anchor = `anchored on ${display}`;
  const motion = feel ? `${anchor ? '' : 'with '}${feel} motion` : '';

  const art = articleFor(archetype.name);
  const tailParts = [anchor, motion].filter(Boolean);
  const tail = tailParts.length ? ` — ${tailParts.join(', ')}.` : '.';
  return `${host} is ${art} ${archetype.name} brand — ${adjList}${tail}`;
}

function buildEvidence(axes, archetype) {
  const ordered = Object.entries(axes)
    .filter(([, a]) => Math.abs(a.value) >= 0.15)
    .sort((a, b) => Math.abs(b[1].value) - Math.abs(a[1].value))
    .slice(0, 3);
  const lines = ordered.map(([key, a]) => {
    const pole = a.value > 0 ? POLES[key].pos : POLES[key].neg;
    return `${a.reading} → ${pole} (${key} ${a.value > 0 ? '+' : ''}${a.value})`;
  });
  lines.push(`Axis fingerprint nearest the ${archetype.name} archetype (${Math.round(archetype.confidence * 100)}% fit, vs ${archetype.runnerUp}).`);
  return lines;
}

// ── Public API ─────────────────────────────────────────────────

export function deriveBrandEssence(design) {
  const d = design || {};
  const axes = computeAxes(d);
  const archetype = pickArchetype(axes);
  const adjectives = pickAdjectives(axes, archetype);
  const positioning = buildPositioning(d, axes, archetype, adjectives);
  const evidence = buildEvidence(axes, archetype);
  return {
    axes,
    archetype: { name: archetype.name, confidence: archetype.confidence, runnerUp: archetype.runnerUp },
    adjectives,
    positioning,
    evidence,
  };
}

export default deriveBrandEssence;
