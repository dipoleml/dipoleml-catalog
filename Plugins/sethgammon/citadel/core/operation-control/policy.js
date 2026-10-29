'use strict';

const {
  MODULE_NAMES,
  createPlan,
  validateScenario,
  validateStack,
} = require('./contracts');

const CONSTRAINT_PATTERN = /\b(must|exactly|only|unless|before|after|cannot|at least|at most|no more|if|then|while|all|none)\b/gi;
const REASONING_PATTERN = /\b(compare|reconcile|derive|optimi[sz]e|dependency|constraint|critical path|contradiction|audit|sequence|minimum|maximum|independent|combine|checksum)\b/gi;
const STRUCTURE_PATTERN = /(?:^|\n)\s*(?:[-*]|\d+[.)]|[A-Z][.)])\s+/gm;

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function taskFeatures(task) {
  const words = task.trim().split(/\s+/).filter(Boolean).length;
  const constraints = countMatches(task, CONSTRAINT_PATTERN);
  const reasoning = countMatches(task, REASONING_PATTERN);
  const structure = countMatches(task, STRUCTURE_PATTERN);
  const score = Math.min(1,
    (Math.min(words, 240) / 240 * 0.30)
      + (Math.min(constraints, 10) / 10 * 0.30)
      + (Math.min(reasoning, 8) / 8 * 0.25)
      + (Math.min(structure, 10) / 10 * 0.15));
  return Object.freeze({
    word_count: words,
    constraint_count: constraints,
    reasoning_count: reasoning,
    structure_count: structure,
    difficulty_score: Number(score.toFixed(6)),
  });
}

function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) throw new Error('model catalog is required');
  for (const tier of ['cheap', 'strong']) {
    const entry = catalog[tier];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`model catalog ${tier} is required`);
    for (const field of ['provider', 'model', 'model_digest', 'endpoint']) {
      if (typeof entry[field] !== 'string' || !entry[field]) throw new Error(`model catalog ${tier}.${field} is invalid`);
    }
  }
  return catalog;
}

function moduleAssignment(tierByModule, catalog) {
  return MODULE_NAMES.map((name) => ({ name, ...catalog[tierByModule[name]] }));
}

function firstAttemptProfile(features, timeoutSeconds) {
  if (features.difficulty_score < 0.20) {
    return {
      label: 'LOCAL_COMPACT',
      tiers: Object.fromEntries(MODULE_NAMES.map((name) => [name, 'cheap'])),
      controls: {
        max_depth: 1,
        max_concurrency: 1,
        max_subtasks: 3,
        llm_retries: 0,
        operation_timeout_seconds: timeoutSeconds,
        module_max_tokens: { atomizer: 384, planner: 512, executor: 384, aggregator: 384, verifier: 384 },
        tools: [],
      },
    };
  }
  if (features.difficulty_score < 0.33) {
    return {
      label: 'MIXED_BOUNDED',
      tiers: {
        atomizer: 'cheap',
        planner: 'cheap',
        executor: 'strong',
        aggregator: 'strong',
        verifier: 'cheap',
      },
      controls: {
        max_depth: 1,
        max_concurrency: 1,
        max_subtasks: 3,
        llm_retries: 0,
        operation_timeout_seconds: timeoutSeconds,
        module_max_tokens: { atomizer: 384, planner: 512, executor: 384, aggregator: 384, verifier: 384 },
        tools: [],
      },
    };
  }
  return {
    label: 'STRONG_DECOMPOSE',
    tiers: {
      atomizer: 'cheap',
      planner: 'cheap',
      executor: 'strong',
      aggregator: 'strong',
      verifier: 'strong',
    },
    controls: {
      max_depth: 2,
      max_concurrency: 1,
      max_subtasks: 4,
      llm_retries: 0,
      operation_timeout_seconds: timeoutSeconds,
      module_max_tokens: { atomizer: 384, planner: 640, executor: 512, aggregator: 512, verifier: 384 },
      tools: [],
    },
  };
}

function escalationProfile(timeoutSeconds) {
  return {
    label: 'VERIFICATION_ESCALATION',
    tiers: {
      atomizer: 'cheap',
      planner: 'cheap',
      executor: 'strong',
      aggregator: 'strong',
      verifier: 'strong',
    },
    controls: {
      max_depth: 1,
      max_concurrency: 1,
      max_subtasks: 3,
      llm_retries: 0,
      operation_timeout_seconds: timeoutSeconds,
      module_max_tokens: { atomizer: 384, planner: 512, executor: 512, aggregator: 512, verifier: 384 },
      tools: [],
    },
  };
}

function routeRomaOperation({ scenario, catalog, stack, attempt = 1, previous = null }) {
  validateScenario(scenario);
  validateCatalog(catalog);
  validateStack(stack);
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 2) throw new Error('attempt is invalid');
  if (attempt === 2 && (!previous || previous.completion_status !== 'failed')) {
    throw new Error('attempt 2 requires an independently failed first attempt');
  }
  const features = taskFeatures(scenario.task);
  const profile = attempt === 1
    ? firstAttemptProfile(features, scenario.timeout_seconds)
    : escalationProfile(scenario.timeout_seconds);
  const reasonCodes = [
    'POLICY_CITADEL_WHOLE_OPERATION',
    profile.label,
    features.difficulty_score < 0.20 ? 'PROMPT_DIFFICULTY_LOW'
      : features.difficulty_score < 0.33 ? 'PROMPT_DIFFICULTY_MEDIUM' : 'PROMPT_DIFFICULTY_HIGH',
    'NO_EXTERNAL_TOOLS',
    'SINGLE_GPU_CONCURRENCY_CAP',
    'PER_MODULE_TOKEN_BUDGET',
    attempt === 1 ? 'INITIAL_ATTEMPT' : 'INDEPENDENT_VERIFICATION_FAILED',
  ];
  return createPlan({
    schema: 1,
    policy_id: 'citadel-whole-operation',
    scenario_id: scenario.id,
    task_digest: require('./contracts').digest(scenario.task),
    attempt,
    stack,
    modules: moduleAssignment(profile.tiers, catalog),
    controls: profile.controls,
    reason_codes: reasonCodes,
  });
}

function promptRoute(task) {
  const features = taskFeatures(task);
  const frontier = features.difficulty_score >= 0.25;
  return Object.freeze({
    target: frontier ? 'frontier' : 'open-local',
    features,
    reason_code: frontier ? 'PROMPT_SCORE_FRONTIER' : 'PROMPT_SCORE_LOCAL',
  });
}

module.exports = Object.freeze({
  promptRoute,
  routeRomaOperation,
  taskFeatures,
});
