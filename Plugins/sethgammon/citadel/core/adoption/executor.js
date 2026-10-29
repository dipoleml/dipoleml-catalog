'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  CONTRACT_VERSION, assertValid, receiptDigest, validatePlan, validateReceipt,
} = require('./contracts');
const {
  ACTIVE_RECEIPT, ADOPTION_DIR, LOCK_PATH, atomicCreate, atomicReplace,
  cleanEmptyParents, readExact, removeIfExact, snapshot,
} = require('./footprint');
const { appendJournal, readJournal } = require('./journal');
const { preflightSource, preflightTarget } = require('./preflight');
const { readReceipt } = require('./planner');
const { sha256Digest } = require('../operations/canonical');
const { resolveTarget } = require('../distribution/fs-safety');
const { mirrorReceipt, retireLedger } = require('./ledger');

class AdoptionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'AdoptionError';
    this.code = code;
    Object.assign(this, details);
  }
}

function operationId(plan) {
  const entropy = `${plan.plan_digest}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
  return `operation-${sha256Digest(entropy).slice('sha256:'.length, 'sha256:'.length + 24)}`;
}

function acquireLock(target, operation) {
  let lock = resolveTarget(target, LOCK_PATH, 'adoption lock');
  const parent = path.dirname(lock);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent);
  lock = resolveTarget(target, LOCK_PATH, 'adoption lock');
  try { fs.mkdirSync(lock); }
  catch (error) {
    if (error.code === 'EEXIST') throw new AdoptionError('TARGET_LOCKED', `Target has an active adoption lock: ${LOCK_PATH}`);
    throw error;
  }
  fs.writeFileSync(path.join(lock, 'owner.json'), `${JSON.stringify({
    operation_id: operation, pid: process.pid, acquired_at: new Date().toISOString(),
  }, null, 2)}\n`, { flag: 'wx' });
  return lock;
}

function releaseLock(lock) {
  if (!lock || !fs.existsSync(lock)) return;
  const stat = fs.lstatSync(lock);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new AdoptionError('LOCK_INVALID', 'Adoption lock is not a plain directory');
  fs.rmSync(lock, { recursive: true });
}

function assertApplyAllowed(plan, options) {
  assertValid(plan, validatePlan, 'adoption plan');
  if (plan.status === 'blocked') throw new AdoptionError('PLAN_BLOCKED', 'Blocked adoption plans cannot be applied', { blockers: plan.blockers });
  if (plan.confirmation.required && options.confirm !== plan.confirmation.token) {
    throw new AdoptionError('CONFIRMATION_REQUIRED', `Apply requires confirmation token ${plan.confirmation.token}`);
  }
}

function assertNoDrift(plan, options = {}) {
  const targetCheck = preflightTarget(plan.target.root, {
    ignorePaths: [LOCK_PATH, ...(options.ignorePaths || [])],
  });
  if (targetCheck.blockers.length || targetCheck.target.preflight_digest !== plan.target.preflight_digest) {
    throw new AdoptionError('TARGET_DRIFT', 'Target identity or working tree changed after planning', {
      planned: plan.target, observed: targetCheck.target, blockers: targetCheck.blockers,
    });
  }
  if (['adopt', 'update'].includes(plan.operation) && plan.source?.kind === 'local-path') {
    const sourceCheck = preflightSource(plan.source.root, { allowDirty: true });
    if (sourceCheck.blockers.length || sourceCheck.source?.source_digest !== plan.source.source_digest) {
      throw new AdoptionError('SOURCE_DRIFT', 'Citadel source changed after planning', {
        planned: plan.source, observed: sourceCheck.source, blockers: sourceCheck.blockers,
      });
    }
  }
}

function inject(options, point) {
  if (options.failAt === point) throw new AdoptionError('INJECTED_FAILURE', `Injected failure at ${point}`);
}

function prepareRun(plan, operation, options, run) {
  const root = plan.target.root;
  appendJournal(root, run.journalDirectory, {
    operationId: operation, phase: 'operation', state: 'planned', payload: plan,
  }, options);
  for (const effect of plan.effects) {
    if (effect.action === 'create' || effect.action === 'replace') {
      atomicCreate(root, `${run.runDirectory}/staging/${effect.effect_id}.bin`, Buffer.from(effect.content_base64, 'base64'));
    }
  }
  inject(options, 'after-stage');
  for (const effect of plan.effects) {
    if (effect.before.exists) {
      const content = readExact(root, effect.path);
      if (!content || snapshot(root, effect.path).digest !== effect.before.digest) {
        throw new AdoptionError('EFFECT_DRIFT', `Effect pre-image changed: ${effect.path}`);
      }
      atomicCreate(root, `${run.runDirectory}/preimages/${effect.effect_id}.bin`, content);
    }
  }
  inject(options, 'after-preimages');
  return run;
}

function applyEffect(root, effect) {
  const current = snapshot(root, effect.path);
  if (JSON.stringify(current) !== JSON.stringify(effect.before)) {
    throw new AdoptionError('EFFECT_DRIFT', `Effect target changed after planning: ${effect.path}`);
  }
  if (effect.action === 'create') {
    return atomicCreate(root, effect.path, Buffer.from(effect.content_base64, 'base64'));
  }
  if (effect.action === 'replace') {
    return atomicReplace(root, effect.path, effect.before, Buffer.from(effect.content_base64, 'base64'));
  }
  const removed = removeIfExact(root, effect.path, effect.before);
  if (!removed.removed) throw new AdoptionError('EFFECT_DRIFT', `Removal target changed after planning: ${effect.path}`);
  cleanEmptyParents(root, effect.path);
  return { exists: false, digest: null, bytes: 0 };
}

function recover(root, completed, run, operation, options) {
  const conflicts = [];
  for (const item of [...completed].reverse()) {
    const { effect } = item;
    try {
      if (effect.action === 'create') {
        const result = removeIfExact(root, effect.path, effect.after);
        if (!result.removed && result.reason !== 'missing') conflicts.push({ path: effect.path, reason: result.reason });
        cleanEmptyParents(root, effect.path);
      } else if (effect.action === 'replace') {
        const current = snapshot(root, effect.path);
        const preimagePath = resolveTarget(root, `${run.runDirectory}/preimages/${effect.effect_id}.bin`, 'adoption pre-image');
        if (current.digest !== effect.after.digest || current.bytes !== effect.after.bytes) {
          conflicts.push({ path: effect.path, reason: 'modified_after_replace' });
        } else if (!fs.existsSync(preimagePath)) {
          conflicts.push({ path: effect.path, reason: 'preimage_missing' });
        } else {
          atomicReplace(root, effect.path, current, fs.readFileSync(preimagePath));
        }
      } else {
        const current = snapshot(root, effect.path);
        const preimage = `${run.runDirectory}/preimages/${effect.effect_id}.bin`;
        if (current.exists) conflicts.push({ path: effect.path, reason: 'occupied' });
        else {
          const preimagePath = resolveTarget(root, preimage, 'adoption pre-image');
          if (!fs.existsSync(preimagePath)) conflicts.push({ path: effect.path, reason: 'preimage_missing' });
          else {
            const stat = fs.lstatSync(preimagePath);
            if (stat.isSymbolicLink() || !stat.isFile()) conflicts.push({ path: effect.path, reason: 'preimage_invalid' });
            else atomicCreate(root, effect.path, fs.readFileSync(preimagePath));
          }
        }
      }
    } catch (error) {
      conflicts.push({ path: effect.path, reason: error.message });
    }
  }
  appendJournal(root, run.journalDirectory, {
    operationId: operation, phase: 'recovery',
    state: conflicts.length ? 'recovery_required' : 'recovered',
    payload: { completed: completed.map((item) => item.effect.effect_id), conflicts },
    reasonCode: conflicts.length ? 'RECOVERY_CONFLICT' : 'COMPENSATED',
  }, options);
  return { state: conflicts.length ? 'recovery_required' : 'recovered', conflicts };
}

function verifyFootprint(root, manifest) {
  return manifest.entries.map((entry) => {
    const observed = snapshot(root, entry.path);
    const exact = observed.exists && observed.digest === entry.installed_digest
      && observed.bytes === entry.installed_bytes;
    return { path: entry.path, required: entry.required, exact, observed };
  });
}

function createReceipt(plan, operation, observedEffects, verification, journalHead, options) {
  const issuedAt = (options.now || (() => new Date().toISOString()))();
  const receipt = {
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_adoption_receipt',
    receipt_id: `receipt-${sha256Digest({ operation, plan: plan.plan_digest }).slice('sha256:'.length, 'sha256:'.length + 24)}`,
    operation_id: operation,
    plan_id: plan.plan_id,
    plan_digest: plan.plan_digest,
    source: plan.source,
    target: plan.target,
    runtime: plan.runtime,
    footprint: plan.footprint_preview,
    observed_effects: observedEffects,
    verification,
    journal_head: journalHead,
    state: 'active',
    issued_at: issuedAt,
    migration: plan.migration,
    generation: plan.generation,
    predecessor: plan.predecessor,
    runtime_projections: plan.runtime_projections,
    receipt_digest: null,
  };
  receipt.receipt_digest = receiptDigest(receipt);
  return assertValid(receipt, validateReceipt, 'adoption receipt');
}

function removeAdoptionControl(root) {
  const control = resolveTarget(root, ADOPTION_DIR, 'adoption control');
  if (!fs.existsSync(control)) return;
  const stat = fs.lstatSync(control);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new AdoptionError('CONTROL_PATH_INVALID', 'Adoption control path is not a plain directory');
  const runs = resolveTarget(root, `${ADOPTION_DIR}/runs`, 'adoption runs');
  if (fs.existsSync(runs)) {
    const runsStat = fs.lstatSync(runs);
    if (runsStat.isSymbolicLink() || !runsStat.isDirectory()) {
      throw new AdoptionError('CONTROL_PATH_INVALID', 'Adoption runs path is not a plain directory');
    }
    fs.rmSync(runs, { recursive: true });
  }
  const removeEmpty = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.isSymbolicLink()) removeEmpty(path.join(directory, entry.name));
    }
    if (directory !== control && fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
  };
  removeEmpty(control);
  if (fs.existsSync(control) && fs.readdirSync(control).length === 0) fs.rmdirSync(control);
}

function assertReceiptAuthority(plan, options) {
  if (!plan.predecessor || !['update', 'rollback', 'leave'].includes(plan.operation)) return;
  let current;
  try { current = readReceipt(plan.target.root, options); }
  catch (error) { throw new AdoptionError('RECEIPT_DRIFT', error.message); }
  if (!current || current.receipt_digest !== plan.predecessor.receipt_digest) {
    throw new AdoptionError('RECEIPT_DRIFT', 'Active receipt changed after planning');
  }
}

function runtimeRemovalEvidence(plan, completed) {
  if (plan.operation !== 'leave') return [];
  return (plan.runtime_projections || []).flatMap((projection) => projection.proposed_effects.map((projected) => {
    const observed = completed.find((item) => item.effect.path === projected.path);
    if (projected.removal.evidence_status === 'unknown' || !observed) {
      return {
        runtime: projection.runtime, surface: projected.surface, path: projected.path,
        status: 'unknown', evidence: null,
      };
    }
    return {
      runtime: projection.runtime, surface: projected.surface, path: projected.path,
      status: 'passed', evidence: observed.observed,
    };
  }));
}

function applyPlan(plan, options = {}) {
  assertApplyAllowed(plan, options);
  const operation = operationId(plan);
  let lock;
  let run;
  const completed = [];
  try {
    lock = acquireLock(plan.target.root, operation);
    inject(options, 'after-lock');
    assertNoDrift(plan, options);
    assertReceiptAuthority(plan, options);
    run = {
      runDirectory: `${ADOPTION_DIR}/runs/${operation}`,
      journalDirectory: `${ADOPTION_DIR}/runs/${operation}/journal`,
    };
    prepareRun(plan, operation, options, run);
    for (const effect of plan.effects) {
      appendJournal(plan.target.root, run.journalDirectory, {
        operationId: operation, phase: 'effect', effectId: effect.effect_id,
        state: 'planned', payload: effect,
      }, options);
      const after = applyEffect(plan.target.root, effect);
      const observed = {
        effect_id: effect.effect_id, action: effect.action, path: effect.path,
        before: effect.before, after, state: 'completed',
      };
      completed.push({ effect, observed });
      appendJournal(plan.target.root, run.journalDirectory, {
        operationId: operation, phase: 'effect', effectId: effect.effect_id,
        state: 'completed', payload: effect, evidence: observed,
      }, options);
      inject(options, `after-effect:${completed.length}`);
    }
    const verification = verifyFootprint(plan.target.root, plan.footprint_preview);
    const activates = ['adopt', 'update', 'rollback', 'restore', 'import'].includes(plan.operation);
    if (activates && verification.some((item) => item.required && !item.exact)) {
      throw new AdoptionError('VERIFICATION_FAILED', 'Required adoption footprint verification failed', { verification });
    }
    appendJournal(plan.target.root, run.journalDirectory, {
      operationId: operation, phase: 'verification', state: 'completed',
      payload: plan.verification, evidence: verification,
    }, options);
    const postSwitch = {
      status: activates && verification.some((item) => item.required && !item.exact) ? 'blocked' : 'healthy',
      generation_id: plan.generation?.generation_id || null,
      required_checks: verification.filter((item) => item.required).length,
    };
    const verified = appendJournal(plan.target.root, run.journalDirectory, {
      operationId: operation, phase: 'doctor', state: 'completed',
      payload: { generation: plan.generation }, evidence: postSwitch,
    }, options);
    if (activates && postSwitch.status !== 'healthy') {
      throw new AdoptionError('POST_SWITCH_DOCTOR_FAILED', 'Post-switch doctor did not pass', { postSwitch });
    }
    inject(options, 'before-receipt');
    let receipt = null;
    let ledger = null;
    if (activates) {
      receipt = createReceipt(plan, operation, completed.map((item) => item.observed), verification, verified.entry_digest, options);
      const receiptContent = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
      const activeBefore = snapshot(plan.target.root, ACTIVE_RECEIPT);
      const activePreimage = activeBefore.exists ? readExact(plan.target.root, ACTIVE_RECEIPT) : null;
      if (activeBefore.exists) {
        const current = JSON.parse(readExact(plan.target.root, ACTIVE_RECEIPT).toString('utf8'));
        if (!plan.predecessor || current.receipt_digest !== plan.predecessor.receipt_digest) {
          throw new AdoptionError('RECEIPT_DRIFT', 'Active receipt no longer matches the planned predecessor');
        }
        atomicReplace(plan.target.root, ACTIVE_RECEIPT, activeBefore, receiptContent);
      } else {
        atomicCreate(plan.target.root, ACTIVE_RECEIPT, receiptContent);
      }
      appendJournal(plan.target.root, run.journalDirectory, {
        operationId: operation, phase: 'receipt', state: 'active',
        payload: { receipt_digest: receipt.receipt_digest }, evidence: snapshot(plan.target.root, ACTIVE_RECEIPT),
      }, options);
      if (options.controlRoot || process.env.CITADEL_CONTROL_ROOT) {
        try { ledger = mirrorReceipt(plan.target.root, receipt, options); }
        catch (error) {
          const activeCurrent = snapshot(plan.target.root, ACTIVE_RECEIPT);
          if (activePreimage) atomicReplace(plan.target.root, ACTIVE_RECEIPT, activeCurrent, activePreimage);
          else removeIfExact(plan.target.root, ACTIVE_RECEIPT, activeCurrent);
          throw new AdoptionError('LEDGER_MIRROR_FAILED', error.message);
        }
      } else ledger = { status: 'disabled' };
    } else {
      const active = readExact(plan.target.root, ACTIVE_RECEIPT);
      if (active) fs.unlinkSync(resolveTarget(plan.target.root, ACTIVE_RECEIPT, 'active adoption receipt'));
      appendJournal(plan.target.root, run.journalDirectory, {
        operationId: operation, phase: 'receipt', state: 'retired',
        payload: { receipt_digest: plan.predecessor?.receipt_digest || null },
      }, options);
      ledger = options.controlRoot || process.env.CITADEL_CONTROL_ROOT
        ? retireLedger(plan.target.root, plan.predecessor?.receipt_digest, options)
        : { status: 'disabled' };
      removeAdoptionControl(plan.target.root);
    }
    return {
      ok: true, operation: plan.operation, operation_id: operation,
      receipt, verification, observed_effects: completed.map((item) => item.observed),
      archive: plan.archive?.path || null, post_switch_doctor: postSwitch, ledger,
      runtime_removal_evidence: runtimeRemovalEvidence(plan, completed),
    };
  } catch (error) {
    const recovery = run ? recover(plan.target.root, completed, run, operation, options) : null;
    if (error instanceof AdoptionError) {
      error.recovery = recovery;
      throw error;
    }
    throw new AdoptionError('APPLY_FAILED', error.message, { cause: error, recovery });
  } finally {
    releaseLock(lock);
    if (plan.operation === 'leave') cleanEmptyParents(plan.target.root, LOCK_PATH);
  }
}

function doctor(target, options = {}) {
  let receipt;
  let localReceiptPresent = false;
  try {
    localReceiptPresent = Boolean(readExact(target, ACTIVE_RECEIPT));
    receipt = readReceipt(target, options);
  }
  catch (error) {
    return { ok: false, status: 'blocked', code: 'RECEIPT_INVALID', message: error.message, checks: [] };
  }
  if (!receipt) return { ok: true, status: 'not_adopted', code: 'NOT_ADOPTED', checks: [] };
  const checks = verifyFootprint(target, receipt.footprint);
  let journalValid = false;
  try {
    const entries = readJournal(target, `${ADOPTION_DIR}/runs/${receipt.operation_id}/journal`);
    journalValid = entries.some((entry) => entry.entry_digest === receipt.journal_head);
  } catch (_) {
    journalValid = false;
  }
  checks.push({ path: `${ADOPTION_DIR}/runs/${receipt.operation_id}/journal`, required: true, exact: journalValid });
  let sourceExact = true;
  if (receipt.source?.kind === 'local-path') {
    const current = preflightSource(receipt.source.root, { allowDirty: true });
    sourceExact = current.source?.source_digest === receipt.source.source_digest;
    checks.push({ path: receipt.source.root, required: false, exact: sourceExact, check: 'source_digest' });
  }
  let unknown = false;
  for (const projection of receipt.runtime_projections || []) {
    for (const effect of projection.proposed_effects) {
      if (effect.removal.evidence_status === 'unknown') {
        unknown = true;
        checks.push({
          path: effect.path, required: false, exact: false,
          check: 'runtime_removal_evidence', status: 'unknown',
        });
      }
    }
  }
  const blocked = checks.some((check) => check.required && !check.exact);
  const degraded = !blocked && checks.some((check) => !check.exact);
  return {
    ok: !blocked && !unknown,
    status: blocked ? 'blocked' : unknown ? 'unknown' : degraded ? 'degraded' : 'healthy',
    code: blocked ? 'REQUIRED_CHECK_FAILED' : unknown ? 'RUNTIME_EVIDENCE_UNKNOWN' : degraded ? 'DRIFT_DETECTED' : 'HEALTHY',
    receipt_digest: receipt.receipt_digest,
    receipt_source: localReceiptPresent ? 'project' : 'private_ledger',
    checks,
  };
}

module.exports = Object.freeze({
  AdoptionError, acquireLock, applyPlan, assertNoDrift, doctor, releaseLock,
  verifyFootprint,
});
