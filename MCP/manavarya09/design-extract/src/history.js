// Historical tracking — save and compare design snapshots over time

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HISTORY_DIR = join(homedir(), '.designlang');

function ensureDir() {
  mkdirSync(HISTORY_DIR, { recursive: true });
}

function historyFile(hostname) {
  return join(HISTORY_DIR, `${hostname}.json`);
}

export function saveSnapshot(design) {
  ensureDir();
  const hostname = new URL(design.meta.url).hostname.replace(/^www\./, '');
  const file = historyFile(hostname);

  // Read directly inside try/catch — no existsSync race.
  let history = [];
  try { history = JSON.parse(readFileSync(file, 'utf-8')); } catch { history = []; }

  // Compact snapshot — only store key metrics, not full data
  const snapshot = {
    timestamp: design.meta.timestamp,
    url: design.meta.url,
    colors: {
      count: design.colors.all.length,
      primary: design.colors.primary?.hex || null,
      secondary: design.colors.secondary?.hex || null,
      accent: design.colors.accent?.hex || null,
    },
    typography: {
      families: design.typography.families.map(f => f.name),
      scaleCount: design.typography.scale.length,
    },
    spacing: {
      base: design.spacing.base,
      count: design.spacing.scale.length,
    },
    shadows: design.shadows.values.length,
    radii: design.borders.radii.length,
    breakpoints: design.breakpoints.length,
    components: Object.keys(design.components),
    a11yScore: design.accessibility?.score || null,
    cssVarCount: Object.values(design.variables).reduce((s, v) => s + Object.keys(v).length, 0),
  };

  history.push(snapshot);

  // Prune oldest entries if history exceeds 50 snapshots
  if (history.length > 50) {
    history = history.slice(history.length - 50);
  }

  writeFileSync(file, JSON.stringify(history, null, 2), 'utf-8');
  return { hostname, snapshotCount: history.length, file };
}

export function getHistory(url) {
  ensureDir();
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  const file = historyFile(hostname);
  try { return JSON.parse(readFileSync(file, 'utf-8')); } catch { return []; }
}

export function formatHistoryMarkdown(url, history) {
  if (history.length === 0) return `No history found for ${url}.\n`;

  const hostname = new URL(url).hostname;
  const lines = [`# Design History: ${hostname}`, '', `${history.length} snapshots recorded.`, ''];

  lines.push('| Date | Colors | Fonts | Spacing | A11y | CSS Vars |');
  lines.push('|------|--------|-------|---------|------|----------|');

  for (const snap of history.reverse()) {
    const date = new Date(snap.timestamp).toLocaleDateString();
    lines.push(`| ${date} | ${snap.colors.count} (primary: \`${snap.colors.primary}\`) | ${snap.typography.families.join(', ')} | ${snap.spacing.count} vals | ${snap.a11yScore ?? 'n/a'}% | ${snap.cssVarCount} |`);
  }
  lines.push('');

  // Detect changes between first and last snapshot
  if (history.length >= 2) {
    const first = history[history.length - 1]; // oldest (reversed)
    const last = history[0]; // newest

    lines.push('## Changes Over Time');
    lines.push('');
    if (first.colors.primary !== last.colors.primary) {
      lines.push(`- **Primary color changed:** \`${first.colors.primary}\` → \`${last.colors.primary}\``);
    }
    if (first.typography.families.join(',') !== last.typography.families.join(',')) {
      lines.push(`- **Fonts changed:** ${first.typography.families.join(', ')} → ${last.typography.families.join(', ')}`);
    }
    if (first.colors.count !== last.colors.count) {
      lines.push(`- **Color count:** ${first.colors.count} → ${last.colors.count}`);
    }
    if (first.a11yScore !== last.a11yScore) {
      lines.push(`- **A11y score:** ${first.a11yScore}% → ${last.a11yScore}%`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
