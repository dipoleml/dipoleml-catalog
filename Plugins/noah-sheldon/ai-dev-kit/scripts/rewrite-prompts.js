#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function titleCase(name) {
  return name
    .replace(/\.md$/i, '')
    .replace(/\/SKILL$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function skillDescription(name) {
  const map = {
    'tdd-workflow': 'Test-driven development workflow with strict RED-GREEN-REFACTOR discipline.',
    'code-review': 'Code review workflow for correctness, regressions, and maintainability.',
    'security-review': 'Security review workflow for secrets, auth, input validation, and unsafe defaults.',
    'verification-loop': 'Verification workflow for tests, smoke checks, and release gates.',
    'frontend-patterns': 'React and Next.js UI patterns with accessibility, performance, and clean composition.',
    'backend-patterns': 'Backend architecture patterns for APIs, services, and data access.',
    'python-patterns': 'Python workflow patterns for typed, testable, maintainable code.',
    'python-testing': 'Python testing workflow for Pytest, FastAPI, and data-heavy code.',
    'typescript-patterns': 'TypeScript workflow patterns for type-safe, maintainable code.',
    'wxt-chrome-extension': 'WXT and Chrome extension workflow for Manifest V3 and browser automation.',
    'mlops-workflow': 'MLOps workflow for training, evaluation, deployment, and retraining.',
    'data-pipelines': 'Data pipeline workflow for ETL, validation, and quality controls.',
    'aws-deployment': 'AWS deployment workflow for repeatable infrastructure and delivery.',
    'observability-telemetry': 'Observability workflow for logs, metrics, traces, and dashboards.',
    'git-workflow': 'Git workflow for branches, commits, merges, and conflict management.',
    'context-prune': 'Context pruning workflow for trimming stale session state and noise.',
    'skill-authoring': 'Skill authoring workflow for packaging repeatable practices as reusable skills.',
  };
  return map[name] || `Workflow guidance for ${titleCase(name)}.`;
}

function skillFocus(name) {
  const map = {
    'tdd-workflow': ['Write tests first', 'Keep the fix minimal', 'Refactor only after green'],
    'code-review': ['Find defects, regressions, and missing tests', 'Prefer concrete findings over vague feedback'],
    'security-review': ['Validate input boundaries', 'Check auth and secrets', 'Reject unsafe defaults'],
    'verification-loop': ['Run the right checks in the right order', 'Report blockers clearly'],
    'frontend-patterns': ['React and Next.js composition', 'Accessibility and responsive layouts', 'Streaming and loading states'],
    'backend-patterns': ['FastAPI and service boundaries', 'Repository and validation patterns', 'Database efficiency'],
    'python-patterns': ['Pandas, NumPy, SQLAlchemy', 'Typed helpers and explicit errors'],
    'python-testing': ['Pytest and FastAPI checks', 'Coverage for failure modes'],
    'typescript-patterns': ['Narrow types and clean modules', 'Explicit async boundaries'],
    'wxt-chrome-extension': ['Manifest V3 and content scripts', 'Service workers and browser APIs'],
    'mlops-workflow': ['Training, evaluation, and deployment', 'Retries, rollbacks, and observability'],
    'data-pipelines': ['ETL, validation, and chunking', 'Safe retries and data quality'],
    'aws-deployment': ['Repeatable deploys and rollback paths', 'Least privilege on AWS'],
    'observability-telemetry': ['Logs, metrics, traces, dashboards', 'Incident evidence and SLOs'],
    'git-workflow': ['Focused branches and checkpoint commits', 'Clear merge and rebase rules'],
    'context-prune': ['Trim stale context', 'Keep the active working set small'],
    'skill-authoring': ['Write reusable skill prompts', 'Keep scope and output explicit'],
  };
  return map[name] || ['Use the skill when the workflow matches the file name.'];
}

function commandDescription(name) {
  const map = {
    plan: 'Restate requirements, assess risks, and produce an implementation plan.',
    tdd: 'Legacy shim for the tdd-workflow skill.',
    e2e: 'Legacy shim for the e2e-testing skill.',
    verify: 'Legacy shim for the verification-loop skill.',
    'code-review': 'Legacy shim for the code-review skill.',
    'build-fix': 'Fix build and type failures with minimal diffs.',
    'refactor-clean': 'Clean dead code and brittle abstractions after tests are green.',
    checkpoint: 'Record a verified checkpoint before the next phase.',
    'review-pr': 'Review a PR or local diff for correctness and regressions.',
    'feature-dev': 'Drive a feature from plan to implementation to review.',
    'test-coverage': 'Measure and improve coverage on the current change.',
    'context-budget': 'Inspect and trim session context usage.',
    eval: 'Run or discuss evaluation workflows.',
    learn: 'Extract reusable lessons from recent work.',
    'learn-eval': 'Turn an eval result into reusable guidance.',
    'skill-create': 'Create a new skill surface from a repeatable workflow.',
    'skill-health': 'Check whether the skill surface is healthy and usable.',
    hookify: 'Create or update hook automation surfaces.',
    'hookify-configure': 'Configure hook profiles and defaults.',
    'hookify-list': 'List available hooks and their entrypoints.',
    'hookify-help': 'Explain the hook workflow quickly.',
    'loop-start': 'Start a bounded automation loop.',
    'loop-status': 'Report the status of a running loop.',
    'save-session': 'Save the current session context.',
    'resume-session': 'Resume a previously saved session.',
    sessions: 'Inspect saved sessions or session history.',
    'update-docs': 'Update docs after behavior changes.',
    'update-codemaps': 'Refresh codemap-style documentation.',
    'git-agent': 'Coordinate issue intake, branch work, and merge steps.',
    'ml-review': 'Review ML, RAG, and LLMOps changes.',
    'project-template': 'Copy the project template workflow into a new repo.',
    promote: 'Promote a verified workflow into the main surface.',
    install: 'Install the AI Dev Kit surface into a target directory.',
    uninstall: 'Remove an installed AI Dev Kit target directory.',
    doctor: 'Check the install surface for missing files and invalid manifests.',
    validate: 'Validate the surface and manifest wiring.',
    launch: 'Prepare a release by validating the install surface.',
    'quality-gate': 'Run the release quality gate.',
  };
  return map[name] || `Workflow command for ${titleCase(name)}.`;
}

function commandDelegate(name) {
  const map = {
    plan: 'planner',
    tdd: 'tdd-workflow',
    e2e: 'e2e-testing',
    verify: 'verification-loop',
    'code-review': 'code-review',
    'build-fix': 'build-error-resolver',
    'refactor-clean': 'refactor-cleaner',
    'review-pr': 'code-review',
    'feature-dev': 'planner, tdd-workflow, code-review',
    'test-coverage': 'verification-loop',
    'context-budget': 'token-budget-advisor',
    eval: 'eval-harness',
    learn: 'documentation-lookup',
    'learn-eval': 'eval-harness',
    'skill-create': 'skill-create',
    'skill-health': 'verification-loop',
    hookify: 'hookify',
    'hookify-configure': 'hookify',
    'hookify-list': 'hookify',
    'hookify-help': 'hookify',
    'loop-start': 'autonomous-loops',
    'loop-status': 'autonomous-loops',
    'save-session': 'context-prune',
    'resume-session': 'context-prune',
    sessions: 'context-prune',
    'update-docs': 'doc-updater',
    'update-codemaps': 'doc-updater',
    'git-agent': 'git-agent-coordinator',
    'ml-review': 'ml-engineer',
    'project-template': 'codebase-onboarding',
    promote: 'planner',
    install: 'install-apply',
    uninstall: 'uninstall',
    doctor: 'doctor',
    validate: 'verification-loop',
    launch: 'planner',
    'quality-gate': 'verification-loop',
  };
  return map[name] || null;
}

function agentBody(name) {
  const title = titleCase(name);
  const roleMap = {
    planner: ['Restate requirements', 'Break work into phases', 'Identify risks and dependencies', 'Keep the plan mergeable'],
    architect: ['Review system boundaries', 'Recommend scalable shapes', 'Reduce coupling', 'Call out tradeoffs'],
    'tdd-guide': ['Write tests first', 'Validate RED before code', 'Keep the fix minimal', 'Refactor after green'],
    'code-reviewer': ['Find concrete bugs', 'Check missing tests', 'Flag regressions', 'Keep feedback actionable'],
    'security-reviewer': ['Inspect auth boundaries', 'Validate input handling', 'Check secrets and shell usage', 'Reject unsafe defaults'],
    'build-error-resolver': ['Fix build and type errors', 'Keep diffs minimal', 'Avoid unrelated cleanup', 'Restore green fast'],
    'e2e-runner': ['Cover critical flows', 'Write browser-level checks', 'Prefer stable scenarios', 'Report flaky paths'],
    'doc-updater': ['Keep docs aligned', 'Remove stale instructions', 'Refresh examples', 'Update file references'],
    'refactor-cleaner': ['Remove dead code', 'Collapse duplication', 'Preserve behavior', 'Keep the cleanup reviewable'],
    'docs-lookup': ['Find current docs', 'Prefer authoritative references', 'Summarize only what matters', 'Note source limitations'],
    'python-reviewer': ['Review Python correctness', 'Check type clarity', 'Inspect data and API code', 'Prefer explicit errors'],
    'database-reviewer': ['Review schemas and queries', 'Check performance', 'Validate migrations', 'Keep changes safe'],
    'ai-judge': ['Score outputs by rubric', 'Surface gaps clearly', 'Confirm pass/fail criteria', 'Avoid vague approvals'],
    'git-agent-coordinator': ['Coordinate branch work', 'Run parallel reviews', 'Manage merge conflicts', 'Keep PRs clean'],
    'ml-engineer': ['Handle ML workflows', 'Evaluate model quality', 'Review RAG and LLMOps', 'Keep deployments reversible'],
    'chrome-ext-developer': ['Own WXT surfaces', 'Handle Manifest V3', 'Manage browser APIs', 'Keep cross-browser compatibility'],
    'data-engineer': ['Design ETL flows', 'Validate data quality', 'Optimize transformations', 'Keep pipelines reliable'],
    'infra-as-code-specialist': ['Own IaC manifests', 'Check drift and rollout safety', 'Validate delivery pipelines', 'Keep infra declarative'],
    'observability-telemetry': ['Instrument traces and metrics', 'Maintain dashboards', 'Capture incident evidence', 'Keep observability affordable'],
  };
  const role = roleMap[name] || ['Follow the repo workflow', 'Be specific', 'Keep changes small'];
  return `You are the ${title} specialist for AI Dev Kit.\n\n## Role\n\n- ${role[0]}\n- ${role[1]}\n- ${role[2]}\n- ${role[3]}\n\n## Workflow\n\n1. Restate the task in concrete terms.\n2. Identify the files or surfaces that will change.\n3. Prefer incremental, verifiable steps.\n4. Call out blockers, risks, and assumptions.\n\n## Output\n\n- Keep responses short and direct.\n- Use exact file paths when relevant.\n- Prefer action items over narrative.\n`;
}

function skillBody(name) {
  const title = titleCase(name);
  const focus = skillFocus(name).map((item) => `- ${item}`).join('\n');
  const extra = {
    'frontend-patterns': '- Prefer intentional layout, accessible controls, and purposeful motion.',
    'backend-patterns': '- Keep APIs explicit and data access isolated behind stable interfaces.',
    'python-patterns': '- Favor pandas, NumPy, and SQLAlchemy patterns that stay testable.',
    'python-testing': '- Include Pytest, FastAPI, and data workflow checks where relevant.',
    'typescript-patterns': '- Keep types narrow and avoid hidden any-paths.',
    'wxt-chrome-extension': '- Treat browser permissions and message passing as first-class concerns.',
    'mlops-workflow': '- Measure model quality before release and keep rollback paths obvious.',
    'data-pipelines': '- Design idempotent, monitored, and retryable data flows.',
    'aws-deployment': '- Keep deploys repeatable and least-privilege.',
    'observability-telemetry': '- Correlate logs, metrics, and traces with user-visible incidents.',
    'git-workflow': '- Keep branches small, commits reviewable, and history clean.',
    'context-prune': '- Remove stale context without losing the active task.',
    'skill-authoring': '- Design reusable skills with clear triggers, workflow, and verification steps.',
  }[name] || '';
  return `# ${title}\n\nUse this when the current task matches the workflow described by this skill.\n\n## When to Use\n\n- ${name.includes('testing') ? 'You need test guidance or test-first workflow.' : 'The task needs a repeatable, specialized workflow.'}\n- ${name.includes('patterns') ? 'You are applying stack conventions or architecture patterns.' : 'The task would benefit from reusable process guidance.'}\n- ${name.includes('review') ? 'You need a review pass or quality gate.' : 'You want a consistent operating procedure.'}\n\n## Core Focus\n\n${focus.join ? focus.map((f) => `- ${f}`).join('\n') : focus}\n${extra ? `${extra}\n` : ''}## Workflow\n\n1. Restate the job in one sentence.\n2. Identify the relevant files, commands, or services.\n3. Apply the skill in small, verifiable steps.\n4. Verify the outcome before moving on.\n\n## Verification\n\n- Prefer concrete checks over vague reassurance.\n- Validate the main behavior and at least one failure path.\n- Keep the response short and direct.\n`;
}

function commandBody(name) {
  const delegate = commandDelegate(name);
  const desc = commandDescription(name);
  const title = titleCase(name);
  const delegateLine = delegate ? `Apply the \`${delegate}\` skill.` : 'Use the repo-local workflow for this command.';
  const extra = {
    plan: 'Keep the plan short, phased, and explicitly blocked on confirmation before code changes.',
    tdd: 'Write tests first and do not touch production code until RED is confirmed.',
    e2e: 'Focus on critical user flows and browser-level evidence.',
    verify: 'Run the right checks in the right order and report blockers only.',
    'code-review': 'Focus on correctness, regressions, and missing tests.',
    'build-fix': 'Fix only the smallest set of build or type errors needed to restore green.',
    'refactor-clean': 'Remove dead code only after the tests are green.',
    'feature-dev': 'Plan, implement, and verify the feature in small phases.',
    'project-template': 'Copy the template surface and update naming before use.',
    'git-agent': 'Coordinate issue intake, branches, and merges with clear checkpoints.',
  }[name] || 'Keep the workflow bounded and explicit.';
  return `# ${title}\n\n${desc}\n\n## Delegate\n\n${delegateLine}\n\n## Notes\n\n- ${extra}\n- Keep responses short and direct.\n- Prefer the maintained skill surface over duplicated prompt logic.\n`;
}

function frontmatter(type, name, description, extra = {}) {
  const lines = ['---'];
  lines.push(`name: ${name}`);
  if (description) lines.push(`description: ${description}`);
  for (const [k, v] of Object.entries(extra)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

function writeFile(rel, content) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
}

function rewriteAgents() {
  const agents = fs.readdirSync(path.join(root, 'agents')).filter((f) => f.endsWith('.md'));
  for (const file of agents) {
    const name = file.replace(/\.md$/i, '');
    const desc = skillDescription(name);
    const body = agentBody(name);
    const extra = {};
    if (['planner', 'architect'].includes(name)) extra.model = 'opus';
    else if (name === 'doc-updater') extra.model = 'haiku';
    else extra.model = 'sonnet';
    extra.tools = '["Read", "Grep", "Glob", "Bash"]';
    extra.fallback_model = 'default';
    writeFile(path.join('agents', file), `${frontmatter('agent', name, desc, extra)}${body}`);
  }
}

function rewriteSkills() {
  const skills = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(path.join(root, dir))) {
      const p = path.join(dir, name);
      const full = path.join(root, p);
      if (fs.statSync(full).isDirectory()) {
        walk(p);
      } else if (name === 'SKILL.md') {
        skills.push(p);
      }
    }
  };
  walk('skills');
  for (const rel of skills) {
    const name = path.basename(path.dirname(rel));
    const desc = skillDescription(name);
    const body = skillBody(name);
    writeFile(rel, `${frontmatter('skill', name, desc, { origin: 'AI Dev Kit' })}${body}`);
  }
}

function rewriteCommands() {
  const cmds = fs.readdirSync(path.join(root, 'commands')).filter((f) => f.endsWith('.md'));
  for (const file of cmds) {
    const name = file.replace(/\.md$/i, '');
    const desc = commandDescription(name);
    const hintMap = {
      plan: '[request]',
      'review-pr': '[pr-number | pr-url | blank]',
      'git-agent': '[issue | blank]',
      'ml-review': '[change | blank]',
      install: '[target]',
      uninstall: '[target]',
    };
    const body = commandBody(name);
    const fm = frontmatter('command', name, desc, hintMap[name] ? { 'argument-hint': hintMap[name] } : {});
    writeFile(path.join('commands', file), `${fm}${body}`);
  }
}

rewriteAgents();
rewriteSkills();
rewriteCommands();
console.log('Prompt surfaces rewritten.');
