// designlang DNA — the run.
//
// Extract a site, place it in the design space, and say where it landed.
// Everything interesting happens in the pure modules beside this one; this
// file only does IO and assembly.

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

import { designVector } from './vector.js';
import { nearest } from './distance.js';
import { buildCorpus, percentiles, outliers } from './corpus.js';
import { loadCorpus, saveCorpus } from './store.js';
import { formatDnaMarkdown } from './report.js';

const HERE = dirname(fileURLToPath(import.meta.url));

// The corpus that ships with the package. Absent in a fresh checkout until
// `--build-corpus` has been run, which is why every consumer treats a missing
// corpus as "no reference frame" rather than an error.
export const DEFAULT_CORPUS = join(HERE, 'corpus.default.json');

export function analyze(design, corpus) {
  const vector = designVector(design);
  if (!corpus) return { vector, corpus: null, neighbours: [], percentiles: null, outliers: [] };

  return {
    vector,
    corpus,
    neighbours: nearest(vector, corpus.entries),
    percentiles: percentiles(vector, corpus),
    outliers: outliers(vector, corpus),
  };
}

export function writeDnaOutputs({ analysis, outDir, prefix }) {
  mkdirSync(outDir, { recursive: true });
  const written = [];

  const jsonPath = join(outDir, `${prefix}.dna.json`);
  writeFileSync(jsonPath, JSON.stringify({
    version: analysis.vector.version,
    url: analysis.vector.url,
    coverage: analysis.vector.coverage,
    order: analysis.vector.order,
    values: analysis.vector.values,
    raw: analysis.vector.raw,
    corpus: analysis.corpus ? { name: analysis.corpus.name, size: analysis.corpus.size } : null,
    neighbours: analysis.neighbours,
    percentiles: analysis.percentiles,
    outliers: analysis.outliers,
  }, null, 2));
  written.push(jsonPath);

  if (analysis.corpus) {
    const mdPath = join(outDir, `${prefix}.dna.md`);
    writeFileSync(mdPath, formatDnaMarkdown(analysis));
    written.push(mdPath);
  }

  return written;
}

// Build a corpus from already-extracted designs and persist it.
export function buildAndSaveCorpus(designs, file, { name = 'default' } = {}) {
  const corpus = buildCorpus(designs.map(designVector), { name });
  saveCorpus(file, corpus);
  return corpus;
}

export { loadCorpus, designVector, formatDnaMarkdown };
