#!/usr/bin/env node

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const action = require('./action-verify');
const operations = require('../core/operations');

const ROOT = path.resolve(__dirname, '..');
const actionYaml = fs.readFileSync(path.join(ROOT, 'action.yml'), 'utf8');
const testsYaml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'tests.yml'), 'utf8');
const releaseYaml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'release.yml'), 'utf8');
const npmPublishPath = path.join(ROOT, '.github', 'workflows', 'npm-publish.yml');

for (const input of ['workflow', 'evidence-path', 'strict', 'working-directory']) {
  assert.match(actionYaml, new RegExp(`^  ${input}:`, 'm'), `action input missing ${input}`);
}
for (const output of ['status', 'receipt-path', 'summary-path']) {
  assert.match(actionYaml, new RegExp(`^  ${output}:`, 'm'), `action output missing ${output}`);
}
assert.match(actionYaml, /using: node24/);
assert.match(actionYaml, /main: scripts\/action-verify\.js/);

assert.match(testsYaml, /citadel-action-consumer:/);
assert.match(testsYaml, /permissions:\n      contents: read/);
assert.match(testsYaml, /uses: \.\//);
const consumerBlock = testsYaml.slice(
  testsYaml.indexOf('  citadel-action-consumer:'),
  testsYaml.indexOf('\n  repository-memory:'),
);
assert.match(consumerBlock, /fetch-depth: 0/, 'action consumer needs repository history for source-bound verification');
assert.match(consumerBlock, /persist-credentials: false/, 'action consumer must not retain checkout credentials');
for (const match of testsYaml.matchAll(/^\s*- uses:\s*(\S+)/gm)) {
  const target = match[1];
  if (target.startsWith('./')) continue;
  assert.match(target, /@[a-f0-9]{40}(?:\s|$)/, `third-party action is not SHA pinned: ${target}`);
}

assert(!fs.existsSync(npmPublishPath), 'unowned npm namespace must not have an executable publish workflow');
for (const file of fs.readdirSync(path.join(ROOT, '.github', 'workflows')).filter((name) => /\.ya?ml$/.test(name))) {
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', file), 'utf8');
  assert.doesNotMatch(workflow, /\bnpm\s+publish\b/, `workflow must not publish to npm: ${file}`);
}

const packageBlock = releaseYaml.slice(releaseYaml.indexOf('  package:'), releaseYaml.length);
assert.match(packageBlock, /permissions:\n      contents: write\n      id-token: write\n      attestations: write/);
assert.equal((releaseYaml.match(/id-token: write/g) || []).length, 1, 'OIDC permission must exist only on release package job');
assert.equal((releaseYaml.match(/attestations: write/g) || []).length, 1, 'attestation permission must exist only on release package job');
assert(!releaseYaml.includes('artifact-metadata: write'), 'binary subject-path attestation must not request registry-only artifact metadata permission');
assert.doesNotMatch(packageBlock, /packages: write/, 'release job must not receive package-registry permission');
assert.match(packageBlock, /uses: actions\/attest@1e69f48acb82d1966a394da916b4c1698aa569d6\s+# v4\.2\.2/);
assert.match(packageBlock, /subject-path: \|\n\s+dist\/release\/citadel-\$\{\{ github\.ref_name \}\}\.tar\.gz\n\s+dist\/release\/citadel-\$\{\{ github\.ref_name \}\}\.tar\.gz\.manifest\.json\n\s+dist\/release\/citadel-\$\{\{ github\.ref_name \}\}\.tar\.gz\.sha256/);
assert(packageBlock.indexOf('actions/attest@') > packageBlock.indexOf('Verify tagged artifact'), 'attestation must follow artifact verification');
assert(packageBlock.indexOf('gh release create') > packageBlock.indexOf('actions/attest@'), 'release publication must follow attestation');
for (const match of releaseYaml.matchAll(/^\s*- uses:\s*(\S+)/gm)) {
  assert.match(match[1], /@[a-f0-9]{40}(?:\s|$)/, `release action is not SHA pinned: ${match[1]}`);
}

for (const invalid of [
  { workflow: 'verify-change;echo-owned' },
  { evidencePath: '../../outside' },
  { workingDirectory: '..\\outside' },
  { strict: 'sometimes' },
]) assert.throws(() => action.validateInputs(invalid, { workspace: ROOT }), /invalid|contained|true or false/);

const actionSource = fs.readFileSync(path.join(ROOT, 'scripts', 'action-verify.js'), 'utf8');
assert.doesNotMatch(actionSource, /shell:\s*true/);
assert.doesNotMatch(actionSource, /execSync|\bexec\(/);

function fixtureWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'citadel-action-'));
  fs.mkdirSync(path.join(root, 'workflows'));
  fs.copyFileSync(path.join(ROOT, 'workflows', 'verify-change.citadel.json'), path.join(root, 'workflows', 'verify-change.citadel.json'));
  return root;
}

function clock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 6, 13, 12, 0, tick++)).toISOString();
}

function executeWith(statuses) {
  const workspace = fixtureWorkspace();
  let index = 0;
  const result = action.executeVerification({
    workflow: 'verify-change', evidencePath: '.planning/action-evidence', strict: 'true', workingDirectory: '.',
  }, {
    workspace,
    env: { GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2' },
    now: clock(),
    runArgv: () => {
      const status = statuses[index++] || 'unknown';
      return { status, exit_code: status === 'passed' ? 0 : status === 'failed' ? 1 : null, stdout_digest: operations.sha256Digest('out'), stderr_digest: operations.sha256Digest('err') };
    },
  });
  return { workspace, result };
}

const passed = executeWith(['passed', 'passed']);
assert.equal(passed.result.status, 'passed');
assert.equal(passed.result.steps.length, 2);
const passedEnvelope = JSON.parse(fs.readFileSync(path.join(passed.workspace, passed.result.receipt_path), 'utf8'));
assert.equal(operations.verifyExecutionReceipt(passedEnvelope).status, 'unsigned');
assert.equal(passedEnvelope.receipt.status, 'passed');
assert(fs.existsSync(path.join(passed.workspace, passed.result.summary_path)));

const failed = executeWith(['failed']);
assert.equal(failed.result.status, 'failed');
assert.equal(failed.result.steps.length, 1, 'ordered execution must stop after verifier failure');
assert.equal(JSON.parse(fs.readFileSync(path.join(failed.workspace, failed.result.receipt_path))).receipt.status, 'failed');

const unknown = executeWith(['unknown']);
assert.equal(unknown.result.status, 'unknown');
assert.equal(JSON.parse(fs.readFileSync(path.join(unknown.workspace, unknown.result.receipt_path))).receipt.status, 'unknown');

const blockedRoot = fixtureWorkspace();
const githubOutput = path.join(blockedRoot, 'github-output.txt');
const githubSummary = path.join(blockedRoot, 'github-summary.md');
const originalExit = process.exitCode;
const blocked = action.main({
  INPUT_WORKFLOW: 'bad;workflow', INPUT_STRICT: 'false', GITHUB_WORKSPACE: blockedRoot,
  GITHUB_OUTPUT: githubOutput, GITHUB_STEP_SUMMARY: githubSummary,
});
process.exitCode = originalExit;
assert.equal(blocked.status, 'blocked');
assert.match(fs.readFileSync(githubOutput, 'utf8'), /status=blocked/);
assert.match(fs.readFileSync(githubSummary, 'utf8'), /Status: \*\*blocked\*\*/);

for (const item of [passed, failed, unknown]) fs.rmSync(item.workspace, { recursive: true, force: true });
fs.rmSync(blockedRoot, { recursive: true, force: true });

process.stdout.write('GitHub Action tests passed.\n');
