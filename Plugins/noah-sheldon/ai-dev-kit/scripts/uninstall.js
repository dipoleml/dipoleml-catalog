const fs = require('fs/promises');
const path = require('path');

async function uninstallTarget(args = []) {
  const targetIndex = args.indexOf('--target');
  const target = targetIndex >= 0 ? args[targetIndex + 1] : path.join(process.cwd(), 'ai-dev-kit-install');
  const root = path.resolve(target);
  await fs.rm(root, { recursive: true, force: true });
  console.log(`Removed ${root}`);
}

if (require.main === module) {
  uninstallTarget(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { uninstallTarget };
