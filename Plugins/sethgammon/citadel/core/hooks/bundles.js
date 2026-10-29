'use strict';

const bundleMap = require('../../hooks/bundle-map.json');

const CORE_BUNDLE = 'core';

function hookName(command) {
  const match = String(command || '').replace(/\\/g, '/').match(/hooks_src\/([^.\/]+)\.js/);
  return match ? match[1] : null;
}

function normalizeBundles(input) {
  if (input === undefined || input === null) return null;
  const values = input instanceof Set ? [...input] : Array.isArray(input) ? input : [input];
  return new Set([CORE_BUNDLE, ...values.map((value) => String(value).trim().toLowerCase()).filter(Boolean)]);
}

function requiredBundle(name) {
  return bundleMap.hooks[name] || CORE_BUNDLE;
}

function filterHookTemplate(template, effectiveBundles) {
  const enabled = normalizeBundles(effectiveBundles);
  if (!enabled) {
    return {
      template,
      installed: [],
      skipped: [],
      mode: 'legacy-all',
    };
  }

  const installed = [];
  const skipped = [];
  const hooks = {};

  for (const [event, entries] of Object.entries(template.hooks || {})) {
    const filteredEntries = [];
    for (const entry of entries) {
      const filteredHooks = [];
      for (const hook of entry.hooks || []) {
        const name = hookName(hook.command);
        const bundle = requiredBundle(name);
        if (enabled.has(bundle)) {
          filteredHooks.push(hook);
          installed.push({ hook: name, event, bundle });
        } else {
          skipped.push({ hook: name, event, bundle, reason: 'bundle-disabled' });
        }
      }
      if (filteredHooks.length > 0) filteredEntries.push({ ...entry, hooks: filteredHooks });
    }
    if (filteredEntries.length > 0) hooks[event] = filteredEntries;
  }

  return {
    template: { ...template, hooks },
    installed,
    skipped,
    mode: 'effective-bundles',
    effectiveBundles: [...enabled].sort(),
  };
}

module.exports = {
  CORE_BUNDLE,
  bundleMap,
  filterHookTemplate,
  hookName,
  normalizeBundles,
  requiredBundle,
};
