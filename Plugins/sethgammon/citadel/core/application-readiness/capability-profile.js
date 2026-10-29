'use strict';

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { canonical, digest, validateScenario } = require('../operation-control/contracts');
const { extractJsonObjects, signPayload, verifyScenarioOutput, verifySignature } = require('../operation-control/receipt');
const { modeledCost, publicKeyFromPrivate, writeJson } = require('./benchmark');

const ROOT = path.resolve(__dirname, '..', '..');
const BENCHMARK = path.join(ROOT, 'benchmarks', 'sentient-readiness-v2');
const METHOD_FILE = path.join(BENCHMARK, 'METHOD.md');
const SCENARIOS_FILE = path.join(BENCHMARK, 'scenarios.json');
const FREEZE_FILE = path.join(BENCHMARK, 'freeze.json');
const DEFAULT_OUTPUT = path.join(BENCHMARK, 'published-run');
const DEFAULT_KEY = 'F:\\Temp\\citadel-sentient-readiness-v2-ed25519.pem';
const OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';
const SEED = 'citadel-capability-profile-v2-2026-08-01';
const REPETITIONS = 3;
const POLICIES = Object.freeze(['always-strong-local', 'citadel-capability-profile-local']);
const MODELS = Object.freeze({
  tiny: Object.freeze({ provider: 'ollama', model: 'qwen2.5-coder:1.5b', model_digest: 'sha256:d7372fd828518a4d38b1eb196c673c31a85f2ed302b3d1e406c4c2d1b64a0668', parameter_size: '1.5B', quantization: 'Q4_K_M' }),
  lexical: Object.freeze({ provider: 'ollama', model: 'qwen2.5-coder:3b', model_digest: 'sha256:f72c60cabf6237b07f6e632b2c48d533cef25eda2efbd34bed21c5e9c01e6225', parameter_size: '3.1B', quantization: 'Q4_K_M' }),
  strong: Object.freeze({ provider: 'ollama', model: 'qwen2.5-coder:7b', model_digest: 'sha256:dae161e27b0e90dd1856c8bb3209201fd6736d8eb66298e75ed87571486f4364', parameter_size: '7.6B', quantization: 'Q4_K_M' }),
});
const ECONOMICS = Object.freeze({ electricity_usd_per_kwh: 0.20, gpu_residual_value_usd: 100, gpu_useful_compute_hours: 10000, setup_and_download_costs_included: false, whole_system_energy_status: 'unknown' });
const GATES = Object.freeze({ quality_floor_relative_to_strong: 0.95, minimum_gpu_energy_reduction: 0.30, minimum_modeled_cost_reduction: 0.30, zero_false_passes_required: true, zero_integrity_failures_required: true });
const SOURCE_FILES = Object.freeze([
  'benchmarks/sentient-readiness-v2/METHOD.md',
  'benchmarks/sentient-readiness-v2/scenarios.json',
  'core/application-readiness/capability-profile.js',
  'scripts/capability-profile-benchmark.js',
  'scripts/test-capability-profile-benchmark.js',
]);

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function normalizedSource(relative) { return fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n'); }
function sourceDigests() { return Object.fromEntries(SOURCE_FILES.map((file) => [file, digest(normalizedSource(file))])); }
function sum(values) { return values.reduce((total, value) => total + value, 0); }
function reduction(baseline, candidate) { return baseline > 0 ? Number((1 - (candidate / baseline)).toFixed(6)) : null; }

function scenarios() {
  const values = readJson(SCENARIOS_FILE);
  if (!Array.isArray(values) || values.length !== 12) throw new Error('capability-profile scenario set must contain exactly 12 scenarios');
  values.forEach((scenario, index) => validateScenario(scenario, `scenarios[${index}]`));
  if (values.some((scenario) => scenario.holdout !== true)) throw new Error('every capability-profile scenario must be a holdout');
  if (new Set(values.map((scenario) => scenario.id)).size !== values.length) throw new Error('capability-profile scenario ids must be unique');
  return values;
}

function capabilityClass(task) {
  const text = String(task || '').toLowerCase();
  if (/\b(?:letters?|vowels?|characters?)\b/.test(text)) return 'lexical';
  if (/\b(?:derive|critical path|constraints?|untrusted|ledger|valid paths?|select two distinct)\b/.test(text)) return 'strong';
  return 'tiny';
}

function routeFor(policyId, task) {
  if (!POLICIES.includes(policyId)) throw new Error(`unsupported capability-profile policy: ${policyId}`);
  if (policyId === 'always-strong-local') return Object.freeze({ capability_class: 'baseline', initial_tier: 'strong', escalation_tier: null, reason_code: 'BASELINE_ALWAYS_STRONG' });
  const tier = capabilityClass(task);
  return Object.freeze({ capability_class: tier, initial_tier: tier, escalation_tier: tier === 'strong' ? null : 'strong', reason_code: `CAPABILITY_${tier.toUpperCase()}` });
}

function stableSchedule(values = scenarios()) {
  return values.flatMap((scenario) => POLICIES.flatMap((policyId) => Array.from({ length: REPETITIONS }, (_, index) => ({ scenario_id: scenario.id, policy_id: policyId, repetition: index + 1 }))))
    .sort((left, right) => digest(`${SEED}\n${left.scenario_id}\n${left.policy_id}\n${left.repetition}`).localeCompare(digest(`${SEED}\n${right.scenario_id}\n${right.policy_id}\n${right.repetition}`)))
    .map((cell, order) => Object.freeze({ order, ...cell }));
}

function createFreeze(publicKey, now = new Date().toISOString()) {
  const unsigned = { schema: 2, freeze_id: null, frozen_at: now, method_digest: digest(normalizedSource('benchmarks/sentient-readiness-v2/METHOD.md')), scenario_set_digest: digest(scenarios()), source_digests: sourceDigests(), seed: SEED, repetitions: REPETITIONS, policies: POLICIES, models: MODELS, routing_contract: { lexical_pattern: '\\b(?:letters?|vowels?|characters?)\\b', strong_pattern: '\\b(?:derive|critical path|constraints?|untrusted|ledger|valid paths?|select two distinct)\\b', fallback: 'tiny', failed_small_model_escalation: 'strong' }, economics: ECONOMICS, gates: GATES, schedule: stableSchedule(), ollama_endpoint: OLLAMA_ENDPOINT, attestation_public_key: publicKey };
  return Object.freeze({ ...unsigned, freeze_id: digest(unsigned) });
}

function validateFreeze(value, options = {}) {
  if (!value || value.schema !== 2 || typeof value.freeze_id !== 'string') throw new Error('capability-profile freeze is invalid');
  if (value.freeze_id !== digest({ ...value, freeze_id: null })) throw new Error('capability-profile freeze id does not match contents');
  if (value.method_digest !== digest(normalizedSource('benchmarks/sentient-readiness-v2/METHOD.md'))) throw new Error('capability-profile method drifted');
  if (value.scenario_set_digest !== digest(scenarios())) throw new Error('capability-profile scenario set drifted');
  if (JSON.stringify(value.models) !== JSON.stringify(MODELS) || JSON.stringify(value.schedule) !== JSON.stringify(stableSchedule())) throw new Error('capability-profile model catalog or schedule drifted');
  if (JSON.stringify(value.gates) !== JSON.stringify(GATES) || JSON.stringify(value.economics) !== JSON.stringify(ECONOMICS)) throw new Error('capability-profile economics or gates drifted');
  if (options.verifySources !== false && JSON.stringify(value.source_digests) !== JSON.stringify(sourceDigests())) throw new Error('one or more capability-profile sources drifted');
  crypto.createPublicKey(value.attestation_public_key);
  return value;
}

function answerFromOutput(outputText) {
  const candidates = extractJsonObjects(outputText).filter((value) => Object.prototype.hasOwnProperty.call(value, 'answer'));
  return candidates.length ? candidates[candidates.length - 1].answer : null;
}

function attemptEconomics(gpu, durationMs) {
  const energy = gpu && Number.isFinite(gpu.energy_kwh) ? gpu.energy_kwh : null;
  return Object.freeze({
    provider_invoice: Object.freeze({ status: 'known', amount_usd: 0, source: 'self_hosted_ollama_no_per_request_invoice' }),
    gpu_energy: energy === null ? Object.freeze({ status: 'unknown', energy_kwh: null, samples: 0, average_watts: null }) : Object.freeze({ status: 'measured', energy_kwh: energy, samples: gpu.samples, average_watts: gpu.average_watts }),
    comparison_cost: modeledCost(energy, durationMs, ECONOMICS),
    actual_end_to_end_cash: Object.freeze({ status: 'unknown', amount_usd: null, source: 'whole_system_energy_and_actual_utility_rate_not_observed' }),
  });
}

function createAttempt({ scenario, tier, response, startedAt, durationMs, gpu, error = null }) {
  const model = MODELS[tier];
  const outputText = response && response.message ? String(response.message.content || '') : '';
  const evidenceVerified = Boolean(response && response.done === true && response.model === model.model);
  const promptTokens = Number(response && response.prompt_eval_count || 0);
  const completionTokens = Number(response && response.eval_count || 0);
  return Object.freeze({ attempt: null, tier, started_at: startedAt, duration_ms: durationMs, output_text: outputText, output_digest: digest(outputText), answer: answerFromOutput(outputText), verification: verifyScenarioOutput(scenario, outputText), execution_evidence: Object.freeze({ status: evidenceVerified ? 'verified' : 'unknown', runtime: 'ollama-chat', requested_model: model.model, observed_model: response ? response.model || null : null, model_digest: model.model_digest, done_reason: response ? response.done_reason || null : null, response_digest: response ? digest(response) : null, error: error || (evidenceVerified ? null : 'runtime_identity_or_completion_not_verified') }), usage: Object.freeze({ prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens, provider_total_duration_ns: Number(response && response.total_duration || 0) }), economics: attemptEconomics(gpu, durationMs) });
}

function terminalStatus(attempts) {
  if (attempts.some((attempt) => attempt.verification.status === 'passed')) return 'passed';
  if (attempts.some((attempt) => attempt.execution_evidence.status === 'unknown')) return 'unknown';
  return 'failed';
}

function buildCell({ scheduleCell, scenario, route, attempts, previousCellDigest, privateKey }) {
  const finalAttempt = attempts.find((attempt) => attempt.verification.status === 'passed') || attempts[attempts.length - 1];
  const unsigned = { schema: 2, cell_id: `${String(scheduleCell.order).padStart(3, '0')}-${scenario.id}--${scheduleCell.policy_id}--r${scheduleCell.repetition}`, order: scheduleCell.order, scenario_id: scenario.id, policy_id: scheduleCell.policy_id, repetition: scheduleCell.repetition, route, attempts, status: terminalStatus(attempts), final_verification: finalAttempt.verification, previous_cell_digest: previousCellDigest };
  const receiptDigest = digest(unsigned);
  const payload = { ...unsigned, receipt_digest: receiptDigest };
  return Object.freeze({ ...payload, attestation: signPayload(payload, privateKey) });
}

function summarize(cells) {
  const policies = POLICIES.map((policyId) => {
    const selected = cells.filter((cell) => cell.policy_id === policyId);
    const attempts = selected.flatMap((cell) => cell.attempts);
    const energyKnown = attempts.every((attempt) => attempt.economics.gpu_energy.status === 'measured');
    const costKnown = attempts.every((attempt) => attempt.economics.comparison_cost.status === 'derived-comparison');
    return { policy_id: policyId, cells: selected.length, verified: selected.filter((cell) => cell.status === 'passed').length, failed: selected.filter((cell) => cell.status === 'failed').length, unknown: selected.filter((cell) => cell.status === 'unknown').length, verified_rate: selected.length ? Number((selected.filter((cell) => cell.status === 'passed').length / selected.length).toFixed(6)) : 0, attempts: attempts.length, tier_attempts: Object.fromEntries(Object.keys(MODELS).map((tier) => [tier, attempts.filter((attempt) => attempt.tier === tier).length])), escalations: selected.filter((cell) => cell.attempts.length > 1).length, duration_ms: sum(attempts.map((attempt) => attempt.duration_ms)), prompt_tokens: sum(attempts.map((attempt) => attempt.usage.prompt_tokens)), completion_tokens: sum(attempts.map((attempt) => attempt.usage.completion_tokens)), gpu_energy_status: energyKnown ? 'measured' : 'unknown', gpu_energy_kwh: energyKnown ? Number(sum(attempts.map((attempt) => attempt.economics.gpu_energy.energy_kwh)).toFixed(9)) : null, modeled_cost_status: costKnown ? 'derived-comparison' : 'unknown', modeled_cost_usd: costKnown ? Number(sum(attempts.map((attempt) => attempt.economics.comparison_cost.total_usd)).toFixed(9)) : null, actual_end_to_end_cash_status: 'unknown' };
  });
  const baseline = policies[0];
  const adaptive = policies[1];
  const qualityRatio = baseline.verified_rate > 0 ? Number((adaptive.verified_rate / baseline.verified_rate).toFixed(6)) : null;
  const energyReduction = baseline.gpu_energy_status === 'measured' && adaptive.gpu_energy_status === 'measured' ? reduction(baseline.gpu_energy_kwh, adaptive.gpu_energy_kwh) : null;
  const costReduction = baseline.modeled_cost_status === 'derived-comparison' && adaptive.modeled_cost_status === 'derived-comparison' ? reduction(baseline.modeled_cost_usd, adaptive.modeled_cost_usd) : null;
  const byId = new Map(scenarios().map((scenario) => [scenario.id, scenario]));
  const falsePasses = cells.filter((cell) => byId.get(cell.scenario_id).adversarial_case && cell.status === 'passed' && cell.final_verification.answer_digest !== byId.get(cell.scenario_id).verification.expected_digest).length;
  const gates = { quality: qualityRatio !== null && qualityRatio >= GATES.quality_floor_relative_to_strong, gpu_energy: energyReduction !== null && energyReduction >= GATES.minimum_gpu_energy_reduction, modeled_cost: costReduction !== null && costReduction >= GATES.minimum_modeled_cost_reduction, terminal_coverage: cells.length === scenarios().length * POLICIES.length * REPETITIONS && cells.every((cell) => ['passed', 'failed', 'unknown'].includes(cell.status)), execution_identity: cells.flatMap((cell) => cell.attempts).every((attempt) => attempt.execution_evidence.status === 'verified'), zero_false_passes: falsePasses === 0 };
  return Object.freeze({ policies, comparison: { quality_ratio: qualityRatio, gpu_energy_reduction: energyReduction, modeled_cost_reduction: costReduction, duration_reduction: reduction(baseline.duration_ms, adaptive.duration_ms), token_reduction: reduction(baseline.prompt_tokens + baseline.completion_tokens, adaptive.prompt_tokens + adaptive.completion_tokens) }, false_passes: falsePasses, integrity_failures: 0, gates, evidence_result: Object.values(gates).every(Boolean) ? 'passed' : 'failed', actual_end_to_end_cash_status: 'unknown' });
}

function verifyCell(cell, scheduleCell, scenario, freeze) {
  if (cell.order !== scheduleCell.order || cell.scenario_id !== scheduleCell.scenario_id || cell.policy_id !== scheduleCell.policy_id || cell.repetition !== scheduleCell.repetition) throw new Error(`capability-profile schedule mismatch at ${scheduleCell.order}`);
  if (JSON.stringify(cell.route) !== JSON.stringify(routeFor(cell.policy_id, scenario.task))) throw new Error(`capability-profile route drifted for ${cell.cell_id}`);
  if (!Array.isArray(cell.attempts) || !cell.attempts.length || cell.attempts.length > 2) throw new Error(`capability-profile attempts invalid for ${cell.cell_id}`);
  cell.attempts.forEach((attempt, index) => {
    if (attempt.attempt !== index + 1) throw new Error(`capability-profile attempt order invalid for ${cell.cell_id}`);
    const model = freeze.models[attempt.tier];
    const evidence = attempt.execution_evidence;
    const validEvidence = evidence.status === 'verified' ? evidence.observed_model === model?.model : evidence.status === 'unknown' && typeof evidence.error === 'string';
    if (!model || evidence.requested_model !== model.model || evidence.model_digest !== model.model_digest || !validEvidence) throw new Error(`capability-profile model evidence invalid for ${cell.cell_id}/${index + 1}`);
    if (JSON.stringify(verifyScenarioOutput(scenario, attempt.output_text)) !== JSON.stringify(attempt.verification) || attempt.output_digest !== digest(attempt.output_text)) throw new Error(`capability-profile output verification drifted for ${cell.cell_id}/${index + 1}`);
    const expectedEconomics = attemptEconomics(attempt.economics.gpu_energy.status === 'measured' ? attempt.economics.gpu_energy : null, attempt.duration_ms);
    if (JSON.stringify(expectedEconomics) !== JSON.stringify(attempt.economics)) throw new Error(`capability-profile economics drifted for ${cell.cell_id}/${index + 1}`);
  });
  if (cell.policy_id === POLICIES[0] && (cell.attempts.length !== 1 || cell.attempts[0].tier !== 'strong')) throw new Error(`capability-profile baseline route invalid for ${cell.cell_id}`);
  if (cell.policy_id === POLICIES[1] && (cell.attempts[0].tier !== cell.route.initial_tier || (cell.attempts.length === 2 && (cell.attempts[0].verification.status === 'passed' || cell.attempts[1].tier !== 'strong')))) throw new Error(`capability-profile adaptive route invalid for ${cell.cell_id}`);
  const finalAttempt = cell.attempts.find((attempt) => attempt.verification.status === 'passed') || cell.attempts[cell.attempts.length - 1];
  if (cell.status !== terminalStatus(cell.attempts) || JSON.stringify(cell.final_verification) !== JSON.stringify(finalAttempt.verification)) throw new Error(`capability-profile terminal result invalid for ${cell.cell_id}`);
  const payload = { ...cell }; delete payload.attestation;
  const unsigned = { ...payload }; delete unsigned.receipt_digest;
  if (payload.receipt_digest !== digest(unsigned) || !verifySignature(payload, cell.attestation, freeze.attestation_public_key)) throw new Error(`capability-profile receipt integrity invalid for ${cell.cell_id}`);
  return cell;
}

function requestJson(url, body = null, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const encoded = body === null ? null : Buffer.from(JSON.stringify(body));
    const request = http.request({ hostname: target.hostname, port: target.port, path: target.pathname, method: encoded ? 'POST' : 'GET', headers: encoded ? { 'content-type': 'application/json', 'content-length': encoded.length } : {} }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`HTTP ${response.statusCode} from ${url}`));
        try { return resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { return reject(error); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`timeout from ${url}`)));
    request.on('error', reject);
    if (encoded) request.end(encoded); else request.end();
  });
}

function startGpuSampler() {
  const samples = [];
  let child = null;
  let available = true;
  try {
    child = childProcess.spawn('nvidia-smi', ['--query-gpu=power.draw', '--format=csv,noheader,nounits', '-lms', '500'], { shell: false, windowsHide: true });
    let pending = '';
    child.stdout.on('data', (chunk) => { pending += chunk.toString('utf8'); const lines = pending.split(/\r?\n/); pending = lines.pop(); for (const line of lines) { const watts = Number(line.trim()); if (Number.isFinite(watts) && watts >= 0) samples.push(watts); } });
    child.on('error', () => { available = false; });
  } catch (_error) { available = false; }
  return { async stop(durationMs) { if (child && !child.killed) child.kill(); await new Promise((resolve) => setTimeout(resolve, 100)); if (!available || !samples.length) return null; const averageWatts = sum(samples) / samples.length; return Object.freeze({ samples: samples.length, average_watts: Number(averageWatts.toFixed(6)), energy_kwh: Number((averageWatts * (durationMs / 3600000) / 1000).toFixed(9)) }); } };
}

async function runOllamaAttempt(scenario, tier) {
  const model = MODELS[tier];
  const sampler = startGpuSampler();
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let response = null; let error = null;
  try { response = await requestJson(`${OLLAMA_ENDPOINT}/api/chat`, { model: model.model, stream: false, keep_alive: 0, format: 'json', messages: [{ role: 'user', content: `${scenario.task}\nDo not use tools or external information. Return only the requested JSON object.` }], options: { temperature: 0, num_predict: 128, num_ctx: 2048, seed: 42 } }, scenario.timeout_seconds * 1000); } catch (caught) { error = caught.message; }
  const durationMs = Date.now() - started;
  const gpu = await sampler.stop(durationMs);
  return createAttempt({ scenario, tier, response, startedAt, durationMs, gpu, error });
}

async function doctor(freeze = fs.existsSync(FREEZE_FILE) ? readJson(FREEZE_FILE) : null) {
  const tags = await requestJson(`${OLLAMA_ENDPOINT}/api/tags`);
  const installed = new Map((tags.models || []).map((model) => [model.name, model]));
  const models = Object.values(MODELS).map((model) => ({ model: model.model, expected_digest: model.model_digest, observed_digest: installed.has(model.model) ? `sha256:${installed.get(model.model).digest}` : null, status: installed.has(model.model) && `sha256:${installed.get(model.model).digest}` === model.model_digest ? 'passed' : 'failed' }));
  const gpu = childProcess.spawnSync('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader'], { encoding: 'utf8', shell: false, windowsHide: true });
  const routes = scenarios().map((scenario) => ({ scenario_id: scenario.id, tier: routeFor(POLICIES[1], scenario.task).initial_tier }));
  return { schema: 2, status: models.every((item) => item.status === 'passed') && gpu.status === 0 ? 'passed' : 'failed', freeze: freeze ? (() => { try { validateFreeze(freeze); return 'passed'; } catch (error) { return `failed: ${error.message}`; } })() : 'not-created', models, gpu: gpu.status === 0 ? gpu.stdout.trim() : null, routes, route_counts: Object.fromEntries(Object.keys(MODELS).map((tier) => [tier, routes.filter((route) => route.tier === tier).length])) };
}

function machineProfile(modelInventory) {
  const gpu = childProcess.spawnSync('nvidia-smi', ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader'], { encoding: 'utf8', shell: false, windowsHide: true });
  const git = childProcess.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true });
  return Object.freeze({ platform: process.platform, arch: process.arch, cpu_count: os.cpus().length, cpu_model: os.cpus()[0] ? os.cpus()[0].model : null, total_memory_bytes: os.totalmem(), gpu: gpu.status === 0 ? gpu.stdout.trim() : null, hostname_digest: digest(os.hostname()), git_commit: git.status === 0 ? git.stdout.trim() : null, node: process.version, model_inventory: modelInventory, human_interventions_during_cells: 0 });
}

async function runCell(scheduleCell, scenario, previousCellDigest, privateKey) {
  const route = routeFor(scheduleCell.policy_id, scenario.task);
  const first = { ...await runOllamaAttempt(scenario, route.initial_tier), attempt: 1 };
  const attempts = [first];
  if (first.verification.status !== 'passed' && route.escalation_tier) attempts.push({ ...await runOllamaAttempt(scenario, route.escalation_tier), attempt: 2 });
  return buildCell({ scheduleCell, scenario, route, attempts, previousCellDigest, privateKey });
}

function cellFile(output, cell) { return path.join(output, 'cells', `${String(cell.order).padStart(3, '0')}-${cell.scenario_id}--${cell.policy_id}--r${cell.repetition}.json`); }
function percent(value) { return value === null ? 'unknown' : `${(value * 100).toFixed(1)}%`; }
function reportMarkdown(bundle) {
  const lines = ['# Citadel capability-profile local optimizer result', '', `Run: \`${bundle.run_id}\`  `, `Freeze: \`${bundle.freeze_id}\`  `, `Window: ${bundle.started_at} to ${bundle.completed_at}`, '', '## Outcome', '', `Evidence and economic gates: **${bundle.summary.evidence_result}**.  `, `False passes: **${bundle.summary.false_passes}**.  `, `Integrity failures: **${bundle.summary.integrity_failures}**.`, '', '| Policy | Verified | Attempts | 1.5B | 3B | 7B | Escalations | Duration | GPU kWh | Modeled USD |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const policy of bundle.summary.policies) lines.push(`| ${policy.policy_id} | ${policy.verified}/${policy.cells} | ${policy.attempts} | ${policy.tier_attempts.tiny} | ${policy.tier_attempts.lexical} | ${policy.tier_attempts.strong} | ${policy.escalations} | ${(policy.duration_ms / 1000).toFixed(1)}s | ${policy.gpu_energy_kwh === null ? 'unknown' : policy.gpu_energy_kwh.toFixed(6)} | ${policy.modeled_cost_usd === null ? 'unknown' : `$${policy.modeled_cost_usd.toFixed(6)}`} |`);
  lines.push('', '## Precommitted comparison', '', `- Relative verified completion: ${percent(bundle.summary.comparison.quality_ratio)} of always-7B.`, `- GPU-energy reduction: ${percent(bundle.summary.comparison.gpu_energy_reduction)}.`, `- Modeled GPU electricity plus amortization reduction: ${percent(bundle.summary.comparison.modeled_cost_reduction)}.`, `- Model-duration reduction: ${percent(bundle.summary.comparison.duration_reduction)}.`, `- Token reduction: ${percent(bundle.summary.comparison.token_reduction)}.`, '', '## Gate results', '', ...Object.entries(bundle.summary.gates).map(([gate, passed]) => `- ${gate}: **${passed ? 'passed' : 'failed'}**`), '', '## Claim boundary', '', 'This is a prospective 72-cell comparison on one Windows workstation, one GTX 1070, one quantized Qwen model family, and exact-answer tasks. Provider invoice cost is observed $0 for self-hosted Ollama. GPU energy is measured. Electricity and GPU amortization are frozen scenario calculations, not observed bills. CPU, memory, storage, display, setup/download cost, and whole-system energy remain unknown.', '', 'Run `npm run readiness:v2:verify` to recompute every route, answer, receipt, chain link, artifact digest, summary, source binding, and Ed25519 signature offline.', '');
  return lines.join('\n');
}

async function runBenchmark({ output = DEFAULT_OUTPUT, keyFile = DEFAULT_KEY } = {}) {
  const freeze = validateFreeze(readJson(FREEZE_FILE));
  const privateKey = fs.readFileSync(keyFile, 'utf8');
  if (publicKeyFromPrivate(privateKey) !== freeze.attestation_public_key) throw new Error('capability-profile private key does not match frozen public key');
  const health = await doctor(freeze);
  if (health.status !== 'passed' || health.freeze !== 'passed') throw new Error('capability-profile doctor did not pass');
  const byId = new Map(scenarios().map((scenario) => [scenario.id, scenario]));
  fs.mkdirSync(path.join(output, 'cells'), { recursive: true });
  const startedAt = new Date().toISOString();
  const cells = []; let previousCellDigest = null;
  for (const scheduleCell of freeze.schedule) {
    const file = cellFile(output, scheduleCell);
    let cell;
    if (fs.existsSync(file)) cell = readJson(file); else { writeJson(path.join(output, 'intent.json'), { schema: 2, freeze_id: freeze.freeze_id, schedule_cell: scheduleCell, previous_cell_digest: previousCellDigest, written_at: new Date().toISOString() }); cell = await runCell(scheduleCell, byId.get(scheduleCell.scenario_id), previousCellDigest, privateKey); writeJson(file, cell); }
    verifyCell(cell, scheduleCell, byId.get(scheduleCell.scenario_id), freeze);
    if (cell.previous_cell_digest !== previousCellDigest) throw new Error(`capability-profile chain mismatch at ${cell.cell_id}`);
    cells.push(cell); previousCellDigest = cell.receipt_digest;
    process.stdout.write(`[${cells.length}/${freeze.schedule.length}] ${cell.scenario_id}/${cell.policy_id}/r${cell.repetition}: ${cell.status}\n`);
  }
  const completedAt = new Date().toISOString();
  const summary = summarize(cells);
  const artifacts = freeze.schedule.map((scheduleCell) => ({ path: path.relative(output, cellFile(output, scheduleCell)).replace(/\\/g, '/'), digest: digest(readJson(cellFile(output, scheduleCell))) }));
  const unsigned = { schema: 2, bundle_id: null, run_id: digest({ freeze_id: freeze.freeze_id, first: cells[0].receipt_digest, last: previousCellDigest, started_at: startedAt }), freeze_id: freeze.freeze_id, started_at: startedAt, completed_at: completedAt, environment: machineProfile(health.models), economics: freeze.economics, artifacts, final_chain_digest: previousCellDigest, summary };
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
  const byId = new Map(scenarios().map((scenario) => [scenario.id, scenario]));
  const cells = []; let previousCellDigest = null;
  for (const scheduleCell of freeze.schedule) { const cell = verifyCell(readJson(cellFile(output, scheduleCell)), scheduleCell, byId.get(scheduleCell.scenario_id), freeze); if (cell.previous_cell_digest !== previousCellDigest) throw new Error(`capability-profile chain mismatch at ${cell.cell_id}`); cells.push(cell); previousCellDigest = cell.receipt_digest; }
  const artifacts = freeze.schedule.map((scheduleCell) => ({ path: path.relative(output, cellFile(output, scheduleCell)).replace(/\\/g, '/'), digest: digest(readJson(cellFile(output, scheduleCell))) }));
  if (JSON.stringify(bundle.artifacts) !== JSON.stringify(artifacts) || bundle.final_chain_digest !== previousCellDigest || JSON.stringify(bundle.summary) !== JSON.stringify(summarize(cells))) throw new Error('capability-profile published bundle drifted');
  const report = fs.readFileSync(path.join(output, 'REPORT.md'), 'utf8').replace(/\r\n/g, '\n');
  if (bundle.report_digest !== digest(report)) throw new Error('capability-profile report digest drifted');
  const payload = { ...bundle }; delete payload.attestation;
  const identityPayload = { ...payload, bundle_id: null }; delete identityPayload.report_digest;
  if (bundle.bundle_id !== digest(identityPayload) || !verifySignature(payload, bundle.attestation, freeze.attestation_public_key)) throw new Error('capability-profile bundle integrity failed');
  return Object.freeze({ status: 'passed', bundle_id: bundle.bundle_id, freeze_id: freeze.freeze_id, cells: cells.length, summary: bundle.summary });
}

module.exports = Object.freeze({ BENCHMARK, DEFAULT_KEY, DEFAULT_OUTPUT, ECONOMICS, FREEZE_FILE, GATES, MODELS, POLICIES, REPETITIONS, buildCell, capabilityClass, createAttempt, createFreeze, doctor, routeFor, runBenchmark, scenarios, stableSchedule, summarize, validateFreeze, verifyCell, verifyPublished });
