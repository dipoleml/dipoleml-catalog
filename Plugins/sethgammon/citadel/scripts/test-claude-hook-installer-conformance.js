#!/usr/bin/env node

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  CURRENT_CLAUDE_HOOK_EVENTS,
  selectSupportedClaudeHookEvents,
} = require('../runtimes/claude-code/generators/hook-support');
const { installClaudeHooks } = require('../runtimes/claude-code/generators/install-hooks');
const { writeJson } = require('../core/hooks/install');

const CITADEL_ROOT = path.resolve(__dirname, '..');
const HOOKS_TEMPLATE_PATH = path.join(CITADEL_ROOT, 'hooks', 'hooks-template.json');
const TEMPLATE_EVENTS = Object.keys(JSON.parse(fs.readFileSync(HOOKS_TEMPLATE_PATH, 'utf8')).hooks);

function withTempDir(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'citadel-claude-install-'));
  try {
    run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

{
  const compatibility = selectSupportedClaudeHookEvents({
    templateEvents: TEMPLATE_EVENTS,
    hookProfile: 'auto',
    claudeVersion: '2.1.219',
  });

  assert.deepEqual(compatibility.supportedEvents, TEMPLATE_EVENTS,
    'Claude Code 2.1.219 auto profile must retain every implemented template event');
  assert.deepEqual(compatibility.missingTemplateEvents, ['MessageDisplay', 'DirectoryAdded'],
    'compatibility report must disclose supported runtime events with no Citadel hook implementation');
  assert.equal(CURRENT_CLAUDE_HOOK_EVENTS.length, 31,
    'the pinned Claude Code 2.1.219 capability snapshot should contain 31 documented events');
}

withTempDir((projectRoot) => {
  const result = installClaudeHooks({
    citadelRoot: CITADEL_ROOT,
    hooksTemplatePath: HOOKS_TEMPLATE_PATH,
    projectRoot,
    hookProfile: 'auto',
    claudeVersion: '2.1.219',
  });
  const settings = JSON.parse(fs.readFileSync(result.settingsPath, 'utf8'));

  for (const event of ['PermissionRequest', 'UserPromptSubmit', 'SubagentStart']) {
    assert(settings.hooks[event], `Claude auto install must emit ${event}`);
  }
});

withTempDir((projectRoot) => {
  const settingsDirectory = path.join(projectRoot, '.claude');
  const settingsPath = path.join(settingsDirectory, 'settings.json');
  const original = '{ "permissions": [ }\n';
  fs.mkdirSync(settingsDirectory, { recursive: true });
  fs.writeFileSync(settingsPath, original, 'utf8');

  assert.throws(() => installClaudeHooks({
    citadelRoot: CITADEL_ROOT,
    hooksTemplatePath: HOOKS_TEMPLATE_PATH,
    projectRoot,
    hookProfile: 'auto',
    claudeVersion: '2.1.219',
  }), /Invalid JSON.*settings\.json/,
  'installer must reject malformed existing settings instead of replacing them');
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), original,
    'malformed existing settings must remain byte-for-byte unchanged');
});

withTempDir((directory) => {
  const settingsPath = path.join(directory, 'settings.json');
  const original = '{\n  "permissions": { "allow": ["Read"] }\n}\n';
  fs.writeFileSync(settingsPath, original, 'utf8');

  assert.throws(() => writeJson(settingsPath, {
    hooks: {
      PreToolUse: [{ hooks: [{ type: 'command' }] }],
    },
  }), /command.*non-empty string/,
  'writer must schema-check hook handlers before replacing settings');
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), original,
    'schema validation failure must preserve the previous settings');
});

withTempDir((directory) => {
  const settingsPath = path.join(directory, 'settings.json');
  const original = '{\n  "permissions": { "allow": ["Read"] }\n}\n';
  fs.writeFileSync(settingsPath, original, 'utf8');

  const failingFileSystem = Object.create(fs);
  failingFileSystem.renameSync = () => {
    const error = new Error('simulated atomic replace failure');
    error.code = 'EACCES';
    throw error;
  };

  assert.throws(() => writeJson(settingsPath, { hooks: {} }, { fileSystem: failingFileSystem }),
    /simulated atomic replace failure/,
    'writer must surface atomic replace failures');
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), original,
    'atomic replace failure must leave the previous settings intact');
  assert.deepEqual(fs.readdirSync(directory), ['settings.json'],
    'atomic replace failure must not leave staging files behind');
});

withTempDir((directory) => {
  const settingsPath = path.join(directory, 'settings.json');
  const original = '{\n  "permissions": { "allow": ["Read"] }\n}\n';
  fs.writeFileSync(settingsPath, original, 'utf8');
  let validations = 0;

  assert.throws(() => writeJson(settingsPath, { hooks: {} }, {
    validate() {
      validations++;
      if (validations === 3) throw new Error('simulated committed-file validation failure');
    },
  }), /simulated committed-file validation failure/,
  'writer must surface post-replace validation failure');
  assert.equal(fs.readFileSync(settingsPath, 'utf8'), original,
    'post-replace validation failure must atomically restore the previous settings');
  assert.deepEqual(fs.readdirSync(directory), ['settings.json'],
    'rollback must not leave staging or recovery files behind');
});

console.log('Claude hook installer conformance tests passed');
