// Design diff engine — compare two design systems

export function diffDesigns(designA, designB) {
  const diff = { urlA: designA.meta.url, urlB: designB.meta.url, sections: [] };

  // Color diff
  const colorDiff = {
    name: 'Colors',
    onlyA: [], onlyB: [], shared: [], changed: [],
  };
  const hexesA = new Set(designA.colors.all.map(c => c.hex));
  const hexesB = new Set(designB.colors.all.map(c => c.hex));
  for (const h of hexesA) { if (!hexesB.has(h)) colorDiff.onlyA.push(h); }
  for (const h of hexesB) { if (!hexesA.has(h)) colorDiff.onlyB.push(h); }
  for (const h of hexesA) { if (hexesB.has(h)) colorDiff.shared.push(h); }

  // Primary color comparison
  if (designA.colors.primary && designB.colors.primary && designA.colors.primary.hex !== designB.colors.primary.hex) {
    colorDiff.changed.push({ property: 'primary', a: designA.colors.primary.hex, b: designB.colors.primary.hex });
  }
  if (designA.colors.secondary && designB.colors.secondary && designA.colors.secondary.hex !== designB.colors.secondary.hex) {
    colorDiff.changed.push({ property: 'secondary', a: designA.colors.secondary.hex, b: designB.colors.secondary.hex });
  }
  diff.sections.push(colorDiff);

  // Typography diff
  const typeDiff = { name: 'Typography', onlyA: [], onlyB: [], shared: [], changed: [] };
  const fontsA = new Set(designA.typography.families.map(f => f.name));
  const fontsB = new Set(designB.typography.families.map(f => f.name));
  for (const f of fontsA) { if (!fontsB.has(f)) typeDiff.onlyA.push(f); }
  for (const f of fontsB) { if (!fontsA.has(f)) typeDiff.onlyB.push(f); }
  for (const f of fontsA) { if (fontsB.has(f)) typeDiff.shared.push(f); }
  diff.sections.push(typeDiff);

  // Spacing diff
  const spaceDiff = { name: 'Spacing', changed: [] };
  if (designA.spacing.base !== designB.spacing.base) {
    spaceDiff.changed.push({ property: 'base unit', a: `${designA.spacing.base}px`, b: `${designB.spacing.base}px` });
  }
  spaceDiff.countA = designA.spacing.scale.length;
  spaceDiff.countB = designB.spacing.scale.length;
  diff.sections.push(spaceDiff);

  // Accessibility diff
  if (designA.accessibility && designB.accessibility) {
    diff.sections.push({
      name: 'Accessibility',
      changed: [{ property: 'WCAG score', a: `${designA.accessibility.score}%`, b: `${designB.accessibility.score}%` }],
    });
  }

  // Component diff
  const compDiff = { name: 'Components', onlyA: [], onlyB: [], shared: [] };
  const compsA = new Set(Object.keys(designA.components));
  const compsB = new Set(Object.keys(designB.components));
  for (const c of compsA) { if (!compsB.has(c)) compDiff.onlyA.push(c); }
  for (const c of compsB) { if (!compsA.has(c)) compDiff.onlyB.push(c); }
  for (const c of compsA) { if (compsB.has(c)) compDiff.shared.push(c); }
  diff.sections.push(compDiff);

  return diff;
}

export function formatDiffMarkdown(diff) {
  const lines = [];
  lines.push(`# Design Comparison`);
  lines.push('');
  lines.push(`| | Site A | Site B |`);
  lines.push(`|---|--------|--------|`);
  lines.push(`| URL | ${diff.urlA} | ${diff.urlB} |`);
  lines.push('');

  for (const section of diff.sections) {
    lines.push(`## ${section.name}`);
    lines.push('');

    if (section.changed && section.changed.length > 0) {
      lines.push('### Differences');
      lines.push('');
      lines.push('| Property | Site A | Site B |');
      lines.push('|----------|--------|--------|');
      for (const c of section.changed) {
        lines.push(`| ${c.property} | \`${c.a}\` | \`${c.b}\` |`);
      }
      lines.push('');
    }

    if (section.onlyA && section.onlyA.length > 0) {
      lines.push(`**Only in Site A:** ${section.onlyA.map(v => `\`${v}\``).join(', ')}`);
      lines.push('');
    }
    if (section.onlyB && section.onlyB.length > 0) {
      lines.push(`**Only in Site B:** ${section.onlyB.map(v => `\`${v}\``).join(', ')}`);
      lines.push('');
    }
    if (section.shared && section.shared.length > 0) {
      lines.push(`**Shared:** ${section.shared.map(v => `\`${v}\``).join(', ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function formatDiffHtml(diff) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Design Comparison</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,sans-serif; background:#0a0a0a; color:#e5e5e5; padding:40px; }
  h1 { font-size:32px; color:#fff; margin-bottom:24px; }
  h2 { font-size:20px; color:#fff; margin:32px 0 16px; border-bottom:1px solid #222; padding-bottom:8px; }
  .urls { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:32px; }
  .url-card { background:#141414; border:1px solid #222; border-radius:12px; padding:16px; }
  .url-card h3 { font-size:12px; color:#666; margin-bottom:4px; }
  .url-card a { color:#3b82f6; font-size:14px; }
  .diff-row { display:grid; grid-template-columns:120px 1fr 1fr; gap:12px; padding:10px 16px; border-radius:8px; margin-bottom:4px; }
  .diff-row:nth-child(odd) { background:#111; }
  .diff-label { color:#888; font-size:13px; }
  .diff-val { font-family:monospace; font-size:13px; }
  .swatch-inline { display:inline-block; width:14px; height:14px; border-radius:3px; vertical-align:middle; margin-right:6px; border:1px solid #333; }
  .only-a { color:#f97316; } .only-b { color:#8b5cf6; } .shared { color:#22c55e; }
  .tag { display:inline-block; font-size:12px; padding:2px 8px; border-radius:4px; margin:2px; }
  .tag-a { background:#f9731620; color:#f97316; }
  .tag-b { background:#8b5cf620; color:#8b5cf6; }
  .tag-shared { background:#22c55e20; color:#22c55e; }
</style></head><body>
<h1>Design Comparison</h1>
<div class="urls">
  <div class="url-card"><h3>Site A</h3><a href="${diff.urlA}">${diff.urlA}</a></div>
  <div class="url-card"><h3>Site B</h3><a href="${diff.urlB}">${diff.urlB}</a></div>
</div>
${diff.sections.map(s => `
<h2>${s.name}</h2>
${s.changed && s.changed.length > 0 ? s.changed.map(c => `
<div class="diff-row">
  <span class="diff-label">${c.property}</span>
  <span class="diff-val">${c.a.startsWith('#') ? `<span class="swatch-inline" style="background:${c.a}"></span>` : ''}${c.a}</span>
  <span class="diff-val">${c.b.startsWith('#') ? `<span class="swatch-inline" style="background:${c.b}"></span>` : ''}${c.b}</span>
</div>`).join('') : ''}
${s.onlyA && s.onlyA.length > 0 ? `<p style="margin:8px 0"><span class="only-a">Only in A:</span> ${s.onlyA.slice(0, 15).map(v => `<span class="tag tag-a">${v.startsWith('#') ? `<span class="swatch-inline" style="background:${v}"></span>` : ''}${v}</span>`).join('')}</p>` : ''}
${s.onlyB && s.onlyB.length > 0 ? `<p style="margin:8px 0"><span class="only-b">Only in B:</span> ${s.onlyB.slice(0, 15).map(v => `<span class="tag tag-b">${v.startsWith('#') ? `<span class="swatch-inline" style="background:${v}"></span>` : ''}${v}</span>`).join('')}</p>` : ''}
${s.shared && s.shared.length > 0 ? `<p style="margin:8px 0"><span class="shared">Shared:</span> ${s.shared.slice(0, 15).map(v => `<span class="tag tag-shared">${v.startsWith('#') ? `<span class="swatch-inline" style="background:${v}"></span>` : ''}${v}</span>`).join('')}</p>` : ''}
`).join('')}
</body></html>`;
}
