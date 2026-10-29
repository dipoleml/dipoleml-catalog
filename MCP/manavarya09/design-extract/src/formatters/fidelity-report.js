// Fidelity report — render a combined (visual + motion) fidelity result as
// JSON, Markdown, and a self-contained SVG share card.
//
// The card is the share hook for the gallery: "97% fidelity clone of stripe.com"
// with a letter grade is a card no competitor can post, because none of them
// produce a measured number. Pure string builders — no I/O.

const GRADE_COLORS = {
  A: '#0a8a52', B: '#1f6feb', C: '#b08400', D: '#d2691e', F: '#c43d3d', unknown: '#555',
};

function band(n) {
  if (n == null) return '#888';
  if (n >= 90) return '#16a34a';
  if (n >= 75) return '#65a30d';
  if (n >= 55) return '#d97706';
  return '#dc2626';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatFidelityJson(report) {
  return JSON.stringify(report, null, 2) + '\n';
}

export function formatFidelityMarkdown(report) {
  const { host, url, overall, grade, visual, motion, directives = [], motionAspects = [] } = report;
  const lines = [];
  lines.push(`# Clone fidelity — ${host || url || 'site'}`);
  lines.push('');
  lines.push(`**${overall ?? '—'}% overall** (${grade})  ·  visual ${visual ?? '—'}%  ·  motion ${motion ?? '—'}%`);
  if (url) lines.push(`\nSource: ${url}`);
  lines.push('');

  if (motionAspects.length) {
    lines.push('## Motion');
    lines.push('');
    lines.push('| aspect | score | original → clone |');
    lines.push('| --- | --- | --- |');
    for (const a of motionAspects) {
      const arrow = `${fmt(a.original)} → ${fmt(a.clone)}`;
      lines.push(`| ${a.aspect} | ${Math.round(a.score * 100)}% | ${esc(arrow)} |`);
    }
    lines.push('');
  }

  lines.push('## Correction plan');
  lines.push('');
  if (!directives.length) {
    lines.push('_No corrections outstanding — the clone is within tolerance._');
  } else {
    for (const d of directives) {
      lines.push(`- **[${d.priority}/${d.area}]** ${d.issue}`);
      lines.push(`  - _fix:_ ${d.fix}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function fmt(v) {
  if (Array.isArray(v)) return v.length ? v.slice(0, 3).join(', ') : '∅';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  return v == null ? '—' : String(v);
}

// Shareable SVG card. width 520 × height 260, self-contained, no external fonts.
export function formatFidelityCard(report) {
  const { host, url, overall, grade, visual, motion } = report;
  const label = host || (url ? safeHost(url) : 'site');
  const color = band(overall);
  const gradeColor = GRADE_COLORS[grade] || GRADE_COLORS.unknown;
  const n = overall == null ? '—' : String(overall);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="260" viewBox="0 0 520 260" role="img" aria-label="${esc(label)} fidelity ${n}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d0d0f"/>
      <stop offset="1" stop-color="#17171b"/>
    </linearGradient>
  </defs>
  <rect width="520" height="260" rx="18" fill="url(#bg)"/>
  <text x="36" y="58" fill="#8a8a93" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" letter-spacing="2">FIDELITY CLONE</text>
  <text x="36" y="92" fill="#f4f4f5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="26" font-weight="700">${esc(label)}</text>
  <text x="36" y="196" fill="${color}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="104" font-weight="800">${esc(n)}<tspan font-size="34" fill="#6b6b73">%</tspan></text>
  <g transform="translate(372, 120)">
    <rect width="112" height="112" rx="16" fill="${gradeColor}"/>
    <text x="56" y="78" fill="#fff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="64" font-weight="800">${esc(grade === 'unknown' ? '?' : grade)}</text>
  </g>
  <text x="36" y="232" fill="#8a8a93" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13">visual ${visual ?? '—'}%  ·  motion ${motion ?? '—'}%  ·  designlang</text>
</svg>
`;
}

function safeHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}
