'use strict';

const crypto = require('crypto');

const SCHEMA_VERSION = 1;
const POLICY_IDS = Object.freeze([
  'frontier-only',
  'prompt-router',
  'always-open-local',
  'citadel-whole-operation',
]);
const MODULE_NAMES = Object.freeze(['atomizer', 'planner', 'executor', 'aggregator', 'verifier']);
const SAFE_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const SCENARIO_FIELDS = Object.freeze([
  'schema',
  'id',
  'category',
  'task',
  'timeout_seconds',
  'holdout',
  'adversarial_case',
  'verification',
]);
const VERIFICATION_FIELDS = Object.freeze([
  'kind',
  'answer_pointer',
  'answer_type',
  'expected_digest',
  'verifier_id',
]);
const STACK_FIELDS = Object.freeze([
  'adapter_id',
  'upstream_repo',
  'upstream_commit',
  'entrypoint',
  'adapter_digest',
]);
const MODULE_FIELDS = Object.freeze([
  'name',
  'provider',
  'model',
  'model_digest',
  'endpoint',
]);
const CONTROL_FIELDS = Object.freeze([
  'max_depth',
  'max_concurrency',
  'max_subtasks',
  'llm_retries',
  'operation_timeout_seconds',
  'module_max_tokens',
  'tools',
]);
const PLAN_FIELDS = Object.freeze([
  'schema',
  'plan_id',
  'policy_id',
  'scenario_id',
  'task_digest',
  'attempt',
  'stack',
  'modules',
  'controls',
  'reason_codes',
]);
const OBSERVED_MODULE_FIELDS = Object.freeze([
  'name',
  'model',
  'prompt_tokens',
  'completion_tokens',
  'total_tokens',
  'duration_ms',
  'error',
]);
const NODE_FIELDS = Object.freeze([
  'index',
  'depth',
  'status',
  'node_type',
  'modules',
]);
const PROVIDER_CALL_FIELDS = Object.freeze([
  'module',
  'model',
  'response_model',
  'prompt_tokens',
  'completion_tokens',
  'total_tokens',
  'timestamp',
]);
const CONFIGURED_TOOL_FIELDS = Object.freeze(['module', 'toolkit', 'kind']);
const TOOL_CALL_FIELDS = Object.freeze(['module', 'name', 'kind']);
const TOTAL_FIELDS = Object.freeze([
  'node_count',
  'max_depth_observed',
  'module_calls',
  'provider_call_count',
  'prompt_tokens',
  'completion_tokens',
  'total_tokens',
  'retry_count',
]);
const INVENTORY_FIELDS = Object.freeze(['name', 'digest']);
const OBSERVATION_FIELDS = Object.freeze([
  'schema',
  'adapter_id',
  'upstream_commit',
  'started_at',
  'duration_ms',
  'status',
  'output_text',
  'applied_controls',
  'configured_modules',
  'configured_tools',
  'tool_calls',
  'provider_calls',
  'nodes',
  'totals',
  'model_inventory',
  'error',
]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(canonical(value)).digest('hex')}`;
}

function exactFields(value, fields) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).length === fields.length
    && fields.every((field) => Object.prototype.hasOwnProperty.call(value, field));
}

function assertSafeString(value, label, max = 512) {
  if (typeof value !== 'string' || !value || value.length > max || /[\u0000-\u001f]/.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function assertInteger(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} is invalid`);
  return value;
}

function validateScenario(value, source = 'scenario') {
  if (!exactFields(value, SCENARIO_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (value.schema !== SCHEMA_VERSION) throw new Error(`${source}.schema is invalid`);
  if (!SAFE_ID.test(value.id)) throw new Error(`${source}.id is invalid`);
  if (!['atomic', 'compositional', 'constraint', 'adversarial'].includes(value.category)) {
    throw new Error(`${source}.category is invalid`);
  }
  assertSafeString(value.task, `${source}.task`, 12000);
  assertInteger(value.timeout_seconds, `${source}.timeout_seconds`, 15, 1800);
  if (typeof value.holdout !== 'boolean') throw new Error(`${source}.holdout is invalid`);
  if (value.adversarial_case !== null && !SAFE_ID.test(value.adversarial_case)) {
    throw new Error(`${source}.adversarial_case is invalid`);
  }
  if (!exactFields(value.verification, VERIFICATION_FIELDS)) {
    throw new Error(`${source}.verification fields are invalid`);
  }
  if (value.verification.kind !== 'json-answer-digest') throw new Error(`${source}.verification.kind is invalid`);
  if (value.verification.answer_pointer !== '/answer') throw new Error(`${source}.verification.answer_pointer is invalid`);
  if (!['integer', 'string'].includes(value.verification.answer_type)) throw new Error(`${source}.verification.answer_type is invalid`);
  if (!SHA256.test(value.verification.expected_digest)) throw new Error(`${source}.verification.expected_digest is invalid`);
  if (!SAFE_ID.test(value.verification.verifier_id)) throw new Error(`${source}.verification.verifier_id is invalid`);
  return value;
}

function validateStack(value, source = 'stack') {
  if (!exactFields(value, STACK_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (!SAFE_ID.test(value.adapter_id)) throw new Error(`${source}.adapter_id is invalid`);
  assertSafeString(value.upstream_repo, `${source}.upstream_repo`, 512);
  if (!/^[0-9a-f]{40}$/.test(value.upstream_commit)) throw new Error(`${source}.upstream_commit is invalid`);
  assertSafeString(value.entrypoint, `${source}.entrypoint`, 256);
  if (!SHA256.test(value.adapter_digest)) throw new Error(`${source}.adapter_digest is invalid`);
  return value;
}

function validateModule(value, source = 'module') {
  if (!exactFields(value, MODULE_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (!MODULE_NAMES.includes(value.name)) throw new Error(`${source}.name is invalid`);
  if (!SAFE_ID.test(value.provider)) throw new Error(`${source}.provider is invalid`);
  assertSafeString(value.model, `${source}.model`, 128);
  if (!SHA256.test(value.model_digest)) throw new Error(`${source}.model_digest is invalid`);
  assertSafeString(value.endpoint, `${source}.endpoint`, 512);
  let endpoint;
  try { endpoint = new URL(value.endpoint); } catch (_error) { throw new Error(`${source}.endpoint is invalid`); }
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new Error(`${source}.endpoint is invalid`);
  }
  return value;
}

function validateControls(value, source = 'controls') {
  if (!exactFields(value, CONTROL_FIELDS)) throw new Error(`${source} fields are invalid`);
  assertInteger(value.max_depth, `${source}.max_depth`, 1, 20);
  assertInteger(value.max_concurrency, `${source}.max_concurrency`, 1, 50);
  assertInteger(value.max_subtasks, `${source}.max_subtasks`, 1, 50);
  assertInteger(value.llm_retries, `${source}.llm_retries`, 0, 10);
  assertInteger(value.operation_timeout_seconds, `${source}.operation_timeout_seconds`, 15, 3600);
  if (!value.module_max_tokens || typeof value.module_max_tokens !== 'object' || Array.isArray(value.module_max_tokens)
    || Object.keys(value.module_max_tokens).sort().join(',') !== [...MODULE_NAMES].sort().join(',')) {
    throw new Error(`${source}.module_max_tokens is invalid`);
  }
  for (const name of MODULE_NAMES) {
    assertInteger(value.module_max_tokens[name], `${source}.module_max_tokens.${name}`, 128, 200000);
  }
  if (!Array.isArray(value.tools) || value.tools.length > 32) throw new Error(`${source}.tools is invalid`);
  for (const [index, tool] of value.tools.entries()) {
    if (!SAFE_ID.test(tool)) throw new Error(`${source}.tools[${index}] is invalid`);
  }
  return value;
}

function validatePlan(value, source = 'plan') {
  if (!exactFields(value, PLAN_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (value.schema !== SCHEMA_VERSION) throw new Error(`${source}.schema is invalid`);
  if (!SHA256.test(value.plan_id)) throw new Error(`${source}.plan_id is invalid`);
  if (value.policy_id !== 'citadel-whole-operation') throw new Error(`${source}.policy_id is invalid`);
  if (!SAFE_ID.test(value.scenario_id)) throw new Error(`${source}.scenario_id is invalid`);
  if (!SHA256.test(value.task_digest)) throw new Error(`${source}.task_digest is invalid`);
  assertInteger(value.attempt, `${source}.attempt`, 1, 10);
  validateStack(value.stack, `${source}.stack`);
  if (!Array.isArray(value.modules) || value.modules.length !== MODULE_NAMES.length) {
    throw new Error(`${source}.modules is invalid`);
  }
  value.modules.forEach((module, index) => validateModule(module, `${source}.modules[${index}]`));
  if (value.modules.map((module) => module.name).join(',') !== MODULE_NAMES.join(',')) {
    throw new Error(`${source}.modules order is invalid`);
  }
  validateControls(value.controls, `${source}.controls`);
  if (!Array.isArray(value.reason_codes) || !value.reason_codes.length || value.reason_codes.length > 32) {
    throw new Error(`${source}.reason_codes is invalid`);
  }
  value.reason_codes.forEach((code, index) => {
    if (!/^[A-Z0-9_]{3,64}$/.test(code)) throw new Error(`${source}.reason_codes[${index}] is invalid`);
  });
  const unsigned = { ...value, plan_id: null };
  if (value.plan_id !== digest(unsigned)) throw new Error(`${source}.plan_id does not match contents`);
  return value;
}

function validateObservedModule(value, source) {
  if (!exactFields(value, OBSERVED_MODULE_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (!MODULE_NAMES.includes(value.name)) throw new Error(`${source}.name is invalid`);
  if (value.model !== null) assertSafeString(value.model, `${source}.model`, 128);
  assertInteger(value.prompt_tokens, `${source}.prompt_tokens`, 0, Number.MAX_SAFE_INTEGER);
  assertInteger(value.completion_tokens, `${source}.completion_tokens`, 0, Number.MAX_SAFE_INTEGER);
  assertInteger(value.total_tokens, `${source}.total_tokens`, 0, Number.MAX_SAFE_INTEGER);
  if (value.total_tokens !== value.prompt_tokens + value.completion_tokens) throw new Error(`${source}.total_tokens is inconsistent`);
  assertInteger(value.duration_ms, `${source}.duration_ms`, 0, Number.MAX_SAFE_INTEGER);
  if (value.error !== null) assertSafeString(value.error, `${source}.error`, 2048);
}

function validateObservation(value, source = 'observation') {
  if (!exactFields(value, OBSERVATION_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (value.schema !== SCHEMA_VERSION) throw new Error(`${source}.schema is invalid`);
  if (!SAFE_ID.test(value.adapter_id)) throw new Error(`${source}.adapter_id is invalid`);
  if (!/^[0-9a-f]{40}$/.test(value.upstream_commit)) throw new Error(`${source}.upstream_commit is invalid`);
  if (!ISO_TIME.test(value.started_at) || Number.isNaN(Date.parse(value.started_at))) throw new Error(`${source}.started_at is invalid`);
  assertInteger(value.duration_ms, `${source}.duration_ms`, 0, Number.MAX_SAFE_INTEGER);
  if (!['completed', 'failed', 'unknown'].includes(value.status)) throw new Error(`${source}.status is invalid`);
  if (value.output_text !== null && typeof value.output_text !== 'string') throw new Error(`${source}.output_text is invalid`);
  validateControls(value.applied_controls, `${source}.applied_controls`);
  if (!Array.isArray(value.configured_modules) || value.configured_modules.length !== MODULE_NAMES.length) {
    throw new Error(`${source}.configured_modules is invalid`);
  }
  value.configured_modules.forEach((module, index) => validateModule(module, `${source}.configured_modules[${index}]`));
  if (!Array.isArray(value.configured_tools) || value.configured_tools.length > 256) throw new Error(`${source}.configured_tools is invalid`);
  value.configured_tools.forEach((tool, index) => {
    const label = `${source}.configured_tools[${index}]`;
    if (!exactFields(tool, CONFIGURED_TOOL_FIELDS)) throw new Error(`${label} fields are invalid`);
    if (!MODULE_NAMES.includes(tool.module)) throw new Error(`${label}.module is invalid`);
    assertSafeString(tool.toolkit, `${label}.toolkit`, 128);
    if (!['mandatory-internal', 'external-configured'].includes(tool.kind)) throw new Error(`${label}.kind is invalid`);
  });
  if (!Array.isArray(value.tool_calls) || value.tool_calls.length > 10000) throw new Error(`${source}.tool_calls is invalid`);
  value.tool_calls.forEach((call, index) => {
    const label = `${source}.tool_calls[${index}]`;
    if (!exactFields(call, TOOL_CALL_FIELDS)) throw new Error(`${label} fields are invalid`);
    if (!MODULE_NAMES.includes(call.module)) throw new Error(`${label}.module is invalid`);
    assertSafeString(call.name, `${label}.name`, 128);
    if (!['mandatory-internal', 'external-configured', 'unknown'].includes(call.kind)) throw new Error(`${label}.kind is invalid`);
  });
  if (!Array.isArray(value.provider_calls) || value.provider_calls.length > 10000) throw new Error(`${source}.provider_calls is invalid`);
  value.provider_calls.forEach((call, index) => {
    const label = `${source}.provider_calls[${index}]`;
    if (!exactFields(call, PROVIDER_CALL_FIELDS)) throw new Error(`${label} fields are invalid`);
    if (!MODULE_NAMES.includes(call.module)) throw new Error(`${label}.module is invalid`);
    assertSafeString(call.model, `${label}.model`, 128);
    if (call.response_model !== null) assertSafeString(call.response_model, `${label}.response_model`, 128);
    assertInteger(call.prompt_tokens, `${label}.prompt_tokens`, 0, Number.MAX_SAFE_INTEGER);
    assertInteger(call.completion_tokens, `${label}.completion_tokens`, 0, Number.MAX_SAFE_INTEGER);
    assertInteger(call.total_tokens, `${label}.total_tokens`, 0, Number.MAX_SAFE_INTEGER);
    if (call.total_tokens !== call.prompt_tokens + call.completion_tokens) throw new Error(`${label}.total_tokens is inconsistent`);
    if (!ISO_TIME.test(call.timestamp) || Number.isNaN(Date.parse(call.timestamp))) throw new Error(`${label}.timestamp is invalid`);
  });
  if (!Array.isArray(value.nodes) || value.nodes.length > 1000) throw new Error(`${source}.nodes is invalid`);
  value.nodes.forEach((node, nodeIndex) => {
    if (!exactFields(node, NODE_FIELDS)) throw new Error(`${source}.nodes[${nodeIndex}] fields are invalid`);
    assertInteger(node.index, `${source}.nodes[${nodeIndex}].index`, 0, 999);
    assertInteger(node.depth, `${source}.nodes[${nodeIndex}].depth`, 0, 20);
    assertSafeString(node.status, `${source}.nodes[${nodeIndex}].status`, 64);
    if (node.node_type !== null) assertSafeString(node.node_type, `${source}.nodes[${nodeIndex}].node_type`, 64);
    if (!Array.isArray(node.modules) || node.modules.length > 64) throw new Error(`${source}.nodes[${nodeIndex}].modules is invalid`);
    node.modules.forEach((module, moduleIndex) => validateObservedModule(module, `${source}.nodes[${nodeIndex}].modules[${moduleIndex}]`));
  });
  if (!exactFields(value.totals, TOTAL_FIELDS)) throw new Error(`${source}.totals fields are invalid`);
  for (const field of TOTAL_FIELDS) assertInteger(value.totals[field], `${source}.totals.${field}`, 0, Number.MAX_SAFE_INTEGER);
  if (value.totals.node_count !== value.nodes.length) throw new Error(`${source}.totals.node_count is inconsistent`);
  if (value.totals.provider_call_count !== value.provider_calls.length) throw new Error(`${source}.totals.provider_call_count is inconsistent`);
  const observedModuleCalls = value.nodes.reduce((sum, node) => sum + node.modules.length, 0);
  if (value.totals.module_calls !== observedModuleCalls) throw new Error(`${source}.totals.module_calls is inconsistent`);
  const maxDepth = value.nodes.reduce((maximum, node) => Math.max(maximum, node.depth), 0);
  if (value.totals.max_depth_observed !== maxDepth) throw new Error(`${source}.totals.max_depth_observed is inconsistent`);
  for (const field of ['prompt_tokens', 'completion_tokens', 'total_tokens']) {
    const amount = value.provider_calls.reduce((sum, call) => sum + call[field], 0);
    if (value.totals[field] !== amount) throw new Error(`${source}.totals.${field} is inconsistent`);
  }
  if (!Array.isArray(value.model_inventory) || value.model_inventory.length > 64) throw new Error(`${source}.model_inventory is invalid`);
  value.model_inventory.forEach((item, index) => {
    if (!exactFields(item, INVENTORY_FIELDS)) throw new Error(`${source}.model_inventory[${index}] fields are invalid`);
    assertSafeString(item.name, `${source}.model_inventory[${index}].name`, 128);
    if (!SHA256.test(item.digest)) throw new Error(`${source}.model_inventory[${index}].digest is invalid`);
  });
  if (value.error !== null) assertSafeString(value.error, `${source}.error`, 4096);
  return value;
}

function createPlan(unsigned) {
  const candidate = { ...unsigned, plan_id: null };
  return validatePlan({ ...candidate, plan_id: digest(candidate) });
}

module.exports = Object.freeze({
  CONTROL_FIELDS,
  MODULE_NAMES,
  POLICY_IDS,
  SCHEMA_VERSION,
  canonical,
  createPlan,
  digest,
  exactFields,
  validateControls,
  validateModule,
  validateObservation,
  validatePlan,
  validateScenario,
  validateStack,
});
