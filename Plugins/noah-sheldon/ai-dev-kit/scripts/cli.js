#!/usr/bin/env node
const { runDoctor } = require('./doctor');
const { buildInstallPlan } = require('./install-plan');
const { applyInstallPlan } = require('./install-apply');
const { uninstallTarget } = require('./uninstall');
const { validateSurface } = require('./validate-surface');

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === 'help') {
    console.log('Usage: aidevkit <doctor|install|uninstall|validate|plan>');
    process.exit(0);
  }

  if (command === 'doctor') {
    runDoctor();
    return;
  }

  if (command === 'validate') {
    validateSurface();
    return;
  }

  if (command === 'plan') {
    const plan = buildInstallPlan(args);
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (command === 'install') {
    const plan = buildInstallPlan(args);
    await applyInstallPlan(plan);
    return;
  }

  if (command === 'uninstall') {
    await uninstallTarget(args);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
