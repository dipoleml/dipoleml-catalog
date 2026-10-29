/**
 * Local control-plane analysis for a scanned coding harness.
 *
 * This module is deliberately side-effect free. It explains what is present,
 * what is likely to apply, and which hygiene signals deserve attention. It
 * never edits files and never invents effective rules for an adapter that has
 * not declared them.
 */

const SETTING_TIER_PRIORITY = {
  user: 10,
  project: 20,
  local: 30,
  managed: 40,
  cli: 50,
  policy: 60,
};

const CONTEXT_CATEGORIES = new Set([
  "config", "instruction", "memory", "skill", "command", "agent", "rule",
]);

const DESCRIBED_CATEGORIES = new Set(["skill", "command", "agent", "memory"]);

function scopeMap(scan) {
  return new Map((scan.scopes || []).map(scope => [scope.id, scope]));
}

function itemKey(item) {
  return [item.scopeId, item.category, item.name, item.path || "", item.sourceFile || ""].join("::");
}

function isAncestorScope(candidate, selected) {
  if (!candidate?.repoDir || !selected?.repoDir || candidate.id === selected.id) return false;
  const prefix = candidate.repoDir.endsWith("/") ? candidate.repoDir : `${candidate.repoDir}/`;
  return selected.repoDir.startsWith(prefix);
}

function effectiveSelection(scan, selectedScopeId) {
  const scopes = scopeMap(scan);
  const selected = scopes.get(selectedScopeId);
  if (!selected) throw new Error(`Unknown scope: ${selectedScopeId}`);

  const rules = scan.effective || {};
  const declared = new Set(rules.includeGlobalCategories || []);
  const ancestorCategories = new Set(rules.ancestorCategories || []);
  const hasDeclaredModel = declared.size > 0 || ancestorCategories.size > 0;
  const records = [];

  for (const item of scan.items || []) {
    let relation = null;
    if (item.scopeId === selectedScopeId) relation = "direct";
    else if (selectedScopeId !== "global" && item.scopeId === "global" && declared.has(item.category)) relation = "global";
    else if (
      selectedScopeId !== "global" &&
      ancestorCategories.has(item.category) &&
      isAncestorScope(scopes.get(item.scopeId), selected)
    ) relation = "ancestor";

    if (relation) records.push({ item, relation });
  }

  return { selected, scopes, records, hasDeclaredModel };
}

function resolveSettings(scan, selectedScopeId) {
  const scopes = scopeMap(scan);
  const selected = scopes.get(selectedScopeId);
  const candidates = (scan.items || []).filter(item => {
    if (item.category !== "setting") return false;
    if (item.scopeId === selectedScopeId || item.sourceTier === "managed") return true;
    if (selectedScopeId === "global") return item.scopeId === "global";
    if (item.scopeId === "global") return true;
    return isAncestorScope(scopes.get(item.scopeId), selected);
  });

  const groups = new Map();
  for (const item of candidates) {
    if (!groups.has(item.name)) groups.set(item.name, []);
    groups.get(item.name).push(item);
  }

  const resolutions = [];
  for (const [name, entries] of groups) {
    const ranked = entries.slice().sort((a, b) => {
      const tier = (SETTING_TIER_PRIORITY[b.sourceTier] || 0) - (SETTING_TIER_PRIORITY[a.sourceTier] || 0);
      if (tier) return tier;
      const direct = Number(b.scopeId === selectedScopeId) - Number(a.scopeId === selectedScopeId);
      if (direct) return direct;
      return itemKey(a).localeCompare(itemKey(b));
    });
    resolutions.push({
      name,
      winner: ranked[0],
      overridden: ranked.slice(1),
      sourceCount: ranked.length,
    });
  }
  return resolutions.sort((a, b) => a.name.localeCompare(b.name));
}

function computeConflicts(records) {
  const byName = new Map();
  for (const record of records) {
    const { item } = record;
    const key = `${item.category}::${item.name}`;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(record);
  }

  let shadowed = 0;
  let conflicts = 0;
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const category = group[0].item.category;
    const relations = new Set(group.map(entry => entry.relation));
    if (["mcp", "agent"].includes(category) && relations.has("direct") && relations.has("global")) {
      shadowed += group.filter(entry => entry.relation === "global").length;
    }
    if (category === "command" && relations.has("direct") && relations.has("global")) {
      conflicts += group.length;
    }
  }
  return { shadowed, conflicts };
}

/**
 * Build an adapter-aware map of the selected scope's inputs.
 */
export function buildContextMap(scan, selectedScopeId) {
  const selection = effectiveSelection(scan, selectedScopeId);
  const settings = resolveSettings(scan, selectedScopeId);
  const grouped = new Map();

  for (const record of selection.records) {
    const sourceId = `${record.relation}:${record.item.scopeId}`;
    if (!grouped.has(sourceId)) {
      const scope = selection.scopes.get(record.item.scopeId);
      grouped.set(sourceId, {
        id: sourceId,
        relation: record.relation,
        scopeId: record.item.scopeId,
        label: scope?.name || record.item.scopeId,
        categories: {},
        itemCount: 0,
        sizeBytes: 0,
      });
    }
    const node = grouped.get(sourceId);
    node.itemCount += 1;
    node.sizeBytes += Number(record.item.sizeBytes || 0);
    node.categories[record.item.category] = (node.categories[record.item.category] || 0) + 1;
  }

  const conflicts = computeConflicts(selection.records);
  const contextBytes = selection.records
    .filter(record => CONTEXT_CATEGORIES.has(record.item.category))
    .reduce((sum, record) => sum + Number(record.item.sizeBytes || 0), 0);

  const nodes = [...grouped.values()].sort((a, b) => {
    const order = { direct: 0, ancestor: 1, global: 2 };
    return (order[a.relation] ?? 9) - (order[b.relation] ?? 9) || a.label.localeCompare(b.label);
  });
  const edges = nodes
    .filter(node => node.relation !== "direct")
    .map(node => ({
      from: node.id,
      to: `direct:${selectedScopeId}`,
      relation: node.relation,
      reason: node.relation === "global" ? "declared global inheritance" : "declared ancestor inheritance",
    }));

  return {
    mode: selection.hasDeclaredModel ? "effective" : "inventory-only",
    scope: {
      id: selection.selected.id,
      name: selection.selected.name,
      repoDir: selection.selected.repoDir || null,
    },
    nodes,
    edges,
    settings: {
      resolvedCount: settings.length,
      overriddenCount: settings.reduce((sum, entry) => sum + entry.overridden.length, 0),
      resolutions: settings,
    },
    summary: {
      itemCount: selection.records.length,
      sourceCount: nodes.length,
      contextBytes,
      estimatedContextTokens: Math.ceil(contextBytes / 4),
      ...conflicts,
    },
  };
}

function addFinding(findings, finding) {
  if (!finding.count) return;
  findings.push(finding);
}

function parseMtime(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : null;
}

/**
 * Compute a deterministic, explainable hygiene score. Exact duplicate repair
 * candidates are supplied by the filesystem audit in repair-engine.mjs.
 */
export function computeHygieneReport(scan, selectedScopeId, {
  now = Date.now(),
  exactDuplicateRepairs = [],
} = {}) {
  const contextMap = buildContextMap(scan, selectedScopeId);
  // Audit the same records represented by the effective map. Filtering only
  // by node scope would accidentally pull in unrelated global categories
  // whenever one inherited global category created a node.
  const relevantItems = effectiveSelection(scan, selectedScopeId).records.map(record => record.item);
  const visibleKeys = new Set(relevantItems.map(itemKey));

  const findings = [];
  let deductions = 0;
  const deduct = (points) => { deductions += points; return points; };

  const duplicateGroups = new Map();
  for (const item of relevantItems) {
    const key = `${item.scopeId}::${item.category}::${item.name}`;
    if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
    duplicateGroups.get(key).push(item);
  }
  const duplicateCount = [...duplicateGroups.values()].reduce((sum, group) => sum + Math.max(0, group.length - 1), 0);
  addFinding(findings, {
    id: "duplicate-identities",
    severity: "medium",
    title: "Duplicate identities in the same scope",
    count: duplicateCount,
    deduction: deduct(Math.min(16, duplicateCount * 4)),
    detail: "Items with the same category and name are harder to reason about and may hide one another.",
  });

  const missingDescription = relevantItems.filter(item =>
    DESCRIBED_CATEGORIES.has(item.category) && !String(item.description || "").trim()
  ).length;
  addFinding(findings, {
    id: "missing-descriptions",
    severity: "low",
    title: "Missing discovery metadata",
    count: missingDescription,
    deduction: deduct(Math.min(10, missingDescription)),
    detail: "Skills, commands, agents, and memories without descriptions are harder for people and harnesses to discover.",
  });

  const oversized = relevantItems.filter(item =>
    CONTEXT_CATEGORIES.has(item.category) && Number(item.sizeBytes || 0) > 20 * 1024
  );
  addFinding(findings, {
    id: "oversized-context",
    severity: "medium",
    title: "Large context-bearing artifacts",
    count: oversized.length,
    deduction: deduct(Math.min(12, oversized.length * 2)),
    detail: `${oversized.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0)} bytes are in individual artifacts larger than 20 KiB. Review whether all of that text must load together.`,
  });

  const staleBefore = now - (180 * 24 * 60 * 60 * 1000);
  const staleSessions = relevantItems.filter(item => {
    if (item.category !== "session") return false;
    const modified = parseMtime(item.mtime || item.ctime);
    return modified !== null && modified < staleBefore;
  }).length;
  addFinding(findings, {
    id: "stale-sessions",
    severity: "info",
    title: "Old session files",
    count: staleSessions,
    deduction: deduct(Math.min(8, staleSessions)),
    detail: "Sessions older than 180 days may be worth archiving, but CCO will not remove them automatically.",
  });

  addFinding(findings, {
    id: "setting-overrides",
    severity: "info",
    title: "Overridden setting values",
    count: contextMap.settings.overriddenCount,
    deduction: deduct(Math.min(8, contextMap.settings.overriddenCount)),
    detail: "Multiple sources define the same setting. The context map shows the winning source and every overridden value.",
  });

  addFinding(findings, {
    id: "exact-duplicate-content",
    severity: "medium",
    title: "Byte-identical duplicate artifacts",
    count: exactDuplicateRepairs.length,
    deduction: deduct(Math.min(15, exactDuplicateRepairs.length * 5)),
    detail: "These duplicates are in the same scope and have matching content fingerprints. Each repair is previewed, backed up, and undoable.",
    repairs: exactDuplicateRepairs,
  });

  const score = Math.max(0, 100 - deductions);
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  return {
    score,
    grade,
    deductions: Math.min(100, deductions),
    findingCount: findings.reduce((sum, finding) => sum + finding.count, 0),
    findings,
    contextMap,
    repairableCount: exactDuplicateRepairs.length,
    auditedItemCount: visibleKeys.size,
    methodology: {
      version: 1,
      contextSizeThresholdBytes: 20 * 1024,
      staleSessionDays: 180,
      note: "The score is a local diagnostic heuristic, not a security certification.",
    },
  };
}
