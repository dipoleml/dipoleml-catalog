'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { digest } = require('../operation-control/contracts');

const RETRIEVAL = Object.freeze({
  maximum_files: 12,
  maximum_total_characters: 60000,
  maximum_file_characters: 12000,
  maximum_file_bytes: 100000,
  excluded_directories: Object.freeze(['.git', '.hg', '.svn', 'build', 'coverage', 'dist', 'node_modules', 'vendor']),
  extensions: Object.freeze(['.cjs', '.js', '.jsx', '.json', '.md', '.mjs', '.ts', '.tsx', '.yaml', '.yml']),
  always_consider: Object.freeze(['package.json', 'tsconfig.json', 'jsconfig.json']),
  maximum_query_terms: 24,
  scoring_rule: 'explicit path/basename or adjacent issue-term match, then git-grep inverse-document-frequency evidence, path overlap, and capped content frequency; lexical tie by path',
});

const STOP = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'class', 'code', 'error', 'file', 'fix', 'for', 'from', 'function', 'in', 'is', 'it', 'issue', 'method', 'of', 'on', 'or', 'return', 'should', 'that', 'the', 'this', 'to', 'with']);

function tokens(value) {
  return String(value || '').toLowerCase().match(/[a-z0-9_$-]{2,}/g)?.filter((token) => !STOP.has(token)) || [];
}

function queryTerms(value) {
  const { base, adjacent } = queryParts(value);
  return [...new Set([...base, ...adjacent].filter((token) => token.length >= 3))].sort((left, right) => right.length - left.length || left.localeCompare(right)).slice(0, RETRIEVAL.maximum_query_terms);
}

function queryParts(value) {
  const base = tokens(value);
  const adjacent = base.slice(0, -1).map((token, index) => `${token}${base[index + 1]}`);
  return { base: [...new Set(base)], adjacent: [...new Set(adjacent)] };
}

function inventory(root) {
  const output = [];
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && RETRIEVAL.excluded_directories.includes(entry.name)) continue;
      const relative = path.posix.join(prefix, entry.name);
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute, relative);
      else if (entry.isFile()) {
        const extension = path.extname(entry.name).toLowerCase();
        if (!RETRIEVAL.extensions.includes(extension) && !RETRIEVAL.always_consider.includes(entry.name)) continue;
        const size = fs.statSync(absolute).size;
        if (size <= RETRIEVAL.maximum_file_bytes) output.push({ relative, absolute, size });
      }
    }
  }
  visit(root);
  return output;
}

function safeText(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.includes(0)) return null;
  return buffer.toString('utf8');
}

function scoreFile(file, problemStatement, grepEvidence = new Map()) {
  const issue = String(problemStatement || '').toLowerCase();
  const issueTokens = queryTerms(issue);
  const relative = file.relative.toLowerCase();
  const basename = path.posix.basename(relative);
  const pathTokens = new Set(tokens(relative));
  const content = safeText(file.absolute);
  if (content === null) return null;
  const lowerContent = content.toLowerCase();
  let score = 0;
  score += grepEvidence.get(file.relative) || 0;
  if (issue.includes(relative)) score += 1000;
  if (basename.length > 3 && issue.includes(basename)) score += 250;
  const compactPath = relative.replace(/[^a-z0-9]/g, '');
  const parts = queryParts(issue);
  if (parts.adjacent.some((token) => token.length >= 5 && compactPath.includes(token))) score += 2000 + (1000 / relative.split('/').length);
  else if (parts.base.some((token) => token.length >= 5 && compactPath.includes(token))) score += 250;
  for (const token of issueTokens) {
    if (pathTokens.has(token)) score += 25;
    const matches = lowerContent.split(token).length - 1;
    score += Math.min(matches, 8);
  }
  if (RETRIEVAL.always_consider.includes(basename)) score += 2;
  return { ...file, content, score };
}

function grepEvidence(root, problemStatement) {
  const evidence = new Map();
  for (const term of queryTerms(problemStatement)) {
    const result = childProcess.spawnSync('git', ['grep', '-l', '-I', '-F', '-e', term, '--', '*.cjs', '*.js', '*.jsx', '*.json', '*.md', '*.mjs', '*.ts', '*.tsx', '*.yaml', '*.yml'], { cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
    if (![0, 1].includes(result.status)) continue;
    const paths = String(result.stdout || '').split(/\r?\n/).filter(Boolean).map((value) => value.replace(/\\/g, '/'));
    if (!paths.length) continue;
    const weight = Math.log(1 + (10000 / paths.length)) * 20;
    for (const relative of paths) evidence.set(relative, (evidence.get(relative) || 0) + weight);
  }
  return evidence;
}

function retrieve(root, task) {
  const evidence = grepEvidence(root, task.problem_statement);
  const ranked = inventory(root).map((file) => scoreFile(file, task.problem_statement, evidence)).filter(Boolean).filter((file) => file.score > 0).sort((left, right) => right.score - left.score || left.relative.localeCompare(right.relative));
  const selected = [];
  let characters = 0;
  for (const file of ranked) {
    if (selected.length >= RETRIEVAL.maximum_files) break;
    const content = file.content.slice(0, RETRIEVAL.maximum_file_characters);
    if (characters + content.length > RETRIEVAL.maximum_total_characters) continue;
    selected.push(Object.freeze({ path: file.relative, score: file.score, truncated: content.length < file.content.length, content, content_digest: digest(content) }));
    characters += content.length;
  }
  const unsigned = {
    schema: 1,
    kind: 'citadel_public_holdout_retrieval',
    retrieval_id: null,
    instance_id: task.instance_id,
    contract: RETRIEVAL,
    inventory_count: ranked.length,
    selected_file_count: selected.length,
    selected_character_count: characters,
    files: selected,
  };
  return Object.freeze({ ...unsigned, retrieval_id: digest(unsigned) });
}

module.exports = Object.freeze({ RETRIEVAL, grepEvidence, inventory, queryParts, queryTerms, retrieve, safeText, scoreFile, tokens });
