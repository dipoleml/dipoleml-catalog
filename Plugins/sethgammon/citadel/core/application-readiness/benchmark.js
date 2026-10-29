'use strict';

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const {
  canonical,
  digest,
  validateScenario,
} = require('../operation-control/contracts');
const {
  extractJsonObjects,
  signPayload,
  verifyScenarioOutput,
  verifySignature,
} = require('../operation-control/receipt');
const { taskFeatures } = require('../operation-control/policy');

const ROOT = path.resolve(__dirname, '..', '..');
const BENCHMARK = path.join(ROOT, 'benchmarks', 'sentient-readiness');
const METHOD_FILE = path.join(BENCHMARK, 'METHOD.md');
const SCENARIOS_FILE = path.join(BENCHMARK, 'scenarios.json');
const FREEZE_FILE = path.join(BENCHMARK, 'freeze.json');
const DEFAULT_OUTPUT = path.join(BENCHMARK, 'published-run');
const DEFAULT_KEY = path.join(os.tmpdir(), 'citadel-sentient-readiness-ed25519.pem');
const OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';
const SEED = 'citadel-sentient-readiness-v1-2026-07-31';
const REPETITIONS = 3;
const POLICIES = Object.freeze(['always-strong-local', 'citadel-adaptive-local']);
const MODELS = Object.freeze({
  cheap: Object.freeze({
    provider: 'ollama',
    model: 'qwen2.5-coder:3b',
    model_digest: 'sha256:f72c60cabf6237b07f6e632b2c48d533cef25eda2efbd34bed21c5e9c01e6225',
    parameter_size: '3.1B',
    quantization: 'Q4_K_M',
  }),
  strong: Object.freeze({
    provider: 'ollama',
    model: 'qwen2.5-coder:7b',
    model_digest: 'sha256:dae161e27b0e90dd1856c8bb3209201fd6736d8eb66298e75ed87571486f4364',
    parameter_size: '7.6B',
    quantization: 'Q4_K_M',
  }),
});
const ECONOMICS = Object.freeze({
  electricity_usd_per_kwh: 0.20,
  gpu_residual_value_usd: 100,
  gpu_useful_compute_hours: 10000,
  setup_and_download_costs_included: false,
  whole_system_energy_status: 'unknown',
});
const GATES = Object.freeze({
  quality_floor_relative_to_strong: 0.95,
  minimum_gpu_energy_reduction: 0.30,
  minimum_modeled_cost_reduction: 0.30,
  zero_false_passes_required: true,
  zero_integrity_failures_required: true,
});
const SOURCE_FILES = Object.freeze([
  'benchmarks/sentient-readiness/METHOD.md',
  'benchmarks/sentient-readiness/scenarios.json',
  'core/application-readiness/benchmark.js',
  'scripts/application-readiness-benchmark.js',
  'scripts/test-application-readiness.js',
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizedSource(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');
}

function sourceDigests() {
  return Object.fromEntries(SOURCE_FILES.map((file) => [file, digest(normalizedSource(file))]));
}

function scenarios() {
  const values = readJson(SCENARIOS_FILE);
  if (!Array.isArray(values) || values.length !== 12) throw new Error('readiness scenario set must contain exactly 12 scenarios');
  values.forEach((scenario, index) => validateScenario(scenario, `scenarios[${index}]`));
  if (values.some((scenario) => scenario.holdout !== true)) throw new Error('every readiness scenario must be a holdout');
  if (new Set(values.map((scenario) => scenario.id)).size !== values.length) throw new Error('readiness scenario ids must be unique');
  return values;
}

function routeFor(policyId, task) {
  if (!POLICIES.includes(policyId)) throw new Error(`unsupported readiness policy: ${policyId}`);
  const features = taskFeatures(task);
  if (policyId === 'always-strong-local') {
    return Object.freeze({ initial_tier: 'strong', escalation_tier: null, features, reason_code: 'BASELINE_ALWAYS_STRONG' });
  }
  const compact = features.difficulty_score < 0.20;
  return Object.freeze({
    initial_tier: compact ? 'cheap' : 'strong',
    escalation_tier: compact ? 'strong' : null,
    features,
    reason_code: compact ? 'ADAPTIVE_COMPACT_LOCAL' : 'ADAPTIVE_STRONG_LOCAL',
  });
}

function stableSchedule(values = scenarios()) {
  return values.flatMap((scenario) => POLICIES.flatMap((policyId) => (
    Array.from({ length: REPETITIONS }, (_, index) => ({
      scenario_id: scenario.id,
      policy_id: policyId,
      repetition: index + 1,
    }))
  ))).sort((left, right) => digest(`${SEED}\n${left.scenario_id}\n${left.policy_id}\n${left.repetition}`)
    .localeCompare(digest(`${SEED}\n${right.scenario_id}\n${right.policy_id}\n${right.repetition}`)))
    .map((cell, order) => Object.freeze({ order, ...cell }));
}

function modeledCost(energyKwh, durationMs, economics = ECONOMICS) {
  if (!Number.isFinite(energyKwh) || energyKwh < 0 || !Number.isFinite(durationMs) || durationMs < 0) {
    return Object.freeze({ status: 'unknown', total_usd: null, components: [] });
  }
  const electricity = energyKwh * economics.electricity_usd_per_kwh;
  const amortization = (durationMs / 3600000)
    * (economics.gpu_residual_value_usd / economics.gpu_useful_compute_hours);
  return Object.freeze({
    status: 'derived-comparison',
    total_usd: Number((electricity + amortization).toFixed(9)),
    components: Object.freeze([
      Object.freeze({
        kind: 'gpu_electricity',
        status: 'derived-comparison',
        amount_usd: Number(electricity.toFixed(9)),
        energy_kwh: Number(energyKwh.toFixed(9)),
        rate_usd_per_kwh: economics.electricity_usd_per_kwh,
        source: 'nvidia_smi_energy_times_frozen_scenario_rate',
      }),
      Object.freeze({
        kind: 'gpu_amortization',
        status: 'derived-comparison',
        amount_usd: Number(amortization.toFixed(9)),
        residual_value_usd: economics.gpu_residual_value_usd,
        useful_compute_hours: economics.gpu_useful_compute_hours,
        source: 'duration_times_frozen_residual_value_scenario',
      }),
      Object.freeze({ kind: 'provider_invoice', status: 'known', amount_usd: 0, source: 'self_hosted_ollama_no_per_request_invoice' }),
      Object.freeze({ kind: 'cpu_memory_storage_display_energy', status: 'unknown', amount_usd: null, source: 'not_measured' }),
    ]),
  });
}

function answerFromOutput(outputText) {
  const candidates = extractJsonObjects(outputText).filter((value) => Object.prototype.hasOwnProperty.call(value, 'answer'));
  return candidates.length ? candidates[candidates.length - 1].answer : null;
}

function terminalStatus(attempts) {
  if (attempts.some((attempt) => attempt.verification.status === 'passed')) return 'passed';
  if (attempts.some((attempt) => attempt.execution_evidence.status === 'unknown')) return 'unknown';
  return 'failed';
}

function buildCell({ scheduleCell, scenario, route, attempts, previousCellDigest, privateKey }) {
  const finalAttempt = attempts.find((attempt) => attempt.verification.status === 'passed') || attempts[attempts.length - 1];
  const unsigned = {
    schema: 1,
    cell_id: `${String(scheduleCell.order).padStart(3, '0')}-${scenario.id}--${scheduleCell.policy_id}--r${scheduleCell.repetition}`,
    order: scheduleCell.order,
    scenario_id: scenario.id,
    policy_id: scheduleCell.policy_id,
    repetition: scheduleCell.repetition,
    route,
    attempts,
    status: terminalStatus(attempts),
    final_verification: finalAttempt.verification,
    previous_cell_digest: previousCellDigest,
  };
  const receiptDigest = digest(unsigned);
  const payload = { ...unsigned, receipt_digest: receiptDigest };
  return Object.freeze({ ...payload, attestation: signPayload(payload, privateKey) });
}

function attemptEconomics(gpu, durationMs) {
  const energy = gpu && Number.isFinite(gpu.energy_kwh) ? gpu.energy_kwh : null;
  return Object.freeze({
    provider_invoice: Object.freeze({ status: 'known', amount_usd: 0, source: 'self_hosted_ollama_no_per_request_invoice' }),
    gpu_energy: energy === null
      ? Object.freeze({ status: 'unknown', energy_kwh: null, samples: 0, average_watts: null })
      : Object.freeze({ status: 'measured', energy_kwh: energy, samples: gpu.samples, average_watts: gpu.average_watts }),
    comparison_cost: modeledCost(energy, durationMs),
    actual_end_to_end_cash: Object.freeze({ status: 'unknown', amount_usd: null, source: 'whole_system_energy_and_actual_utility_rate_not_observed' }),
  });
}

function createAttempt({ scenario, tier, response, startedAt, durationMs, gpu, error = null }) {
  const model = MODELS[tier];
  const outputText = response && response.message ? String(response.message.content || '') : '';
  const evidenceVerified = Boolean(response && response.done === true && response.model === model.model);
  const verification = verifyScenarioOutput(scenario, outputText);
  const promptTokens = Number(response && response.prompt_eval_count || 0);
  const completionTokens = Number(response && response.eval_count || 0);
  return Object.freeze({
    attempt: null,
    tier,
    started_at: startedAt,
    duration_ms: durationMs,
    output_text: outputText,
    output_digest: digest(outputText),
    answer: answerFromOutput(outputText),
    verification,
    execution_evidence: Object.freeze({
      status: evidenceVerified ? 'verified' : 'unknown',
      runtime: 'ollama-chat',
      requested_model: model.model,
      observed_model: response ? response.model || null : null,
      model_digest: model.model_digest,
      done_reason: response ? response.done_reason || null : null,
      response_digest: response ? digest(response) : null,
      error: error || (evidenceVerified ? null : 'runtime_identity_or_completion_not_verified'),
    }),
    usage: Object.freeze({
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      provider_total_duration_ns: Number(response && response.total_duration || 0),
    }),
    economics: attemptEconomics(gpu, durationMs),
  });
}

function withAttemptNumber(attempt, number) {
  return Object.freeze({ ...attempt, attempt: number });
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function reduction(baseline, candidate) {
  return baseline > 0 ? Number((1 - (candidate / baseline)).toFixed(6)) : null;
}

function summarize(cells) {
  const policies = POLICIES.map((policyId) => {
    const selected = cells.filter((cell) => cell.policy_id === policyId);
    const attempts = selected.flatMap((cell) => cell.attempts);
    const energyKnown = attempts.every((attempt) => attempt.economics.gpu_energy.status === 'measured');
    const costKnown = attempts.every((attempt) => attempt.economics.comparison_cost.status === 'derived-comparison');
    return {
      policy_id: policyId,
      cells: selected.length,
      verified: selected.filter((cell) => cell.status === 'passed').length,
      failed: selected.filter((cell) => cell.status === 'failed').length,
      unknown: selected.filter((cell) => cell.status === 'unknown').length,
      verified_rate: selected.length ? Number((selected.filter((cell) => cell.status === 'passed').length / selected.length).toFixed(6)) : 0,
      attempts: attempts.length,
      cheap_attempts: attempts.filter((attempt) => attempt.tier === 'cheap').length,
      strong_attempts: attempts.filter((attempt) => attempt.tier === 'strong').length,
      escalations: selected.filter((cell) => cell.attempts.length > 1).length,
      duration_ms: sum(attempts.map((attempt) => attempt.duration_ms)),
      prompt_tokens: sum(attempts.map((attempt) => attempt.usage.prompt_tokens)),
      completion_tokens: sum(attempts.map((attempt) => attempt.usage.completion_tokens)),
      gpu_energy_status: energyKnown ? 'measured' : 'unknown',
      gpu_energy_kwh: energyKnown ? Number(sum(attempts.map((attempt) => attempt.economics.gpu_energy.energy_kwh)).toFixed(9)) : null,
      modeled_cost_status: costKnown ? 'derived-comparison' : 'unknown',
      modeled_cost_usd: costKnown ? Number(sum(attempts.map((attempt) => attempt.economics.comparison_cost.total_usd)).toFixed(9)) : null,
      actual_end_to_end_cash_status: 'unknown',
    };
  });
  const baseline = policies.find((entry) => entry.policy_id === 'always-strong-local');
  const adaptive = policies.find((entry) => entry.policy_id === 'citadel-adaptive-local');
  const qualityRatio = baseline.verified_rate > 0 ? Number((adaptive.verified_rate / baseline.verified_rate).toFixed(6)) : null;
  const energyReduction = baseline.gpu_energy_status === 'measured' && adaptive.gpu_energy_status === 'measured'
    ? reduction(baseline.gpu_energy_kwh, adaptive.gpu_energy_kwh) : null;
  const modeledCostReduction = baseline.modeled_cost_status === 'derived-comparison' && adaptive.modeled_cost_status === 'derived-comparison'
    ? reduction(baseline.modeled_cost_usd, adaptive.modeled_cost_usd) : null;
  const falsePasses = cells.filter((cell) => {
    const scenario = scenarios().find((item) => item.id === cell.scenario_id);
    return scenario.adversarial_case && cell.status === 'passed'
      && cell.final_verification.answer_digest !== scenario.verification.expected_digest;
  }).length;
  const gates = {
    quality: qualityRatio !== null && qualityRatio >= GATES.quality_floor_relative_to_strong,
    gpu_energy: energyReduction !== null && energyReduction >= GATES.minimum_gpu_energy_reduction,
    modeled_cost: modeledCostReduction !== null && modeledCostReduction >= GATES.minimum_modeled_cost_reduction,
    terminal_coverage: cells.length === scenarios().length * POLICIES.length * REPETITIONS
      && cells.every((cell) => ['passed', 'failed', 'unknown'].includes(cell.status)),
    execution_identity: cells.flatMap((cell) => cell.attempts)
      .every((attempt) => attempt.execution_evidence.status === 'verified'),
    zero_false_passes: falsePasses === 0,
  };
  return Object.freeze({
    policies,
    comparison: {
      quality_ratio: qualityRatio,
      gpu_energy_reduction: energyReduction,
      modeled_cost_reduction: modeledCostReduction,
      duration_reduction: reduction(baseline.duration_ms, adaptive.duration_ms),
      token_reduction: reduction(
        baseline.prompt_tokens + baseline.completion_tokens,
        adaptive.prompt_tokens + adaptive.completion_tokens,
      ),
    },
    false_passes: falsePasses,
    integrity_failures: 0,
    gates,
    evidence_result: Object.values(gates).every(Boolean) ? 'passed' : 'failed',
    actual_end_to_end_cash_status: 'unknown',
  });
}

function publicKeyFromPrivate(privatePem) {
  return crypto.createPublicKey(crypto.createPrivateKey(privatePem)).export({ type: 'spki', format: 'pem' });
}

function createFreeze(publicKey, now = new Date().toISOString()) {
  const unsigned = {
    schema: 1,
    freeze_id: null,
    frozen_at: now,
    method_digest: digest(normalizedSource('benchmarks/sentient-readiness/METHOD.md')),
    scenario_set_digest: digest(scenarios()),
    source_digests: sourceDigests(),
    seed: SEED,
    repetitions: REPETITIONS,
    policies: POLICIES,
    models: MODELS,
    route_threshold: 0.20,
    economics: ECONOMICS,
    gates: GATES,
    schedule: stableSchedule(),
    ollama_endpoint: OLLAMA_ENDPOINT,
    attestation_public_key: publicKey,
  };
  return Object.freeze({ ...unsigned, freeze_id: digest(unsigned) });
}

function validateFreeze(value, options = {}) {
  if (!value || value.schema !== 1 || typeof value.freeze_id !== 'string') throw new Error('readiness freeze is invalid');
  if (value.freeze_id !== digest({ ...value, freeze_id: null })) throw new Error('readiness freeze id does not match contents');
  if (value.method_digest !== digest(normalizedSource('benchmarks/sentient-readiness/METHOD.md'))) throw new Error('readiness method drifted');
  if (value.scenario_set_digest !== digest(scenarios())) throw new Error('readiness scenario set drifted');
  if (JSON.stringify(value.models) !== JSON.stringify(MODELS)) throw new Error('readiness model catalog drifted');
  if (JSON.stringify(value.schedule) !== JSON.stringify(stableSchedule())) throw new Error('readiness schedule drifted');
  if (JSON.stringify(value.gates) !== JSON.stringify(GATES) || JSON.stringify(value.economics) !== JSON.stringify(ECONOMICS)) {
    throw new Error('readiness economics or gates drifted');
  }
  if (options.verifySources !== false && JSON.stringify(value.source_digests) !== JSON.stringify(sourceDigests())) {
    throw new Error('one or more readiness benchmark sources drifted');
  }
  crypto.createPublicKey(value.attestation_public_key);
  return value;
}

function verifyCell(cell, scheduleCell, scenario, freeze) {
  if (cell.order !== scheduleCell.order || cell.scenario_id !== scheduleCell.scenario_id
    || cell.policy_id !== scheduleCell.policy_id || cell.repetition !== scheduleCell.repetition) {
    throw new Error(`readiness cell schedule mismatch at ${scheduleCell.order}`);
  }
  if (JSON.stringify(cell.route) !== JSON.stringify(routeFor(cell.policy_id, scenario.task))) throw new Error(`readiness route drifted for ${cell.cell_id}`);
  if (!Array.isArray(cell.attempts) || !cell.attempts.length || cell.attempts.length > 2) throw new Error(`readiness attempts invalid for ${cell.cell_id}`);
  for (const [index, attempt] of cell.attempts.entries()) {
    if (attempt.attempt !== index + 1) throw new Error(`readiness attempt order invalid for ${cell.cell_id}`);
    const model = freeze.models[attempt.tier];
    const evidence = attempt.execution_evidence;
    const validVerifiedEvidence = evidence.status === 'verified' && evidence.observed_model === model?.model;
    const validUnknownEvidence = evidence.status === 'unknown'
      && (evidence.observed_model === null || typeof evidence.observed_model === 'string')
      && typeof evidence.error === 'string' && evidence.error.length > 0;
    if (!model || evidence.requested_model !== model.model
      || evidence.model_digest !== model.model_digest
      || (!validVerifiedEvidence && !validUnknownEvidence)) {
      throw new Error(`readiness model evidence invalid for ${cell.cell_id}/${index + 1}`);
    }
    const verification = verifyScenarioOutput(scenario, attempt.output_text);
    if (JSON.stringify(verification) !== JSON.stringify(attempt.verification)) throw new Error(`readiness answer verification drifted for ${cell.cell_id}/${index + 1}`);
    if (attempt.output_digest !== digest(attempt.output_text)) throw new Error(`readiness output digest invalid for ${cell.cell_id}/${index + 1}`);
    const expectedEconomics = attemptEconomics(
      attempt.economics.gpu_energy.status === 'measured' ? attempt.economics.gpu_energy : null,
      attempt.duration_ms,
    );
    if (JSON.stringify(expectedEconomics) !== JSON.stringify(attempt.economics)) throw new Error(`readiness economics drifted for ${cell.cell_id}/${index + 1}`);
  }
  if (cell.policy_id === 'always-strong-local' && (cell.attempts.length !== 1 || cell.attempts[0].tier !== 'strong')) {
    throw new Error(`readiness baseline route invalid for ${cell.cell_id}`);
  }
  if (cell.policy_id === 'citadel-adaptive-local') {
    if (cell.attempts[0].tier !== cell.route.initial_tier) throw new Error(`readiness adaptive initial tier invalid for ${cell.cell_id}`);
    if (cell.attempts.length === 2 && (cell.attempts[0].verification.status === 'passed'
      || cell.attempts[1].tier !== cell.route.escalation_tier)) throw new Error(`readiness escalation invalid for ${cell.cell_id}`);
  }
  const finalAttempt = cell.attempts.find((attempt) => attempt.verification.status === 'passed') || cell.attempts[cell.attempts.length - 1];
  if (cell.status !== terminalStatus(cell.attempts) || JSON.stringify(cell.final_verification) !== JSON.stringify(finalAttempt.verification)) {
    throw new Error(`readiness terminal result invalid for ${cell.cell_id}`);
  }
  const payload = { ...cell };
  delete payload.attestation;
  const unsigned = { ...payload };
  delete unsigned.receipt_digest;
  if (payload.receipt_digest !== digest(unsigned)) throw new Error(`readiness receipt digest invalid for ${cell.cell_id}`);
  if (!verifySignature(payload, cell.attestation, freeze.attestation_public_key)) throw new Error(`readiness receipt signature invalid for ${cell.cell_id}`);
  return cell;
}

function getJson(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`HTTP ${response.statusCode} from ${url}`));
        try { return resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (error) { return reject(error); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`timeout from ${url}`)));
    request.on('error', reject);
  });
}

function postJson(url, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const encoded = Buffer.from(JSON.stringify(body));
    const request = http.request({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': encoded.length },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`HTTP ${response.statusCode} from ${url}`));
        try { return resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (error) { return reject(error); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`timeout from ${url}`)));
    request.on('error', reject);
    request.end(encoded);
  });
}

function startGpuSampler() {
  const samples = [];
  let child = null;
  let available = true;
  try {
    child = childProcess.spawn('nvidia-smi', ['--query-gpu=power.draw', '--format=csv,noheader,nounits', '-lms', '500'], {
      shell: false, windowsHide: true,
    });
    let pending = '';
    child.stdout.on('data', (chunk) => {
      pending += chunk.toString('utf8');
      const lines = pending.split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) {
        const watts = Number(line.trim());
        if (Number.isFinite(watts) && watts >= 0) samples.push(watts);
      }
    });
    child.on('error', () => { available = false; });
  } catch (_error) { available = false; }
  return {
    async stop(durationMs) {
      if (child && !child.killed) child.kill();
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!available || !samples.length) return null;
      const averageWatts = sum(samples) / samples.length;
      return Object.freeze({
        samples: samples.length,
        average_watts: Number(averageWatts.toFixed(6)),
        energy_kwh: Number((averageWatts * (durationMs / 3600000) / 1000).toFixed(9)),
      });
    },
  };
}

async function runOllamaAttempt(scenario, tier) {
  const model = MODELS[tier];
  const sampler = startGpuSampler();
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let response = null;
  let error = null;
  try {
    response = await postJson(`${OLLAMA_ENDPOINT}/api/chat`, {
      model: model.model,
      stream: false,
      keep_alive: 0,
      format: 'json',
      messages: [{ role: 'user', content: `${scenario.task}\nDo not use tools or external information. Return only the requested JSON object.` }],
      options: { temperature: 0, num_predict: 128, num_ctx: 2048, seed: 42 },
    }, scenario.timeout_seconds * 1000);
  } catch (caught) { error = caught.message; }
  const durationMs = Date.now() - started;
  const gpu = await sampler.stop(durationMs);
  return createAttempt({ scenario, tier, response, startedAt, durationMs, gpu, error });
}

async function doctor(freeze = fs.existsSync(FREEZE_FILE) ? readJson(FREEZE_FILE) : null) {
  const tags = await getJson(`${OLLAMA_ENDPOINT}/api/tags`);
  const installed = new Map((tags.models || []).map((model) => [model.name, model]));
  const modelChecks = Object.values(MODELS).map((model) => ({
    model: model.model,
    expected_digest: model.model_digest,
    observed_digest: installed.has(model.model) ? `sha256:${installed.get(model.model).digest}` : null,
    status: installed.has(model.model) && `sha256:${installed.get(model.model).digest}` === model.model_digest ? 'passed' : 'failed',
  }));
  const gpu = childProcess.spawnSync('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader'], { encoding: 'utf8', shell: false, windowsHide: true });
  const routes = scenarios().map((scenario) => ({
    scenario_id: scenario.id,
    score: routeFor('citadel-adaptive-local', scenario.task).features.difficulty_score,
    tier: routeFor('citadel-adaptive-local', scenario.task).initial_tier,
  }));
  const report = {
    schema: 1,
    status: modelChecks.every((check) => check.status === 'passed') && gpu.status === 0 ? 'passed' : 'failed',
    freeze: freeze ? (() => { try { validateFreeze(freeze); return 'passed'; } catch (error) { return `failed: ${error.message}`; } })() : 'not-created',
    models: modelChecks,
    gpu: gpu.status === 0 ? gpu.stdout.trim() : null,
    routes,
    route_counts: {
      cheap: routes.filter((route) => route.tier === 'cheap').length,
      strong: routes.filter((route) => route.tier === 'strong').length,
    },
  };
  return report;
}

function machineProfile(modelInventory = []) {
  const gpu = childProcess.spawnSync('nvidia-smi', ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader'], {
    encoding: 'utf8', shell: false, windowsHide: true,
  });
  const git = childProcess.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true });
  return Object.freeze({
    platform: process.platform,
    arch: process.arch,
    cpu_count: os.cpus().length,
    cpu_model: os.cpus()[0] ? os.cpus()[0].model : null,
    total_memory_bytes: os.totalmem(),
    gpu: gpu.status === 0 ? gpu.stdout.trim() : null,
    hostname_digest: digest(os.hostname()),
    git_commit: git.status === 0 ? git.stdout.trim() : null,
    node: process.version,
    model_inventory: modelInventory,
    human_interventions_during_cells: 0,
  });
}

async function runCell(scheduleCell, scenario, previousCellDigest, privateKey) {
  const route = routeFor(scheduleCell.policy_id, scenario.task);
  const attempts = [withAttemptNumber(await runOllamaAttempt(scenario, route.initial_tier), 1)];
  if (attempts[0].verification.status !== 'passed' && route.escalation_tier) {
    attempts.push(withAttemptNumber(await runOllamaAttempt(scenario, route.escalation_tier), 2));
  }
  return buildCell({ scheduleCell, scenario, route, attempts, previousCellDigest, privateKey });
}

function cellFile(output, scheduleCell) {
  return path.join(output, 'cells', `${String(scheduleCell.order).padStart(3, '0')}-${scheduleCell.scenario_id}--${scheduleCell.policy_id}--r${scheduleCell.repetition}.json`);
}

function reportMarkdown(bundle) {
  const lines = [
    '# Citadel prospective local economic comparison result',
    '',
    `Run: \`${bundle.run_id}\`  `,
    `Freeze: \`${bundle.freeze_id}\`  `,
    `Window: ${bundle.started_at} to ${bundle.completed_at}`,
    '',
    '## Outcome',
    '',
    `Evidence and economic gates: **${bundle.summary.evidence_result}**.  `,
    `False passes: **${bundle.summary.false_passes}**.  `,
    `Integrity failures: **${bundle.summary.integrity_failures}**.`,
    '',
    '| Policy | Verified | Attempts | 3B | 7B | Escalations | Duration | GPU kWh | Modeled comparison USD |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const policy of bundle.summary.policies) {
    lines.push(`| ${policy.policy_id} | ${policy.verified}/${policy.cells} | ${policy.attempts} | ${policy.cheap_attempts} | ${policy.strong_attempts} | ${policy.escalations} | ${(policy.duration_ms / 1000).toFixed(1)}s | ${policy.gpu_energy_kwh === null ? 'unknown' : policy.gpu_energy_kwh.toFixed(6)} | ${policy.modeled_cost_usd === null ? 'unknown' : `$${policy.modeled_cost_usd.toFixed(6)}`} |`);
  }
  const percent = (value) => value === null ? 'unknown' : `${(value * 100).toFixed(1)}%`;
  lines.push(
    '',
    '## Precommitted comparison',
    '',
    `- Relative verified completion: ${percent(bundle.summary.comparison.quality_ratio)} of always-7B.`,
    `- GPU-energy reduction: ${percent(bundle.summary.comparison.gpu_energy_reduction)}.`,
    `- Modeled GPU electricity plus amortization reduction: ${percent(bundle.summary.comparison.modeled_cost_reduction)}.`,
    `- Model-duration reduction: ${percent(bundle.summary.comparison.duration_reduction)}.`,
    `- Token reduction: ${percent(bundle.summary.comparison.token_reduction)}.`,
    '',
    '## Gate results',
    '',
    ...Object.entries(bundle.summary.gates).map(([gate, passed]) => `- ${gate}: **${passed ? 'passed' : 'failed'}**`),
    '',
    '## Claim boundary',
    '',
    'This is a prospective 72-cell comparison on one Windows workstation, one GTX 1070, one Qwen model family, and exact-answer tasks. Provider invoice cost is observed $0 for self-hosted Ollama. GPU energy is measured. Electricity and GPU amortization are frozen scenario calculations, not observed bills. CPU, memory, storage, display, and whole-system energy remain unknown, so actual end-to-end cash remains unknown.',
    '',
    'Run `npm run readiness:verify` to recompute every route, answer, receipt, chain link, artifact digest, summary, source binding, and Ed25519 signature offline.',
    '',
  );
  return lines.join('\n');
}

async function runBenchmark({ output = DEFAULT_OUTPUT, keyFile = DEFAULT_KEY } = {}) {
  const freeze = validateFreeze(readJson(FREEZE_FILE));
  const privateKey = fs.readFileSync(keyFile, 'utf8');
  if (publicKeyFromPrivate(privateKey) !== freeze.attestation_public_key) throw new Error('readiness private key does not match frozen public key');
  const health = await doctor(freeze);
  if (health.status !== 'passed' || health.freeze !== 'passed') throw new Error('readiness doctor did not pass');
  const schedule = freeze.schedule;
  const byId = new Map(scenarios().map((scenario) => [scenario.id, scenario]));
  fs.mkdirSync(path.join(output, 'cells'), { recursive: true });
  const startedAt = new Date().toISOString();
  const cells = [];
  let previousCellDigest = null;
  for (const scheduleCell of schedule) {
    const file = cellFile(output, scheduleCell);
    let cell;
    if (fs.existsSync(file)) cell = readJson(file);
    else {
      writeJson(path.join(output, 'intent.json'), {
        schema: 1,
        freeze_id: freeze.freeze_id,
        schedule_cell: scheduleCell,
        previous_cell_digest: previousCellDigest,
        written_at: new Date().toISOString(),
      });
      cell = await runCell(scheduleCell, byId.get(scheduleCell.scenario_id), previousCellDigest, privateKey);
      writeJson(file, cell);
    }
    verifyCell(cell, scheduleCell, byId.get(scheduleCell.scenario_id), freeze);
    if (cell.previous_cell_digest !== previousCellDigest) throw new Error(`readiness chain mismatch at ${cell.cell_id}`);
    cells.push(cell);
    previousCellDigest = cell.receipt_digest;
    process.stdout.write(`[${cells.length}/${schedule.length}] ${cell.scenario_id}/${cell.policy_id}/r${cell.repetition}: ${cell.status}\n`);
  }
  const completedAt = new Date().toISOString();
  const summary = summarize(cells);
  const artifacts = schedule.map((scheduleCell) => {
    const relative = path.relative(output, cellFile(output, scheduleCell)).replace(/\\/g, '/');
    return { path: relative, digest: digest(readJson(cellFile(output, scheduleCell))) };
  });
  const unsigned = {
    schema: 1,
    bundle_id: null,
    run_id: digest({ freeze_id: freeze.freeze_id, first: cells[0].receipt_digest, last: previousCellDigest, started_at: startedAt }),
    freeze_id: freeze.freeze_id,
    started_at: startedAt,
    completed_at: completedAt,
    environment: machineProfile(health.models),
    economics: freeze.economics,
    artifacts,
    final_chain_digest: previousCellDigest,
    summary,
  };
  const bundleId = digest(unsigned);
  const payload = { ...unsigned, bundle_id: bundleId };
  const report = reportMarkdown(payload);
  fs.writeFileSync(path.join(output, 'REPORT.md'), report, 'utf8');
  const finalPayload = { ...payload, report_digest: digest(report.replace(/\r\n/g, '\n')) };
  const bundle = { ...finalPayload, attestation: signPayload(finalPayload, privateKey) };
  writeJson(path.join(output, 'bundle.json'), bundle);
  if (fs.existsSync(path.join(output, 'intent.json'))) fs.unlinkSync(path.join(output, 'intent.json'));
  return bundle;
}

function verifyPublished(output = DEFAULT_OUTPUT) {
  const freeze = validateFreeze(readJson(FREEZE_FILE));
  const bundle = readJson(path.join(output, 'bundle.json'));
  const schedule = freeze.schedule;
  const byId = new Map(scenarios().map((scenario) => [scenario.id, scenario]));
  const cells = [];
  let previousCellDigest = null;
  for (const scheduleCell of schedule) {
    const file = cellFile(output, scheduleCell);
    const cell = verifyCell(readJson(file), scheduleCell, byId.get(scheduleCell.scenario_id), freeze);
    if (cell.previous_cell_digest !== previousCellDigest) throw new Error(`readiness chain mismatch at ${cell.cell_id}`);
    previousCellDigest = cell.receipt_digest;
    cells.push(cell);
  }
  const expectedArtifacts = schedule.map((scheduleCell) => ({
    path: path.relative(output, cellFile(output, scheduleCell)).replace(/\\/g, '/'),
    digest: digest(readJson(cellFile(output, scheduleCell))),
  }));
  if (JSON.stringify(bundle.artifacts) !== JSON.stringify(expectedArtifacts)) throw new Error('readiness bundle artifact manifest drifted');
  if (bundle.final_chain_digest !== previousCellDigest) throw new Error('readiness final chain digest drifted');
  if (JSON.stringify(bundle.summary) !== JSON.stringify(summarize(cells))) throw new Error('readiness summary drifted');
  const report = fs.readFileSync(path.join(output, 'REPORT.md'), 'utf8').replace(/\r\n/g, '\n');
  if (bundle.report_digest !== digest(report)) throw new Error('readiness report digest drifted');
  const payload = { ...bundle };
  delete payload.attestation;
  const identityPayload = { ...payload, bundle_id: null };
  delete identityPayload.report_digest;
  if (bundle.bundle_id !== digest(identityPayload)) throw new Error('readiness bundle id drifted');
  if (!verifySignature(payload, bundle.attestation, freeze.attestation_public_key)) throw new Error('readiness bundle signature invalid');
  return Object.freeze({ status: 'passed', bundle_id: bundle.bundle_id, freeze_id: freeze.freeze_id, cells: cells.length, summary: bundle.summary });
}

module.exports = Object.freeze({
  BENCHMARK,
  DEFAULT_KEY,
  DEFAULT_OUTPUT,
  ECONOMICS,
  FREEZE_FILE,
  GATES,
  MODELS,
  POLICIES,
  REPETITIONS,
  buildCell,
  createAttempt,
  createFreeze,
  doctor,
  modeledCost,
  publicKeyFromPrivate,
  routeFor,
  runBenchmark,
  scenarios,
  stableSchedule,
  summarize,
  validateFreeze,
  verifyCell,
  verifyPublished,
  writeJson,
});
