// designlang DNA — the report.
//
// Everything above this file produces numbers. This file has the harder job:
// saying what they mean without overclaiming. Two rules it holds to —
//
//   * never print a distance without saying how many features backed it, and
//   * never print a percentile without naming the corpus it ranks against.
//
// A design score with no stated reference frame is the thing this whole
// feature exists to replace.

import { AXES, FEATURE_ORDER } from './vector.js';

const pct = x => `${Math.round(x * 100)}`;
const d2 = x => x.toFixed(2);

// Percentiles read better as plain English than as a number in most lines.
function band(p) {
  if (p >= 0.9) return 'far above the corpus';
  if (p >= 0.7) return 'above the corpus';
  if (p > 0.3) return 'typical';
  if (p > 0.1) return 'below the corpus';
  return 'far below the corpus';
}

// Feature keys are terse by design; these are what a person calls them.
const LABELS = {
  'color.chromaMean': 'colour saturation',
  'color.chromaMax': 'most saturated colour',
  'color.hueCount': 'number of hues',
  'color.hueSpread': 'hue spread',
  'color.neutralTemp': 'neutral tinting',
  'color.surfaceLevels': 'surface levels',
  'color.surfaceLightness': 'surface lightness',
  'color.accentDelta': 'accent/surface contrast',
  'type.scaleRatio': 'type scale ratio',
  'type.scaleRegularity': 'type scale regularity',
  'type.displayContrast': 'display/body contrast',
  'type.bodyLineHeight': 'body line height',
  'type.weightRange': 'weight range',
  'type.familyCount': 'font families',
  'space.baseUnit': 'spacing base unit',
  'space.rampRegularity': 'spacing regularity',
  'space.scaleDepth': 'spacing steps',
  'space.scaleSpread': 'spacing range',
  'shape.radiusMedian': 'corner radius',
  'shape.radiusVariance': 'radius consistency',
  'shape.pillRate': 'pill shapes',
  'shape.borderWeight': 'border weight',
  'shape.shadowSoftness': 'shadow softness',
  'shape.elevationLevels': 'elevation levels',
  'motion.durationMedian': 'motion duration',
  'motion.durationSpread': 'duration range',
  'motion.springiness': 'springiness',
  'motion.easeOutShare': 'ease-out usage',
  'motion.linearShare': 'linear easing usage',
  'motion.scrollLinked': 'scroll-linked motion',
};

const label = key => LABELS[key] || key;

export function formatDnaMarkdown({ vector, corpus, neighbours = [], percentiles, outliers = [] }) {
  const lines = [];
  const url = vector.url || 'this design';

  lines.push(`# Design DNA — ${url}`);
  lines.push('');
  lines.push(`Ranked against **${corpus.size} design systems** (corpus \`${corpus.name}\`, vector v${vector.version}).`);
  lines.push('');

  if (vector.coverage < 1) {
    lines.push(`> **Partial coverage.** ${pct(vector.coverage)}% of the ${FEATURE_ORDER.length} features were`
      + ` measurable on this page — the rest were never extracted. Comparisons below use only what exists.`);
    lines.push('');
  }

  lines.push('## Where it sits');
  lines.push('');
  lines.push('| Axis | Percentile | Reading |');
  lines.push('|---|---|---|');
  for (const axis of AXES) {
    const p = percentiles.axes[axis];
    lines.push(p === null
      ? `| ${axis} | — | not measured |`
      : `| ${axis} | ${pct(p)} | ${band(p)} |`);
  }
  lines.push('');

  if (neighbours.length) {
    lines.push('## Nearest design systems');
    lines.push('');
    neighbours.forEach((n, i) => {
      // The axis that most separates them is the interesting half of a
      // similarity claim — "close, except on motion" is the real finding.
      const worst = AXES
        .filter(a => n.axes[a].distance !== null)
        .sort((a, b) => n.axes[b].distance - n.axes[a].distance)[0];
      const rank = i === 0 ? 'closest' : `#${i + 1}`;
      const aside = worst ? `, furthest on ${worst} (${d2(n.axes[worst].distance)})` : '';
      lines.push(`- **${n.url}** · ${rank} · distance ${d2(n.distance)} across ${n.compared} features${aside}`);
    });
    lines.push('');
  }

  if (outliers.length) {
    lines.push('## What makes it look the way it does');
    lines.push('');
    lines.push('The features furthest from the middle of the corpus:');
    lines.push('');
    for (const o of outliers) {
      lines.push(`- **${label(o.feature)}** — ${pct(o.percentile)}th percentile, ${band(o.percentile)}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('_Percentiles are ranks within the corpus, not judgements — a design far from the corpus'
    + ' middle is unusual, which may be exactly the intent._');
  lines.push('');

  return lines.join('\n');
}
