'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'docs', 'index.html'), 'utf8');
const siteCss = fs.readFileSync(path.join(root, 'docs', 'site-system.css'), 'utf8');
const siteJs = fs.readFileSync(path.join(root, 'docs', 'site-system.js'), 'utf8');
const operation = fs.readFileSync(path.join(root, 'docs', 'operation-control.html'), 'utf8');
const optimizer = fs.readFileSync(path.join(root, 'docs', 'optimizer.html'), 'utf8');
const research = fs.readFileSync(path.join(root, 'docs', 'research.html'), 'utf8');
const evidence = fs.readFileSync(path.join(root, 'docs', 'evidence.html'), 'utf8');
const walkthrough = fs.readFileSync(path.join(root, 'docs', 'walkthrough.html'), 'utf8');
const contract = fs.readFileSync(path.join(root, 'docs', 'interactive-story-contract.md'), 'utf8');

function localLinksResolve(file, source) {
  const docsRoot = path.join(root, 'docs');
  const hrefs = [...source.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  return hrefs.every((href) => {
    if (/^(?:https?:|data:|mailto:)/.test(href) || href === '#') return true;
    const target = href.split('#')[0].split('?')[0];
    if (!target) return true;
    const resolved = path.resolve(path.dirname(path.join(docsRoot, file)), target);
    return resolved.startsWith(docsRoot) && fs.existsSync(resolved);
  });
}

const checks = [
  ['story section exists', html.includes('id="product-story"')],
  ['Operation Fork section exists', html.includes('id="operation-fork"') && html.includes('One objective. Two runtimes. One proof standard.')],
  ['Operation Fork demonstrates verified and missing evidence', html.includes('data-fork-mode="verified"') && html.includes('data-fork-mode="missing"') && html.includes('Insufficient evidence')],
  ['Operation Fork refuses manufactured winners', html.includes('Speed and cost do not manufacture a winner') && html.includes('refuses to recommend or select a winner')],
  ['Operation Fork mobile comparison stacks', html.includes('.operation-fork-runtimes { grid-template-columns: 1fr; }')],
  ['hero shows the first-success path', html.includes('Citadel first-success path') && html.includes('/do next')],
  ['screen transition names its value', html.includes('See the work survive a session')],
  ['document uses native scrolling', siteCss.includes('body.site-home') && siteCss.includes('overflow-y: auto') && !html.includes('// Wheel interception')],
  ['native-scroll landing does not autofocus below the hero', !html.includes('// Focus input on load') && !html.includes('setTimeout(() => input.focus(), 100)')],
  ['custom scrollbar and progress rail are explicit', siteCss.includes('*::-webkit-scrollbar-thumb') && siteCss.includes('scrollbar-color:') && html.includes('site-scroll-progress')],
  ['campaign scenario exists', html.includes('data-story-scenario="campaign"')],
  ['review scenario exists', html.includes('data-story-scenario="review"')],
  ['fleet scenario exists', html.includes('data-story-scenario="fleet"')],
  ['evidence challenge exists', html.includes('data-story-scenario="evidence"') && html.includes('expected source absent')],
  ['deploy replay exists', html.includes('data-story-scenario="deploy"') && html.includes('waitingEvents: 59')],
  ['proof gallery contains bounded receipts', (html.match(/class="proof-card"/g) || []).length === 6 && (html.match(/Boundary:/g) || []).length >= 6],
  ['proof gallery links resolve from docs root', html.includes('href="GOLDEN_PATH.md"') && html.includes('href="DASHBOARD_SPEC.md"') && !html.includes('href="docs/GOLDEN_PATH.md"')],
  ['runtime tabs treat Claude and Codex equally', html.includes('data-runtime="claude"') && html.includes('data-runtime="codex"') && html.includes('--runtime claude') && html.includes('--runtime codex')],
  ['first verified success is explicit', html.includes('/do review README.md') && html.includes('/do next')],
  ['keyboard arrow navigation covers tablists', html.includes("['ArrowLeft', 'ArrowRight']")],
  ['copy controls have visible feedback', html.includes("button.classList.add('is-copied')") && html.includes('.install-copy.is-copied::after { content: "Copied"')],
  ['repository inspector exists', html.includes('aria-label="Repository state inspector"')],
  ['playback controls exist', ['story-prev', 'story-play', 'story-next', 'story-reset'].every(id => html.includes(`id="${id}"`))],
  ['fresh session step exists', html.includes('fresh process restored')],
  ['unknown evidence state exists', html.includes('production-source  UNKNOWN')],
  ['fleet worktrees exist', html.includes('wt-fleet-api') && html.includes('wt-fleet-components') && html.includes('wt-fleet-utils')],
  ['reduced motion participates in playback', html.includes("prefers-reduced-motion: reduce")],
  ['mobile story layout exists', html.includes('.story-layout { grid-template-columns: 1fr; }')],
  ['mobile router choices use a readable grid', siteCss.includes('.site-home .generators { grid-template-columns: 1fr 1fr;') && siteCss.includes('overflow: visible')],
  ['progressive complexity starts with do', html.includes('One entry point, four levels') && html.includes('/do &lt;request&gt;') && html.includes('Most users stay at 1-2')],
  ['all public surfaces use the shared system', [html, operation, optimizer, research, evidence, walkthrough].every(page => page.includes('site-system.css') && page.includes('site-system.js') && page.includes('site-nav'))],
  ['operation proof leads with the prospective runtime cell', operation.includes('Current proof · prospective v2') && operation.includes('1 / 3 passed') && operation.includes('$0.704256')],
  ['optimizer preserves the bounded pass and leads with the outside-authored failure', optimizer.includes('24</strong><span>outside-authored repositories') && optimizer.includes('VALID_EXTERNAL_BASELINE_OPEN') && optimizer.includes('LEARNED_VALUE_REQUIRED') && optimizer.includes('15.7% more measured GPU energy') && optimizer.includes('38.7%') && optimizer.includes('controller / direct Claude: 3 / 2 of 16')],
  ['research page separates bounded evidence from funded generalization', research.includes('Evidence ladder') && research.includes('≥95%') && research.includes('≥30%') && research.includes('38.7%') && research.includes('outside controller / Claude: 3 / 2 of 16') && research.includes('general production result: not demonstrated')],
  ['evidence page leads with the public-holdout baseline failure and exact open boundary', evidence.includes('Outside-authored work exposed the bottleneck.') && evidence.includes('3/16') && evidence.includes('2/16') && evidence.includes('38.7%') && evidence.includes('outside-authored production tasks with a valid strong baseline') && evidence.includes('npm run grant:verify')],
  ['walkthrough publishes video, disclosure, and transcript', walkthrough.includes('citadel-sentient-walkthrough.mp4') && walkthrough.includes('Synthetic narration is disclosed') && walkthrough.includes('Accessible transcript')],
  ['all public local links resolve', [
    ['index.html', html], ['operation-control.html', operation],
    ['optimizer.html', optimizer], ['research.html', research], ['evidence.html', evidence], ['walkthrough.html', walkthrough]
  ].every(([file, source]) => localLinksResolve(file, source))],
  ['experience contract names all acceptance questions', (contract.match(/^\d+\. /gm) || []).length >= 7],
  ['public story copy contains no em dash', !html.slice(html.indexOf('<section class="story-section"'), html.indexOf('<!-- Vertical tier cascade -->')).includes('—')]
  ,['fallback documentation links are real', html.includes('href="CAMPAIGNS.md"') && html.includes('href="CLAUDE_INSTALLATION_GUIDE.md"')]
  ,['public skill count is current', html.includes('Skills  -  49 built in') && !html.includes('Skills  -  45 installed')]
  ,['public proof and install copy contains no em dash', !html.slice(html.indexOf('<section class="proof-section"'), html.indexOf('<!-- Final CTA')).includes('—')]
  ,['homepage payload remains under declared 250KB source budget', Buffer.byteLength(html + siteCss + siteJs, 'utf8') < 250 * 1024]
  ,['animated stats preserve the published values', html.includes('const targets = [49, 4, 29, 2]') && !html.includes('const targets = [33, 4, 14, 0]')]
];

for (const [name, pass] of checks) {
  assert.equal(pass, true, name);
  console.log(`PASS ${name}`);
}

console.log(`Citadel site story contract passed: ${checks.length}/${checks.length}`);
