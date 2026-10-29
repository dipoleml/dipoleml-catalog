// Formatters for the whole-site design system reports.
//
// Pure string builders over the object returned by `synthesizeSite`. Two
// human-readable companions to `*-site-system.json`:
//   - coverage: every token, its scope, and which pages use it
//   - consistency: the grade, per-category breakdown, and off-system outliers

function scopeBadge(scope) {
  return scope === 'site-wide' ? '🟢 site-wide' : scope === 'section' ? '🟡 section' : '🔴 page-local';
}

function fmtPct(cov) {
  return `${Math.round((cov || 0) * 100)}%`;
}

function coverageTable(title, rows, label = (r) => r.key) {
  if (!rows || !rows.length) return `### ${title}\n\n_none detected_\n`;
  const lines = [`### ${title}`, '', '| Token | Coverage | Scope | Pages |', '| --- | --- | --- | --- |'];
  for (const r of rows) {
    lines.push(`| \`${label(r)}\` | ${fmtPct(r.coverage)} | ${scopeBadge(r.scope)} | ${r.pages.join(', ')} |`);
  }
  return lines.join('\n') + '\n';
}

export function formatSiteCoverage(result) {
  const { pagesAnalyzed, pages, coverage } = result;
  const out = [];
  out.push('# Site Design System — Coverage Map\n');
  out.push(`Synthesized from **${pagesAnalyzed}** page${pagesAnalyzed === 1 ? '' : 's'}: ${pages.map((p) => p.type).join(', ')}.\n`);
  out.push('Coverage = the share of pages that use a token. 🟢 site-wide (≥80%), 🟡 section (40–80%), 🔴 page-local (<40%).\n');
  out.push(coverageTable('Colors', coverage.colors, (r) => r.key));
  out.push(coverageTable('Backgrounds', coverage.backgrounds, (r) => r.key));
  out.push(coverageTable('Text colors', coverage.text, (r) => r.key));
  out.push(coverageTable('Type families', coverage.typography, (r) => (r.value?.name || r.key)));
  out.push(coverageTable('Type scale (px)', coverage.typeScale, (r) => `${r.key}px`));
  out.push(coverageTable('Spacing (px)', coverage.spacing, (r) => `${r.key}px`));
  out.push(coverageTable('Radii (px)', coverage.borders, (r) => `${r.key}px`));
  out.push(coverageTable('Shadows', coverage.shadows, (r) => r.key));
  return out.join('\n');
}

export function formatSiteConsistency(result) {
  const { pagesAnalyzed, pages, drift, crawled } = result;
  const out = [];
  out.push('# Site Design System — Consistency Report\n');
  if (drift.grade == null) {
    out.push(drift.summary + '\n');
    return out.join('\n');
  }
  out.push(`## Grade: ${drift.grade}/100 (${drift.letter})\n`);
  out.push(drift.summary + '\n');

  out.push('### By category\n');
  out.push('| Category | Consistency |');
  out.push('| --- | --- |');
  for (const [cat, score] of Object.entries(drift.categoryScores || {})) {
    out.push(`| ${cat} | ${score}/100 |`);
  }
  out.push('');

  out.push('### Pages analyzed\n');
  const rows = crawled || pages.map((p) => ({ ...p, ok: true }));
  out.push('| Page | URL | Status |');
  out.push('| --- | --- | --- |');
  for (const p of rows) {
    out.push(`| ${p.type} | ${p.url} | ${p.ok === false ? `⚠️ ${p.error || 'failed'}` : '✓'} |`);
  }
  out.push('');

  out.push('### Off-system tokens\n');
  if (!drift.outliers.length) {
    out.push('None — every meaningful token is shared across the site. 🎉\n');
  } else {
    out.push('Tokens introduced by a single page (candidates to consolidate):\n');
    out.push('| Category | Token | Page | Uses |');
    out.push('| --- | --- | --- | --- |');
    for (const o of drift.outliers) {
      out.push(`| ${o.category} | \`${o.token}\` | ${o.pages.join(', ')} | ${o.count} |`);
    }
    out.push('');
  }
  return out.join('\n');
}
