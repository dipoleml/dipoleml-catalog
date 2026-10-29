'use strict';

const fs = require('fs');
const { DESIGN } = require('../core/public-holdout/selection');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function goldMatrix(selection, limitPerStratum, offsetPerStratum = 0) {
  return DESIGN.feature_strata.flatMap((featureKey) => {
    const split = featureKey.slice(0, 2);
    return selection.ordered_candidates[split].filter((candidate) => candidate.feature_key === featureKey).slice(offsetPerStratum, offsetPerStratum + limitPerStratum).map((candidate) => ({ instance_id: candidate.instance_id, repo: candidate.repo, split, feature_key: featureKey, artifact_name: candidate.instance_id.replace(/[^A-Za-z0-9_.-]/g, '-') }));
  });
}

function predictionMatrix(predictions, pool) {
  const byId = new Map(pool.candidates.map((candidate) => [candidate.instance_id, candidate]));
  return Object.keys(predictions).sort().map((instanceId) => {
    const candidate = byId.get(instanceId);
    if (!candidate) throw new Error(`prediction instance absent from pool: ${instanceId}`);
    return { instance_id: instanceId, repo: candidate.repo, split: candidate.split, feature_key: candidate.public_features.feature_key, artifact_name: instanceId.replace(/[^A-Za-z0-9_.-]/g, '-') };
  });
}

function main() {
  const [mode, selectionFile, poolFile, predictionFile, limitText, offsetText] = process.argv.slice(2);
  const pool = readJson(poolFile);
  let matrix;
  if (mode === 'gold') matrix = goldMatrix(readJson(selectionFile), Number(limitText || 20), Number(offsetText || 0));
  else if (mode === 'prediction') matrix = predictionMatrix(readJson(predictionFile), pool);
  else throw new Error('mode must be gold or prediction');
  process.stdout.write(`matrix=${JSON.stringify({ include: matrix })}\n`);
  process.stdout.write(`count=${matrix.length}\n`);
}

if (require.main === module) main();
module.exports = Object.freeze({ goldMatrix, predictionMatrix });
