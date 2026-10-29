const path = require('path');

function buildInstallPlan(args = []) {
  const targetIndex = args.indexOf('--target');
  const target = targetIndex >= 0 ? args[targetIndex + 1] : path.join(process.cwd(), 'ai-dev-kit-install');
  return {
    source: path.resolve(__dirname, '..'),
    target: path.resolve(target),
    entries: [
      'AGENTS.md',
      'CHANGELOG.md',
      'CONTRIBUTING.md',
      'LICENSE',
      'README.md',
      'SECURITY.md',
      'VERSION',
      '.claude-plugin',
      '.codex-plugin',
      '.github',
      '.mcp.json',
      '.opencode',
      'agents',
      'commands',
      'contexts',
      'docs',
      'examples',
      'hooks',
      'install.ps1',
      'install.sh',
      'manifests',
      'mcp-configs',
      'package.json',
      'plugins',
      'rules',
      'schemas',
      'scripts',
      'skills',
      'tests'
    ]
  };
}

module.exports = { buildInstallPlan };
