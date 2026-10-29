// designlang pair — fuse two extracted designs across configurable axes.
//
// Picks each dimension from one source or the other so designers can run
// experiments like "Stripe colours × Linear typography × Vercel motion".
// Input: two full design objects from extractDesignLanguage(), an axis
// map, and an output URL/title for branding the fused result.
//
// We deep-clone source objects before merging so callers' originals stay
// intact. The fused design is structurally identical to a normal
// extraction so every downstream emitter (DTCG, Tailwind, shadcn,
// Figma, brand-book, pack) works on it untouched.

const AXES = ['colors', 'typography', 'spacing', 'shape', 'motion', 'voice', 'components'];

const DEFAULT_AXES = {
  colors:     'a',
  spacing:    'a',
  shape:      'a',
  motion:     'a',
  typography: 'b',
  voice:      'b',
  components: 'b',
};

function host(url) {
  try { return new URL(url).hostname; } catch { return String(url || ''); }
}

function clone(x) {
  return x == null ? x : JSON.parse(JSON.stringify(x));
}

// Normalise the user's --<axis>-from flags into a single { axis: 'a'|'b' }
// map. Anything they don't specify falls through to DEFAULT_AXES, which
// is calibrated for a clean "visual A × voice B" crossover.
function resolveAxes(opts = {}) {
  const out = { ...DEFAULT_AXES };
  for (const axis of AXES) {
    const flag = opts[`${axis}From`];
    if (flag === 'a' || flag === 'A') out[axis] = 'a';
    else if (flag === 'b' || flag === 'B') out[axis] = 'b';
  }
  return out;
}

/**
 * Fuse two extracted designs along configurable axes.
 *
 * @param {object} a — design from extractDesignLanguage(urlA)
 * @param {object} b — design from extractDesignLanguage(urlB)
 * @param {object} opts
 * @param {'a'|'b'} [opts.colorsFrom='a']
 * @param {'a'|'b'} [opts.typographyFrom='b']
 * @param {'a'|'b'} [opts.spacingFrom='a']
 * @param {'a'|'b'} [opts.shapeFrom='a']
 * @param {'a'|'b'} [opts.motionFrom='a']
 * @param {'a'|'b'} [opts.voiceFrom='b']
 * @param {'a'|'b'} [opts.componentsFrom='b']
 * @returns {object} { design, summary }
 */
export function fuseDesigns(a, b, opts = {}) {
  if (!a || !b) throw new Error('fuseDesigns: both designs are required');
  const axes = resolveAxes(opts);
  const pick = (axis, sliceA, sliceB) => clone(axes[axis] === 'a' ? sliceA : sliceB);
  const src = (axis) => axes[axis] === 'a' ? a : b;

  // Start from a deep clone of A so meta-fields (e.g. raw crawler output)
  // have a sensible default. Downstream emitters lean heavily on .meta.url
  // for filenames + titles, so we synthesise a pair-specific URL.
  const fused = clone(a);

  // Colours — every sub-field in one block (primary, secondary, accent,
  // neutrals, backgrounds, text, gradients, all). Mixing primary from
  // one site and neutrals from another tends to produce off-brand greys,
  // so we keep the whole palette together.
  fused.colors = pick('colors', a.colors, b.colors);

  // Typography — same logic. Families, scale, weights, headings, body
  // travel as one unit because the type system is tightly coupled.
  fused.typography = pick('typography', a.typography, b.typography);
  // Pull related signals along with the type pick so the brand book
  // renders coherently (specimen lines lean on voice.sampleHeadings).
  if (axes.voice === axes.typography) {
    // already aligned; keep voice-from picked below
  }

  // Spacing.
  fused.spacing = pick('spacing', a.spacing, b.spacing);
  // Layout often co-varies with spacing — move it together.
  fused.layout = pick('spacing', a.layout, b.layout);

  // Shape — radii + shadows + borders.
  fused.borders = pick('shape', a.borders, b.borders);
  fused.shadows = pick('shape', a.shadows, b.shadows);

  // Motion.
  fused.motion = pick('motion', a.motion, b.motion);
  fused.animations = pick('motion', a.animations, b.animations);

  // Voice.
  fused.voice = pick('voice', a.voice, b.voice);

  // Components — anatomy, clusters, library detection.
  fused.componentAnatomy = pick('components', a.componentAnatomy, b.componentAnatomy);
  fused.componentClusters = pick('components', a.componentClusters, b.componentClusters);
  fused.componentLibrary = pick('components', a.componentLibrary, b.componentLibrary);
  fused.components = pick('components', a.components, b.components);

  // Material language and imagery style track colour by default — they
  // describe the *visual* feel.
  fused.materialLanguage = pick('colors', a.materialLanguage, b.materialLanguage);
  fused.imageryStyle = pick('colors', a.imageryStyle, b.imageryStyle);

  // CSS variables tend to mirror colour + typography. We keep the
  // variables from whichever source contributed colour, since colour
  // tokens are the dominant variable family.
  fused.variables = pick('colors', a.variables, b.variables);

  // Score, accessibility, css-health are *measurements* of the source
  // sites — they don't apply to the fused design. Strip them so
  // downstream consumers don't surface stale numbers.
  fused.score = null;
  fused.accessibility = src('colors').accessibility ? clone(src('colors').accessibility) : null;
  fused.cssHealth = null;

  // Synthesise meta. The pair URL is a virtual identifier so emitters
  // produce non-colliding filenames (e.g. "stripe-x-linear").
  const hostA = host(a.meta?.url);
  const hostB = host(b.meta?.url);
  fused.meta = {
    ...(a.meta || {}),
    url: `pair://${hostA}-x-${hostB}`,
    title: `${hostA} × ${hostB}`,
    pairedFrom: { a: a.meta?.url || hostA, b: b.meta?.url || hostB },
    timestamp: new Date().toISOString(),
    elementCount: (a.meta?.elementCount || 0) + (b.meta?.elementCount || 0),
    pagesAnalyzed: 1,
    fusedAxes: axes,
  };
  fused.fusedAxes = axes;

  // Drop the raw crawler output — it belongs to a single page and
  // confuses any consumer that tries to re-derive things from it.
  delete fused._raw;

  const summary = {
    a: { url: a.meta?.url, host: hostA },
    b: { url: b.meta?.url, host: hostB },
    axes,
  };
  return { design: fused, summary };
}

export { AXES, DEFAULT_AXES };
