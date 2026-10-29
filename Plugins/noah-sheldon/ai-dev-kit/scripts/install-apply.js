const fs = require('fs/promises');
const path = require('path');
const { buildInstallPlan } = require('./install-plan');

async function copyEntry(sourceRoot, targetRoot, relPath) {
  const source = path.join(sourceRoot, relPath);
  const target = path.join(targetRoot, relPath);
  const stat = await fs.stat(source);

  if (stat.isDirectory()) {
    await fs.mkdir(target, { recursive: true });
    const children = await fs.readdir(source);
    for (const child of children) {
      await copyEntry(sourceRoot, targetRoot, path.join(relPath, child));
    }
    return;
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

async function applyInstallPlan(plan) {
  if (plan.source === plan.target) {
    throw new Error('Install target must be different from the source repository');
  }

  await fs.mkdir(plan.target, { recursive: true });
  for (const entry of plan.entries) {
    await copyEntry(plan.source, plan.target, entry);
  }
  console.log(`Installed AI Dev Kit files into ${plan.target}`);
}

if (require.main === module) {
  const plan = buildInstallPlan(process.argv.slice(2));
  applyInstallPlan(plan).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { applyInstallPlan };
