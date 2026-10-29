'use strict';

const fs = require('fs');
const path = require('path');
const {
  CONTRACT_VERSION, assertValid, confirmationToken, digestBytes,
  footprintDigest, planDigest, receiptDigest, validatePlan, validateReceipt,
} = require('./contracts');
const {
  ACTIVE_RECEIPT, ARCHIVE_DIR, portableState, readExact, snapshot,
} = require('./footprint');
const { issue, preflightSource, preflightTarget } = require('./preflight');
const { sha256Digest } = require('../operations/canonical');
const { baselineMigration } = require('./migrations');
const { plannableProjectionEffects } = require('./projections');
const { readLedgerReceipt } = require('./ledger');

function encode(content) {
  return Buffer.from(content).toString('base64');
}

function createEffect(index, relativePath, ownership, before, content, action = null) {
  const bytes = Buffer.from(content);
  return {
    effect_id: `effect-${String(index).padStart(4, '0')}`,
    action: action || (before.exists ? 'replace' : 'create'),
    path: relativePath,
    ownership,
    before,
    after: { digest: digestBytes(bytes), bytes: bytes.length },
    content_base64: encode(bytes),
  };
}

function footprintEntry(index, effect, required, removal, preimage = null) {
  return {
    entry_id: `entry-${String(index).padStart(4, '0')}`,
    path: effect.path,
    kind: 'file',
    ownership: effect.ownership,
    required,
    before: effect.before,
    installed_digest: effect.after.digest,
    installed_bytes: effect.after.bytes,
    removal,
    preimage_base64: preimage === null ? null : encode(preimage),
  };
}

function generationFor(source, seed, stateSchema = 'citadel-state-v1') {
  const generationId = `generation-${sha256Digest({
    source_digest: source?.source_digest || null, version: source?.version || 'legacy', seed,
  }).slice('sha256:'.length, 'sha256:'.length + 24)}`;
  return {
    generation_id: generationId,
    version: source?.version || 'legacy',
    source_digest: source?.source_digest || null,
    state_schema: stateSchema,
    pointer_path: '.citadel/adoption/current.json',
  };
}

function pointerContent(generation) {
  return Buffer.from(`${JSON.stringify({
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_generation_pointer',
    generation_id: generation.generation_id,
    state_schema: generation.state_schema,
  }, null, 2)}\n`);
}

function manifest(entries) {
  const value = {
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_footprint_manifest',
    entries,
    manifest_digest: null,
  };
  value.manifest_digest = footprintDigest(value);
  return value;
}

function finalizePlan(base) {
  const seed = { ...base, plan_id: null, plan_digest: null };
  base.plan_id = `plan-${sha256Digest(seed).slice('sha256:'.length, 'sha256:'.length + 24)}`;
  base.plan_digest = planDigest(base);
  base.confirmation.token = confirmationToken(base.plan_digest);
  return assertValid(base, validatePlan, 'adoption plan');
}

function desiredFiles(source, createdAt) {
  const template = path.join(source.root, '.citadel', 'project.template.md');
  const project = fs.existsSync(template)
    ? fs.readFileSync(template)
    : Buffer.from('# Citadel project\n');
  const activation = Buffer.from(`${JSON.stringify({
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_local_activation',
    source: source.root,
    source_digest: source.source_digest,
    version: source.version,
    activated_from_plan_at: createdAt,
  }, null, 2)}\n`);
  return [
    { path: '.citadel/plugin-root.txt', content: Buffer.from(`${source.root}\n`), required: true },
    { path: '.citadel/version.txt', content: Buffer.from(`${source.version}\n`), required: true },
    { path: '.citadel/project.md', content: project, required: false },
    { path: '.citadel/adoption/activation.json', content: activation, required: true },
  ];
}

function generationFiles(source, generation, createdAt) {
  const base = `.citadel/adoption/generations/${generation.generation_id}`;
  const template = path.join(source.root, '.citadel', 'project.template.md');
  const project = fs.existsSync(template) ? fs.readFileSync(template) : Buffer.from('# Citadel project\n');
  const activation = Buffer.from(`${JSON.stringify({
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_immutable_generation',
    generation,
    source,
    created_at: createdAt,
  }, null, 2)}\n`);
  return [
    { path: `${base}/plugin-root.txt`, content: Buffer.from(`${source.root}\n`) },
    { path: `${base}/version.txt`, content: Buffer.from(`${source.version}\n`) },
    { path: `${base}/project.md`, content: project },
    { path: `${base}/generation.json`, content: activation },
  ];
}

function createAdoptionPlan(options) {
  const createdAt = (options.now || (() => new Date().toISOString()))();
  const sourceCheck = preflightSource(options.source, { allowDirty: Boolean(options.allowDirtySource) });
  const targetCheck = preflightTarget(options.target);
  const blockers = [...sourceCheck.blockers, ...targetCheck.blockers];
  const warnings = [...sourceCheck.warnings, ...targetCheck.warnings];
  const effects = [];
  const entries = [];
  let generation = null;
  if (targetCheck.target) {
    const active = snapshot(targetCheck.target.root, ACTIVE_RECEIPT);
    if (active.exists) blockers.push(issue('ALREADY_ADOPTED', 'Target already has an active Citadel adoption receipt', [ACTIVE_RECEIPT]));
  }
  if (sourceCheck.source && targetCheck.target) {
    generation = generationFor(sourceCheck.source, createdAt);
    for (const desired of desiredFiles(sourceCheck.source, createdAt)) {
      const before = snapshot(targetCheck.target.root, desired.path);
      const candidate = createEffect(effects.length + 1, desired.path, 'owned', before, desired.content);
      if (!before.exists) {
        effects.push(candidate);
        entries.push(footprintEntry(entries.length + 1, candidate, desired.required, 'delete_if_exact'));
      } else if (before.digest === candidate.after.digest && before.bytes === candidate.after.bytes) {
        candidate.ownership = 'ambiguous';
        entries.push(footprintEntry(entries.length + 1, candidate, desired.required, 'retain'));
        warnings.push(issue('PREEXISTING_EXACT_PATH', 'Matching pre-existing content is retained as ambiguously owned', [desired.path]));
      } else if (desired.required) {
        blockers.push(issue('REQUIRED_PATH_CONFLICT', 'Required Citadel path already exists with different content', [desired.path]));
      } else {
        candidate.ownership = 'ambiguous';
        candidate.after = { digest: before.digest, bytes: before.bytes };
        candidate.content_base64 = encode(readExact(targetCheck.target.root, desired.path));
        entries.push(footprintEntry(entries.length + 1, candidate, false, 'retain'));
        warnings.push(issue('OPTIONAL_PATH_RETAINED', 'Pre-existing optional project content is retained', [desired.path]));
      }
    }
    for (const desired of generationFiles(sourceCheck.source, generation, createdAt)) {
      const before = snapshot(targetCheck.target.root, desired.path);
      if (before.exists) {
        blockers.push(issue('GENERATION_COLLISION', 'Immutable generation path already exists', [desired.path]));
        continue;
      }
      const effect = createEffect(effects.length + 1, desired.path, 'owned', before, desired.content);
      effects.push(effect);
      entries.push(footprintEntry(entries.length + 1, effect, true, 'delete_if_exact'));
    }
    const pointerBefore = snapshot(targetCheck.target.root, generation.pointer_path);
    if (pointerBefore.exists) blockers.push(issue('GENERATION_POINTER_CONFLICT', 'Generation pointer already exists without an active receipt', [generation.pointer_path]));
    else {
      const pointer = createEffect(effects.length + 1, generation.pointer_path, 'owned', pointerBefore, pointerContent(generation));
      effects.push(pointer);
      entries.push(footprintEntry(entries.length + 1, pointer, true, 'delete_if_exact'));
    }
    for (const projected of plannableProjectionEffects(options.runtimeProjections || [])) {
      const content = Buffer.from(projected.proposed.content_base64, 'base64');
      const effect = createEffect(
        effects.length + 1, projected.path, projected.ownership,
        projected.before, content, projected.action,
      );
      effects.push(effect);
      const preimage = projected.before.exists ? readExact(targetCheck.target.root, projected.path) : null;
      entries.push(footprintEntry(
        entries.length + 1, effect, true,
        projected.before.exists ? 'restore_preimage_if_exact' : 'delete_if_exact',
        preimage,
      ));
    }
  }
  const dirty = Boolean(targetCheck.target?.dirty_paths.length);
  if (dirty) warnings.push(issue('TARGET_DIRTY', 'Target has uncommitted changes; apply requires explicit confirmation', targetCheck.target.dirty_paths));
  const reasons = [
    ...(dirty ? ['target_dirty'] : []),
    ...(entries.some((entry) => entry.ownership === 'ambiguous') ? ['ambiguous_ownership'] : []),
    ...(entries.some((entry) => entry.ownership === 'shared') ? ['shared_runtime_projection'] : []),
    ...((options.runtimeProjections || []).some((projection) => projection.proposed_effects
      .some((effect) => effect.removal.evidence_status === 'unknown')) ? ['unknown_external_removal'] : []),
  ];
  for (const projection of options.runtimeProjections || []) {
    for (const effect of projection.proposed_effects) {
      if (effect.removal.evidence_status === 'unknown') {
        warnings.push(issue('RUNTIME_REMOVAL_UNKNOWN', effect.removal.required_observation, [effect.path]));
      }
    }
  }
  const blocked = blockers.length > 0;
  const runtime = { adapter: 'local-path', name: options.runtime || 'local', scope: 'project', version: '1' };
  return finalizePlan({
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_adoption_plan',
    operation: 'adopt',
    plan_id: null,
    created_at: createdAt,
    target: targetCheck.target,
    source: sourceCheck.source,
    runtime,
    status: blocked ? 'blocked' : reasons.length ? 'confirmation_required' : 'ready',
    blockers,
    warnings,
    confirmation: { required: !blocked && reasons.length > 0, reasons, token: null },
    effects,
    footprint_preview: manifest(entries),
    verification: entries.map((entry) => ({
      check: 'file_digest', path: entry.path, required: entry.required,
      digest: entry.installed_digest, bytes: entry.installed_bytes,
    })),
    rollback: { strategy: 'preimage-journal', reversible: true },
    archive: null,
    migration: baselineMigration(),
    generation,
    predecessor: null,
    runtime_projections: options.runtimeProjections || [],
    plan_digest: null,
  });
}

function readReceipt(target, options = {}) {
  const content = readExact(target, ACTIVE_RECEIPT);
  if (!content) return options.controlRoot ? readLedgerReceipt(target, options) : null;
  const receipt = JSON.parse(content.toString('utf8').replace(/^\uFEFF/, ''));
  assertValid(receipt, validateReceipt, 'active adoption receipt');
  return receipt;
}

function createLeavePlan(options) {
  const createdAt = (options.now || (() => new Date().toISOString()))();
  const targetCheck = preflightTarget(options.target);
  const blockers = [...targetCheck.blockers];
  const warnings = [...targetCheck.warnings];
  let receipt = null;
  try { receipt = targetCheck.target ? readReceipt(targetCheck.target.root, options) : null; }
  catch (error) { blockers.push(issue('RECEIPT_INVALID', error.message, [ACTIVE_RECEIPT])); }
  if (!receipt) blockers.push(issue('NOT_ADOPTED', 'Target has no active Citadel adoption receipt', [ACTIVE_RECEIPT]));
  for (const projection of receipt?.runtime_projections || []) {
    for (const effect of projection.proposed_effects) {
      if (effect.removal.evidence_status === 'unknown') {
        warnings.push(issue('RUNTIME_REMOVAL_UNKNOWN', effect.removal.required_observation, [effect.path]));
      }
    }
  }
  const effects = [];
  if (receipt && targetCheck.target) {
    for (const entry of receipt.footprint.entries) {
      const current = snapshot(targetCheck.target.root, entry.path);
      const exact = current.exists && current.digest === entry.installed_digest
        && current.bytes === entry.installed_bytes;
      if (['owned', 'shared'].includes(entry.ownership) && entry.removal === 'delete_if_exact' && exact) {
        effects.push({
          effect_id: `effect-${String(effects.length + 1).padStart(4, '0')}`,
          action: 'remove', path: entry.path, ownership: 'owned', before: current,
          after: null, content_base64: null,
        });
      } else if (entry.ownership === 'shared' && entry.removal === 'restore_preimage_if_exact' && exact) {
        const preimage = Buffer.from(entry.preimage_base64, 'base64');
        effects.push(createEffect(
          effects.length + 1, entry.path, 'shared', current, preimage, 'replace',
        ));
      } else {
        const code = ['owned', 'shared'].includes(entry.ownership)
          ? 'MODIFIED_FOOTPRINT_RETAINED' : 'AMBIGUOUS_FOOTPRINT_RETAINED';
        warnings.push(issue(code, 'Leave will retain content that is modified or not exclusively owned by Citadel', [entry.path]));
      }
    }
  }
  const ownedMaterial = [];
  if (receipt && targetCheck.target) {
    for (const entry of receipt.footprint.entries) {
      const current = snapshot(targetCheck.target.root, entry.path);
      if (current.exists && current.digest === entry.installed_digest && current.bytes === entry.installed_bytes) {
        const content = readExact(targetCheck.target.root, entry.path);
        ownedMaterial.push({
          path: entry.path, ownership: entry.ownership, digest: current.digest,
          bytes: current.bytes, content_base64: content.toString('base64'),
        });
      }
    }
  }
  const archiveObject = receipt ? {
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_adoption_archive',
    archived_at: createdAt,
    receipt,
    portable_state: portableState(targetCheck.target.root),
    owned_material: ownedMaterial,
  } : null;
  const archiveBytes = archiveObject ? Buffer.from(`${JSON.stringify(archiveObject, null, 2)}\n`) : null;
  const archivePath = receipt
    ? `${ARCHIVE_DIR}/${createdAt.replace(/[:.]/g, '-')}-${receipt.receipt_id}.json`
    : null;
  if (archiveBytes) {
    const archiveBefore = snapshot(targetCheck.target.root, archivePath);
    if (archiveBefore.exists) blockers.push(issue('ARCHIVE_EXISTS', 'Versioned leave archive path already exists and will not be overwritten', [archivePath]));
    effects.unshift(createEffect(1, archivePath, 'user_state', archiveBefore, archiveBytes));
    effects.forEach((effect, index) => { effect.effect_id = `effect-${String(index + 1).padStart(4, '0')}`; });
  }
  const blocked = blockers.length > 0;
  return finalizePlan({
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_adoption_plan',
    operation: 'leave',
    plan_id: null,
    created_at: createdAt,
    target: targetCheck.target,
    source: receipt?.source || null,
    runtime: receipt?.runtime || { adapter: 'local-path', name: 'unknown', scope: 'project', version: '1' },
    status: blocked ? 'blocked' : 'confirmation_required',
    blockers,
    warnings,
    confirmation: { required: !blocked, reasons: blocked ? [] : ['destructive_leave'], token: null },
    effects,
    footprint_preview: receipt?.footprint || manifest([]),
    verification: effects.map((effect) => effect.action === 'remove'
      ? { check: 'absent', path: effect.path }
      : {
        check: 'file_digest', path: effect.path, required: true,
        digest: effect.after.digest, bytes: effect.after.bytes,
      }),
    rollback: { strategy: 'preimage-journal', reversible: receipt?.migration?.reversible !== false },
    archive: archiveBytes ? { path: archivePath, digest: digestBytes(archiveBytes), content_base64: encode(archiveBytes) } : null,
    migration: receipt?.migration || baselineMigration(),
    generation: receipt?.generation || null,
    predecessor: receipt ? { receipt_id: receipt.receipt_id, receipt_digest: receipt.receipt_digest } : null,
    runtime_projections: receipt?.runtime_projections || [],
    plan_digest: null,
  });
}

module.exports = Object.freeze({
  createAdoptionPlan, createEffect, createLeavePlan, finalizePlan,
  footprintEntry, generationFiles, generationFor, manifest, pointerContent,
  readReceipt, receiptDigest,
});
