'use strict';

const {
  executorProfileDigest,
} = require('../forks/executor-profiles');
const { validateExecutorProfile } = require('./contracts');

function operationForkProfile(executor) {
  validateExecutorProfile(executor);
  return Object.freeze({
    profile_id: executor.profile_id,
    runtime: executor.runtime,
    model: executor.model,
    local_provider: null,
    adapter_options: executor.runtime === 'claude'
      ? Object.freeze({ permission_mode: 'acceptEdits' })
      : Object.freeze({ sandbox: 'workspace-write' }),
  });
}

function boundExecutorProfileDigest(executor) {
  return executorProfileDigest(operationForkProfile(executor));
}

function validateExecutorBindings(executors) {
  const mismatches = [];
  for (const executor of executors) {
    validateExecutorProfile(executor);
    if (executor.executor_profile_digest !== boundExecutorProfileDigest(executor)) {
      mismatches.push(executor.profile_id);
    }
  }
  return Object.freeze(mismatches);
}

module.exports = Object.freeze({
  boundExecutorProfileDigest,
  operationForkProfile,
  validateExecutorBindings,
});
