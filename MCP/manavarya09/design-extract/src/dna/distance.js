// designlang DNA — distance.
//
// The whole point of the space is that "these two designs are similar" stops
// being an opinion. Distance here is deliberately plain: mean absolute
// difference across the features both designs actually have, reported per
// axis as well as overall.
//
// Mean-absolute rather than Euclidean because the output has to be readable —
// 0.31 means "the average feature is 31% of the range apart", which a person
// can reason about. Euclidean distance in 30 dimensions is a number nobody
// has intuition for.
//
// Every result carries `compared`: how many features backed it. A distance
// from four surviving features is not the same claim as one from thirty, and
// callers are given what they need to say so.

import { AXES, AXIS_INDICES } from './vector.js';

function meanAbs(a, b, indices) {
  let sum = 0, n = 0;
  for (const i of indices) {
    const x = a[i], y = b[i];
    if (x === null || y === null) continue;
    sum += Math.abs(x - y);
    n++;
  }
  return { distance: n ? sum / n : null, compared: n };
}

const ALL_INDICES = AXES.flatMap(axis => AXIS_INDICES[axis]);

export function designDistance(a, b) {
  const av = a.values, bv = b.values;

  const axes = {};
  for (const axis of AXES) axes[axis] = meanAbs(av, bv, AXIS_INDICES[axis]);

  const overall = meanAbs(av, bv, ALL_INDICES);

  return {
    overall: overall.distance,
    compared: overall.compared,
    comparable: overall.compared > 0,
    axes,
  };
}

// Rank a corpus by distance from `vector`, closest first. A corpus entry for
// the same URL is dropped — comparing a design to itself is never the answer
// anyone wanted, and it would otherwise always win.
export function nearest(vector, corpus, { limit = 5 } = {}) {
  return corpus
    .filter(c => !(vector.url && c.url === vector.url))
    .map(c => {
      const d = designDistance(vector, c);
      return { url: c.url, distance: d.overall, compared: d.compared, axes: d.axes };
    })
    .filter(r => r.distance !== null)
    .sort((x, y) => x.distance - y.distance)
    .slice(0, limit);
}
