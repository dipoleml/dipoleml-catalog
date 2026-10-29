const fs = require('fs');
const path = require('path');

const requiredPaths = [
  'package.json',
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'WORKING-CONTEXT.md',
  'LICENSE',
  'VERSION',
  '.claude-plugin/plugin.json',
  '.claude-plugin/README.md',
  '.claude-plugin/PLUGIN_SCHEMA_NOTES.md',
  '.codex-plugin/plugin.json',
  '.codex-plugin/README.md',
  '.opencode/opencode.json',
  '.opencode/README.md',
  '.opencode/package.json',
  '.opencode/index.ts',
  '.opencode/tsconfig.json',
  '.opencode/MIGRATION.md',
  '.opencode/commands/README.md',
  '.opencode/commands/plan.md',
  '.opencode/commands/code-review.md',
  '.opencode/commands/tdd.md',
  '.opencode/commands/verify.md',
  '.opencode/plugins/index.ts',
  '.opencode/plugins/ecc-hooks.ts',
  '.opencode/tools/index.ts',
  '.opencode/instructions/INSTRUCTIONS.md',
  '.opencode/prompts/agents/planner.txt',
  '.opencode/prompts/agents/code-reviewer.txt',
  '.claude/README.md',
  '.codex/README.md',
  '.cursor/README.md',
  '.gemini/README.md',
  'scripts/cli.js',
  'scripts/doctor.js',
  'scripts/install-plan.js',
  'scripts/install-apply.js',
  'scripts/uninstall.js',
  'scripts/sync-claude.js',
  'scripts/sync-codex.js',
  'scripts/sync-opencode.js',
  'scripts/sync-gemini.js',
  'scripts/copy-template.sh',
  'tests/smoke.test.js',
  'agents',
  'skills',
  'commands',
  'hooks',
  'rules',
  'manifests',
  'schemas',
  'docs',
  'examples',
  'docs/examples/project-guidelines-template.md',
  'docs/examples/product-capability-template.md',
  'commands/code-review.md',
  'commands/tdd.md',
  'commands/e2e.md',
  'commands/verify.md',
  'commands/quality-gate.md',
  'commands/build-fix.md',
  'commands/refactor-clean.md',
  'commands/checkpoint.md',
  'commands/review-pr.md',
  'commands/feature-dev.md',
  'commands/test-coverage.md',
  'commands/context-budget.md',
  'commands/eval.md',
  'commands/learn.md',
  'commands/learn-eval.md',
  'commands/skill-create.md',
  'commands/skill-health.md',
  'commands/hookify.md',
  'commands/hookify-configure.md',
  'commands/hookify-list.md',
  'commands/hookify-help.md',
  'commands/loop-start.md',
  'commands/loop-status.md',
  'commands/save-session.md',
  'commands/resume-session.md',
  'commands/sessions.md',
  'commands/update-docs.md',
  'commands/update-codemaps.md',
  'commands/git-agent.md',
  'commands/ml-review.md',
  'commands/context-prune.md',
  'skills/python-testing/SKILL.md'
];

function validateSurface() {
  const root = path.resolve(__dirname, '..');
  const missing = requiredPaths.filter((rel) => !fs.existsSync(path.join(root, rel)));
  if (missing.length > 0) {
    throw new Error(`Missing required surface files: ${missing.join(', ')}`);
  }

  const countFiles = (dir) => {
    const walk = (current) => {
      let count = 0;
      for (const name of fs.readdirSync(current)) {
        const p = path.join(current, name);
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          count += walk(p);
        } else {
          count += 1;
        }
      }
      return count;
    };
    return walk(path.join(root, dir));
  };

  const agentCount = countFiles('agents');
  const skillCount = countFiles('skills');
  const commandCount = countFiles('commands');
  const commonRuleCount = countFiles('rules/common');
  const pythonRuleCount = countFiles('rules/python');
  const typescriptRuleCount = countFiles('rules/typescript');
  const webRuleCount = countFiles('rules/web');

  if (agentCount < 20) throw new Error(`Expected at least 20 agents, found ${agentCount}`);
  if (skillCount < 50) throw new Error(`Expected at least 50 skills, found ${skillCount}`);
  if (commandCount < 30) throw new Error(`Expected at least 30 commands, found ${commandCount}`);
  if (commonRuleCount !== 10) throw new Error(`Expected 10 common rules, found ${commonRuleCount}`);
  if (pythonRuleCount !== 5) throw new Error(`Expected 5 python rules, found ${pythonRuleCount}`);
  if (typescriptRuleCount !== 5) throw new Error(`Expected 5 typescript rules, found ${typescriptRuleCount}`);
  if (webRuleCount !== 8) throw new Error(`Expected 8 web rules, found ${webRuleCount}`);

  JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const claudePlugin = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));
  const codexPlugin = JSON.parse(fs.readFileSync(path.join(root, '.codex-plugin/plugin.json'), 'utf8'));
  const opencode = JSON.parse(fs.readFileSync(path.join(root, '.opencode/opencode.json'), 'utf8'));
  const hooks = JSON.parse(fs.readFileSync(path.join(root, 'hooks/hooks.json'), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(root, 'manifests/install-profiles.json'), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(root, 'manifests/install-modules.json'), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(root, 'manifests/install-components.json'), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(root, 'examples/statusline.json'), 'utf8'));
  for (const schema of [
    'schemas/plugin.schema.json',
    'schemas/install-profiles.schema.json',
    'schemas/install-components.schema.json',
    'schemas/state-store.schema.json'
  ]) {
    JSON.parse(fs.readFileSync(path.join(root, schema), 'utf8'));
  }

  for (const rel of codexPlugin.agents || []) {
    if (!fs.existsSync(path.join(root, rel))) {
      throw new Error(`Codex plugin references missing agent: ${rel}`);
    }
  }

  for (const rel of codexPlugin.skills || []) {
    if (!fs.existsSync(path.join(root, rel))) {
      throw new Error(`Codex plugin references missing skill surface: ${rel}`);
    }
  }

  for (const rel of codexPlugin.commands || []) {
    if (!fs.existsSync(path.join(root, rel))) {
      throw new Error(`Codex plugin references missing command surface: ${rel}`);
    }
  }

  for (const rel of opencode.instructions || []) {
    if (!fs.existsSync(path.join(root, rel))) {
      throw new Error(`OpenCode config references missing instruction: ${rel}`);
    }
  }

  for (const rel of Object.values(hooks)) {
    if (!fs.existsSync(path.join(root, rel))) {
      throw new Error(`Hook config references missing file: ${rel}`);
    }
  }

  if (!claudePlugin.interface || !claudePlugin.interface.displayName) {
    throw new Error('Claude plugin manifest missing interface.displayName');
  }
}

if (require.main === module) {
  validateSurface();
  console.log('Surface validation passed.');
}

module.exports = { validateSurface };
