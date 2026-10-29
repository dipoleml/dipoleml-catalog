import { groupIntegrations } from '../health';
import { t } from '../i18n';
import type { IntegrationRow } from '../types';
import { emit, errorText, escapeHtml, notify, qs, requestJson, runRefresh } from '../ui';

let targets: IntegrationRow[] | null = null;
const busy = new Set<string>();

export const integrationTargets = () => targets;

const statusText = (row: IntegrationRow) =>
  ({
    active: t.hookInstalled,
    disabled: t.hookDisabled,
    'not-installed': '',
    'not-inspected': t.hookStatusUnknown,
  })[row.status];

const rowHtml = (row: IntegrationRow) => {
  const uninstall = row.status === 'active';
  const action =
    row.version === null
      ? ''
      : `<button type="button" data-integration-action="${uninstall ? 'uninstall' : 'install'}" data-integration-target="${escapeHtml(row.target)}"${busy.has(row.target) ? ' disabled' : ''}>${
          busy.has(row.target)
            ? uninstall
              ? t.uninstalling
              : t.installing
            : uninstall
              ? t.uninstall
              : row.status === 'disabled'
                ? t.enable
                : t.install
        }</button>`;
  return `<li class="setting-row agent-row">
    <span class="agent-name">${escapeHtml(row.label)}</span>
    <span class="agent-version"${row.version === null ? '' : ` title="v${escapeHtml(row.version)}"`}>${row.version === null ? t.notDetected : `v${escapeHtml(row.version)}`}</span>
    <span class="agent-status ${row.status}">${statusText(row)}</span>
    <span class="agent-action">${action}</span>
    ${row.note ? `<p class="notice ${row.note.kind}">${escapeHtml(row.note.text)}</p>` : ''}
  </li>`;
};

const groupHtml = (title: string, rows: IntegrationRow[], sub = '') =>
  rows.length === 0
    ? ''
    : `<section class="section"><div class="section-head"><div><h3 class="section-title">${title} <span class="count">${rows.length}</span></h3>${sub ? `<p class="section-sub">${sub}</p>` : ''}</div></div><ul class="card rows">${rows.map(rowHtml).join('')}</ul></section>`;

const render = () => {
  if (!targets) return;
  const groups = groupIntegrations(targets);
  qs('integrations-list').innerHTML =
    groupHtml(t.installedAgents, groups.installed) +
    groupHtml(
      t.detectedAgents,
      groups.available,
      groups.installed.length === 0 ? t.noHookYet : '',
    ) +
    (groups.missing.length === 0
      ? ''
      : `<details class="section missing-agents"><summary>${t.missingAgents} <span class="count">${groups.missing.length}</span></summary><ul class="card rows">${groups.missing.map(rowHtml).join('')}</ul></details>`);
};

export const loadIntegrations = async () => {
  const result = await requestJson('/api/integrations');
  if (!result.ok || !Array.isArray(result.data?.targets)) {
    qs('integrations-list').innerHTML =
      `<p class="empty">${escapeHtml(t.couldNotCheckAgents(errorText(result)))}</p>`;
    return;
  }
  targets = result.data.targets;
  qs('integrations-node-version').textContent = result.data.system.nodeVersion ?? t.unknownValue;
  qs('integrations-platform').textContent = result.data.system.platform;
  render();
  emit('integrations');
};

const runAction = async (button: HTMLElement) => {
  const target = button.dataset.integrationTarget;
  const action = button.dataset.integrationAction;
  if (!target || busy.has(target)) return;
  busy.add(target);
  render();
  const result = await requestJson(`/api/${action}`, {
    method: 'POST',
    body: JSON.stringify({ target }),
  });
  busy.delete(target);
  const row = targets?.find((entry) => entry.target === target);
  if (!row) return;
  const ok = result.ok && result.data.ok === true;
  if (ok) row.status = action === 'install' ? 'active' : 'not-installed';
  row.note = {
    kind: ok ? 'ok' : 'error',
    text: ok ? result.data.output : result.data?.output || errorText(result),
  };
  if (!ok) notify(action === 'install' ? t.installFailed : t.uninstallFailed, 'error');
  render();
  emit('integrations');
};

export const initIntegrations = () => {
  qs('integrations-refresh').addEventListener('click', (event) => {
    void runRefresh(event.currentTarget as HTMLButtonElement, loadIntegrations);
  });
  qs('integrations-list').addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-integration-action]');
    if (button) void runAction(button);
  });
};
