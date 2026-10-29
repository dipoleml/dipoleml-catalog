import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { extractDesignLanguage } from './index.js';
import { formatTailwind } from './formatters/tailwind.js';
import { formatCssVars } from './formatters/css-vars.js';
import { formatShadcnTheme } from './formatters/theme.js';

export async function applyDesign(url, options = {}) {
  const { dir = '.', framework } = options;
  const design = await extractDesignLanguage(url, options);
  const detected = framework || detectFramework(dir);
  const applied = [];

  if (detected === 'tailwind' || detected === 'auto') {
    const twPath = findFile(dir, ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs']);
    if (twPath) {
      writeFileSync(twPath, formatTailwind(design), 'utf-8');
      applied.push({ file: twPath, type: 'tailwind' });
    }
  }

  if (detected === 'shadcn' || detected === 'auto') {
    const globalsPath = findFile(dir, [
      'app/globals.css', 'src/app/globals.css', 'styles/globals.css',
      'src/styles/globals.css', 'src/index.css', 'app/global.css',
    ]);
    if (globalsPath) {
      const existing = readFileSync(globalsPath, 'utf-8');
      const shadcnVars = formatShadcnTheme(design);
      // Replace existing @layer base block or append
      const layerRegex = /@layer\s+base\s*\{[\s\S]*?\n\}/;
      const updated = layerRegex.test(existing)
        ? existing.replace(layerRegex, shadcnVars)
        : existing + '\n\n' + shadcnVars;
      writeFileSync(globalsPath, updated, 'utf-8');
      applied.push({ file: globalsPath, type: 'shadcn' });
    }
  }

  if (detected === 'css' || detected === 'auto') {
    const cssVarsContent = formatCssVars(design);
    const cssPath = join(dir, 'design-variables.css');
    writeFileSync(cssPath, cssVarsContent, 'utf-8');
    applied.push({ file: cssPath, type: 'css-variables' });
  }

  return { design, applied, framework: detected };
}

function detectFramework(dir) {
  if (findFile(dir, ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs'])) {
    // Check for shadcn
    if (findFile(dir, ['components.json'])) return 'shadcn';
    return 'tailwind';
  }
  return 'auto';
}

function findFile(dir, candidates) {
  for (const c of candidates) {
    const p = join(dir, c);
    if (existsSync(p)) return p;
  }
  return null;
}
