// Sync command — watch a live site and auto-update local tokens when design changes

import { extractDesignLanguage } from './index.js';
import { formatTokens } from './formatters/tokens.js';
import { formatTailwind } from './formatters/tailwind.js';
import { formatCssVars } from './formatters/css-vars.js';
import { saveSnapshot, getHistory } from './history.js';
import { openSync, closeSync, ftruncateSync, writeSync } from 'fs';
import { join } from 'path';

// Race-free "update only if file exists" — open with 'r+' atomically
// requires an existing file (throws ENOENT otherwise) and gives us a
// write-capable descriptor in one syscall, eliminating the toctou window
// that statSync→writeFileSync would have. Truncate then write through the
// same fd so no other process can sneak between check and write.
function updateIfExists(path, content) {
  let fd;
  try {
    fd = openSync(path, 'r+');
    ftruncateSync(fd, 0);
    writeSync(fd, content, 0, 'utf-8');
    return true;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd); } catch { /* best-effort close */ }
    }
  }
}

export async function syncDesign(url, options = {}) {
  const { out = '.', interval = 3600000 } = options; // default 1 hour

  const current = await extractDesignLanguage(url, options);
  const history = getHistory(url);
  const previous = history.length > 1 ? history[history.length - 2] : null;

  const changes = [];

  if (previous) {
    // Detect changes
    if (previous.colors.primary !== current.colors.primary?.hex) {
      changes.push({ type: 'color', property: 'primary', from: previous.colors.primary, to: current.colors.primary?.hex });
    }
    if (previous.colors.secondary !== current.colors.secondary?.hex) {
      changes.push({ type: 'color', property: 'secondary', from: previous.colors.secondary, to: current.colors.secondary?.hex });
    }
    if (previous.typography.families.join(',') !== current.typography.families.map(f => f.name).join(',')) {
      changes.push({ type: 'typography', property: 'fonts', from: previous.typography.families.join(', '), to: current.typography.families.map(f => f.name).join(', ') });
    }
    if (previous.colors.count !== current.colors.all.length) {
      changes.push({ type: 'color', property: 'count', from: String(previous.colors.count), to: String(current.colors.all.length) });
    }
    if (previous.a11yScore !== current.accessibility?.score) {
      changes.push({ type: 'accessibility', property: 'score', from: `${previous.a11yScore}%`, to: `${current.accessibility?.score}%` });
    }
  }

  // Save snapshot
  saveSnapshot(current);

  // Update local files
  const updates = [];

  if (updateIfExists(join(out, 'design-tokens.json'), formatTokens(current)))    updates.push('design-tokens.json');
  if (updateIfExists(join(out, 'tailwind.config.js'), formatTailwind(current)))  updates.push('tailwind.config.js');
  if (updateIfExists(join(out, 'variables.css'),     formatCssVars(current)))    updates.push('variables.css');

  return {
    changes,
    updatedFiles: updates,
    isFirstRun: !previous,
    design: current,
  };
}
