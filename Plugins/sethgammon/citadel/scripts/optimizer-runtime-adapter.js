#!/usr/bin/env node
'use strict';

// This adapter is deliberately self-contained. Executor profiles bind the
// SHA-256 digest of these exact bytes, so runtime invocation, telemetry
// parsing, and cost derivation cannot drift behind an unchanged profile.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const INPUT_FIELDS = Object.freeze([
  'schema',
  'scenario_id',
  'policy_id',
  'repetition',
  'task',
  'allowed_tools',
  'timeout_minutes',
  'repository_path',
  'output_path',
  'profile',
  'pricing_snapshot',
  'probe',
  'decision',
]);
const PROFILE_FIELDS = Object.freeze([
  'schema',
  'profile_id',
  'runtime',
  'provider',
  'model',
  'tier',
  'executor_profile_digest',
  'adapter_digest',
  'capabilities',
  'priors',
]);
const PRICING_FIELDS = Object.freeze([
  'schema', 'currency', 'observed_at', 'source_url', 'billing_basis', 'models',
]);
const PRICE_FIELDS = Object.freeze([
  'provider',
  'model',
  'input_per_million_usd',
  'cached_input_per_million_usd',
  'output_per_million_usd',
  'standard_input_limit_tokens',
  'over_limit_input_multiplier',
  'over_limit_output_multiplier',
]);
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/;
const THREAD_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLAUDE_ALLOWED_TOOLS = 'Read,Edit,Write,Glob,Grep,Bash(node *),Bash(npm *),Bash(npx *),Bash(git diff *),Bash(git status *),Bash(git rev-parse *)';

function exactFields(value, fields) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

function safeInput(value) {
  if (!exactFields(value, INPUT_FIELDS) || value.schema !== 1) throw new Error('Adapter input fields are invalid');
  if (!exactFields(value.profile, PROFILE_FIELDS)) throw new Error('Adapter profile fields are invalid');
  if (!['claude', 'codex'].includes(value.profile.runtime)
    || !MODEL_PATTERN.test(value.profile.model)
    || typeof value.repository_path !== 'string'
    || !path.isAbsolute(value.repository_path)
    || typeof value.output_path !== 'string'
    || !path.isAbsolute(value.output_path)
    || typeof value.task !== 'string'
    || value.task.length === 0
    || value.task.length > 12000) {
    throw new Error('Adapter input is invalid');
  }
  return value;
}

function pathEntries(env) {
  return String(env.PATH || env.Path || '').split(path.delimiter).filter(Boolean);
}

function candidateDirectories(command, env) {
  const directories = [];
  if (['codex', 'claude'].includes(command)
    && typeof env.APPDATA === 'string'
    && path.isAbsolute(env.APPDATA)
    && !/[\r\n\0]/.test(env.APPDATA)) {
    directories.push(path.join(env.APPDATA, 'npm'));
  }
  directories.push(...pathEntries(env));
  const seen = new Set();
  return directories.filter((directory) => {
    const key = process.platform === 'win32' ? directory.toLowerCase() : directory;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findOnPath(command, env) {
  if (command.includes('/') || command.includes('\\') || path.isAbsolute(command)) {
    return fs.existsSync(command) ? command : null;
  }
  for (const directory of candidateDirectories(command, env)) {
    for (const extension of ['.exe', '.com', '.cmd', '.bat']) {
      const candidate = path.join(directory, `${command}${extension}`);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch (_error) { /* keep looking */ }
    }
  }
  return null;
}

function nodeEntrypoint(command, resolved) {
  const root = path.dirname(resolved);
  if (command === 'codex') return path.join(root, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  if (command === 'claude') return path.join(root, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
  return null;
}

function platformInvocation(invocation, env = process.env) {
  if (process.platform !== 'win32') return invocation;
  const resolved = findOnPath(invocation.command, env);
  if (!resolved) return invocation;
  if (!['.cmd', '.bat'].includes(path.extname(resolved).toLowerCase())) {
    return { command: resolved, args: [...invocation.args] };
  }
  const entrypoint = nodeEntrypoint(invocation.command, resolved);
  if (!entrypoint || !fs.existsSync(entrypoint)) throw new Error('Executor shim has no trusted direct entrypoint');
  return { command: process.execPath, args: [entrypoint, ...invocation.args] };
}

function invocationFor(profile) {
  if (profile.runtime === 'claude') {
    return {
      command: 'claude',
      args: [
        '--print',
        '--output-format', 'json',
        '--permission-mode', 'acceptEdits',
        '--allowedTools', CLAUDE_ALLOWED_TOOLS,
        '--model', profile.model,
      ],
    };
  }
  return {
    command: 'codex',
    args: [
      'exec',
      '--json',
      '--sandbox', 'workspace-write',
      '--ignore-user-config',
      '--model', profile.model,
      '-',
    ],
  };
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function usageOf(value) {
  if (!value || typeof value !== 'object') return null;
  const input = nonNegativeInteger(Number(value.input_tokens));
  const output = nonNegativeInteger(Number(value.output_tokens));
  const cached = value.cached_input_tokens === undefined
    ? nonNegativeInteger(Number(value.cache_read_input_tokens || 0))
    : nonNegativeInteger(Number(value.cached_input_tokens));
  if (input === null || output === null || cached === null || cached > input) return null;
  return { input_tokens: input, cached_input_tokens: cached, output_tokens: output };
}

function containedRealFile(root, candidate) {
  try {
    if (fs.lstatSync(candidate).isSymbolicLink()) return null;
    const realRoot = fs.realpathSync(root);
    const realCandidate = fs.realpathSync(candidate);
    const relative = path.relative(realRoot, realCandidate);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return realCandidate;
  } catch (_error) {
    return null;
  }
}

function findClaudeSessionFile(sessionId, env = process.env) {
  if (!THREAD_PATTERN.test(sessionId)) return null;
  const claudeRoot = env.CLAUDE_CONFIG_DIR
    || ((env.USERPROFILE || env.HOME) ? path.join(env.USERPROFILE || env.HOME, '.claude') : null);
  if (!claudeRoot) return null;
  const projects = path.resolve(claudeRoot, 'projects');
  try {
    if (!fs.statSync(projects).isDirectory() || fs.lstatSync(projects).isSymbolicLink()) return null;
  } catch (_error) {
    return null;
  }
  const target = `${sessionId}.jsonl`.toLowerCase();
  const stack = [projects];
  let scanned = 0;
  let match = null;
  while (stack.length) {
    const directory = stack.pop();
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch (_error) { return null; }
    for (const entry of entries) {
      scanned += 1;
      if (scanned > 20000) return null;
      if (entry.isSymbolicLink()) continue;
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) stack.push(candidate);
      else if (entry.isFile() && entry.name.toLowerCase() === target) {
        const contained = containedRealFile(projects, candidate);
        if (!contained || match !== null) return null;
        match = contained;
      }
    }
  }
  return match;
}

function claudeSessionModel(sessionId, repositoryPath, env = process.env) {
  const file = findClaudeSessionFile(sessionId, env);
  if (!file) return null;
  let expected;
  try { expected = fs.realpathSync(repositoryPath); } catch (_error) { return null; }
  let descriptor;
  try {
    descriptor = fs.openSync(file, 'r');
    const size = Math.min(fs.fstatSync(descriptor).size, 4 * 1024 * 1024);
    const buffer = Buffer.alloc(size);
    const bytes = fs.readSync(descriptor, buffer, 0, size, 0);
    const models = new Set();
    for (const line of buffer.subarray(0, bytes).toString('utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      let event;
      try { event = JSON.parse(line); } catch (_error) { continue; }
      if (!event || event.type !== 'assistant' || !event.message) continue;
      if (typeof event.cwd !== 'string' || typeof event.message.model !== 'string') continue;
      let eventCwd;
      try { eventCwd = fs.realpathSync(event.cwd); } catch (_error) { continue; }
      if (eventCwd === expected && MODEL_PATTERN.test(event.message.model)) {
        models.add(event.message.model);
      }
    }
    return models.size === 1 ? [...models][0] : null;
  } catch (_error) {
    return null;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function claudeObservation(stdout, repositoryPath, env = process.env) {
  let payload;
  try { payload = JSON.parse(stdout); } catch (_error) { return null; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const usageModels = payload.modelUsage && typeof payload.modelUsage === 'object'
    ? Object.keys(payload.modelUsage) : [];
  let model = typeof payload.model === 'string' && MODEL_PATTERN.test(payload.model) ? payload.model
    : usageModels.length === 1 && MODEL_PATTERN.test(usageModels[0]) ? usageModels[0] : null;
  let source = 'claude-json';
  const sessionId = payload.session_id || payload.sessionId;
  if (model === null && THREAD_PATTERN.test(sessionId || '')) {
    model = claudeSessionModel(sessionId, repositoryPath, env);
    if (model !== null) source = 'claude-json+session-jsonl';
  }
  const amount = Number(payload.total_cost_usd);
  return {
    model,
    usage: usageOf(payload.usage),
    vendor_cost_usd: Number.isFinite(amount) && amount >= 0 ? amount : null,
    source,
    trusted: true,
  };
}

function findCodexSessionFile(threadId, env = process.env) {
  if (!THREAD_PATTERN.test(threadId)) return null;
  const userRoot = env.CODEX_HOME
    || ((env.USERPROFILE || env.HOME) ? path.join(env.USERPROFILE || env.HOME, '.codex') : null);
  if (!userRoot) return null;
  const sessions = path.resolve(userRoot, 'sessions');
  try {
    if (!fs.statSync(sessions).isDirectory() || fs.lstatSync(sessions).isSymbolicLink()) return null;
  } catch (_error) {
    return null;
  }
  const suffix = `-${threadId}.jsonl`.toLowerCase();
  const stack = [sessions];
  let scanned = 0;
  let match = null;
  while (stack.length) {
    const directory = stack.pop();
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch (_error) { return null; }
    for (const entry of entries) {
      scanned += 1;
      if (scanned > 20000) return null;
      if (entry.isSymbolicLink()) continue;
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) stack.push(candidate);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(suffix)) {
        const contained = containedRealFile(sessions, candidate);
        if (!contained || match !== null) return null;
        match = contained;
      }
    }
  }
  return match;
}

function codexSessionModel(threadId, repositoryPath, env = process.env) {
  const file = findCodexSessionFile(threadId, env);
  if (!file) return null;
  let expected;
  try { expected = fs.realpathSync(repositoryPath); } catch (_error) { return null; }
  let descriptor;
  try {
    descriptor = fs.openSync(file, 'r');
    const size = Math.min(fs.fstatSync(descriptor).size, 2 * 1024 * 1024);
    const buffer = Buffer.alloc(size);
    const bytes = fs.readSync(descriptor, buffer, 0, size, 0);
    let observed = null;
    for (const line of buffer.subarray(0, bytes).toString('utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      let event;
      try { event = JSON.parse(line); } catch (_error) { continue; }
      if (!event || event.type !== 'turn_context' || !event.payload) continue;
      if (typeof event.payload.cwd !== 'string' || typeof event.payload.model !== 'string') continue;
      let eventCwd;
      try { eventCwd = fs.realpathSync(event.payload.cwd); } catch (_error) { continue; }
      if (eventCwd === expected && MODEL_PATTERN.test(event.payload.model)) observed = event.payload.model;
    }
    return observed;
  } catch (_error) {
    return null;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function codexObservation(stdout, repositoryPath, env = process.env) {
  let model = null;
  let usage = null;
  let threadId = null;
  for (const line of String(stdout || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch (_error) { continue; }
    if (!event || typeof event !== 'object') continue;
    const body = event.msg && typeof event.msg === 'object' ? event.msg : event;
    if (event.type === 'thread.started' && THREAD_PATTERN.test(event.thread_id || '')) threadId = event.thread_id;
    if (typeof body.model === 'string' && MODEL_PATTERN.test(body.model)) model = body.model;
    if (event.type === 'turn.completed') usage = usageOf(event.usage) || usage;
  }
  if (model === null && threadId !== null) model = codexSessionModel(threadId, repositoryPath, env);
  if (model === null && usage === null) return null;
  return { model, usage, vendor_cost_usd: null, source: 'codex-jsonl', trusted: true };
}

function unknownCost(source, sourceRef) {
  return {
    status: 'unknown',
    amount_usd: null,
    provenance: 'unknown',
    source,
    source_ref: sourceRef,
    pricing_snapshot_digest: null,
    components: [],
  };
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return `sha256:${require('crypto').createHash('sha256').update(canonical(value)).digest('hex')}`;
}

function validatePricing(snapshot) {
  if (!exactFields(snapshot, PRICING_FIELDS)
    || snapshot.schema !== 1
    || snapshot.currency !== 'USD'
    || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.observed_at)
    || typeof snapshot.source_url !== 'string'
    || !/^https:\/\//.test(snapshot.source_url)
    || !['official_api_list_price', 'contracted_rate', 'invoice_export'].includes(snapshot.billing_basis)
    || !Array.isArray(snapshot.models)) {
    return false;
  }
  return snapshot.models.every((item) => exactFields(item, PRICE_FIELDS)
    && typeof item.provider === 'string'
    && typeof item.model === 'string'
    && MODEL_PATTERN.test(item.model)
    && PRICE_FIELDS.slice(2, 5).every((field) => Number.isFinite(item[field]) && item[field] >= 0)
    && (
      (item.standard_input_limit_tokens === null
        && item.over_limit_input_multiplier === null
        && item.over_limit_output_multiplier === null)
      || (Number.isInteger(item.standard_input_limit_tokens)
        && item.standard_input_limit_tokens > 0
        && Number.isFinite(item.over_limit_input_multiplier)
        && item.over_limit_input_multiplier >= 1
        && Number.isFinite(item.over_limit_output_multiplier)
        && item.over_limit_output_multiplier >= 1)
    ));
}

function costForObservation(profile, observation, pricingSnapshot) {
  if (!observation || observation.trusted !== true) {
    return unknownCost('runtime_adapter', 'runtime_telemetry_unavailable');
  }
  if (profile.runtime === 'claude' && observation.vendor_cost_usd !== null) {
    return {
      status: 'known',
      amount_usd: observation.vendor_cost_usd,
      provenance: 'vendor_reported',
      source: 'claude_json',
      source_ref: 'claude --output-format json total_cost_usd',
      pricing_snapshot_digest: null,
      components: [{
        kind: 'model',
        amount_usd: observation.vendor_cost_usd,
        source: 'claude total_cost_usd',
      }],
    };
  }
  if (!validatePricing(pricingSnapshot) || !observation.usage) {
    return unknownCost('runtime_adapter', 'pricing_or_token_usage_unavailable');
  }
  const price = pricingSnapshot.models.find((item) => (
    item.provider === profile.provider && item.model === profile.model
  ));
  if (!price) return unknownCost('runtime_adapter', 'model_missing_from_pricing_snapshot');
  const usage = observation.usage;
  const uncached = usage.input_tokens - usage.cached_input_tokens;
  const overLimit = price.standard_input_limit_tokens !== null
    && usage.input_tokens > price.standard_input_limit_tokens;
  const inputMultiplier = overLimit ? price.over_limit_input_multiplier : 1;
  const outputMultiplier = overLimit ? price.over_limit_output_multiplier : 1;
  const amount = Number(((
    uncached * price.input_per_million_usd * inputMultiplier
    + usage.cached_input_tokens * price.cached_input_per_million_usd * inputMultiplier
    + usage.output_tokens * price.output_per_million_usd * outputMultiplier
  ) / 1_000_000).toFixed(6));
  return {
    status: 'known',
    amount_usd: amount,
    provenance: 'price_derived',
    source: 'runtime_token_telemetry',
    source_ref: `${pricingSnapshot.source_url} observed ${pricingSnapshot.observed_at}; ${pricingSnapshot.billing_basis}`,
    pricing_snapshot_digest: sha256(pricingSnapshot),
    components: [{
      kind: 'model',
      amount_usd: amount,
      source: `${profile.provider}/${profile.model} token pricing`,
    }],
  };
}

function promptFor(input) {
  return [
    'Execute this frozen benchmark task in the current repository.',
    'Stay inside the repository. Do not commit, push, publish, deploy, or contact external systems.',
    'Make the smallest correct change and leave it in the working tree for independent verification.',
    '',
    `Task: ${input.task}`,
  ].join('\n');
}

function progressStatus(repositoryPath) {
  const result = spawnSync('git', ['diff', '--name-only', '--'], {
    cwd: repositoryPath,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: 10000,
  });
  if (result.status !== 0) return 'unknown';
  return String(result.stdout || '').trim() ? 'progress' : 'stalled';
}

function executeAdapter(input, options = {}) {
  safeInput(input);
  const invocation = platformInvocation(invocationFor(input.profile), options.env || process.env);
  const result = (options.spawn || spawnSync)(invocation.command, invocation.args, {
    cwd: input.repository_path,
    input: promptFor(input),
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: input.timeout_minutes * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024,
    env: options.env || process.env,
  });
  const observation = input.profile.runtime === 'claude'
    ? claudeObservation(result.stdout || '', input.repository_path, options.env || process.env)
    : codexObservation(result.stdout || '', input.repository_path, options.env || process.env);
  const observedModel = observation ? observation.model : null;
  const modelProof = observedModel === null ? 'unknown'
    : observedModel === input.profile.model ? 'passed' : 'failed';
  return {
    schema: 1,
    profile_id: input.profile.profile_id,
    requested_model: input.profile.model,
    observed_model: observedModel,
    model_proof_status: modelProof,
    receipt_status: result.status === 0 && observation && observation.trusted ? 'verified' : 'failed',
    cost: costForObservation(input.profile, observation, input.pricing_snapshot),
    human_interventions: 0,
    progress_status: progressStatus(input.repository_path),
  };
}

function main() {
  const inputFile = process.argv[2];
  if (!inputFile) throw new Error('Adapter input file is required');
  const input = safeInput(JSON.parse(fs.readFileSync(path.resolve(inputFile), 'utf8')));
  const output = executeAdapter(input);
  fs.writeFileSync(input.output_path, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Optimizer runtime adapter failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  claudeObservation,
  claudeSessionModel,
  codexObservation,
  costForObservation,
  executeAdapter,
  invocationFor,
  findClaudeSessionFile,
  safeInput,
  validatePricing,
});
