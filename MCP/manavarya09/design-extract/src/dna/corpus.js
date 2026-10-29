// designlang DNA — the corpus and percentiles.
//
// A vector on its own says nothing. "Radius 0.31" is only meaningful next to
// what real design systems do, and that reference frame is the corpus: a
// versioned set of vectors extracted from known systems.
//
// The corpus is pinned to VECTOR_VERSION. Comparing a vector against a corpus
// built by different rules would produce a confident, wrong number, so that
// mismatch throws rather than degrading.

import { FEATURE_ORDER, AXES, AXIS_INDICES, VECTOR_VERSION } from './vector.js';

export function buildCorpus(vectors, { name = 'default' } = {}) {
  const usable = vectors.filter(v => v && v.version === VECTOR_VERSION);

  // Per feature, the sorted list of values the corpus actually observed.
  // Nulls are dropped rather than counted, so a feature only a third of the
  // corpus measured still ranks against that third honestly.
  const columns = FEATURE_ORDER.map((_, i) =>
    usable.map(v => v.values[i]).filter(x => x !== null).sort((a, b) => a - b));

  return {
    version: VECTOR_VERSION,
    name,
    size: usable.length,
    entries: usable.map(v => ({ url: v.url, values: v.values })),
    columns,
  };
}

// Share of the corpus this value sits at or above. Ties count as half, so a
// value identical to every corpus entry lands mid-scale instead of at 1.
function rank(value, sorted) {
  if (!sorted.length) return null;
  let below = 0, equal = 0;
  for (const x of sorted) {
    if (x < value) below++;
    else if (x === value) equal++;
  }
  return (below + equal / 2) / sorted.length;
}

export function percentiles(vector, corpus) {
  if (!corpus || corpus.version !== vector.version) {
    throw new Error(
      `DNA corpus version mismatch: vector v${vector.version}, corpus v${corpus && corpus.version}. `
      + 'Rebuild the corpus before comparing.',
    );
  }

  const features = {};
  vector.values.forEach((value, i) => {
    features[FEATURE_ORDER[i]] = value === null ? null : rank(value, corpus.columns[i]);
  });

  // An axis percentile is the mean of the feature percentiles that exist —
  // "your colour system sits at the 12th percentile" is the sentence people
  // actually want out of this.
  const axes = {};
  for (const axis of AXES) {
    const vals = AXIS_INDICES[axis]
      .map(i => features[FEATURE_ORDER[i]])
      .filter(x => x !== null);
    axes[axis] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  return { features, axes, corpus: { name: corpus.name, size: corpus.size } };
}

// The features where this design sits furthest from the middle of the corpus —
// the honest answer to "what makes this look the way it does?"
export function outliers(vector, corpus, { limit = 5 } = {}) {
  const { features } = percentiles(vector, corpus);
  return Object.entries(features)
    .filter(([, p]) => p !== null)
    .map(([feature, p]) => ({ feature, percentile: p, deviation: Math.abs(p - 0.5) }))
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, limit);
}
