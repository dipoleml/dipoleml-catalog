// Design vocabularies — opinionated token overlays applied during `designlang remix`.
//
// A vocabulary is a self-contained set of tokens + signature CSS that imposes
// a visual language on top of the page-shape (sections, voice, anatomy)
// extracted from a real URL. The output is a single HTML file: "what would
// stripe.com look like if it had been designed brutalist?"

import { brutalist } from './brutalist.js';
import { swiss } from './swiss.js';
import { artDeco } from './art-deco.js';
import { cyberpunk } from './cyberpunk.js';
import { softUi } from './soft-ui.js';
import { editorial } from './editorial.js';

export const VOCABULARIES = {
  brutalist,
  swiss,
  'art-deco': artDeco,
  cyberpunk,
  'soft-ui': softUi,
  editorial,
};

export function listVocabularies() {
  return Object.entries(VOCABULARIES).map(([id, v]) => ({ id, name: v.name, blurb: v.blurb }));
}

export function getVocabulary(id) {
  const v = VOCABULARIES[id];
  if (!v) {
    const available = Object.keys(VOCABULARIES).join(', ');
    throw new Error(`unknown vocabulary "${id}" — available: ${available}`);
  }
  return v;
}
