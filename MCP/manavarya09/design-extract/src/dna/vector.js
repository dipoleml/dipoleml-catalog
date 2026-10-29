// designlang DNA — the vector.
//
// Turns the raw measurements from features.js into a fixed-length, ordered
// vector of 0..1 numbers, so two designs can be compared as points rather
// than as prose.
//
// Two rules make the numbers mean something:
//
//   1. FEATURE_ORDER and NORMALIZERS are FROZEN per VECTOR_VERSION. A score
//      published today has to mean the same thing next year, so changing a
//      range or reordering a feature is a version bump, never an edit.
//   2. A missing measurement stays `null` all the way through. Distance skips
//      null pairs rather than substituting a midpoint, because an invented
//      0.5 is indistinguishable from a real one and would quietly move a site
//      in the space.

export const VECTOR_VERSION = 1;

// Map a raw measurement onto 0..1 across the range real design systems
// actually occupy. Ranges are deliberately generous at the top so unusual
// sites saturate rather than distort.
const span = (lo, hi) => v => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
const identity = v => Math.max(0, Math.min(1, v));

// [axis, feature key, normalizer] — the frozen definition of the space.
const SPEC = [
  ['color', 'chromaMean', identity],
  ['color', 'chromaMax', identity],
  ['color', 'hueCount', span(0, 6)],
  ['color', 'hueSpread', identity],
  ['color', 'neutralTemp', span(0, 0.15)],
  ['color', 'surfaceLevels', span(1, 6)],
  ['color', 'surfaceLightness', identity],
  ['color', 'accentDelta', identity],

  ['type', 'scaleRatio', span(1, 1.8)],
  ['type', 'scaleRegularity', identity],
  ['type', 'displayContrast', span(1, 6)],
  ['type', 'bodyLineHeight', span(1, 2)],
  ['type', 'weightRange', span(0, 700)],
  ['type', 'familyCount', span(1, 4)],

  ['space', 'baseUnit', span(2, 16)],
  ['space', 'rampRegularity', identity],
  ['space', 'scaleDepth', span(2, 12)],
  ['space', 'scaleSpread', span(1, 16)],

  ['shape', 'radiusMedian', span(0, 32)],
  ['shape', 'radiusVariance', span(0, 16)],
  ['shape', 'pillRate', identity],
  ['shape', 'borderWeight', span(0, 4)],
  ['shape', 'shadowSoftness', identity],
  ['shape', 'elevationLevels', span(1, 5)],

  ['motion', 'durationMedian', span(0, 800)],
  ['motion', 'durationSpread', span(0, 800)],
  ['motion', 'springiness', identity],
  ['motion', 'easeOutShare', identity],
  ['motion', 'linearShare', identity],
  ['motion', 'scrollLinked', identity],
];

export const FEATURE_ORDER = Object.freeze(SPEC.map(([axis, key]) => `${axis}.${key}`));

export const AXES = Object.freeze(['color', 'type', 'space', 'shape', 'motion']);

// Index ranges per axis, so distance can report per-axis without re-deriving.
export const AXIS_INDICES = Object.freeze(Object.fromEntries(
  AXES.map(axis => [axis, SPEC.reduce((acc, [a], i) => (a === axis ? [...acc, i] : acc), [])]),
));

import { rawFeatures } from './features.js';

export function designVector(design) {
  const raw = rawFeatures(design || {});
  const values = SPEC.map(([axis, key, normalize]) => {
    const v = raw[axis][key];
    return Number.isFinite(v) ? normalize(v) : null;
  });

  return {
    version: VECTOR_VERSION,
    url: (design && design.meta && design.meta.url) || null,
    order: FEATURE_ORDER,
    values,
    raw,
    // How much of the space this design actually filled in. A vector built
    // from a third of the features is not comparable to a complete one, and
    // the report says so instead of pretending.
    coverage: values.filter(v => v !== null).length / values.length,
  };
}
