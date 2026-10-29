import { findSuspectEntries } from '@/audit/display';
import { SAFETY_LEVEL_CAPABILITIES } from '@/core/policy/safety-level';
import { repoUrl } from '../format';
import { attentionItems } from '../health';
import { formatCount, formatRelativeTime, t } from '../i18n';
import { levelName } from '../policy-summary';
import type { ActivityFeed, UpdateStatus } from '../types';
import { agentLabels, errorText, escapeHtml, on, qs, requestJson, shared } from '../ui';
import { retentionDays } from './activity';
import { integrationTargets } from './integrations';

const OVERVIEW_DAYS = 7;

let feed: ActivityFeed | null = null;
let update: UpdateStatus | null = null;

const renderStatusCard = () => {
  const loaded = shared.policy;
  if (!loaded) return;
  const targets = integrationTargets();
  const active = (targets ?? []).filter((row) => row.status === 'active');
  const policy = loaded.policy;
  const off = [
    policy.destructive_command_protection.enabled ? null : t.commandProtectionIsOff,
    policy.secret_protection.enabled ? null : t.secretProtectionIsOff,
  ].filter((text) => text !== null);
  const noAgent = loaded.errors.length === 0 && targets !== null && active.length === 0;
  const headline =
    loaded.errors.length > 0
      ? t.statusRepair
      : !targets
        ? t.statusCheckingAgents
        : noAgent
          ? t.statusNoAgent
          : off.length > 0
            ? t.statusPartlyProtected
            : t.statusProtected;
  const customized =
    (loaded.preview?.counts.effectiveCustomizations ?? 0) > 0 ||
    Object.entries(policy.safety.overrides).some(
      ([key, value]) =>
        value !==
        SAFETY_LEVEL_CAPABILITIES[policy.safety.level][
          key as keyof typeof SAFETY_LEVEL_CAPABILITIES.standard
        ],
    );
  const facts = [
    t.presetFact(levelName(policy.safety.level, t), customized),
    ...(off.length > 0
      ? off
      : [
          loaded.preview ? t.commandRulesOn(loaded.preview.counts.enabled) : null,
          t.secretProtectionIsOn,
        ]),
    active.length > 0
      ? t.hookActiveIn(
          active.length <= 3
            ? active.map((row) => row.label).join(t.listSeparator)
            : t.agentCount(active.length),
        )
      : null,
  ].filter((text) => text !== null);
  const [actionHref, actionLabel] = noAgent
    ? ['#integrations', t.installHook]
    : ['#policy', loaded.errors.length > 0 ? t.repair : t.configure];
  qs('status-card').innerHTML = `<div>
      <p class="status-headline">${escapeHtml(headline)}</p>
      <p class="status-facts">${facts.map(escapeHtml).join(' · ')}</p>
    </div>
    <a class="link-button" href="${actionHref}">${escapeHtml(actionLabel)}</a>`;
};

const renderAttention = () => {
  const items = attentionItems(
    {
      targets: integrationTargets(),
      update,
      errors: feed?.counts.errors ?? 0,
      suspects: feed ? findSuspectEntries(feed.entries).size : 0,
      days: feed?.days ?? OVERVIEW_DAYS,
    },
    t,
  );
  qs('attention').hidden = items.length === 0;
  qs('attention-list').innerHTML = items
    .map(
      (item) =>
        `<li class="list-row attention-row"><span>${escapeHtml(item.text)}</span><a class="link-button" href="${escapeHtml(item.href)}"${item.href.startsWith('#') ? '' : ' target="_blank" rel="noopener"'}>${escapeHtml(item.href.startsWith('#activity') ? t.review : item.href.startsWith('#') ? t.fix : t.releaseNotes)}</a></li>`,
    )
    .join('');
};

const sparkline = (byDay: number[], noun: string) => {
  const max = Math.max(...byDay, 1);
  return `<div class="tile-spark" role="img" aria-label="${escapeHtml(t.perDayChart(noun, byDay.map(formatCount).join(t.listSeparator)))}">${byDay
    .map(
      (count) =>
        `<span class="spark-bar${count === 0 ? ' spark-zero' : ''}" style="height:${count === 0 ? 2 : Math.max(3, Math.round((count / max) * 36))}px" title="${formatCount(count)}"></span>`,
    )
    .join('')}</div>`;
};

const ruleHref = (ruleId: string) =>
  ruleId.startsWith('custom.')
    ? `#rules?focus=${encodeURIComponent(ruleId)}`
    : `#activity?q=${encodeURIComponent(ruleId)}`;

const renderActivity = () => {
  if (!feed) return;
  const loaded = feed;
  qs('overview-tiles').innerHTML = [
    [loaded.counts.blocked, t.tileBlocked, loaded.counts.blockedByDay],
    [loaded.totalInWindow, t.tileChecked, loaded.counts.analyzedByDay],
  ]
    .map(
      ([value, label, byDay]) =>
        `<div class="tile"><div><strong>${formatCount(value as number)}</strong><span>${escapeHtml(`${label} · ${t.lastDays(loaded.days)}`)}</span></div>${sparkline(byDay as number[], label as string)}</div>`,
    )
    .join('');
  const blocks = loaded.entries.filter((entry) => entry.decision !== 'allow').slice(0, 8);
  qs('recent-blocks').innerHTML =
    blocks.length === 0
      ? `<p class="empty">${escapeHtml(t.nothingBlocked(loaded.days))}</p>`
      : `<ul class="card list">${blocks
          .map(
            (
              entry,
            ) => `<li><a class="list-row compact-row" href="${entry.ruleId ? ruleHref(entry.ruleId) : '#activity'}">
              <time datetime="${escapeHtml(entry.ts)}">${escapeHtml(formatRelativeTime(entry.ts))}</time>
              <span class="feed-agent">${escapeHtml(entry.agent && entry.agent !== 'unknown' ? (agentLabels[entry.agent] ?? entry.agent) : '')}</span>
              <code class="feed-command">${escapeHtml(entry.segment || entry.command || t.noCommandRecorded)}</code>
              <span class="feed-rule">${escapeHtml(entry.failureStage ? t.guardError : (entry.ruleId ?? ''))}</span>
            </a></li>`,
          )
          .join('')}</ul>`;
  const top = Object.entries(loaded.counts.rules)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  qs('top-rules-title').textContent = `${t.topRules} · ${t.lastDays(loaded.days)}`;
  qs('top-rules').innerHTML =
    top.length === 0
      ? `<p class="empty">${escapeHtml(t.noRuleBlocked)}</p>`
      : `<ul class="card list">${top
          .map(
            ([ruleId, count]) => `<li><a class="list-row rule-count-row" href="${ruleHref(ruleId)}">
              <code class="rule-label">${escapeHtml(ruleId)}</code>
              <span class="count">${escapeHtml(t.blockCount(count))}</span>
            </a></li>`,
          )
          .join('')}</ul>`;
};

export const loadOverview = async () => {
  const result = await requestJson(
    `/api/activity?days=${Math.min(OVERVIEW_DAYS, retentionDays())}`,
  );
  if (!result.ok || !result.data) {
    qs('recent-blocks').innerHTML =
      `<p class="empty">${escapeHtml(t.couldNotLoadActivity(errorText(result)))}</p>`;
    return;
  }
  feed = result.data as ActivityFeed;
  renderActivity();
  renderAttention();
};

export const loadHealth = async () => {
  const result = await requestJson('/api/health');
  update = result.ok ? (result.data?.update ?? null) : null;
  renderAttention();
};

type StarContext = { starCount: number | null; blockedTotal: number };
const starIcons = {
  outline:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"></path></svg>',
  filled:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"></path></svg>',
};
let starContext: StarContext = { starCount: null, blockedTotal: 0 };

const starCountHtml = (count: number | null) =>
  typeof count === 'number'
    ? `<span class="star-count">${count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k` : count}</span>`
    : '';
const renderStarPitch = (starred: boolean) => {
  const evidence =
    starContext.blockedTotal > 0 ? t.starEvidence(starContext.blockedTotal, retentionDays()) : '';
  qs('star-pitch-text').innerHTML = starred
    ? evidence
    : evidence
      ? `${evidence} ${t.starIfSaved}`
      : t.starIfUseful;
};
const renderStarLink = (href: string) => {
  qs('star-slot').innerHTML =
    `<a class="star-cta" href="${escapeHtml(href)}" target="_blank" rel="noopener" aria-label="${escapeHtml(t.starLinkLabel)}"><span class="star-icon" aria-hidden="true">${starIcons.outline}</span><span class="star-label">${escapeHtml(t.starOnGitHub)}</span>${starCountHtml(starContext.starCount)}</a>`;
  qs('star-row').hidden = false;
};
export const loadStarContext = async () => {
  const result = await requestJson('/api/star/context');
  starContext = result.ok && result.data ? result.data : { starCount: null, blockedTotal: 0 };
  renderStarPitch(false);
  qs('star-slot').innerHTML =
    `<button type="button" class="star-cta" aria-label="${escapeHtml(t.starButtonLabel)}"><span class="star-icon" aria-hidden="true">${starIcons.outline}</span><span class="star-label">${escapeHtml(t.starOnGitHub)}</span>${starCountHtml(starContext.starCount)}</button>`;
  qs('star-row').hidden = false;
};
const starRepo = async (button: HTMLButtonElement) => {
  button.disabled = true;
  const result = await requestJson('/api/star', { method: 'POST' });
  if (!(result.ok && result.data?.ok === true)) {
    renderStarLink(result.data?.fallbackUrl ?? repoUrl);
    return;
  }
  (button.querySelector('.star-icon') as HTMLElement).innerHTML = starIcons.filled;
  (button.querySelector('.star-label') as HTMLElement).textContent = t.starred;
  button.setAttribute('aria-label', t.starredLabel);
  button.classList.add('starred');
  renderStarPitch(true);
};

export const initOverview = () => {
  on('policy', renderStatusCard);
  on('integrations', () => {
    renderStatusCard();
    renderAttention();
  });
  qs('star-slot').addEventListener('click', (event) => {
    const button = (event.target as Element).closest('.star-cta');
    if (button instanceof HTMLButtonElement) void starRepo(button);
  });
};
