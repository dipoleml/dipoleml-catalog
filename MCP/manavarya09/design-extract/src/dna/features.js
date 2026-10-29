// designlang DNA — the feature readers.
//
// Pure functions. Given the assembled `design` object they return raw,
// human-meaningful measurements (px, ms, ratios, shares) grouped by axis.
// Normalization into 0..1 happens in vector.js, so the numbers here stay
// readable in reports and debuggable by eye.
//
// A reader returns `null` when the input it needs was never extracted —
// never a guessed value. Missing data must stay visibly missing, because a
// distance computed against an invented number is a lie.

// ── shared helpers ─────────────────────────────────────────────

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
  return { h: h * 360, s, l };
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb) : null;
}

// The extractors emit HSL with s/l as 0-100 integers (src/utils.js), while
// anything derived from a hex here is already 0-1. Both shapes reach these
// readers, so saturation and lightness are coerced to fractions on the way in.
// Without this the colour features silently mix units and every distance
// involving them is wrong.
function asFractionHsl(hsl) {
  if (!hsl) return null;
  const { h, s, l } = hsl;
  if (!Number.isFinite(s) || !Number.isFinite(l)) return null;
  const percentScale = s > 1 || l > 1;
  return { h, s: percentScale ? s / 100 : s, l: percentScale ? l / 100 : l };
}

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function stdev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
}

// A colour counts as chromatic once it carries enough saturation to read as a
// hue rather than as a tinted grey.
const CHROMATIC_S = 0.12;

// ── colour ─────────────────────────────────────────────────────

export function colorFeatures(design) {
  const c = design.colors || {};
  const all = (Array.isArray(c.all) ? c.all : [])
    .map(x => asFractionHsl(x && x.hsl ? x.hsl : hexToHsl(x && x.hex)))
    .filter(Boolean);
  const named = [c.primary, c.secondary, c.accent]
    .filter(Boolean)
    .map(x => asFractionHsl(x.hsl || hexToHsl(x.hex)))
    .filter(Boolean);
  const pool = all.length ? all : named;

  const backgrounds = (Array.isArray(c.backgrounds) ? c.backgrounds : [])
    .map(x => asFractionHsl(hexToHsl(x)))
    .filter(Boolean);
  const neutrals = (Array.isArray(c.neutrals) ? c.neutrals : [])
    .map(x => asFractionHsl(x.hsl || hexToHsl(x.hex)))
    .filter(Boolean);

  const chromatic = pool.filter(x => x.s > CHROMATIC_S);

  // Hue spread as circular dispersion: 1 - the mean resultant length. One hue
  // (or none) is not spread out, so it reads 0.
  let hueSpread = null;
  if (chromatic.length) {
    if (chromatic.length < 2) {
      hueSpread = 0;
    } else {
      const rad = chromatic.map(x => (x.h * Math.PI) / 180);
      const cx = mean(rad.map(Math.cos));
      const cy = mean(rad.map(Math.sin));
      hueSpread = 1 - Math.sqrt(cx * cx + cy * cy);
    }
  }

  const bgLightness = backgrounds.length ? mean(backgrounds.map(x => x.l)) : null;
  const primary = named[0] || null;

  return {
    chromaMean: pool.length ? (chromatic.length ? mean(chromatic.map(x => x.s)) : 0) : null,
    chromaMax: pool.length ? Math.max(0, ...pool.map(x => x.s)) : null,
    hueCount: pool.length ? new Set(chromatic.map(x => Math.floor(x.h / 30) % 12)).size : null,
    hueSpread,
    neutralTemp: neutrals.length ? mean(neutrals.map(x => x.s)) : null,
    surfaceLevels: backgrounds.length
      ? new Set(backgrounds.map(x => Math.round(x.l * 20))).size
      : null,
    surfaceLightness: bgLightness,
    accentDelta: primary && bgLightness != null ? Math.abs(primary.l - bgLightness) : null,
  };
}

// ── typography ─────────────────────────────────────────────────

// Line-height reaches us as a computed CSS value: a px length, a unitless
// ratio, or the keyword `normal`. Only the first two are measurable — `normal`
// resolves differently per font, so it stays null rather than becoming a guess.
function lineHeightRatio(raw, size) {
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  const isLength = typeof raw === 'string' ? /px$/.test(raw.trim()) : n > 4;
  if (!isLength) return n;
  return Number.isFinite(size) && size > 0 ? n / size : null;
}

export function typeFeatures(design) {
  const t = design.typography || {};
  const scale = (Array.isArray(t.scale) ? t.scale : []).filter(s => s && s.size > 0);
  const sizes = [...new Set(scale.map(s => s.size))].sort((a, b) => a - b);
  // Font weights arrive as CSS strings ('400') as often as numbers.
  const weights = (Array.isArray(t.weights) ? t.weights : [])
    .map(w => Number(typeof w === 'object' && w !== null ? w.weight : w))
    .filter(Number.isFinite);
  const families = Array.isArray(t.families) ? t.families : [];

  // The type scale's ratio is the median step between adjacent sizes; how
  // tightly the steps agree with that median is the scale's regularity.
  let ratio = null, regularity = null;
  if (sizes.length >= 3) {
    const steps = [];
    for (let i = 1; i < sizes.length; i++) steps.push(sizes[i] / sizes[i - 1]);
    ratio = median(steps);
    regularity = 1 - Math.min(1, mean(steps.map(s => Math.abs(s - ratio) / ratio)));
  }

  const bodySize = (t.body && t.body.size) || (sizes.length ? median(sizes) : null);
  const lineHeights = scale.map(s => lineHeightRatio(s.lineHeight, s.size)).filter(Number.isFinite);
  const bodyLineHeight = (t.body ? lineHeightRatio(t.body.lineHeight, t.body.size) : null)
    ?? (lineHeights.length ? median(lineHeights) : null);

  return {
    scaleRatio: ratio,
    scaleRegularity: regularity,
    displayContrast: bodySize && sizes.length ? sizes[sizes.length - 1] / bodySize : null,
    bodyLineHeight,
    weightRange: weights.length ? Math.max(...weights) - Math.min(...weights) : null,
    familyCount: families.length || null,
  };
}

// ── space ──────────────────────────────────────────────────────

export function spaceFeatures(design) {
  const s = design.spacing || {};
  const scale = (Array.isArray(s.scale) ? s.scale : []).filter(v => Number.isFinite(v) && v > 0);
  const base = Number.isFinite(s.base) && s.base > 0 ? s.base : null;

  return {
    baseUnit: base,
    // How much of the spacing scale actually sits on the base unit — the
    // difference between a system and a pile of arbitrary paddings.
    rampRegularity: base && scale.length
      ? scale.filter(v => Math.abs(v / base - Math.round(v / base)) < 0.01).length / scale.length
      : null,
    scaleDepth: scale.length || null,
    scaleSpread: base && scale.length ? Math.max(...scale) / base : null,
  };
}

// ── shape ──────────────────────────────────────────────────────

// Radii at or above this are pills/circles, not corner rounding, and would
// otherwise drag the median to nonsense.
const PILL_PX = 100;

export function shapeFeatures(design) {
  const radii = (design.borders && Array.isArray(design.borders.radii) ? design.borders.radii : [])
    .map(r => (typeof r === 'number' ? r : r && r.value))
    .filter(Number.isFinite);
  const corners = radii.filter(v => v < PILL_PX);
  const widths = (design.borders && Array.isArray(design.borders.widths) ? design.borders.widths : [])
    .filter(Number.isFinite);
  const shadows = (design.shadows && Array.isArray(design.shadows.values) ? design.shadows.values : [])
    .filter(s => s && !s.inset);

  return {
    radiusMedian: corners.length ? median(corners) : (radii.length ? 0 : null),
    radiusVariance: corners.length ? stdev(corners) : (radii.length ? 0 : null),
    pillRate: radii.length ? radii.filter(v => v >= PILL_PX).length / radii.length : null,
    borderWeight: widths.length ? mean(widths) : null,
    // Softness is the share of a shadow's visual weight that is blur rather
    // than offset — a big soft halo vs. a hard drop.
    shadowSoftness: shadows.length
      ? mean(shadows.map(s => {
        const vw = Number.isFinite(s.visualWeight) && s.visualWeight > 0
          ? s.visualWeight
          : Math.hypot(s.offsetX || 0, s.offsetY || 0) + (s.blur || 0);
        return vw > 0 ? (s.blur || 0) / vw : 0;
      }))
      : null,
    elevationLevels: shadows.length
      ? new Set(shadows.map(s => s.label || Math.round(s.visualWeight || 0))).size
      : null,
  };
}

// ── motion ─────────────────────────────────────────────────────

export function motionFeatures(design) {
  const m = design.motion || {};
  const durations = (Array.isArray(m.durations) ? m.durations : [])
    .map(d => (typeof d === 'number' ? d : d && d.ms))
    .filter(v => Number.isFinite(v) && v > 0);
  const easings = Array.isArray(m.easings) ? m.easings : [];
  const totalUses = easings.reduce((sum, e) => sum + (e.count || 0), 0);
  const share = family => (totalUses
    ? easings.filter(e => e.family === family).reduce((sum, e) => sum + (e.count || 0), 0) / totalUses
    : null);

  const springs = Array.isArray(m.springs) ? m.springs : null;
  const scroll = m.scrollLinked;

  return {
    durationMedian: durations.length ? median(durations) : null,
    durationSpread: durations.length ? Math.max(...durations) - Math.min(...durations) : null,
    springiness: springs ? Math.min(1, springs.length / 3) : null,
    easeOutShare: easings.length ? (share('ease-out') ?? 0) : null,
    linearShare: easings.length ? (share('linear') ?? 0) : null,
    scrollLinked: scroll && typeof scroll.present === 'boolean' ? (scroll.present ? 1 : 0) : null,
  };
}

export function rawFeatures(design) {
  return {
    color: colorFeatures(design || {}),
    type: typeFeatures(design || {}),
    space: spaceFeatures(design || {}),
    shape: shapeFeatures(design || {}),
    motion: motionFeatures(design || {}),
  };
}
