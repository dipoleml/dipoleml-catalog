// designlang DNA — corpus persistence.
//
// A corpus on disk outlives the code that wrote it, so loading one checks its
// version before anything is allowed to compare against it. A silently stale
// corpus is worse than no corpus: it still produces confident percentiles.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { VECTOR_VERSION } from './vector.js';

export function saveCorpus(file, corpus) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(corpus, null, 2));
  return file;
}

export function loadCorpus(file) {
  if (!existsSync(file)) return null;
  const corpus = JSON.parse(readFileSync(file, 'utf8'));
  if (corpus.version !== VECTOR_VERSION) {
    throw new Error(
      `DNA corpus at ${file} was built for vector version v${corpus.version}, but this build emits version v${VECTOR_VERSION}. `
      + 'Rebuild it with `designlang dna --build-corpus <urls...>`.',
    );
  }
  return corpus;
}
