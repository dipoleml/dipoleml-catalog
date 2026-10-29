// designlang theme-swap — recolour an extracted design around a new brand
// primary while preserving perceptual structure (lightness + chroma stay
// close, only hue shifts). Operates on the design object produced by
// extractDesignLanguage so every downstream emitter (DTCG, Tailwind,
// shadcn, Figma vars, CSS vars) inherits the change for free.

import { hexToOklch, oklchToHex } from './utils/color-gamut.js';

// Below this chroma we treat the colour as a neutral and leave it alone.
// Real-world brand palettes have chroma in the 0.05–0.30 range; pure
// greys sit under ~0.02. 0.04 is a defensible split that keeps body text,
// surfaces, and rule lines untouched while moving accents / brand inks.
const NEUTRAL_CHROMA_MAX = 0.04;

function normaliseHex(s) {
  if (typeof s !== 'string') return null;
  const t = s.trim().toLowerCase();
  if (!t) return null;
  const m = t.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!m) return null;
  let body = m[1];
  if (body.length === 3) body = body.split('').map(c => c + c).join('');
  return '#' + body;
}

function hueDelta(h0, h1) {
  // Shortest signed distance between two hues (-180..180).
  let d = h1 - h0;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function rotateHue(h, delta) {
  let r = h + delta;
  while (r < 0) r += 360;
  while (r >= 360) r -= 360;
  return r;
}

// Decide whether to recolour a given hex. We always preserve neutrals so
// body text, surfaces, and rule lines look the same. We optionally allow
// the caller to pin the lightness target (for the *primary* swap itself,
// where the user's `--primary` value should land exactly).
function recolourHex(hex, { hueShift, neutralKeep = true, target = null }) {
  const oklch = hexToOklch(hex);
  if (!oklch) return hex;
  if (target) {
    // Used for the primary itself — copy the target's L, C, h verbatim
    // so the user gets exactly the colour they asked for, not a rotation.
    return oklchToHex(target);
  }
  if (neutralKeep && oklch.C < NEUTRAL_CHROMA_MAX) return hex;
  return oklchToHex({ L: oklch.L, C: oklch.C, h: rotateHue(oklch.h, hueShift) });
}

// Detect the "primary" anchor we'll rotate the rest of the palette around.
// Order of preference:
//   1. design.colors.primary.hex (extractor's classification)
//   2. the most-used non-neutral colour in design.colors.all
//   3. fall back to the first non-neutral entry
function detectPrimary(design) {
  const fromExtractor = design?.colors?.primary?.hex;
  if (fromExtractor) {
    const norm = normaliseHex(fromExtractor);
    if (norm) return norm;
  }
  const all = (design?.colors?.all || []).filter(c => c?.hex && hexToOklch(c.hex));
  // Most-used coloured (non-neutral) value.
  const coloured = all
    .filter(c => {
      const o = hexToOklch(c.hex);
      return o && o.C >= NEUTRAL_CHROMA_MAX;
    })
    .sort((a, b) => (b.count || 0) - (a.count || 0));
  if (coloured.length) return normaliseHex(coloured[0].hex);
  if (all.length) return normaliseHex(all[0].hex);
  return null;
}

/**
 * Recolour an extracted design around a new brand primary.
 *
 * @param {object} design — the full design returned by extractDesignLanguage()
 * @param {object} opts
 * @param {string} opts.primary — target primary colour as hex (#rrggbb)
 * @param {boolean} [opts.preserveLightness=true]
 *   When true, the rotation only changes hue (default). When false, the
 *   target's lightness/chroma are also propagated to the rest of the
 *   palette — leaves a heavier brand stamp, often too aggressive.
 * @param {string|null} [opts.fromPrimary=null]
 *   Override the auto-detected source primary. Useful when the extractor
 *   misclassifies (e.g. a neutral got promoted by usage count).
 * @returns {object} { design, summary } — recoloured design plus a small
 *   summary of what changed (used by the formatter for the diff view).
 */
export function recolorDesign(design, opts = {}) {
  if (!design) throw new Error('recolorDesign: design is required');
  const targetHex = normaliseHex(opts.primary);
  if (!targetHex) {
    throw new Error(`recolorDesign: invalid --primary "${opts.primary}". Expected hex like "#ff4800".`);
  }

  const sourceHex = normaliseHex(opts.fromPrimary) || detectPrimary(design);
  if (!sourceHex) {
    throw new Error('recolorDesign: could not detect a source primary in the design (no coloured tokens found)');
  }

  const sourceOklch = hexToOklch(sourceHex);
  const targetOklch = hexToOklch(targetHex);
  if (!sourceOklch || !targetOklch) {
    throw new Error('recolorDesign: failed to parse source/target hex into OKLCH');
  }
  const hueShift = hueDelta(sourceOklch.h, targetOklch.h);

  // Walk the design and rebuild a recoloured copy. We mutate a deep clone
  // so the caller's original stays intact.
  const out = JSON.parse(JSON.stringify(design));
  const changes = [];
  const seen = new Set();
  function swap(hex, opts2 = {}) {
    const norm = normaliseHex(hex);
    if (!norm) return hex;
    const next = recolourHex(norm, { hueShift, ...opts2 });
    if (next !== norm && !seen.has(norm + '→' + next)) {
      seen.add(norm + '→' + next);
      changes.push({ from: norm, to: next });
    }
    return next;
  }

  // 1) The primary itself — pin to the user's target hex.
  if (out.colors?.primary?.hex) {
    out.colors.primary.hex = swap(out.colors.primary.hex, { target: targetOklch });
  }
  // 2) Secondary / accent — rotate by the hue delta.
  for (const k of ['secondary', 'accent']) {
    if (out.colors?.[k]?.hex) out.colors[k].hex = swap(out.colors[k].hex);
  }
  // 3) Every entry in colors.all (the canonical palette).
  if (Array.isArray(out.colors?.all)) {
    out.colors.all = out.colors.all.map(c => {
      if (!c?.hex) return c;
      // Pin the source primary slot to the target exactly so it shows up
      // verbatim in shadcn/Tailwind output.
      const isSourcePrimary = normaliseHex(c.hex) === sourceHex;
      return { ...c, hex: swap(c.hex, isSourcePrimary ? { target: targetOklch } : {}) };
    });
  }
  // 4) Neutrals — explicitly *don't* rotate. Surfaces, text, rule lines
  //    should stay readable. (We rely on neutralKeep inside swap().)
  if (Array.isArray(out.colors?.neutrals)) {
    out.colors.neutrals = out.colors.neutrals.map(c => c?.hex ? { ...c, hex: swap(c.hex) } : c);
  }
  // 5) Backgrounds + text — same neutral-preserving logic.
  if (Array.isArray(out.colors?.backgrounds)) {
    out.colors.backgrounds = out.colors.backgrounds.map(swap);
  }
  if (Array.isArray(out.colors?.text)) {
    out.colors.text = out.colors.text.map(swap);
  }
  // 6) Gradients — rebuild every stop.
  if (Array.isArray(out.colors?.gradients)) {
    out.colors.gradients = out.colors.gradients.map(g => {
      if (typeof g !== 'string') return g;
      return g.replace(/#[0-9a-fA-F]{3,6}\b/g, swap);
    });
  }
  if (out.gradients?.gradients && Array.isArray(out.gradients.gradients)) {
    out.gradients.gradients = out.gradients.gradients.map(g => {
      if (typeof g === 'string') return g.replace(/#[0-9a-fA-F]{3,6}\b/g, swap);
      if (g?.raw) return { ...g, raw: g.raw.replace(/#[0-9a-fA-F]{3,6}\b/g, swap) };
      return g;
    });
  }
  // 7) CSS variables — rotate any value that looks like a hex.
  if (out.variables && typeof out.variables === 'object') {
    for (const cat of Object.keys(out.variables)) {
      const obj = out.variables[cat];
      if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          if (typeof obj[k] === 'string') obj[k] = obj[k].replace(/#[0-9a-fA-F]{3,6}\b/g, swap);
        }
      }
    }
  }

  out.meta = {
    ...(out.meta || {}),
    themeSwap: {
      from: sourceHex,
      to: targetHex,
      hueShift: Math.round(hueShift * 100) / 100,
      changedColors: changes.length,
    },
  };

  return { design: out, summary: { from: sourceHex, to: targetHex, hueShift, changes } };
}
