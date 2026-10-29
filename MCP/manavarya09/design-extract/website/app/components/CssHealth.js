// §04 CSS health — mostly static. Static SVG plot, no ResizeObserver needed
// (responsive via 100% width + aspect-ratio). Numbers are the PR B smoke
// sample taken from stripe.com: 14 sheets, 89% unused, 764 !important rules,
// 9,041 duplicate declarations.

// Synthetic sample shaped from the PR B smoke distribution: a mostly low
// specificity body with a rising-ramp tail — the classic "!important wall"
// silhouette. X = rule order (0..100), Y = collapsed specificity (a*100+b*10+c).
const POINTS = [
  [2, 11], [4, 10], [6, 20], [8, 12], [10, 21], [12, 11], [14, 22],
  [16, 20], [18, 12], [20, 22], [22, 30], [24, 20], [26, 21], [28, 31],
  [30, 22], [32, 30], [34, 31], [36, 22], [38, 32], [40, 30], [42, 40],
  [44, 32], [46, 41], [48, 42], [50, 51], [52, 42], [54, 50], [56, 61],
  [58, 52], [60, 71], [62, 81], [64, 92], [66, 112], [68, 121], [70, 141],
  [72, 161], [74, 172], [76, 191], [78, 202], [80, 221], [82, 232],
  [84, 252], [86, 272], [88, 291], [90, 311], [92, 331], [94, 352],
  [96, 372], [98, 391], [100, 412],
];

const VENDOR_CHIPS = [
  ['-webkit-', '183'],
  ['-moz-', '41'],
  ['-ms-', '7'],
  ['-o-', '2'],
  ['duplicates', '9,041'],
];

const STATS = [
  ['89%', 'unused css'],
  ['764', '!important rules'],
  ['9,041', 'duplicate declarations'],
  ['14', 'stylesheets analyzed'],
];

import Rule from './Rule';
import Marginalia from './Marginalia';

function SpecificityPlot() {
  // viewBox 100 x 100 (abstract units), axis gutters inside.
  const maxY = 500;
  const padL = 10;
  const padB = 12;
  const padT = 4;
  const padR = 4;

  return (
    <svg
      viewBox="0 0 200 125"
      preserveAspectRatio="none"
      role="img"
      aria-label="Specificity scatter plot — rule order vs specificity score"
      style={{
        width: '100%',
        aspectRatio: '16 / 10',
        border: '1px solid var(--ink)',
        background: 'var(--paper)',
        display: 'block',
      }}
    >
      {/* axis lines */}
      <line x1={padL} y1={125 - padB} x2={200 - padR} y2={125 - padB} stroke="var(--ink)" strokeWidth="0.5" />
      <line x1={padL} y1={padT} x2={padL} y2={125 - padB} stroke="var(--ink)" strokeWidth="0.5" />

      {/* axis labels (mono ~10px visually — SVG units scaled) */}
      <text x={padL} y={124} fontFamily="var(--font-mono)" fontSize="3.2" fill="var(--ink-2)" letterSpacing="0.1">
        rule order →
      </text>
      <text
        x={padL + 1}
        y={padT + 3}
        fontFamily="var(--font-mono)"
        fontSize="3.2"
        fill="var(--ink-2)"
        letterSpacing="0.1"
      >
        ↑ specificity
      </text>
      <text x={200 - padR - 14} y={124} fontFamily="var(--font-mono)" fontSize="3" fill="var(--ink-3)">
        n=50
      </text>

      {/* points */}
      {POINTS.map(([x, y], i) => {
        const px = padL + (x / 100) * (200 - padL - padR);
        const py = 125 - padB - (Math.min(y, maxY) / maxY) * (125 - padB - padT);
        const outlier = y > 200;
        return (
          <rect
            key={i}
            x={px - 1}
            y={py - 1}
            width="2"
            height="2"
            fill={outlier ? 'var(--accent)' : 'var(--ink)'}
          />
        );
      })}
    </svg>
  );
}

export default function CssHealth() {
  return (
    <>
      <Rule number="04" label="CSS health audit" />
      <div className="with-margin" style={{ marginTop: 'var(--r5)' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 'var(--r3)' }}>§04 CSS health</div>
          <h2 className="display" style={{ marginBottom: 'var(--r4)' }}>
            The stylesheet is the problem.
          </h2>
          <p className="prose" style={{ fontSize: 18, maxWidth: '62ch', color: 'var(--ink-2)' }}>
            Most sites ship 40–90% unused CSS, long walls of <code>!important</code> escalations,
            and a specificity graph that rises forever. v7.0 surfaces all of it — not as a
            vanity score, but as exact declaration-level evidence.
          </p>

          <div
            className="grid-12"
            style={{
              marginTop: 'var(--r7)',
              gap: 'var(--col-gap)',
              alignItems: 'start',
            }}
          >
            {/* Big numerals — span 5 */}
            <div
              style={{
                gridColumn: 'span 5',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--r5) var(--r4)',
              }}
            >
              {STATS.map(([n, label]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    className="display"
                    style={{
                      fontSize: 'clamp(64px, 7vw, 120px)',
                      lineHeight: 0.95,
                      fontVariantNumeric: 'tabular-nums',
                      fontFeatureSettings: "'tnum' 1",
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {n}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Plot — span 7 */}
            <div style={{ gridColumn: 'span 7' }}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-2)',
                  marginBottom: 'var(--r3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>specificity distribution</span>
                <span style={{ color: 'var(--accent)' }}>outliers: specificity &gt; 200</span>
              </div>
              <SpecificityPlot />
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  marginTop: 'var(--r3)',
                }}
              >
                collapsed score: a×100 + b×10 + c. rising tail = accumulated !important wall.
              </div>
            </div>
          </div>

          {/* Caption strip — vendor prefix chips */}
          <div
            style={{
              marginTop: 'var(--r7)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--r3)',
              borderTop: 'var(--hair)',
              paddingTop: 'var(--r4)',
            }}
          >
            {VENDOR_CHIPS.map(([k, v]) => (
              <span
                key={k}
                className="mono"
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '3px 8px',
                  border: '1px solid var(--ink)',
                  fontSize: 11,
                  letterSpacing: '0.04em',
                }}
              >
                <span style={{ color: 'var(--ink-2)' }}>{k}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </span>
            ))}
          </div>
        </div>

        <Marginalia>
          <div>additive scoring</div>
          <p style={{ marginTop: 6 }}>
            Tracked additively: existing score fields kept for back-compat; CSS health joins as a new
            dimension.
          </p>
          <hr style={{ margin: '12px 0', border: 0, borderTop: '1px solid var(--ink-3)' }} />
          <div>works on any site</div>
          <p className="foot" style={{ marginTop: 6 }}>
            Flags rising specificity, zombie declarations, and abandoned <code>!important</code> walls —
            with exact selector provenance.
          </p>
        </Marginalia>
      </div>
    </>
  );
}
