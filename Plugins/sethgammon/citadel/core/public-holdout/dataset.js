'use strict';

const { digest } = require('../operation-control/contracts');

const DATASET = Object.freeze({
  id: 'SWE-bench-Live/MultiLang',
  config: 'default',
  revision: 'main',
  source: 'https://huggingface.co/datasets/SWE-bench-Live/MultiLang',
  rows_api: 'https://datasets-server.huggingface.co/rows',
  splits: Object.freeze(['js', 'ts']),
});

const ELIGIBILITY = Object.freeze({
  created_on_or_after: '2025-01-01T00:00:00.000Z',
  minimum_problem_characters: 80,
  maximum_problem_characters: 16000,
  maximum_gold_changed_paths: 8,
  maximum_gold_changed_lines: 400,
  allowed_source_extensions: Object.freeze([
    '.cjs', '.js', '.jsx', '.json', '.mjs', '.ts', '.tsx',
  ]),
});

function canonicalRow(row) {
  return {
    repo: row.repo,
    pull_number: String(row.pull_number),
    instance_id: row.instance_id,
    issue_numbers: Array.isArray(row.issue_numbers) ? [...row.issue_numbers].map(String) : [],
    base_commit: row.base_commit,
    patch: row.patch,
    test_patch: row.test_patch,
    problem_statement: row.problem_statement,
    hints_text: row.hints_text || '',
    all_hints_text: row.all_hints_text || '',
    commit_urls: Array.isArray(row.commit_urls) ? [...row.commit_urls] : [],
    created_at: row.created_at,
    commit_url: row.commit_url || '',
    rebuild_cmds: Array.isArray(row.rebuild_cmds) ? [...row.rebuild_cmds] : [],
    test_cmds: Array.isArray(row.test_cmds) ? [...row.test_cmds] : [],
    print_cmds: Array.isArray(row.print_cmds) ? [...row.print_cmds] : [],
    log_parser: row.log_parser || '',
    FAIL_TO_PASS: Array.isArray(row.FAIL_TO_PASS) ? [...row.FAIL_TO_PASS] : [],
    PASS_TO_PASS: Array.isArray(row.PASS_TO_PASS) ? [...row.PASS_TO_PASS] : [],
    docker_image: row.docker_image || '',
  };
}

function diffStats(patch) {
  const paths = [];
  let additions = 0;
  let deletions = 0;
  let creates_file = false;
  let deletes_file = false;
  for (const line of String(patch || '').split(/\r?\n/)) {
    const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (match) paths.push(match[2]);
    else if (line.startsWith('+') && !line.startsWith('+++')) additions += 1;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions += 1;
    if (line === '--- /dev/null') creates_file = true;
    if (line === '+++ /dev/null') deletes_file = true;
  }
  return Object.freeze({
    changed_paths: [...new Set(paths)].sort(),
    additions,
    deletions,
    changed_lines: additions + deletions,
    creates_file,
    deletes_file,
  });
}

function sourcePath(pathname) {
  const normalized = String(pathname).toLowerCase();
  if (/(^|\/)(__tests__|test|tests|spec|specs|fixtures?)\//.test(normalized)) return false;
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(normalized)) return false;
  return ELIGIBILITY.allowed_source_extensions.some((extension) => normalized.endsWith(extension));
}

function eligibilityFor(row) {
  const reasons = [];
  const gold = diffStats(row.patch);
  const created = Date.parse(row.created_at);
  const statementLength = String(row.problem_statement || '').trim().length;
  if (!row.repo || !row.instance_id || !row.base_commit) reasons.push('IDENTITY_INCOMPLETE');
  if (!Number.isFinite(created) || created < Date.parse(ELIGIBILITY.created_on_or_after)) reasons.push('OUTSIDE_DATE_WINDOW');
  if (statementLength < ELIGIBILITY.minimum_problem_characters) reasons.push('PROBLEM_TOO_SHORT');
  if (statementLength > ELIGIBILITY.maximum_problem_characters) reasons.push('PROBLEM_TOO_LONG');
  if (!String(row.patch || '').trim()) reasons.push('GOLD_PATCH_MISSING');
  if (!String(row.test_patch || '').trim()) reasons.push('TEST_PATCH_MISSING');
  if (!Array.isArray(row.FAIL_TO_PASS) || row.FAIL_TO_PASS.length === 0) reasons.push('FAIL_TO_PASS_MISSING');
  if (gold.changed_paths.length === 0) reasons.push('GOLD_CHANGED_PATHS_MISSING');
  if (gold.changed_paths.length > ELIGIBILITY.maximum_gold_changed_paths) reasons.push('GOLD_TOO_MANY_PATHS');
  if (gold.changed_lines > ELIGIBILITY.maximum_gold_changed_lines) reasons.push('GOLD_TOO_MANY_LINES');
  if (gold.creates_file || gold.deletes_file) reasons.push('GOLD_CREATES_OR_DELETES_FILE');
  if (!gold.changed_paths.some(sourcePath)) reasons.push('NO_PRODUCT_SOURCE_CHANGE');
  return Object.freeze({ eligible: reasons.length === 0, reason_codes: reasons, gold });
}

function publicFeatures(row, split) {
  const words = String(row.problem_statement || '').trim().split(/\s+/).filter(Boolean).length;
  return Object.freeze({
    language: split,
    issue_word_count: words,
    issue_size: words <= 150 ? 'short' : 'long',
    feature_key: `${split}.issue-${words <= 150 ? 'short' : 'long'}`,
  });
}

function candidateFromRow(entry, split) {
  if (!entry || !Number.isInteger(entry.row_idx) || !entry.row) throw new TypeError('dataset row entry is invalid');
  if (!DATASET.splits.includes(split)) throw new TypeError(`unsupported split: ${split}`);
  const row = canonicalRow(entry.row);
  const eligibility = eligibilityFor(row);
  return Object.freeze({
    schema: 1,
    dataset_id: DATASET.id,
    dataset_revision: DATASET.revision,
    split,
    row_index: entry.row_idx,
    instance_id: row.instance_id,
    repo: row.repo,
    pull_number: row.pull_number,
    base_commit: row.base_commit,
    created_at: row.created_at,
    docker_image: row.docker_image,
    public_features: publicFeatures(row, split),
    source_row_digest: digest(row),
    problem_statement_digest: digest(row.problem_statement),
    gold_patch_digest: digest(row.patch),
    test_patch_digest: digest(row.test_patch),
    gold_scope: eligibility.gold,
    eligible: eligibility.eligible,
    exclusion_reason_codes: eligibility.reason_codes,
  });
}

async function fetchJson(url, fetchImpl = global.fetch) {
  const response = await fetchImpl(url, { headers: { 'user-agent': 'citadel-public-holdout/1' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

async function fetchSplit(split, fetchImpl = global.fetch) {
  if (!DATASET.splits.includes(split)) throw new TypeError(`unsupported split: ${split}`);
  const rows = [];
  const length = 100;
  for (let offset = 0; ; offset += length) {
    const query = new URLSearchParams({
      dataset: DATASET.id,
      config: DATASET.config,
      split,
      offset: String(offset),
      length: String(length),
    });
    const page = await fetchJson(`${DATASET.rows_api}?${query}`, fetchImpl);
    if (!Array.isArray(page.rows)) throw new Error(`dataset rows missing for ${split}/${offset}`);
    rows.push(...page.rows);
    if (rows.length >= page.num_rows_total || page.rows.length < length) break;
  }
  return rows;
}

function buildPool(splitRows, observedAt = new Date().toISOString()) {
  const candidates = DATASET.splits.flatMap((split) => {
    const rows = splitRows[split];
    if (!Array.isArray(rows)) throw new TypeError(`rows missing for split ${split}`);
    return rows.map((entry) => candidateFromRow(entry, split));
  }).sort((left, right) => left.instance_id.localeCompare(right.instance_id));
  const duplicate = candidates.find((candidate, index) => candidates.findIndex((item) => item.instance_id === candidate.instance_id) !== index);
  if (duplicate) throw new Error(`duplicate instance_id: ${duplicate.instance_id}`);
  const bySplit = Object.fromEntries(DATASET.splits.map((split) => {
    const values = candidates.filter((candidate) => candidate.split === split);
    return [split, {
      total: values.length,
      eligible: values.filter((candidate) => candidate.eligible).length,
      excluded: values.filter((candidate) => !candidate.eligible).length,
    }];
  }));
  const exclusionReasons = {};
  for (const candidate of candidates) for (const reason of candidate.exclusion_reason_codes) exclusionReasons[reason] = (exclusionReasons[reason] || 0) + 1;
  const unsigned = {
    schema: 1,
    kind: 'citadel_public_holdout_candidate_pool',
    pool_id: null,
    observed_at: observedAt,
    dataset: DATASET,
    eligibility_contract: ELIGIBILITY,
    counts: { total: candidates.length, eligible: candidates.filter((candidate) => candidate.eligible).length, by_split: bySplit, exclusion_reasons: exclusionReasons },
    candidates,
  };
  return Object.freeze({ ...unsigned, pool_id: digest(unsigned) });
}

function validatePool(pool) {
  if (!pool || pool.schema !== 1 || pool.kind !== 'citadel_public_holdout_candidate_pool') throw new TypeError('candidate pool identity invalid');
  if (pool.pool_id !== digest({ ...pool, pool_id: null })) throw new Error('candidate pool digest mismatch');
  if (JSON.stringify(pool.dataset) !== JSON.stringify(DATASET) || JSON.stringify(pool.eligibility_contract) !== JSON.stringify(ELIGIBILITY)) throw new Error('candidate pool contract drifted');
  for (const candidate of pool.candidates) {
    if (!DATASET.splits.includes(candidate.split) || typeof candidate.instance_id !== 'string' || typeof candidate.source_row_digest !== 'string') throw new Error('candidate pool entry invalid');
  }
  const total = pool.candidates.length;
  const eligible = pool.candidates.filter((candidate) => candidate.eligible).length;
  if (pool.counts.total !== total || pool.counts.eligible !== eligible) throw new Error('candidate pool counts drifted');
  return pool;
}

function visibleTask(entry, split) {
  const row = canonicalRow(entry.row);
  const candidate = candidateFromRow(entry, split);
  return Object.freeze({
    schema: 1,
    instance_id: candidate.instance_id,
    split,
    row_index: candidate.row_index,
    repo: candidate.repo,
    pull_number: candidate.pull_number,
    base_commit: candidate.base_commit,
    created_at: candidate.created_at,
    docker_image: candidate.docker_image,
    problem_statement: row.problem_statement,
    public_features: candidate.public_features,
    source_row_digest: candidate.source_row_digest,
    problem_statement_digest: candidate.problem_statement_digest,
    hidden_artifact_digests: {
      gold_patch: candidate.gold_patch_digest,
      test_patch: candidate.test_patch_digest,
    },
  });
}

module.exports = Object.freeze({
  DATASET,
  ELIGIBILITY,
  buildPool,
  candidateFromRow,
  canonicalRow,
  diffStats,
  eligibilityFor,
  fetchSplit,
  publicFeatures,
  sourcePath,
  validatePool,
  visibleTask,
});
