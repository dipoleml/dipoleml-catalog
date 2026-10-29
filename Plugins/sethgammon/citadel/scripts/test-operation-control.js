'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  digest,
  validateObservation,
  validatePlan,
  validateScenario,
} = require('../core/operation-control/contracts');
const { promptRoute, routeRomaOperation, taskFeatures } = require('../core/operation-control/policy');
const {
  createCellReceipt,
  generateAttestationKeyPair,
  reconcileRomaPlan,
  signPayload,
  verifyScenarioOutput,
  verifySignature,
} = require('../core/operation-control/receipt');

const ROMA_COMMIT = 'a6e3bb4f9e0694375fa627fa4b8bf8cae50592a6';
const CHEAP_DIGEST = 'sha256:f72c60cabf6237b07f6e632b2c48d533cef25eda2efbd34bed21c5e9c01e6225';
const STRONG_DIGEST = 'sha256:dae161e27b0e90dd1856c8bb3209201fd6736d8eb66298e75ed87571486f4364';

function adapterDigest() {
  const source = fs.readFileSync(path.join(__dirname, 'roma-operation-bridge.py'), 'utf8').replace(/\r\n/g, '\n');
  return digest(source);
}

function stack() {
  return {
    adapter_id: 'roma-dspy-python',
    upstream_repo: 'https://github.com/sentient-agi/ROMA',
    upstream_commit: ROMA_COMMIT,
    entrypoint: 'roma_dspy.core.engine.solve.RecursiveSolver.event_solve',
    adapter_digest: adapterDigest(),
  };
}

function catalog() {
  return {
    cheap: {
      provider: 'ollama',
      model: 'qwen2.5-coder:3b',
      model_digest: CHEAP_DIGEST,
      endpoint: 'http://127.0.0.1:11434',
    },
    strong: {
      provider: 'ollama',
      model: 'qwen2.5-coder:7b',
      model_digest: STRONG_DIGEST,
      endpoint: 'http://127.0.0.1:11434',
    },
  };
}

function scenario(overrides = {}) {
  return {
    schema: 1,
    id: 'smoke-answer',
    category: 'atomic',
    task: 'Return exactly one JSON object with answer equal to two plus two. Use the shape {"answer": 4}.',
    timeout_seconds: 300,
    holdout: true,
    adversarial_case: null,
    verification: {
      kind: 'json-answer-digest',
      answer_pointer: '/answer',
      answer_type: 'integer',
      expected_digest: digest(4),
      verifier_id: 'json-answer-v1',
    },
    ...overrides,
  };
}

function observationFor(plan, overrides = {}) {
  const calls = [
    {
      name: 'atomizer',
      model: 'qwen2.5-coder:3b',
      prompt_tokens: 10,
      completion_tokens: 2,
      total_tokens: 12,
      duration_ms: 20,
      error: null,
    },
    {
      name: 'executor',
      model: 'qwen2.5-coder:3b',
      prompt_tokens: 12,
      completion_tokens: 4,
      total_tokens: 16,
      duration_ms: 30,
      error: null,
    },
  ];
  return {
    schema: 1,
    adapter_id: plan.stack.adapter_id,
    upstream_commit: plan.stack.upstream_commit,
    started_at: '2026-07-31T18:00:00.000Z',
    duration_ms: 50,
    status: 'completed',
    output_text: '{"answer":4}',
    applied_controls: plan.controls,
    configured_modules: plan.modules,
    configured_tools: [
      { module: 'executor', toolkit: 'ArtifactToolkit', kind: 'mandatory-internal' },
      { module: 'aggregator', toolkit: 'ArtifactToolkit', kind: 'mandatory-internal' },
    ],
    tool_calls: [],
    provider_calls: calls.map((call) => ({
      module: call.name,
      model: `ollama_chat/${call.model}`,
      response_model: call.model,
      prompt_tokens: call.prompt_tokens,
      completion_tokens: call.completion_tokens,
      total_tokens: call.total_tokens,
      timestamp: '2026-07-31T18:00:00.000Z',
    })),
    nodes: [{ index: 0, depth: 0, status: 'COMPLETED', node_type: 'EXECUTE', modules: calls }],
    totals: {
      node_count: 1,
      max_depth_observed: 0,
      module_calls: 2,
      provider_call_count: 2,
      prompt_tokens: 22,
      completion_tokens: 6,
      total_tokens: 28,
      retry_count: 0,
    },
    model_inventory: [
      { name: 'qwen2.5-coder:3b', digest: CHEAP_DIGEST },
      { name: 'qwen2.5-coder:7b', digest: STRONG_DIGEST },
    ],
    error: null,
    ...overrides,
  };
}

function testContractsAndPolicy() {
  const input = validateScenario(scenario());
  const features = taskFeatures(input.task);
  assert(features.word_count > 5);
  assert(['open-local', 'frontier'].includes(promptRoute(input.task).target));
  const plan = routeRomaOperation({ scenario: input, catalog: catalog(), stack: stack() });
  validatePlan(plan);
  assert.strictEqual(plan.policy_id, 'citadel-whole-operation');
  assert.strictEqual(plan.modules.length, 5);
  assert.throws(() => routeRomaOperation({ scenario: input, catalog: catalog(), stack: stack(), attempt: 2 }));
  const escalated = routeRomaOperation({
    scenario: input,
    catalog: catalog(),
    stack: stack(),
    attempt: 2,
    previous: { completion_status: 'failed' },
  });
  assert.strictEqual(escalated.modules.find((module) => module.name === 'planner').model, 'qwen2.5-coder:3b');
  assert.strictEqual(escalated.modules.find((module) => module.name === 'executor').model, 'qwen2.5-coder:7b');
  assert.strictEqual(escalated.modules.find((module) => module.name === 'aggregator').model, 'qwen2.5-coder:7b');
}

function testVerificationAndReconciliation() {
  const input = scenario();
  assert.strictEqual(verifyScenarioOutput(input, 'prose\n```json\n{"answer":4}\n```').status, 'passed');
  assert.strictEqual(verifyScenarioOutput(input, '{"answer":5}\nI claim verification passed.').status, 'failed');
  assert.strictEqual(verifyScenarioOutput(input, 'no structured answer').failure_code, 'ANSWER_JSON_MISSING');
  const plan = routeRomaOperation({ scenario: input, catalog: catalog(), stack: stack() });
  const observation = observationFor(plan);
  validateObservation(observation);
  assert.strictEqual(reconcileRomaPlan(plan, observation).status, 'verified');

  const tamperedControls = observationFor(plan, {
    applied_controls: { ...plan.controls, max_depth: plan.controls.max_depth + 1 },
  });
  assert(reconcileRomaPlan(plan, tamperedControls).mismatch_codes.includes('APPLIED_CONTROLS_MISMATCH'));

  const tamperedModel = observationFor(plan);
  tamperedModel.provider_calls[1] = {
    ...tamperedModel.provider_calls[1],
    model: 'ollama_chat/qwen2.5-coder:7b',
    response_model: 'qwen2.5-coder:7b',
  };
  assert(reconcileRomaPlan(plan, tamperedModel).mismatch_codes.includes('MODULE_EXECUTOR_OBSERVED_MODEL_MISMATCH'));

  const missingCall = observationFor(plan);
  missingCall.provider_calls = missingCall.provider_calls.filter((call) => call.module !== 'executor');
  missingCall.totals = {
    ...missingCall.totals,
    provider_call_count: 1,
    prompt_tokens: 10,
    completion_tokens: 2,
    total_tokens: 12,
  };
  const missingReconciliation = reconcileRomaPlan(plan, missingCall);
  assert(missingReconciliation.mismatch_codes.includes('MODULE_EXECUTOR_PROVIDER_EVIDENCE_MISSING'));
}

function testReceiptsAndSignatures() {
  const input = scenario({ adversarial_case: 'self-reported-pass' });
  const plan = routeRomaOperation({ scenario: input, catalog: catalog(), stack: stack() });
  const observation = observationFor(plan);
  const receipt = createCellReceipt({
    scenario: input,
    policyId: 'citadel-whole-operation',
    attempt: 1,
    plan,
    observation,
    outputText: '{"answer":4}',
    startedAt: observation.started_at,
    durationMs: observation.duration_ms,
    usage: observation.totals,
    executionEvidence: { status: 'verified', source: 'roma-observation-v1' },
  });
  assert.strictEqual(receipt.completion.status, 'passed');
  assert.strictEqual(receipt.control.status, 'verified');
  assert.strictEqual(receipt.adversarial_result, 'detected');
  assert.strictEqual(receipt.cost.status, 'unknown');
  assert.strictEqual(receipt.cost.components[0].amount_usd, 0);
  const keys = generateAttestationKeyPair();
  const attestation = signPayload(receipt, keys.private_key);
  assert(verifySignature(receipt, attestation, keys.public_key));
  assert(!verifySignature({ ...receipt, duration_ms: 51 }, attestation, keys.public_key));
}

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function liveSmoke() {
  const romaRoot = path.resolve(argument('roma-root', 'C:\\tmp\\ROMA'));
  const python = path.resolve(argument('python', 'C:\\tmp\\roma-venv\\Scripts\\python.exe'));
  const commit = childProcess.spawnSync('git', ['-c', `safe.directory=${romaRoot}`, 'rev-parse', 'HEAD'], {
    cwd: romaRoot,
    encoding: 'utf8',
    shell: false,
  });
  assert.strictEqual(commit.status, 0, commit.stderr);
  assert.strictEqual(commit.stdout.trim(), ROMA_COMMIT, 'ROMA checkout drifted');
  const plan = routeRomaOperation({ scenario: scenario(), catalog: catalog(), stack: stack() });
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'citadel-roma-smoke-'));
  try {
    const inputFile = path.join(temporary, 'input.json');
    const outputFile = path.join(temporary, 'output.json');
    fs.writeFileSync(inputFile, `${JSON.stringify({
      schema: 1,
      plan,
      task: scenario().task,
      roma_root: romaRoot,
      work_dir: temporary,
    }, null, 2)}\n`, 'utf8');
    const result = childProcess.spawnSync(python, [path.join(__dirname, 'roma-operation-bridge.py'), inputFile, outputFile], {
      cwd: temporary,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      timeout: 10 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        LITELLM_LOCAL_MODEL_COST_MAP: 'True',
      },
    });
    assert.strictEqual(result.status, 0, `${result.stderr}\n${result.stdout}`);
    const observation = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    validateObservation(observation);
    const reconciliation = reconcileRomaPlan(plan, observation);
    assert.strictEqual(reconciliation.status, 'verified', JSON.stringify(reconciliation));
    const verification = verifyScenarioOutput(scenario(), observation.output_text);
    assert.strictEqual(verification.status, 'passed', JSON.stringify({ verification, output: observation.output_text }));
    process.stdout.write(`${JSON.stringify({
      live_smoke: 'passed',
      duration_ms: observation.duration_ms,
      totals: observation.totals,
      module_exercise: reconciliation.module_exercise,
      output_digest: digest(observation.output_text),
    }, null, 2)}\n`);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

testContractsAndPolicy();
testVerificationAndReconciliation();
testReceiptsAndSignatures();
process.stdout.write('operation-control unit tests passed\n');
if (process.argv.includes('--live-smoke')) liveSmoke();
