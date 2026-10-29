'use strict';

const crypto = require('crypto');
const {
  MODULE_NAMES,
  canonical,
  digest,
  validateObservation,
  validatePlan,
  validateScenario,
} = require('./contracts');

function extractJsonObjects(text) {
  const source = String(text || '');
  const candidates = [];
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== '{') continue;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let end = start; end < source.length; end += 1) {
      const character = source[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') quoted = false;
        continue;
      }
      if (character === '"') quoted = true;
      else if (character === '{') depth += 1;
      else if (character === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(source.slice(start, end + 1));
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) candidates.push(parsed);
          } catch (_error) {
            // Keep scanning: model output may contain prose or malformed examples before the answer.
          }
          break;
        }
      }
    }
  }
  return candidates;
}

function verifyScenarioOutput(scenario, outputText) {
  validateScenario(scenario);
  const answers = extractJsonObjects(outputText)
    .filter((candidate) => Object.prototype.hasOwnProperty.call(candidate, 'answer'));
  if (!answers.length) {
    return Object.freeze({
      status: 'failed',
      verifier_id: scenario.verification.verifier_id,
      answer_digest: null,
      failure_code: 'ANSWER_JSON_MISSING',
    });
  }
  const answer = answers[answers.length - 1].answer;
  const answerDigest = digest(answer);
  return Object.freeze({
    status: answerDigest === scenario.verification.expected_digest ? 'passed' : 'failed',
    verifier_id: scenario.verification.verifier_id,
    answer_digest: answerDigest,
    failure_code: answerDigest === scenario.verification.expected_digest ? null : 'ANSWER_DIGEST_MISMATCH',
  });
}

function sameControls(left, right) {
  return canonical(left) === canonical(right);
}

function normalizeObservedModel(model) {
  if (typeof model !== 'string') return null;
  const pieces = model.split('/');
  return pieces[pieces.length - 1].toLowerCase();
}

function reconcileRomaPlan(plan, observation) {
  validatePlan(plan);
  validateObservation(observation);
  const mismatches = [];
  if (observation.status !== 'completed') mismatches.push('EXECUTION_NOT_COMPLETED');
  if (observation.adapter_id !== plan.stack.adapter_id) mismatches.push('ADAPTER_ID_MISMATCH');
  if (observation.upstream_commit !== plan.stack.upstream_commit) mismatches.push('UPSTREAM_COMMIT_MISMATCH');
  if (!sameControls(observation.applied_controls, plan.controls)) mismatches.push('APPLIED_CONTROLS_MISMATCH');
  const externalTools = observation.configured_tools
    .filter((item) => item.kind === 'external-configured')
    .map((item) => item.toolkit)
    .sort();
  if (JSON.stringify(externalTools) !== JSON.stringify([...plan.controls.tools].sort())) {
    mismatches.push('EXTERNAL_TOOL_CONFIG_MISMATCH');
  }
  if (observation.tool_calls.some((call) => call.kind === 'external-configured' && !plan.controls.tools.includes(call.name))) {
    mismatches.push('UNPLANNED_EXTERNAL_TOOL_CALL');
  }

  const inventory = new Map(observation.model_inventory.map((entry) => [entry.name.toLowerCase(), entry.digest]));
  const configured = new Map(observation.configured_modules.map((entry) => [entry.name, entry]));
  const exercise = [];
  for (const planned of plan.modules) {
    const applied = configured.get(planned.name);
    if (!applied) {
      mismatches.push(`MODULE_${planned.name.toUpperCase()}_CONFIG_MISSING`);
      exercise.push({ name: planned.name, status: 'unknown', calls: 0, observed_models: [] });
      continue;
    }
    if (applied.provider !== planned.provider
      || applied.model !== planned.model
      || applied.model_digest !== planned.model_digest
      || applied.endpoint !== planned.endpoint) {
      mismatches.push(`MODULE_${planned.name.toUpperCase()}_CONFIG_MISMATCH`);
    }
    if (inventory.get(planned.model.toLowerCase()) !== planned.model_digest) {
      mismatches.push(`MODULE_${planned.name.toUpperCase()}_MODEL_DIGEST_MISMATCH`);
    }
    const calls = observation.provider_calls.filter((item) => item.module === planned.name);
    const nodeExecutions = observation.nodes.flatMap((node) => node.modules).filter((item) => item.name === planned.name);
    const observedModels = [...new Set(calls.flatMap((item) => [item.model, item.response_model]).filter(Boolean))].sort();
    const expectedModel = normalizeObservedModel(planned.model);
    if (nodeExecutions.length > 0 && calls.length === 0) {
      mismatches.push(`MODULE_${planned.name.toUpperCase()}_PROVIDER_EVIDENCE_MISSING`);
    }
    const wrong = observedModels.some((model) => normalizeObservedModel(model) !== expectedModel);
    if (wrong) mismatches.push(`MODULE_${planned.name.toUpperCase()}_OBSERVED_MODEL_MISMATCH`);
    exercise.push({
      name: planned.name,
      status: nodeExecutions.length === 0 && calls.length === 0 ? 'not_exercised'
        : calls.length === 0 || wrong ? 'mismatch' : 'exercised',
      calls: calls.length,
      observed_models: observedModels,
    });
  }
  return Object.freeze({
    status: mismatches.length ? 'failed' : 'verified',
    mismatch_codes: Object.freeze([...new Set(mismatches)].sort()),
    module_exercise: Object.freeze(exercise),
  });
}

function costEnvelope({ policyId, durationMs, usage, gpu = null, billingClass = null }) {
  const local = billingClass === 'self-hosted-local'
    || (billingClass === null && (policyId === 'always-open-local' || policyId === 'citadel-whole-operation'));
  const gpuKnown = gpu && Number.isFinite(gpu.energy_kwh) && gpu.energy_kwh >= 0;
  return Object.freeze({
    status: 'unknown',
    total_usd: null,
    reason: local
      ? 'electricity_rate_cpu_energy_and_hardware_amortization_unmeasured'
      : 'subscription_allocation_and_provider_cost_unreported',
    components: Object.freeze([
      {
        kind: 'provider_invoice',
        status: local ? 'known' : 'unknown',
        amount_usd: local ? 0 : null,
        source: local ? 'self_hosted_ollama_no_per_request_invoice' : 'subscription_no_per_request_invoice',
      },
      {
        kind: 'gpu_energy',
        status: gpuKnown ? 'measured_nonmonetary' : 'unknown',
        amount_usd: null,
        energy_kwh: gpuKnown ? gpu.energy_kwh : null,
        samples: gpuKnown ? gpu.samples : 0,
        source: gpuKnown ? 'nvidia_smi_power_draw_integration' : 'telemetry_unavailable',
      },
      {
        kind: 'cpu_and_system_energy',
        status: 'unknown',
        amount_usd: null,
        source: 'not_measured',
      },
      {
        kind: 'hardware_amortization',
        status: 'unknown',
        amount_usd: null,
        source: 'not_allocated',
      },
    ]),
    duration_ms: durationMs,
    usage: usage || null,
    setup_costs_included: false,
  });
}

function createCellReceipt({
  scenario,
  policyId,
  attempt,
  plan = null,
  observation = null,
  outputText,
  startedAt,
  durationMs,
  usage = null,
  gpu = null,
  billingClass = null,
  executionEvidence,
}) {
  validateScenario(scenario);
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error('attempt is invalid');
  const completion = verifyScenarioOutput(scenario, outputText);
  const control = plan && observation
    ? reconcileRomaPlan(plan, observation)
    : { status: executionEvidence && executionEvidence.status === 'verified' ? 'verified' : 'unknown', mismatch_codes: [], module_exercise: [] };
  const unsigned = {
    schema: 1,
    receipt_id: null,
    scenario_id: scenario.id,
    policy_id: policyId,
    attempt,
    plan_id: plan ? plan.plan_id : null,
    observation_digest: observation ? digest(observation) : null,
    output_digest: digest(String(outputText || '')),
    started_at: startedAt,
    duration_ms: durationMs,
    completion,
    control,
    execution_evidence: executionEvidence,
    cost: costEnvelope({ policyId, durationMs, usage, gpu, billingClass }),
    adversarial_result: scenario.adversarial_case === null
      ? null
      : completion.status === 'passed' ? 'detected' : 'not_demonstrated',
  };
  return Object.freeze({ ...unsigned, receipt_id: digest(unsigned) });
}

function generateAttestationKeyPair() {
  const pair = crypto.generateKeyPairSync('ed25519');
  return Object.freeze({
    public_key: pair.publicKey.export({ type: 'spki', format: 'pem' }),
    private_key: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
  });
}

function signPayload(payload, privateKey) {
  const payloadDigest = digest(payload);
  const signature = crypto.sign(null, Buffer.from(canonical(payload)), privateKey).toString('base64');
  return Object.freeze({ algorithm: 'Ed25519', payload_digest: payloadDigest, signature });
}

function verifySignature(payload, attestation, publicKey) {
  if (!attestation || attestation.algorithm !== 'Ed25519' || attestation.payload_digest !== digest(payload)) return false;
  try {
    return crypto.verify(null, Buffer.from(canonical(payload)), publicKey, Buffer.from(attestation.signature, 'base64'));
  } catch (_error) {
    return false;
  }
}

module.exports = Object.freeze({
  costEnvelope,
  createCellReceipt,
  extractJsonObjects,
  generateAttestationKeyPair,
  reconcileRomaPlan,
  signPayload,
  verifyScenarioOutput,
  verifySignature,
});
