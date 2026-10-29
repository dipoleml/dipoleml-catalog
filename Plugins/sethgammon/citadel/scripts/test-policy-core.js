#!/usr/bin/env node
'use strict';

const assert = require('assert');

const {
  checkProtectedBranchDeletion,
  detectExternalAction,
  getTier,
  readExternalActionPolicy,
  stripQuotedContent,
} = require('../core/policy/external-actions');

const defaultPolicy = readExternalActionPolicy({});
assert(defaultPolicy.protectedBranches.includes('main'), 'default policy should protect main');
assert.equal(
  checkProtectedBranchDeletion('git push origin --delete main', defaultPolicy.protectedBranches),
  'main'
);

const stripped = stripQuotedContent('echo "gh pr merge" && git push origin feat/test');
assert(!stripped.includes('gh pr merge'), 'quoted content should be stripped before matching');

const secret = detectExternalAction('cat .env.local', defaultPolicy);
assert.equal(secret.kind, 'secret', 'secret reads should be detected');

const protectedBranch = detectExternalAction('git push origin --delete main', defaultPolicy);
assert.equal(protectedBranch.kind, 'protected-branch', 'protected branch deletion should be detected');

const soft = detectExternalAction('git push origin feat/test', defaultPolicy);
assert.equal(soft.tier, 'allow', 'git push should be allowed by default');

const prCreate = detectExternalAction('gh pr create --title test --body test', defaultPolicy);
assert.equal(prCreate.tier, 'allow', 'gh pr create should be allowed by default');

const hard = detectExternalAction('gh release create v1.0.0', defaultPolicy);
assert.equal(hard.tier, 'hard', 'release create should be hard-tier by default');

assert.equal(
  getTier('future external action', defaultPolicy),
  'hard',
  'unknown detected external actions must fail closed'
);

assert.throws(
  () => readExternalActionPolicy({ policy: { externalActions: { hard: 'gh pr merge' } } }),
  /hard.*array/i,
  'malformed policy lists must be rejected'
);

const permissivePolicy = readExternalActionPolicy({
  policy: {
    externalActions: {
      protectedBranches: ['release'],
      hard: [],
      soft: [],
      allow: ['git push', 'P-001', 'P-004'],
    },
  },
});

const forceMain = detectExternalAction('git push --force origin main', permissivePolicy);
assert.equal(forceMain.rule, 'P-001', 'force-push to main must be detected as P-001');
assert.equal(forceMain.tier, 'hard', 'P-001 must remain hard under permissive config');

const forceMaster = detectExternalAction('git push origin master -f', permissivePolicy);
assert.equal(forceMaster.rule, 'P-001', 'force-push to master must be detected regardless of flag position');

const quotedMain = detectExternalAction('git push --force origin "main"', permissivePolicy);
assert.equal(quotedMain.rule, 'P-001', 'quoted main ref must not bypass P-001');

const gitGlobalOption = detectExternalAction('git -C repo push --force origin main', permissivePolicy);
assert.equal(gitGlobalOption.rule, 'P-001', 'git global options must not bypass P-001');

const plusMain = detectExternalAction('git push origin +main', permissivePolicy);
assert.equal(plusMain.rule, 'P-001', 'leading-plus force refspec must not bypass P-001');

const plusHeadMain = detectExternalAction('git push origin +HEAD:main', permissivePolicy);
assert.equal(plusHeadMain.rule, 'P-001', 'forced source:destination refspec must not bypass P-001');

const implicitForce = detectExternalAction('git push -f', permissivePolicy);
assert.equal(implicitForce.rule, 'P-001', 'implicit force-push target must fail closed');

const combinedForce = detectExternalAction('git push -fu origin main', permissivePolicy);
assert.equal(combinedForce.rule, 'P-001', 'combined short force flags must not bypass P-001');

const noVerify = detectExternalAction('git commit --no-verify -m test', permissivePolicy);
assert.equal(noVerify.rule, 'P-004', 'git --no-verify must be detected as P-004');
assert.equal(noVerify.tier, 'hard', 'P-004 must remain hard under permissive config');

const shortNoVerify = detectExternalAction('git commit -n -m test', permissivePolicy);
assert.equal(shortNoVerify.rule, 'P-004', 'git commit -n must be detected as the P-004 hook-bypass alias');
assert.equal(shortNoVerify.tier, 'hard', 'git commit -n must remain hard under permissive config');

const noVerifyGlobalOption = detectExternalAction('git -C repo commit "--no-verify" -m test', permissivePolicy);
assert.equal(noVerifyGlobalOption.rule, 'P-004', 'quoted --no-verify after git global options must not bypass P-004');

for (const [command, expectedRule] of [
  ['env git push --force origin main', 'P-001'],
  ['command git commit --no-verify -m test', 'P-004'],
  ['cmd /c "git push --force origin main"', 'P-001'],
  ['powershell -Command "git commit --no-verify -m test"', 'P-004'],
  ["bash -c 'git push --force origin main'", 'P-001'],
  ['"C:\\Program Files\\Git\\bin\\git.exe" push --force origin main', 'P-001'],
  ['C:\\Git\\bin\\git.exe push --force origin main', 'P-001'],
  ['cmd /c call git push --force origin main', 'P-001'],
  ['bash -c "exec git push --force origin main"', 'P-001'],
  ['git push --force origin HEAD', 'P-001'],
]) {
  const wrapped = detectExternalAction(command, permissivePolicy);
  assert.equal(wrapped?.rule, expectedRule, `${command} must enforce ${expectedRule}`);
  assert.equal(wrapped?.tier, 'hard', `${command} must remain non-configurable`);
}

const wrappedRelease = detectExternalAction("bash -c 'gh release create v1.0.0'", defaultPolicy);
assert.equal(wrappedRelease?.label, 'gh release create', 'shell wrappers must not hide detected external actions');
assert.equal(wrappedRelease?.tier, 'hard', 'wrapped hard actions must retain their tier');

const quotedExample = detectExternalAction('echo "git push --force origin main"', permissivePolicy);
assert.equal(quotedExample, null, 'quoted examples must not be mistaken for direct Git commands');

const reversibleForcePush = detectExternalAction('git push --force origin feat/test', permissivePolicy);
assert.equal(reversibleForcePush.label, 'git push', 'feature-branch force-push remains normal push policy');
assert.equal(reversibleForcePush.tier, 'allow', 'normal reversible push behavior must be preserved');

console.log('policy core tests passed');
