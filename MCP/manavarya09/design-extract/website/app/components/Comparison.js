import Marginalia from './Marginalia';

const TOOLS = [
  'designlang',
  'v0',
  'Builder.io Visual Copilot',
  'Style Dictionary',
  'Subframe',
  'Project Wallace',
];

// Y = yes, N = no, P = partial
const ROWS = [
  {
    feature: 'Extracts from a live URL',
    cells: ['Y', 'N', 'Y', 'N', 'N', 'Y'],
  },
  {
    feature: 'Emits W3C DTCG tokens',
    cells: ['Y', 'N', 'N', 'Y', 'N', 'N'],
  },
  {
    feature: 'Semantic alias layer',
    cells: ['Y', 'N', 'N', 'Y', 'P', 'N'],
  },
  {
    feature: 'Multi-platform output (iOS, Android, Flutter)',
    cells: ['Y', 'N', 'N', 'Y', 'N', 'N'],
  },
  {
    feature: 'MCP server over stdio',
    cells: ['Y', 'N', 'N', 'N', 'N', 'N'],
  },
  {
    feature: 'CSS health audit',
    cells: ['Y', 'N', 'N', 'N', 'N', 'Y'],
  },
  {
    feature: 'A11y remediation suggestions',
    cells: ['P', 'N', 'P', 'N', 'N', 'P'],
  },
  {
    feature: 'Component cluster detection',
    cells: ['P', 'Y', 'Y', 'N', 'Y', 'N'],
  },
  {
    feature: 'Offline / local-only',
    cells: ['Y', 'N', 'N', 'Y', 'N', 'N'],
  },
  {
    feature: 'Open source / MIT',
    cells: ['Y', 'N', 'N', 'Y', 'N', 'P'],
  },
];

function Mark({ kind }) {
  if (kind === 'Y') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-label="yes" role="img">
        <rect x="2" y="2" width="10" height="10" fill="var(--ink)" transform="rotate(45 7 7)" />
      </svg>
    );
  }
  if (kind === 'P') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-label="partial" role="img">
        <rect
          x="3"
          y="3"
          width="10"
          height="10"
          fill="var(--accent)"
          stroke="var(--ink)"
          strokeWidth="1"
          transform="rotate(45 8 8)"
        />
      </svg>
    );
  }
  return (
    <span className="mono" style={{ color: 'var(--ink-3)', fontSize: 14 }} aria-label="no">
      —
    </span>
  );
}

export default function Comparison() {
  return (
    <div>
      <div className="with-margin" style={{ marginTop: 'var(--r5)', marginBottom: 'var(--r7)' }}>
        <div>
          <div className="section-label" style={{ marginBottom: 'var(--r5)' }}>
            <span>§08 — Compared</span>
          </div>
          <h2 className="display" style={{ marginBottom: 'var(--r4)' }}>
            Where designlang doesn&apos;t win,<br />
            <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>it says so.</em>
          </h2>
          <p className="prose" style={{ fontSize: 18, lineHeight: 1.5, maxWidth: '62ch' }}>
            We picked five tools doing closely adjacent work. The matrix below is our honest
            assessment on 2026-04-18, written by someone who actually uses all six.
          </p>
        </div>
        <Marginalia>
          <div>legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Mark kind="Y" /> <span>supported</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Mark kind="P" /> <span>partial</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Mark kind="N" /> <span>not supported</span>
          </div>
          <hr style={{ margin: '12px 0', border: 0, borderTop: '1px solid var(--ink-3)' }} />
          <p className="foot">
            Open a PR if this matrix is wrong for your tool. We&apos;ll update it or explain
            our read.
          </p>
        </Marginalia>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 'var(--r7)' }}>
        <table
          style={{
            width: '100%',
            minWidth: 900,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              <th
                scope="col"
                className="mono"
                style={{
                  textAlign: 'left',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--ink-2)',
                  padding: '12px 20px 12px 0',
                  borderBottom: '1px solid var(--ink)',
                  fontWeight: 400,
                  width: '28%',
                }}
              >
                Feature
              </th>
              {TOOLS.map((t, i) => (
                <th
                  key={t}
                  scope="col"
                  className="mono"
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: i === 0 ? 'var(--ink)' : 'var(--ink-2)',
                    padding: '12px 8px',
                    borderBottom: '1px solid var(--ink)',
                    fontWeight: 400,
                  }}
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, rIdx) => (
              <tr key={row.feature}>
                <th
                  scope="row"
                  style={{
                    textAlign: 'left',
                    padding: '14px 20px 14px 0',
                    fontWeight: 400,
                    fontSize: 15,
                    color: 'var(--ink)',
                    borderBottom: rIdx === ROWS.length - 1 ? 0 : '1px solid var(--paper-3)',
                  }}
                >
                  {row.feature}
                </th>
                {row.cells.map((c, i) => (
                  <td
                    key={i}
                    style={{
                      textAlign: 'center',
                      padding: '14px 8px',
                      verticalAlign: 'middle',
                      borderBottom: rIdx === ROWS.length - 1 ? 0 : '1px solid var(--paper-3)',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mark kind={c} />
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="with-margin">
        <div>
          <h3
            className="mono"
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--ink-2)',
              marginBottom: 'var(--r4)',
            }}
          >
            What designlang is not
          </h3>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              display: 'grid',
              gap: 'var(--r3)',
              maxWidth: '72ch',
            }}
          >
            <li
              style={{
                borderLeft: '1px solid var(--ink)',
                paddingLeft: 'var(--r4)',
                fontSize: 16,
                lineHeight: 1.5,
              }}
            >
              <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                It is not a design-to-code generator.
              </em>{' '}
              It extracts the <strong>system</strong>, not the components as JSX.
            </li>
            <li
              style={{
                borderLeft: '1px solid var(--ink)',
                paddingLeft: 'var(--r4)',
                fontSize: 16,
                lineHeight: 1.5,
              }}
            >
              <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                It is not a hosted cloud service.
              </em>{' '}
              The free website extractor is rate-limited; production use should run the CLI or
              MCP server locally.
            </li>
            <li
              style={{
                borderLeft: '1px solid var(--ink)',
                paddingLeft: 'var(--r4)',
                fontSize: 16,
                lineHeight: 1.5,
              }}
            >
              <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                It is not a Figma plugin.
              </em>{' '}
              designlang reads the <strong>rendered DOM</strong>, not the Figma file — the
              output is what your users actually see, not what a designer intended.
            </li>
          </ul>
        </div>
        <Marginalia>
          <div>honesty clause</div>
          <p className="foot" style={{ marginTop: 6 }}>
            Two partial cells for designlang on purpose — the a11y remediation engine
            suggests fixes but won&apos;t rewrite your markup, and component cluster
            detection is heuristic, not vision-based.
          </p>
        </Marginalia>
      </div>
    </div>
  );
}
