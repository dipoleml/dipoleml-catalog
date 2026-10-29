'use strict';

const fs = require('fs');
const path = require('path');
const {
  CONTRACT_VERSION, assertValid, digestBytes, validateReceipt,
} = require('./contracts');
const {
  ACTIVE_RECEIPT, readExact, snapshot,
} = require('./footprint');
const {
  createEffect, finalizePlan, footprintEntry, generationFiles, generationFor,
  manifest, pointerContent, readReceipt,
} = require('./planner');
const {
  baselineMigration, compareVersions, evaluateMigration,
} = require('./migrations');
const { preflightSource, preflightTarget, issue } = require('./preflight');
const {
  plannableProjectionEffects,
} = require('./projections');
const { readLedgerReceiptById } = require('./ledger');

function predecessor(receipt) {
  return receipt ? { receipt_id: receipt.receipt_id, receipt_digest: receipt.receipt_digest } : null;
}

function verification(effects) {
  return effects.map((effect) => effect.action === 'remove'
    ? { check: 'absent', path: effect.path }
    : {
      check: 'file_digest', path: effect.path, required: true,
      digest: effect.after.digest, bytes: effect.after.bytes,
    });
}

function combineEntries(previous, additions, retiredPaths = new Set()) {
  const byPath = new Map(previous
    .filter((entry) => !retiredPaths.has(entry.path))
    .map((entry) => [entry.path, { ...entry }]));
  for (const addition of additions) {
    const old = byPath.get(addition.path);
    if (old && old.ownership === 'shared') {
      addition.before = old.before;
      addition.removal = old.removal;
      addition.preimage_base64 = old.preimage_base64;
    }
    byPath.set(addition.path, addition);
  }
  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path))
    .map((entry, index) => ({ ...entry, entry_id: `entry-${String(index + 1).padStart(4, '0')}` }));
}

function appendGenerationEffects(context, source, generation, createdAt) {
  for (const desired of generationFiles(source, generation, createdAt)) {
    const before = snapshot(context.root, desired.path);
    if (before.exists) {
      context.blockers.push(issue('GENERATION_COLLISION', 'Immutable generation path already exists', [desired.path]));
      continue;
    }
    const effect = createEffect(context.effects.length + 1, desired.path, 'owned', before, desired.content);
    context.effects.push(effect);
    context.entries.push(footprintEntry(context.entries.length + 1, effect, true, 'delete_if_exact'));
  }
}

function appendProjectionEffects(context, projections) {
  for (const projected of plannableProjectionEffects(projections)) {
    const content = Buffer.from(projected.proposed.content_base64, 'base64');
    const effect = createEffect(
      context.effects.length + 1, projected.path, projected.ownership,
      projected.before, content, projected.action,
    );
    context.effects.push(effect);
    const preimage = projected.before.exists ? readExact(context.root, projected.path) : null;
    context.entries.push(footprintEntry(
      context.entries.length + 1, effect, true,
      projected.before.exists ? 'restore_preimage_if_exact' : 'delete_if_exact',
      preimage,
    ));
  }
  for (const projection of projections) {
    for (const effect of projection.proposed_effects) {
      if (effect.removal.evidence_status === 'unknown') {
        context.warnings.push(issue('RUNTIME_REMOVAL_UNKNOWN', effect.removal.required_observation, [effect.path]));
      }
    }
  }
}

function appendStaleProjectionEffects(context, current, nextProjections) {
  const nextPaths = new Set(plannableProjectionEffects(nextProjections).map((effect) => effect.path));
  const oldPaths = new Set(plannableProjectionEffects(current.runtime_projections || []).map((effect) => effect.path));
  const retired = new Set();
  for (const relative of oldPaths) {
    if (nextPaths.has(relative)) continue;
    const entry = current.footprint.entries.find((item) => item.path === relative);
    if (!entry) continue;
    const before = snapshot(context.root, relative);
    const exact = before.exists && before.digest === entry.installed_digest && before.bytes === entry.installed_bytes;
    if (!before.exists) {
      retired.add(relative);
      continue;
    }
    if (!exact) {
      context.warnings.push(issue('STALE_PROJECTION_RETAINED', 'Stale runtime projection was modified and will not be pruned', [relative]));
      context.entries.push({
        ...entry,
        entry_id: `entry-${String(context.entries.length + 1).padStart(4, '0')}`,
        ownership: 'ambiguous',
        required: false,
        before,
        installed_digest: before.digest,
        installed_bytes: before.bytes,
        removal: 'retain',
        preimage_base64: null,
      });
      continue;
    }
    if (entry.removal === 'restore_preimage_if_exact') {
      const preimage = Buffer.from(entry.preimage_base64, 'base64');
      context.effects.push(createEffect(
        context.effects.length + 1, relative, 'shared', before, preimage, 'replace',
      ));
    } else {
      context.effects.push({
        effect_id: `effect-${String(context.effects.length + 1).padStart(4, '0')}`,
        action: 'remove', path: relative, ownership: entry.ownership,
        before, after: null, content_base64: null,
      });
    }
    retired.add(relative);
  }
  return retired;
}

function loadCurrent(targetCheck, options, blockers) {
  if (!targetCheck.target) return null;
  try {
    const receipt = readReceipt(targetCheck.target.root, options);
    if (!receipt) blockers.push(issue('NOT_ADOPTED', 'Target has no active adoption receipt', [ACTIVE_RECEIPT]));
    return receipt;
  } catch (error) {
    blockers.push(issue('RECEIPT_INVALID', error.message, [ACTIVE_RECEIPT]));
    return null;
  }
}

function createUpdatePlan(options) {
  const createdAt = (options.now || (() => new Date().toISOString()))();
  const targetCheck = preflightTarget(options.target);
  const sourceCheck = preflightSource(options.source, { allowDirty: Boolean(options.allowDirtySource) });
  const blockers = [...targetCheck.blockers, ...sourceCheck.blockers];
  const warnings = [...targetCheck.warnings, ...sourceCheck.warnings];
  const current = loadCurrent(targetCheck, options, blockers);
  const migration = options.migration || {
    reads: ['unknown'], writes: ['unknown'], reversible: false, minimum_code_version: '0.0.0',
  };
  if (!options.migration) blockers.push(issue('MIGRATION_METADATA_REQUIRED', 'Update requires explicit migration metadata'));
  let migrationResult = null;
  if (current && sourceCheck.source) {
    migrationResult = evaluateMigration(migration, {
      currentSchema: current.generation?.state_schema || 'citadel-state-v1',
      codeVersion: sourceCheck.source.version,
      knownSchemas: options.knownSchemas,
    });
    if (!migrationResult.compatible) blockers.push(issue(migrationResult.code, migrationResult.errors.join('; ')));
    const order = compareVersions(sourceCheck.source.version, current.generation?.version || current.source?.version);
    if (order === null) blockers.push(issue('VERSION_UNKNOWN', 'Update source and installed versions must be semantic versions'));
    else if (order < 0 && !options.allowDowngrade) blockers.push(issue('DOWNGRADE_BLOCKED', 'Update cannot downgrade without explicit allowDowngrade'));
    if (sourceCheck.source.source_digest === current.source?.source_digest) {
      blockers.push(issue('UPDATE_NO_CHANGE', 'Update source matches the active receipt'));
    }
  }
  const generation = sourceCheck.source
    ? generationFor(sourceCheck.source, { operation: 'update', migration }, migrationResult?.nextSchema || 'citadel-state-v1')
    : null;
  const context = {
    root: targetCheck.target?.root, blockers, warnings, effects: [], entries: [],
  };
  const projectionUpdate = Array.isArray(options.runtimeProjections);
  const nextProjections = projectionUpdate
    ? options.runtimeProjections : current?.runtime_projections || [];
  let retiredPaths = new Set();
  if (current && sourceCheck.source && generation && targetCheck.target) {
    appendGenerationEffects(context, sourceCheck.source, generation, createdAt);
    const retainedPath = `.citadel/adoption/receipts/${current.receipt_id}.json`;
    const retainedBefore = snapshot(context.root, retainedPath);
    const retainedContent = Buffer.from(`${JSON.stringify(current, null, 2)}\n`);
    if (retainedBefore.exists) blockers.push(issue('PREDECESSOR_RECEIPT_COLLISION', 'Retained predecessor receipt path already exists', [retainedPath]));
    else {
      const retained = createEffect(context.effects.length + 1, retainedPath, 'owned', retainedBefore, retainedContent);
      context.effects.push(retained);
      context.entries.push(footprintEntry(context.entries.length + 1, retained, true, 'delete_if_exact'));
    }
    if (projectionUpdate) {
      retiredPaths = appendStaleProjectionEffects(context, current, nextProjections);
      appendProjectionEffects(context, nextProjections);
    }
    const pointerBefore = snapshot(context.root, generation.pointer_path);
    if (!pointerBefore.exists) blockers.push(issue('GENERATION_POINTER_MISSING', 'Active generation pointer is missing', [generation.pointer_path]));
    else {
      const pointer = createEffect(
        context.effects.length + 1, generation.pointer_path, 'owned',
        pointerBefore, pointerContent(generation), 'replace',
      );
      context.effects.push(pointer);
      context.entries.push(footprintEntry(context.entries.length + 1, pointer, true, 'delete_if_exact'));
    }
  }
  const combined = combineEntries(current?.footprint.entries || [], context.entries, retiredPaths);
  const blocked = blockers.length > 0;
  return finalizePlan({
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_adoption_plan',
    operation: 'update',
    plan_id: null,
    created_at: createdAt,
    target: targetCheck.target,
    source: sourceCheck.source,
    runtime: current?.runtime || { adapter: 'local-path', name: options.runtime || 'local', scope: 'project', version: '1' },
    status: blocked ? 'blocked' : 'confirmation_required',
    blockers,
    warnings,
    confirmation: { required: !blocked, reasons: blocked ? [] : ['version_switch', 'state_migration'], token: null },
    effects: context.effects,
    footprint_preview: manifest(combined),
    verification: verification(context.effects),
    rollback: { strategy: 'preimage-journal', reversible: migration.reversible },
    archive: null,
    migration,
    generation,
    predecessor: predecessor(current),
    runtime_projections: nextProjections,
    plan_digest: null,
  });
}

function readPredecessor(target, current, options) {
  if (!current.predecessor) return null;
  const relative = `.citadel/adoption/receipts/${current.predecessor.receipt_id}.json`;
  const content = readExact(target, relative);
  let receipt = content ? JSON.parse(content.toString('utf8').replace(/^\uFEFF/, '')) : null;
  if (!receipt && options.controlRoot) receipt = readLedgerReceiptById(target, current.predecessor.receipt_id, options);
  if (!receipt) return null;
  assertValid(receipt, validateReceipt, 'rollback predecessor receipt');
  if (receipt.receipt_digest !== current.predecessor.receipt_digest) throw new Error('Rollback predecessor digest does not match');
  return receipt;
}

function createRollbackPlan(options) {
  const createdAt = (options.now || (() => new Date().toISOString()))();
  const targetCheck = preflightTarget(options.target);
  const blockers = [...targetCheck.blockers];
  const warnings = [...targetCheck.warnings];
  const current = loadCurrent(targetCheck, options, blockers);
  let prior = null;
  if (current && targetCheck.target) {
    try { prior = readPredecessor(targetCheck.target.root, current, options); }
    catch (error) { blockers.push(issue('PREDECESSOR_INVALID', error.message)); }
    if (!current.predecessor || !prior) blockers.push(issue('ROLLBACK_UNAVAILABLE', 'No verified predecessor receipt is available'));
    if (current.migration?.reversible !== true) blockers.push(issue('MIGRATION_IRREVERSIBLE', 'Active migration does not permit rollback'));
    if (prior && !prior.migration.reads.includes(current.generation.state_schema)) {
      blockers.push(issue('ROLLBACK_STATE_INCOMPATIBLE', `Previous version cannot read ${current.generation.state_schema}`));
    }
  }
  const context = {
    root: targetCheck.target?.root, blockers, warnings, effects: [], entries: [],
  };
  if (current && prior && targetCheck.target) {
    const retainedPath = `.citadel/adoption/receipts/${current.receipt_id}.json`;
    const retainedBefore = snapshot(context.root, retainedPath);
    if (!retainedBefore.exists) {
      const retained = createEffect(
        context.effects.length + 1, retainedPath, 'owned', retainedBefore,
        Buffer.from(`${JSON.stringify(current, null, 2)}\n`),
      );
      context.effects.push(retained);
      context.entries.push(footprintEntry(context.entries.length + 1, retained, true, 'delete_if_exact'));
    }
    for (const projected of plannableProjectionEffects(prior.runtime_projections || [])) {
      const desired = Buffer.from(projected.proposed.content_base64, 'base64');
      const before = snapshot(context.root, projected.path);
      if (before.exists && before.digest === digestBytes(desired) && before.bytes === desired.length) continue;
      const effect = createEffect(
        context.effects.length + 1, projected.path, projected.ownership,
        before, desired, before.exists ? 'replace' : 'create',
      );
      context.effects.push(effect);
      context.entries.push(footprintEntry(
        context.entries.length + 1, effect, true,
        before.exists ? 'restore_preimage_if_exact' : 'delete_if_exact',
        before.exists ? readExact(context.root, projected.path) : null,
      ));
    }
    const pointerBefore = snapshot(context.root, prior.generation.pointer_path);
    if (!pointerBefore.exists) blockers.push(issue('GENERATION_POINTER_MISSING', 'Active generation pointer is missing', [prior.generation.pointer_path]));
    else {
      const pointer = createEffect(
        context.effects.length + 1, prior.generation.pointer_path, 'owned',
        pointerBefore, pointerContent(prior.generation), 'replace',
      );
      context.effects.push(pointer);
      context.entries.push(footprintEntry(context.entries.length + 1, pointer, true, 'delete_if_exact'));
    }
  }
  const combined = combineEntries(current?.footprint.entries || [], context.entries);
  const blocked = blockers.length > 0;
  return finalizePlan({
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_adoption_plan',
    operation: 'rollback',
    plan_id: null,
    created_at: createdAt,
    target: targetCheck.target,
    source: prior?.source || current?.source || null,
    runtime: prior?.runtime || current?.runtime || { adapter: 'local-path', name: 'unknown', scope: 'project', version: '1' },
    status: blocked ? 'blocked' : 'confirmation_required',
    blockers,
    warnings,
    confirmation: { required: !blocked, reasons: blocked ? [] : ['generation_rollback'], token: null },
    effects: context.effects,
    footprint_preview: manifest(combined),
    verification: verification(context.effects),
    rollback: { strategy: 'preimage-journal', reversible: prior?.migration?.reversible !== false },
    archive: null,
    migration: prior?.migration || baselineMigration(),
    generation: prior?.generation || null,
    predecessor: predecessor(current),
    runtime_projections: prior?.runtime_projections || [],
    plan_digest: null,
  });
}

function readArchive(file) {
  const content = fs.readFileSync(file);
  const archive = JSON.parse(content.toString('utf8').replace(/^\uFEFF/, ''));
  if (archive.contract_version !== CONTRACT_VERSION || archive.kind !== 'citadel_adoption_archive'
      || !archive.receipt || !Array.isArray(archive.portable_state) || !Array.isArray(archive.owned_material)) {
    throw new Error('Portable archive contract is invalid or incomplete');
  }
  assertValid(archive.receipt, validateReceipt, 'archived adoption receipt');
  return { archive, content };
}

function createRestorePlan(options) {
  const createdAt = (options.now || (() => new Date().toISOString()))();
  const targetCheck = preflightTarget(options.target);
  const blockers = [...targetCheck.blockers];
  const warnings = [...targetCheck.warnings];
  let loaded = null;
  try { loaded = readArchive(options.archive); }
  catch (error) { blockers.push(issue('ARCHIVE_INVALID', error.message)); }
  if (targetCheck.target) {
    try {
      if (readReceipt(targetCheck.target.root, options)) blockers.push(issue('ALREADY_ADOPTED', 'Restore requires a target without an active receipt'));
    } catch (error) { blockers.push(issue('RECEIPT_INVALID', error.message)); }
  }
  const effects = [];
  const entries = [];
  if (loaded && targetCheck.target) {
    const archivedByPath = new Map(loaded.archive.receipt.footprint.entries.map((entry) => [entry.path, entry]));
    const materialPaths = new Set(loaded.archive.owned_material.map((item) => item.path));
    for (const item of [...loaded.archive.owned_material, ...loaded.archive.portable_state.filter((entry) => entry.kind === 'file')]) {
      const before = snapshot(targetCheck.target.root, item.path);
      const content = Buffer.from(item.content_base64, 'base64');
      if (digestBytes(content) !== item.digest || content.length !== item.bytes) {
        blockers.push(issue('ARCHIVE_CONTENT_INVALID', 'Archived content digest does not match', [item.path]));
        continue;
      }
      const archivedEntry = archivedByPath.get(item.path);
      const ownership = archivedEntry?.ownership || 'user_state';
      if (!before.exists) {
        const effect = createEffect(effects.length + 1, item.path, ownership, before, content);
        effects.push(effect);
        entries.push(footprintEntry(
          entries.length + 1, effect, archivedEntry?.required || false,
          ownership === 'user_state' ? 'retain' : 'delete_if_exact',
        ));
      } else if (before.digest === item.digest && before.bytes === item.bytes) {
        const pseudo = createEffect(0, item.path, 'ambiguous', before, content, 'replace');
        entries.push(footprintEntry(entries.length + 1, pseudo, archivedEntry?.required || false, 'retain'));
        warnings.push(issue('RESTORE_EXISTING_EXACT', 'Existing matching content is retained as ambiguous', [item.path]));
      } else {
        blockers.push(issue('RESTORE_CONFLICT', 'Restore will not overwrite existing different content', [item.path]));
      }
    }
    for (const archivedEntry of loaded.archive.receipt.footprint.entries) {
      if (materialPaths.has(archivedEntry.path)) continue;
      const current = snapshot(targetCheck.target.root, archivedEntry.path);
      const exact = current.exists && current.digest === archivedEntry.installed_digest
        && current.bytes === archivedEntry.installed_bytes;
      if (!exact && archivedEntry.required) {
        blockers.push(issue('ARCHIVE_INCOMPLETE', 'Archive cannot restore a required footprint entry', [archivedEntry.path]));
      } else if (!exact) {
        warnings.push(issue('ARCHIVE_OPTIONAL_MISSING', 'Archive omits modified optional footprint content', [archivedEntry.path]));
      }
    }
  }
  const receipt = loaded?.archive.receipt || null;
  const blocked = blockers.length > 0;
  return finalizePlan({
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_adoption_plan',
    operation: 'restore',
    plan_id: null,
    created_at: createdAt,
    target: targetCheck.target,
    source: receipt?.source || null,
    runtime: receipt?.runtime || { adapter: 'local-path', name: 'restore', scope: 'project', version: '1' },
    status: blocked ? 'blocked' : 'confirmation_required',
    blockers,
    warnings,
    confirmation: { required: !blocked, reasons: blocked ? [] : ['portable_state_restore'], token: null },
    effects,
    footprint_preview: manifest(combineEntries(receipt?.footprint.entries || [], entries)),
    verification: verification(effects),
    rollback: { strategy: 'preimage-journal', reversible: true },
    archive: loaded ? {
      path: 'external-archive', digest: digestBytes(loaded.content),
      content_base64: loaded.content.toString('base64'),
    } : null,
    migration: receipt?.migration || baselineMigration(),
    generation: receipt?.generation || null,
    predecessor: predecessor(receipt),
    runtime_projections: receipt?.runtime_projections || [],
    plan_digest: null,
  });
}

function recursiveFiles(root, relative) {
  const absolute = path.join(root, ...relative.split('/'));
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) return [];
  if (stat.isFile()) return [relative];
  if (!stat.isDirectory()) return [];
  return fs.readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => recursiveFiles(root, `${relative}/${entry.name}`));
}

function classifyLegacy(relative, source, target) {
  if (relative === '.citadel/plugin-root.txt' && source) {
    const content = readExact(target, relative);
    if (content?.toString('utf8').trim() === source.root) return 'owned';
  }
  if (relative === '.citadel/version.txt' && source) {
    const content = readExact(target, relative);
    if (content?.toString('utf8').trim() === source.version) return 'owned';
  }
  if (['.claude/settings.json', '.codex/hooks.json', '.codex/config.toml', '.agents/plugins/marketplace.json'].includes(relative)) return 'shared';
  return 'ambiguous';
}

function createImportPlan(options) {
  const createdAt = (options.now || (() => new Date().toISOString()))();
  const targetCheck = preflightTarget(options.target);
  const sourceCheck = options.source
    ? preflightSource(options.source, { allowDirty: Boolean(options.allowDirtySource) })
    : { source: null, blockers: [], warnings: [] };
  const blockers = [...targetCheck.blockers, ...sourceCheck.blockers];
  const warnings = [...targetCheck.warnings, ...sourceCheck.warnings];
  if (targetCheck.target) {
    try {
      if (readReceipt(targetCheck.target.root, options)) blockers.push(issue('ALREADY_ADOPTED', 'Legacy import requires no active receipt'));
    } catch (error) { blockers.push(issue('RECEIPT_INVALID', error.message)); }
  }
  const effects = [];
  const entries = [];
  let generation = null;
  if (targetCheck.target) {
    const roots = [
      '.citadel/plugin-root.txt', '.citadel/version.txt', '.citadel/project.md',
      '.claude/settings.json', '.codex/hooks.json', '.codex/config.toml',
      '.agents/plugins/marketplace.json', '.agents/skills',
    ];
    const files = [...new Set(roots.flatMap((relative) => recursiveFiles(targetCheck.target.root, relative)))].sort();
    for (const relative of files) {
      const before = snapshot(targetCheck.target.root, relative);
      const ownership = classifyLegacy(relative, sourceCheck.source, targetCheck.target.root);
      entries.push({
        entry_id: `entry-${String(entries.length + 1).padStart(4, '0')}`,
        path: relative, kind: 'file', ownership, required: false, before,
        installed_digest: before.digest, installed_bytes: before.bytes,
        removal: ownership === 'owned' ? 'delete_if_exact' : 'retain',
        preimage_base64: null,
      });
    }
    if (!files.length) blockers.push(issue('LEGACY_FOOTPRINT_NOT_FOUND', 'No recognizable legacy Citadel footprint was found'));
    generation = generationFor(sourceCheck.source, { operation: 'import', files });
    const inventoryPath = `.citadel/adoption/generations/${generation.generation_id}/inventory.json`;
    const inventory = Buffer.from(`${JSON.stringify({
      contract_version: CONTRACT_VERSION, kind: 'citadel_legacy_inventory',
      imported_at: createdAt, entries: entries.map(({ path: itemPath, ownership }) => ({ path: itemPath, ownership })),
      rollback_guarantee: 'imperfect',
    }, null, 2)}\n`);
    const inventoryBefore = snapshot(targetCheck.target.root, inventoryPath);
    if (!inventoryBefore.exists) {
      const effect = createEffect(effects.length + 1, inventoryPath, 'owned', inventoryBefore, inventory);
      effects.push(effect);
      entries.push(footprintEntry(entries.length + 1, effect, true, 'delete_if_exact'));
    }
    const pointerBefore = snapshot(targetCheck.target.root, generation.pointer_path);
    if (pointerBefore.exists) blockers.push(issue('GENERATION_POINTER_CONFLICT', 'Legacy import found an existing generation pointer without a receipt'));
    else {
      const pointer = createEffect(effects.length + 1, generation.pointer_path, 'owned', pointerBefore, pointerContent(generation));
      effects.push(pointer);
      entries.push(footprintEntry(entries.length + 1, pointer, true, 'delete_if_exact'));
    }
  }
  const migration = { ...baselineMigration(), reversible: false };
  warnings.push(issue('IMPERFECT_ROLLBACK', 'Legacy import cannot prove a perfect pre-Citadel rollback'));
  const blocked = blockers.length > 0;
  return finalizePlan({
    contract_version: CONTRACT_VERSION,
    kind: 'citadel_adoption_plan',
    operation: 'import',
    plan_id: null,
    created_at: createdAt,
    target: targetCheck.target,
    source: sourceCheck.source,
    runtime: { adapter: 'local-path', name: options.runtime || 'legacy-import', scope: 'project', version: '1' },
    status: blocked ? 'blocked' : 'confirmation_required',
    blockers,
    warnings,
    confirmation: { required: !blocked, reasons: blocked ? [] : ['legacy_ownership_inference'], token: null },
    effects,
    footprint_preview: manifest(entries),
    verification: verification(effects),
    rollback: { strategy: 'preimage-journal', reversible: false },
    archive: null,
    migration,
    generation,
    predecessor: null,
    runtime_projections: options.runtimeProjections || [],
    plan_digest: null,
  });
}

module.exports = Object.freeze({
  combineEntries, createImportPlan, createRestorePlan, createRollbackPlan,
  createUpdatePlan, readArchive, readPredecessor,
});
