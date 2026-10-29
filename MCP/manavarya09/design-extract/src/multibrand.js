// Multi-brand N-site comparison matrix

import { extractDesignLanguage } from './index.js';

export async function compareBrands(urls, options = {}) {
  const brands = [];

  for (const url of urls) {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    try {
      const design = await extractDesignLanguage(normalized, options);
      const hostname = new URL(normalized).hostname.replace(/^www\./, '');
      brands.push({ url: normalized, hostname, design });
    } catch (err) {
      brands.push({ url: normalized, hostname: url, error: err.message });
    }
  }

  return brands;
}

export function formatBrandMatrix(brands) {
  const lines = [];
  const valid = brands.filter(b => !b.error);

  lines.push('# Multi-Brand Design Comparison');
  lines.push('');
  lines.push(`Comparing ${valid.length} brands.`);
  lines.push('');

  // Overview table
  const headers = ['Property', ...valid.map(b => b.hostname)];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);

  // Primary color
  lines.push(`| Primary Color | ${valid.map(b => `\`${b.design.colors.primary?.hex || 'none'}\``).join(' | ')} |`);
  // Secondary color
  lines.push(`| Secondary Color | ${valid.map(b => `\`${b.design.colors.secondary?.hex || 'none'}\``).join(' | ')} |`);
  // Fonts
  lines.push(`| Fonts | ${valid.map(b => b.design.typography.families.map(f => f.name).join(', ') || 'none').join(' | ')} |`);
  // Color count
  lines.push(`| Color Count | ${valid.map(b => b.design.colors.all.length).join(' | ')} |`);
  // Spacing base
  lines.push(`| Spacing Base | ${valid.map(b => b.design.spacing.base ? `${b.design.spacing.base}px` : 'none').join(' | ')} |`);
  // A11y score
  lines.push(`| A11y Score | ${valid.map(b => b.design.accessibility ? `${b.design.accessibility.score}%` : 'n/a').join(' | ')} |`);
  // Shadows
  lines.push(`| Shadows | ${valid.map(b => b.design.shadows.values.length).join(' | ')} |`);
  // Radii
  lines.push(`| Border Radii | ${valid.map(b => b.design.borders.radii.length).join(' | ')} |`);
  // CSS vars
  lines.push(`| CSS Variables | ${valid.map(b => Object.values(b.design.variables).reduce((s, v) => s + Object.keys(v).length, 0)).join(' | ')} |`);
  // Components
  lines.push(`| Components | ${valid.map(b => Object.keys(b.design.components).join(', ') || 'none').join(' | ')} |`);

  lines.push('');

  // Color overlap matrix
  lines.push('## Color Overlap');
  lines.push('');
  if (valid.length >= 2) {
    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const colorsA = new Set(valid[i].design.colors.all.map(c => c.hex));
        const colorsB = new Set(valid[j].design.colors.all.map(c => c.hex));
        const shared = [...colorsA].filter(c => colorsB.has(c));
        lines.push(`**${valid[i].hostname} vs ${valid[j].hostname}:** ${shared.length} shared colors${shared.length > 0 ? ` (${shared.slice(0, 5).map(c => `\`${c}\``).join(', ')})` : ''}`);
      }
    }
    lines.push('');
  }

  // Font comparison
  lines.push('## Typography Comparison');
  lines.push('');
  const allFonts = new Set();
  for (const b of valid) {
    for (const f of b.design.typography.families) allFonts.add(f.name);
  }
  lines.push(`| Font | ${valid.map(b => b.hostname).join(' | ')} |`);
  lines.push(`| --- | ${valid.map(() => '---').join(' | ')} |`);
  for (const font of allFonts) {
    lines.push(`| ${font} | ${valid.map(b => b.design.typography.families.some(f => f.name === font) ? 'Yes' : '-').join(' | ')} |`);
  }
  lines.push('');

  // Errors
  const errored = brands.filter(b => b.error);
  if (errored.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const b of errored) {
      lines.push(`- **${b.url}**: ${b.error}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function formatBrandMatrixHtml(brands) {
  const valid = brands.filter(b => !b.error);

  const swatchCell = (hex) => hex
    ? `<td><span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${hex};border:1px solid #333;vertical-align:middle;margin-right:6px"></span><code>${hex}</code></td>`
    : `<td>-</td>`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Multi-Brand Comparison</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,sans-serif; background:#0a0a0a; color:#e5e5e5; padding:40px; }
  h1 { font-size:28px; color:#fff; margin-bottom:24px; }
  h2 { font-size:18px; color:#fff; margin:32px 0 12px; }
  table { width:100%; border-collapse:collapse; margin:12px 0; }
  th { text-align:left; padding:10px 12px; background:#141414; color:#888; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #222; }
  td { padding:10px 12px; border-bottom:1px solid #1a1a1a; font-size:13px; }
  tr:hover td { background:#111; }
  code { background:#1e1e2e; padding:2px 6px; border-radius:4px; font-size:12px; color:#a78bfa; }
  .score-good { color:#22c55e; } .score-warn { color:#eab308; } .score-bad { color:#ef4444; }
</style></head><body>
<h1>Multi-Brand Design Comparison</h1>
<p style="color:#666;margin-bottom:24px">${valid.length} brands analyzed</p>

<table>
<tr><th>Property</th>${valid.map(b => `<th>${b.hostname}</th>`).join('')}</tr>
<tr><td>Primary Color</td>${valid.map(b => swatchCell(b.design.colors.primary?.hex)).join('')}</tr>
<tr><td>Secondary Color</td>${valid.map(b => swatchCell(b.design.colors.secondary?.hex)).join('')}</tr>
<tr><td>Fonts</td>${valid.map(b => `<td>${b.design.typography.families.map(f => `<code>${f.name}</code>`).join(' ')}</td>`).join('')}</tr>
<tr><td>Colors</td>${valid.map(b => `<td>${b.design.colors.all.length}</td>`).join('')}</tr>
<tr><td>Spacing Base</td>${valid.map(b => `<td>${b.design.spacing.base ? b.design.spacing.base + 'px' : '-'}</td>`).join('')}</tr>
<tr><td>A11y Score</td>${valid.map(b => {
    const s = b.design.accessibility?.score;
    const cls = s >= 80 ? 'score-good' : s >= 50 ? 'score-warn' : 'score-bad';
    return `<td class="${cls}">${s ?? 'n/a'}%</td>`;
  }).join('')}</tr>
<tr><td>Shadows</td>${valid.map(b => `<td>${b.design.shadows.values.length}</td>`).join('')}</tr>
<tr><td>Border Radii</td>${valid.map(b => `<td>${b.design.borders.radii.length}</td>`).join('')}</tr>
<tr><td>CSS Variables</td>${valid.map(b => `<td>${Object.values(b.design.variables).reduce((s, v) => s + Object.keys(v).length, 0)}</td>`).join('')}</tr>
</table>

<h2>Full Color Palettes</h2>
${valid.map(b => `
<h3 style="color:#888;font-size:14px;margin:16px 0 8px">${b.hostname}</h3>
<div style="display:flex;gap:4px;flex-wrap:wrap">
${b.design.colors.all.slice(0, 15).map(c => `<div style="width:32px;height:32px;border-radius:6px;background:${c.hex};border:1px solid #333" title="${c.hex}"></div>`).join('')}
</div>`).join('')}

</body></html>`;
}
