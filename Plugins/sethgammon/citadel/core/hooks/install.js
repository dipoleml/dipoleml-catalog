'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback = {}, options = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (options.strict) {
      const wrapped = new Error(`Invalid JSON at ${filePath}: ${error.message}`);
      wrapped.cause = error;
      throw wrapped;
    }
    return fallback;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateHookConfig(data) {
  if (!isPlainObject(data)) throw new Error('Hook config must be a JSON object');
  if (!Object.prototype.hasOwnProperty.call(data, 'hooks')) return true;
  if (!isPlainObject(data.hooks)) throw new Error('Hook config hooks must be an object');

  for (const [event, entries] of Object.entries(data.hooks)) {
    if (!event.trim()) throw new Error('Hook event name must be a non-empty string');
    if (!Array.isArray(entries)) throw new Error(`Hook event ${event} must contain an array of entries`);

    for (const [entryIndex, entry] of entries.entries()) {
      if (!isPlainObject(entry)) throw new Error(`Hook event ${event} entry ${entryIndex} must be an object`);
      if ('matcher' in entry && typeof entry.matcher !== 'string') {
        throw new Error(`Hook event ${event} entry ${entryIndex} matcher must be a string`);
      }
      if (!Array.isArray(entry.hooks) || entry.hooks.length === 0) {
        throw new Error(`Hook event ${event} entry ${entryIndex} hooks must be a non-empty array`);
      }

      for (const [hookIndex, hook] of entry.hooks.entries()) {
        if (!isPlainObject(hook)) {
          throw new Error(`Hook event ${event} entry ${entryIndex} hook ${hookIndex} must be an object`);
        }
        if (typeof hook.type !== 'string' || !hook.type.trim()) {
          throw new Error(`Hook event ${event} entry ${entryIndex} hook ${hookIndex} type must be a non-empty string`);
        }
        if (hook.type === 'command' && (typeof hook.command !== 'string' || !hook.command.trim())) {
          throw new Error(`Hook event ${event} entry ${entryIndex} hook ${hookIndex} command must be a non-empty string`);
        }
      }
    }
  }

  return true;
}

function temporaryPath(filePath, label) {
  const suffix = crypto.randomBytes(6).toString('hex');
  return path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${suffix}.${label}`);
}

function writeExclusive(fileSystem, filePath, content, mode) {
  const descriptor = fileSystem.openSync(filePath, 'wx', mode);
  try {
    fileSystem.writeFileSync(descriptor, content, 'utf8');
    if (typeof fileSystem.fsyncSync === 'function') fileSystem.fsyncSync(descriptor);
  } finally {
    fileSystem.closeSync(descriptor);
  }
}

function restorePreviousFile(fileSystem, filePath, previous) {
  if (!previous.exists) {
    if (fileSystem.existsSync(filePath)) fileSystem.unlinkSync(filePath);
    return;
  }

  const recoveryPath = temporaryPath(filePath, 'rollback');
  try {
    writeExclusive(fileSystem, recoveryPath, previous.content, previous.mode);
    fileSystem.renameSync(recoveryPath, filePath);
  } finally {
    if (fileSystem.existsSync(recoveryPath)) fileSystem.unlinkSync(recoveryPath);
  }
}

function writeJson(filePath, data, options = {}) {
  const fileSystem = options.fileSystem || fs;
  const validate = options.validate || validateHookConfig;
  const directory = path.dirname(filePath);
  if (!fileSystem.existsSync(directory)) fileSystem.mkdirSync(directory, { recursive: true });

  const serialized = JSON.stringify(data, null, 2);
  if (typeof serialized !== 'string') throw new Error(`Unable to serialize JSON for ${filePath}`);
  const content = `${serialized}\n`;
  const roundTripped = JSON.parse(content);
  validate(roundTripped);

  const previous = fileSystem.existsSync(filePath)
    ? {
        exists: true,
        content: fileSystem.readFileSync(filePath),
        mode: fileSystem.statSync(filePath).mode & 0o777,
      }
    : { exists: false, content: null, mode: 0o666 };
  const stagingPath = temporaryPath(filePath, 'tmp');

  try {
    writeExclusive(fileSystem, stagingPath, content, previous.mode);
    const staged = JSON.parse(fileSystem.readFileSync(stagingPath, 'utf8'));
    validate(staged);
    fileSystem.renameSync(stagingPath, filePath);

    try {
      const committed = JSON.parse(fileSystem.readFileSync(filePath, 'utf8'));
      validate(committed);
    } catch (error) {
      try {
        restorePreviousFile(fileSystem, filePath, previous);
      } catch (rollbackError) {
        const combined = new Error(
          `Config validation failed after replace and rollback failed: ${error.message}; ${rollbackError.message}`
        );
        combined.cause = error;
        combined.rollbackError = rollbackError;
        throw combined;
      }
      throw error;
    }
  } finally {
    if (fileSystem.existsSync(stagingPath)) fileSystem.unlinkSync(stagingPath);
  }
}

function quoteNodeCommand(command) {
  return command.replace(/^node\s+(.+)$/, (_match, script) => {
    if (script.includes(' ') && !script.startsWith('"')) return `node "${script}"`;
    return `node ${script}`;
  });
}

function isCitadelHookEntry(entry, marker) {
  if (!entry.hooks) return false;
  return entry.hooks.some(hook => hook.command && hook.command.includes(marker));
}

function mergeHookMaps({ existingHooks = {}, generatedHooks = {}, preserveMarker }) {
  const merged = {};
  const allEvents = new Set([...Object.keys(existingHooks), ...Object.keys(generatedHooks)]);

  for (const event of allEvents) {
    const currentEntries = existingHooks[event] || [];
    const generatedEntries = generatedHooks[event] || [];
    const preservedEntries = currentEntries.filter(entry => !isCitadelHookEntry(entry, preserveMarker));

    if (generatedEntries.length > 0 || preservedEntries.length > 0) {
      merged[event] = [...generatedEntries, ...preservedEntries];
    }
  }

  return merged;
}

function countGeneratedEntries(hooks) {
  return Object.values(hooks).reduce((sum, entries) => sum + entries.length, 0);
}

function countPreservedHooks(hooks, preserveMarker) {
  return Object.values(hooks).reduce((sum, entries) => {
    return sum + entries.filter(entry => !isCitadelHookEntry(entry, preserveMarker)).length;
  }, 0);
}

module.exports = {
  countGeneratedEntries,
  countPreservedHooks,
  ensureDir,
  mergeHookMaps,
  quoteNodeCommand,
  readJson,
  validateHookConfig,
  writeJson,
};
