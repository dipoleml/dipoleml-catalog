// Motion fidelity — score how faithfully a clone reproduces the ORIGINAL's
// motion language. `verify` deliberately ignores motion (it can't show up in a
// static crop); this is the half that does.
//
// Inputs are two `extractMotion()` outputs (original, clone) plus optional
// choreography sequences from `detectChoreography()`. Everything here is a pure
// function over that data — no browser, no I/O — so it tests offline.
//
// The score is a weighted blend of seven aspects. Each aspect returns a 0..1
// sub-score, its weight, and a human-readable `gap` that the correction planner
// turns into an actionable fix. A missing-on-the-clone motion is the dominant
// signal; an over-animated clone (motion the original never had) is penalised
// more gently — wrong, but less wrong than a dead, static rebuild.

// ── feel adjacency ──────────────────────────────────────────────
// extractMotion().feel ∈ springy | responsive | smooth | mechanical | mixed.
// Neighbours read as "close enough" (half credit); opposites score zero.
const FEEL_NEIGHBORS = {
  springy: ['responsive'],
  responsive: ['springy', 'smooth'],
  smooth: ['responsive', 'mechanical'],
  mechanical: ['smooth'],
  mixed: ['responsive', 'smooth'],
};

function scoreFeel(a, b) {
  if (!a && !b) return 1;
  if (a === b) return 1;
  if (FEEL_NEIGHBORS[a]?.includes(b)) return 0.5;
  return 0;
}

// ── numeric set closeness ───────────────────────────────────────
// For each original value, find the nearest clone value and score by relative
// closeness (a 200ms vs 220ms transition is nearly right; 200ms vs 20ms is not).
function nearest(value, pool) {
  let best = Infinity;
  for (const p of pool) best = Math.min(best, Math.abs(p - value));
  return best;
}

function durationCloseness(originalMs, cloneMs) {
  if (!originalMs.length && !cloneMs.length) return 1;
  if (!originalMs.length) return 0.7; // clone invented motion timing; mild penalty
  if (!cloneMs.length) return 0; // original moves, clone is frozen — the worst case
  let sum = 0;
  for (const ms of originalMs) {
    const d = nearest(ms, cloneMs);
    // tolerance scales with the duration: ±25% reads as a match.
    const tol = Math.max(40, ms * 0.25);
    sum += Math.max(0, 1 - d / (tol * 4));
  }
  return sum / originalMs.length;
}

// ── distribution similarity (easing families) ───────────────────
function shareVector(easings) {
  const total = easings.reduce((s, e) => s + (e.count || 1), 0) || 1;
  const v = {};
  for (const e of easings) v[e.family] = (v[e.family] || 0) + (e.count || 1) / total;
  return v;
}

function distributionSimilarity(a, b) {
  const families = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (!families.size) return 1;
  let l1 = 0;
  for (const f of families) l1 += Math.abs((a[f] || 0) - (b[f] || 0));
  return Math.max(0, 1 - l1 / 2); // L1 over two distributions ∈ [0,2]
}

// ── multiset overlap (keyframe kinds) ───────────────────────────
function kindCounts(keyframes) {
  const c = {};
  for (const kf of keyframes) {
    if (kf.used === false) continue; // only motion that actually plays
    c[kf.kind] = (c[kf.kind] || 0) + 1;
  }
  return c;
}

function multisetOverlap(a, b) {
  const kinds = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (!kinds.size) return 1;
  let inter = 0, union = 0;
  for (const k of kinds) {
    inter += Math.min(a[k] || 0, b[k] || 0);
    union += Math.max(a[k] || 0, b[k] || 0);
  }
  return union ? inter / union : 1;
}

// ── presence parity ─────────────────────────────────────────────
// Both-present or both-absent = match. Missing on the clone is penalised
// fully; present-only-on-clone (over-animation) keeps partial credit.
function presenceParity(originalHas, cloneHas) {
  if (originalHas === cloneHas) return 1;
  return originalHas && !cloneHas ? 0 : 0.6;
}

const ASPECT_WEIGHTS = {
  feel: 2,
  durations: 2,
  easings: 2,
  springs: 1.5,
  keyframes: 1.5,
  scrollLinked: 1,
  choreography: 1,
};

function staggerScore(orig, clone) {
  const oHas = orig.length > 0;
  const cHas = clone.length > 0;
  if (!oHas && !cHas) return 1;
  if (oHas && !cHas) return 0;
  if (!oHas && cHas) return 0.6;
  // Both stagger — compare the dominant stagger step timing.
  const oStep = orig[0].staggerMs || 0;
  const cStep = clone[0].staggerMs || 0;
  const tol = Math.max(20, oStep * 0.4);
  return Math.max(0, 1 - Math.abs(oStep - cStep) / (tol * 4));
}

/**
 * Score motion fidelity of a clone against an original.
 * @param {object} original  extractMotion() output for the source site
 * @param {object} clone      extractMotion() output for the rebuilt clone
 * @param {object} [opts]     { originalChoreography, cloneChoreography }
 * @returns {{ score:number, aspects:Array, feel:{original,clone} }}
 */
export function scoreMotionFidelity(original = {}, clone = {}, opts = {}) {
  const o = normalize(original);
  const c = normalize(clone);
  const oChoreo = opts.originalChoreography || [];
  const cChoreo = opts.cloneChoreography || [];

  const aspects = [
    {
      aspect: 'feel',
      score: scoreFeel(o.feel, c.feel),
      original: o.feel, clone: c.feel,
      gap: o.feel !== c.feel ? `feels ${c.feel}, original feels ${o.feel}` : null,
    },
    {
      aspect: 'durations',
      score: durationCloseness(o.durMs, c.durMs),
      original: o.durMs, clone: c.durMs,
      gap: o.durMs.length && !c.durMs.length ? 'clone has no transitions/animations — original is in motion' : null,
    },
    {
      aspect: 'easings',
      score: distributionSimilarity(shareVector(o.easings), shareVector(c.easings)),
      original: o.easings.map(e => e.family), clone: c.easings.map(e => e.family),
      gap: easingGap(o.easings, c.easings),
    },
    {
      aspect: 'springs',
      score: presenceParity(o.springs.length > 0, c.springs.length > 0),
      original: o.springs.length, clone: c.springs.length,
      gap: o.springs.length && !c.springs.length ? 'original uses spring/overshoot easing the clone is missing' : null,
    },
    {
      aspect: 'keyframes',
      score: multisetOverlap(kindCounts(o.keyframes), kindCounts(c.keyframes)),
      original: Object.keys(kindCounts(o.keyframes)), clone: Object.keys(kindCounts(c.keyframes)),
      gap: keyframeGap(kindCounts(o.keyframes), kindCounts(c.keyframes)),
    },
    {
      aspect: 'scrollLinked',
      score: presenceParity(o.scrollLinked, c.scrollLinked),
      original: o.scrollLinked, clone: c.scrollLinked,
      gap: o.scrollLinked && !c.scrollLinked ? 'original drives scroll/view-timeline motion the clone lacks' : null,
    },
    {
      aspect: 'choreography',
      score: staggerScore(oChoreo, cChoreo),
      original: oChoreo.length, clone: cChoreo.length,
      gap: oChoreo.length && !cChoreo.length ? 'original staggers a sequence the clone animates flat' : null,
    },
  ].map(a => ({ ...a, weight: ASPECT_WEIGHTS[a.aspect] }));

  const totalWeight = aspects.reduce((s, a) => s + a.weight, 0);
  const score = Math.round(100 * aspects.reduce((s, a) => s + a.weight * a.score, 0) / totalWeight);

  return { score, aspects, feel: { original: o.feel, clone: c.feel } };
}

function easingGap(o, c) {
  const oFam = new Set(o.map(e => e.family));
  const cFam = new Set(c.map(e => e.family));
  const missing = [...oFam].filter(f => !cFam.has(f));
  return missing.length ? `clone is missing easing families: ${missing.join(', ')}` : null;
}

function keyframeGap(o, c) {
  const missing = Object.keys(o).filter(k => !c[k]);
  return missing.length ? `clone is missing keyframe motion: ${missing.join(', ')}` : null;
}

function normalize(m) {
  return {
    feel: m.feel || (m.durations?.length || m.easings?.length ? 'mixed' : null),
    durMs: (m.durations || []).map(d => (typeof d === 'number' ? d : d.ms)).filter(n => n > 0),
    easings: m.easings || [],
    springs: m.springs || [],
    keyframes: m.keyframes || [],
    scrollLinked: !!(m.scrollLinked?.present),
  };
}
