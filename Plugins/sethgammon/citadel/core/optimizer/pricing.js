'use strict';

const { digest, exactFields, validateCost } = require('./contracts');

const SNAPSHOT_FIELDS = Object.freeze([
  'schema',
  'currency',
  'observed_at',
  'source_url',
  'billing_basis',
  'models',
]);
const MODEL_FIELDS = Object.freeze([
  'provider',
  'model',
  'input_per_million_usd',
  'cached_input_per_million_usd',
  'output_per_million_usd',
  'standard_input_limit_tokens',
  'over_limit_input_multiplier',
  'over_limit_output_multiplier',
]);
const USAGE_FIELDS = Object.freeze([
  'input_tokens',
  'cached_input_tokens',
  'output_tokens',
]);

function nonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function validatePricingSnapshot(value, source = 'pricing snapshot') {
  if (!exactFields(value, SNAPSHOT_FIELDS)) throw new Error(`${source} fields are invalid`);
  if (value.schema !== 1 || value.currency !== 'USD') throw new Error(`${source} identity is invalid`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.observed_at)) throw new Error(`${source}.observed_at is invalid`);
  if (typeof value.source_url !== 'string' || !/^https:\/\//.test(value.source_url) || value.source_url.length > 512) {
    throw new Error(`${source}.source_url is invalid`);
  }
  if (!['official_api_list_price', 'contracted_rate', 'invoice_export'].includes(value.billing_basis)) {
    throw new Error(`${source}.billing_basis is invalid`);
  }
  if (!Array.isArray(value.models) || value.models.length === 0) throw new Error(`${source}.models is invalid`);
  const identities = new Set();
  for (const [index, model] of value.models.entries()) {
    if (!exactFields(model, MODEL_FIELDS)) throw new Error(`${source}.models[${index}] fields are invalid`);
    if (typeof model.provider !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(model.provider)) {
      throw new Error(`${source}.models[${index}].provider is invalid`);
    }
    if (typeof model.model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/.test(model.model)) {
      throw new Error(`${source}.models[${index}].model is invalid`);
    }
    for (const field of MODEL_FIELDS.slice(2, 5)) {
      if (!nonNegative(model[field])) throw new Error(`${source}.models[${index}].${field} is invalid`);
    }
    if (model.standard_input_limit_tokens === null) {
      if (model.over_limit_input_multiplier !== null || model.over_limit_output_multiplier !== null) {
        throw new Error(`${source}.models[${index}] over-limit pricing requires a token limit`);
      }
    } else if (!Number.isInteger(model.standard_input_limit_tokens)
      || model.standard_input_limit_tokens < 1
      || !Number.isFinite(model.over_limit_input_multiplier)
      || model.over_limit_input_multiplier < 1
      || !Number.isFinite(model.over_limit_output_multiplier)
      || model.over_limit_output_multiplier < 1) {
      throw new Error(`${source}.models[${index}] over-limit pricing is invalid`);
    }
    const identity = `${model.provider}/${model.model}`;
    if (identities.has(identity)) throw new Error(`${source} contains duplicate model pricing: ${identity}`);
    identities.add(identity);
  }
  return value;
}

function pricingSnapshotDigest(snapshot) {
  return digest(validatePricingSnapshot(snapshot));
}

function validateUsage(value, source = 'usage') {
  if (!exactFields(value, USAGE_FIELDS)) throw new Error(`${source} fields are invalid`);
  for (const field of USAGE_FIELDS) {
    if (!Number.isInteger(value[field]) || value[field] < 0) throw new Error(`${source}.${field} is invalid`);
  }
  if (value.cached_input_tokens > value.input_tokens) {
    throw new Error(`${source}.cached_input_tokens exceeds input_tokens`);
  }
  return value;
}

function roundUsd(value) {
  return Number(value.toFixed(6));
}

function deriveTokenCost(snapshot, provider, model, usage) {
  validatePricingSnapshot(snapshot);
  validateUsage(usage);
  const price = snapshot.models.find((item) => item.provider === provider && item.model === model);
  if (!price) throw new Error(`Pricing snapshot does not contain ${provider}/${model}`);
  const uncachedInput = usage.input_tokens - usage.cached_input_tokens;
  const overLimit = price.standard_input_limit_tokens !== null
    && usage.input_tokens > price.standard_input_limit_tokens;
  const inputMultiplier = overLimit ? price.over_limit_input_multiplier : 1;
  const outputMultiplier = overLimit ? price.over_limit_output_multiplier : 1;
  const amount = roundUsd((
    uncachedInput * price.input_per_million_usd * inputMultiplier
    + usage.cached_input_tokens * price.cached_input_per_million_usd * inputMultiplier
    + usage.output_tokens * price.output_per_million_usd * outputMultiplier
  ) / 1_000_000);
  return validateCost({
    status: 'known',
    amount_usd: amount,
    provenance: 'price_derived',
    source: 'runtime_token_telemetry',
    source_ref: `${snapshot.source_url} observed ${snapshot.observed_at}; ${snapshot.billing_basis}`,
    pricing_snapshot_digest: pricingSnapshotDigest(snapshot),
    components: [{
      kind: 'model',
      amount_usd: amount,
      source: `${provider}/${model} token pricing`,
    }],
  });
}

function pricingCoversExecutors(snapshot, executors) {
  validatePricingSnapshot(snapshot);
  const identities = new Set(snapshot.models.map((item) => `${item.provider}/${item.model}`));
  return executors
    .filter((executor) => executor.runtime === 'codex')
    .every((executor) => identities.has(`${executor.provider}/${executor.model}`));
}

module.exports = Object.freeze({
  MODEL_FIELDS,
  SNAPSHOT_FIELDS,
  USAGE_FIELDS,
  deriveTokenCost,
  pricingCoversExecutors,
  pricingSnapshotDigest,
  validatePricingSnapshot,
  validateUsage,
});
