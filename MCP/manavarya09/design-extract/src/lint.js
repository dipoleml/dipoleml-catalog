// designlang lint — audit a local token file for the same issues scoring flags on live sites.
// Supports DTCG, flat design-tokens.json, Tailwind config (partial), and CSS variable files.

import { readFileSync } from 'fs';
import { extname } from 'path';

function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function relLum({ r, g, b }) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a, b) {
  const la = relLum(a), lb = relLum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function flattenDtcg(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (k.startsWith('$')) continue;
    if (v && typeof v === 'object') {
      if ('$value' in v) {
        out.push({ name: prefix ? `${prefix}.${k}` : k, value: v.$value, type: v.$type });
      } else {
        flattenDtcg(v, prefix ? `${prefix}.${k}` : k, out);
      }
    }
  }
  return out;
}

function loadTokens(file) {
  const raw = readFileSync(file, 'utf8');
  const ext = extname(file);
  if (ext === '.json') {
    const json = JSON.parse(raw);
    const flat = flattenDtcg(json);
    if (flat.length) return flat;
    // flat fallback: { colors: { primary: '#000' }, ... }
    const out = [];
    for (const [group, entries] of Object.entries(json)) {
      if (!entries || typeof entries !== 'object') continue;
      for (const [k, v] of Object.entries(entries)) {
        out.push({ name: `${group}.${k}`, value: String(v), type: group.replace(/s$/, '') });
      }
    }
    return out;
  }
  if (ext === '.css') {
    const out = [];
    for (const m of raw.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
      out.push({ name: m[1], value: m[2].trim(), type: 'unknown' });
    }
    return out;
  }
  throw new Error(`Unsupported file type: ${ext}. Use .json or .css.`);
}

function isColor(t) { return t.type === 'color' || /^#[\da-f]{3,8}$/i.test(t.value) || /^rgb/i.test(t.value); }
function toHex(v) {
  const m = v.match(/^#([a-f\d]{3,8})$/i);
  if (m) {
    const h = m[1];
    if (h.length === 3) return '#' + h.split('').map(c => c + c).join('');
    return '#' + h.slice(0, 6);
  }
  const rgb = v.match(/rgba?\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)/i);
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
  return null;
}

function dedupeClose(hexes, threshold = 8) {
  const near = [];
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      const a = hexToRgb(hexes[i].value), b = hexToRgb(hexes[j].value);
      if (!a || !b) continue;
      const dist = Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
      if (dist > 0 && dist < threshold) near.push({ a: hexes[i].name, b: hexes[j].name, distance: Math.round(dist) });
    }
  }
  return near;
}

function parsePx(v) {
  const m = String(v).match(/^(-?\d*\.?\d+)px$/);
  return m ? parseFloat(m[1]) : null;
}

function checkScale(values, label) {
  const nums = values.map(parsePx).filter(n => n !== null && n >= 0).sort((a, b) => a - b);
  if (nums.length < 3) return null;
  const gaps = [];
  for (let i = 1; i < nums.length; i++) gaps.push(nums[i] - nums[i - 1]);
  // Heuristic: ratio wildly inconsistent?
  const ratios = [];
  for (let i = 1; i < nums.length; i++) if (nums[i - 1] > 0) ratios.push(nums[i] / nums[i - 1]);
  const avg = ratios.reduce((s, r) => s + r, 0) / (ratios.length || 1);
  const variance = ratios.reduce((s, r) => s + (r - avg) ** 2, 0) / (ratios.length || 1);
  return { label, count: nums.length, values: nums, avgRatio: +avg.toFixed(2), variance: +variance.toFixed(3) };
}

export function lintTokens(file) {
  const tokens = loadTokens(file);
  const findings = [];
  const scorecard = {};

  const colors = tokens.filter(isColor).map(t => ({ name: t.name, value: toHex(t.value) || t.value })).filter(t => /^#[\da-f]{6}$/i.test(t.value));
  const neighbors = dedupeClose(colors);
  if (neighbors.length) {
    findings.push({
      severity: 'warn',
      rule: 'color-sprawl',
      message: `${neighbors.length} near-duplicate color pair(s) within 8 RGB units`,
      detail: neighbors.slice(0, 5),
    });
  }
  scorecard.colorDiscipline = Math.max(0, 100 - neighbors.length * 8);

  const spacing = tokens.filter(t => /spacing|space|gap|size/i.test(t.name));
  const spaceCheck = checkScale(spacing.map(t => t.value), 'spacing');
  if (spaceCheck && spaceCheck.variance > 0.25) {
    findings.push({
      severity: 'warn',
      rule: 'spacing-scale-inconsistent',
      message: `Spacing scale ratios vary (variance ${spaceCheck.variance}). Consider a consistent ratio (1.5x, 2x).`,
      detail: spaceCheck,
    });
  }
  scorecard.spacingSystem = spaceCheck ? Math.max(30, 100 - Math.round(spaceCheck.variance * 200)) : 50;

  const radii = tokens.filter(t => /radius|radii/i.test(t.name));
  if (radii.length > 8) {
    findings.push({
      severity: 'warn',
      rule: 'radius-sprawl',
      message: `${radii.length} radius tokens — consider collapsing to 4-6.`,
    });
  }
  scorecard.borderRadii = Math.max(30, 100 - Math.max(0, radii.length - 6) * 10);

  const shadows = tokens.filter(t => /shadow|elevation/i.test(t.name));
  if (shadows.length > 10) {
    findings.push({
      severity: 'info',
      rule: 'shadow-sprawl',
      message: `${shadows.length} shadow tokens — rarely need more than 6 elevation levels.`,
    });
  }
  scorecard.shadows = Math.max(30, 100 - Math.max(0, shadows.length - 6) * 8);

  // Contrast: try to find text/bg pairs by name.
  const palette = colors;
  const bgs = palette.filter(c => /bg|background|surface/i.test(c.name));
  const fgs = palette.filter(c => /fg|text|foreground|ink|label/i.test(c.name));
  const contrastFails = [];
  for (const fg of fgs) {
    for (const bg of bgs) {
      const fgRgb = hexToRgb(fg.value), bgRgb = hexToRgb(bg.value);
      if (!fgRgb || !bgRgb) continue;
      const c = contrast(fgRgb, bgRgb);
      if (c < 4.5) contrastFails.push({ fg: fg.name, bg: bg.name, ratio: +c.toFixed(2) });
    }
  }
  if (contrastFails.length) {
    findings.push({
      severity: 'error',
      rule: 'contrast-wcag-aa',
      message: `${contrastFails.length} fg/bg pair(s) fail WCAG AA (4.5:1)`,
      detail: contrastFails.slice(0, 10),
    });
  }
  scorecard.accessibility = contrastFails.length ? Math.max(20, 100 - contrastFails.length * 12) : 100;

  const avg = Math.round(Object.values(scorecard).reduce((s, v) => s + v, 0) / Object.keys(scorecard).length);
  const grade = avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : 'F';

  return {
    file,
    tokenCount: tokens.length,
    score: avg,
    grade,
    scorecard,
    findings,
    stats: {
      colors: colors.length,
      spacing: spacing.length,
      radii: radii.length,
      shadows: shadows.length,
    },
  };
}
