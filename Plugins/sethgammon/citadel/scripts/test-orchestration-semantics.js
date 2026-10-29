'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LIVE_SURFACES = [
  'skills/archon/SKILL.md',
  'skills/fleet/SKILL.md',
  'docs/CAMPAIGNS.md',
  'docs/FLEET.md',
  'docs/JUDGE_TIERING.md',
  'docs/CONSTITUTION.md',
];

const UNSAFE_RULES = [
  {
    name: 'timeout-as-success',
    pattern: /\b(?:validator|policy[- ]enforcer|voter)?\s*time(?:out|d out)[^.\n]{0,140}\btreat(?:ed)?(?:\s+the result)?\s+as\s+`?(?:verdict:\s*["']?)?(?:pass|proceed|allow)\b/i,
    example: 'Validator timeout: treat the result as verdict: "pass".',
  },
  {
    name: 'timeout-counts-as-success',
    pattern: /\btime(?:out|d out)[^.\n]{0,100}\bcounts?\s+as\s+`?(?:pass|proceed|allow)\b/i,
    example: 'A timed out voter counts as proceed.',
  },
  {
    name: 'timeout-direct-success',
    pattern: /\btime(?:out|d out)[^.\n]{0,100}\b(?:becomes?|is considered|=>|→)\s+`?(?:pass|passed|proceed|allow|advance|merge)\b/i,
    example: 'Validator timeout becomes passed.',
  },
  {
    name: 'malformed-as-success',
    pattern: /\b(?:malformed|unparseable)[^.\n]{0,160}\b(?:treat(?:ed)?\s+as\s+`?(?:pass|proceed|allow)|allow reversible operations|advance|merge)\b/i,
    example: 'Malformed validator output: treat as pass.',
  },
  {
    name: 'optional-exit-evidence',
    pattern: /\bvalidate (?:task )?exit evidence if\b[^.\n]{0,100}\b(?:has|exists)\b/i,
    example: 'Validate exit evidence if the session has an Exit Evidence table.',
  },
  {
    name: 'missing-evidence-advances',
    pattern: /\bmissing (?:required )?evidence[^.\n]{0,140}\b(?:pass|proceed|advance|merge|complete)\b/i,
    example: 'Missing required evidence may advance the phase.',
  },
  {
    name: 'partial-advances',
    pattern: /\b(?:mark(?:ed)?\s+(?:the\s+)?(?:phase|wave|task)\s+(?:as\s+)?`?partial`?|`partial`\s+(?:phase|wave|task))[\s\S]{0,180}\b(?:advance|proceed|merge|complete)\b/i,
    example: 'Mark the phase partial and advance.',
  },
  {
    name: 'exhausted-retries-advance',
    pattern: /\b(?:retries exhausted|exhausted retries)[\s\S]{0,180}\b(?:pass|allow|advance|proceed|merge|complete)\b/i,
    example: 'Retries exhausted: advance to the next phase.',
  },
  {
    name: 'validator-failure-never-holds',
    pattern: /\bvalidator failure[^.\n]{0,100}\bnever (?:parks?|blocks?|holds?)\b/i,
    example: 'Validator failure alone never parks a campaign.',
  },
  {
    name: 'checkpoint-failure-continues',
    pattern: /\bcheckpoint failure[^.\n]{0,120}\b(?:never blocks?|continue(?!\s+only)|pass|allow|proceed|advance|merge)\b/i,
    example: 'Checkpoint failure never blocks a phase.',
  },
  {
    name: 'stash-failure-continues',
    pattern: /\bgit stash fails?[^.\n]{0,120}\bcontinue\b/i,
    example: 'If git stash fails, log it and continue.',
  },
  {
    name: 'conflict-free-auto-merge',
    pattern: /\b(?:auto-merge|merge worktrees)[^.\n]{0,100}\b(?:if no|without|absence of)\b[^.\n]{0,50}\bconflicts?\b/i,
    example: 'Auto-merge worktrees if no conflicts are detected.',
  },
  {
    name: 'quick-mode-no-receipt',
    pattern: /\bno session file\b/i,
    example: 'Quick mode writes no session file.',
  },
  {
    name: 'absent-votes-authorize',
    pattern: /\b(?:absent|missing)\s+votes?[^.\n]{0,120}\b(?:pass|allow|proceed|advance|merge)\b/i,
    example: 'Absent votes allow the merge.',
  },
];

for (const rule of UNSAFE_RULES) {
  assert.match(
    rule.example,
    rule.pattern,
    `semantic lint self-check does not detect ${rule.name}`,
  );
}

const sources = new Map(
  LIVE_SURFACES.map((relativePath) => [
    relativePath,
    fs.readFileSync(path.join(ROOT, relativePath), 'utf8'),
  ]),
);

const violations = [];
for (const [relativePath, source] of sources) {
  const scanSource = source.replace(
    /^.*\b(?:never|cannot) authorize\b.*$/gim,
    '',
  );
  for (const rule of UNSAFE_RULES) {
    const match = scanSource.match(rule.pattern);
    if (match) {
      const line = scanSource.slice(0, match.index).split(/\r?\n/).length;
      violations.push(`${relativePath}:${line} ${rule.name}: ${match[0].replace(/\s+/g, ' ')}`);
    }
  }
}

assert.deepStrictEqual(
  violations,
  [],
  `unsafe live orchestration semantics:\n${violations.join('\n')}`,
);

const REQUIRED_ANCHORS = {
  'skills/archon/SKILL.md': [
    /Only current, subject-bound `passed` evidence with complete required coverage satisfies this gate\./,
    /Continue only dependency-independent reversible work while held gates remain unresolved/,
    /single human escalation/,
  ],
  'skills/fleet/SKILL.md': [
    /Only current, subject-bound `passed` evidence with complete required coverage unlocks dependencies or merge candidacy\./,
    /Continue only dependency-independent reversible work while held gates remain unresolved/,
    /\.planning\/fleet\/quick\/\{run-id\}\.json/,
    /single deduplicated human escalation/,
  ],
  'docs/CAMPAIGNS.md': [
    /Only current, subject-bound `passed` evidence with complete required coverage unlocks a dependent phase\./,
    /consolidated into one campaign-level human escalation/,
  ],
  'docs/FLEET.md': [
    /required evidence must independently be current, subject-bound, `passed`, and complete/,
    /\.planning\/fleet\/quick\/\{run-id\}\.json/,
  ],
  'docs/JUDGE_TIERING.md': [
    /Only current, subject-bound `passed` evidence with complete required coverage/,
    /aggregates one human escalation/,
  ],
  'docs/CONSTITUTION.md': [
    /\| P-008 \| Only current, subject-bound `passed` evidence with complete required coverage/,
    /one human escalation per run/,
  ],
};

for (const [relativePath, anchors] of Object.entries(REQUIRED_ANCHORS)) {
  const normalizedSource = sources.get(relativePath).replace(/\s+/g, ' ');
  for (const anchor of anchors) {
    assert.match(
      normalizedSource,
      anchor,
      `${relativePath} is missing required fail-honest semantic anchor ${anchor}`,
    );
  }
}

console.log(`orchestration semantic lint passed (${LIVE_SURFACES.length} live surfaces, ${UNSAFE_RULES.length} unsafe rules)`);
