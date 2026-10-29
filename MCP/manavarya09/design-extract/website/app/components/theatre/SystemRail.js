'use client';

// The right half of the stage: the design system assembling itself from the
// real token stream. Each swatch/specimen animates in (CSS, reduced-motion
// safe) as its token lands — the "tokens flying off the page" payoff.

export default function SystemRail({ swatches, fontSample, dimensions, summary }) {
  return (
    <div className="thtr-rail">
      <Block label="palette" count={swatches.length}>
        <div className="thtr-wells">
          {swatches.length === 0 && <Empty>colours land here</Empty>}
          {swatches.map((s) => (
            <span
              key={s.path}
              className="thtr-well thtr-pop"
              style={{ background: s.hex }}
              title={`${s.path} · ${s.hex}`}
            />
          ))}
        </div>
      </Block>

      <Block label="type">
        {fontSample ? (
          <div className="thtr-specimen thtr-pop" style={{ fontFamily: fontSample }}>
            <span className="thtr-specimen-big">Ag</span>
            <span className="thtr-specimen-name">{cleanFont(fontSample)}</span>
          </div>
        ) : (
          <Empty>the typeface lands here</Empty>
        )}
      </Block>

      <Block label="spacing" count={dimensions.length}>
        {dimensions.length ? (
          <div className="thtr-scale">
            {dimensions.slice(0, 8).map((d) => (
              <span
                key={d.path}
                className="thtr-scale-bar thtr-pop"
                style={{ height: `${Math.max(4, Math.min(48, d.px))}px` }}
                title={`${d.path} · ${d.raw}`}
              />
            ))}
          </div>
        ) : (
          <Empty>the rhythm lands here</Empty>
        )}
      </Block>

      {summary && (
        <div className="thtr-summary thtr-pop">
          {summaryStats(summary).map((s) => (
            <span key={s.label} className="thtr-stat">
              <strong>{s.value}</strong> {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Block({ label, count, children }) {
  return (
    <section className="thtr-block">
      <header className="thtr-block-head">
        <span className="thtr-block-label">{label}</span>
        {count != null && <span className="thtr-block-count">{count}</span>}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className="thtr-empty">{children}</p>;
}

function cleanFont(f) {
  return String(f).split(',')[0].replace(/["']/g, '').trim();
}

// `summary` shape comes from buildSummary() — pull a few headline counts.
function summaryStats(summary) {
  const out = [];
  const push = (value, label) => {
    if (value != null && value !== 0) out.push({ value, label });
  };
  push(summary.colors, 'colours');
  push(summary.componentCount, 'components');
  push(summary.spacingCount, 'spaces');
  const grade = summary.score?.grade;
  if (grade) out.push({ value: grade, label: 'grade' });
  else push(summary.cssVarCount, 'vars');
  return out.slice(0, 4);
}
