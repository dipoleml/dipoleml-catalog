import {
  MAX_AUDIT_RETENTION_DAYS,
  MIN_AUDIT_RETENTION_DAYS,
} from '@/core/policy/audit-retention-days';
import { guiData } from '../gui-data';
import { t } from '../i18n';
import { clonePolicy } from '../project-draft';
import {
  confirmDialog,
  copyText,
  errorText,
  escapeHtml,
  icons,
  isWriteSuccess,
  notify,
  on,
  qs,
  requestJson,
  savePreference,
  shared,
} from '../ui';
import { limitActivityDays, loadActivity } from './activity';
import { loadOverview } from './overview';
import { loadPolicy, runExclusive } from './policy';

const themes = ['auto', 'light', 'dark'] as const;
type Theme = (typeof themes)[number];

const applyTheme = (theme: Theme) => {
  document.documentElement.style.colorScheme = theme === 'auto' ? 'light dark' : theme;
  document.querySelectorAll<HTMLElement>('[data-theme-choice]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
  });
};

let savedTheme: Theme = guiData.preferences.theme ?? 'auto';
const chooseTheme = async (theme: Theme) => {
  applyTheme(theme);
  if (await savePreference({ theme })) {
    savedTheme = theme;
    return;
  }
  applyTheme(savedTheme);
};

const renderRetention = () => {
  const days = shared.policy?.policy.audit.retention_days;
  if (days === undefined) return;
  qs<HTMLInputElement>('retention-days').value = String(days);
  qs('retention-unit').textContent = t.dayUnit(days);
};

const blockedBy = () =>
  (shared.policy?.errors.length ?? 0) > 0
    ? t.repairInProtectionsFirst
    : shared.drafting
      ? t.leaveProjectDraftFirst
      : shared.dirty
        ? t.saveProtectionsFirst
        : null;

const saveRetentionDays = async (days: number) => {
  const saved = shared.policy;
  if (!saved) return;
  const current = saved.policy.audit.retention_days;
  const problem =
    !Number.isInteger(days) || days < MIN_AUDIT_RETENTION_DAYS || days > MAX_AUDIT_RETENTION_DAYS
      ? t.retentionRange(MIN_AUDIT_RETENTION_DAYS, MAX_AUDIT_RETENTION_DAYS)
      : blockedBy();
  if (problem) {
    renderRetention();
    notify(t.retentionUnchanged, 'error', problem);
    return;
  }
  if (days === current) return;
  if (
    days < current &&
    !(await confirmDialog({
      title: t.shortenRetentionTitle(days),
      body: t.shortenRetentionBody(days),
      detail: qs('logs-path').textContent ?? '',
      confirmLabel: t.shortenRetention,
    }))
  ) {
    renderRetention();
    return;
  }
  await runExclusive(t.savingStatus, async () => {
    const policy = clonePolicy(saved.policy);
    policy.audit.retention_days = days;
    const result = await requestJson('/api/policy', {
      method: 'POST',
      body: JSON.stringify(policy),
    });
    if (!isWriteSuccess(result)) {
      renderRetention();
      notify(t.saveFailed, 'error', errorText(result));
      return;
    }
    if (!(await loadPolicy())) return;
    limitActivityDays(days);
    await Promise.all([loadOverview(), loadActivity()]);
    notify(t.retentionSaved(days), 'ok');
  });
};

const resetPolicy = async () => {
  const saved = shared.policy;
  if (!saved) return;
  if (shared.drafting) {
    notify(t.resetUnavailable, 'error', t.leaveProjectDraftFirst);
    return;
  }
  if (
    !(await confirmDialog({
      title: t.resetPolicyTitle,
      body: t.resetPolicyBody,
      detail: saved.path,
      confirmLabel: t.resetPolicy,
    }))
  )
    return;
  await runExclusive(t.resettingStatus, async () => {
    const result = await requestJson('/api/reset', { method: 'POST', body: '{}' });
    if (!isWriteSuccess(result)) {
      notify(t.resetFailed, 'error', errorText(result));
      return;
    }
    sessionStorage.removeItem('cc-safety-net-draft');
    if (await loadPolicy()) notify(t.policyReset, 'ok', result.data.path);
  });
};

export const initSettings = () => {
  document.querySelectorAll<HTMLElement>('[data-copy-path]').forEach((button) => {
    button.innerHTML = `${icons.copy}<span>${escapeHtml(t.copy)}</span>`;
    button.addEventListener('click', () => {
      void copyText(button, qs(button.dataset.copyPath ?? '').dataset.path ?? '');
    });
  });
  applyTheme(savedTheme);
  qs('settings-theme').addEventListener('click', (event) => {
    const theme = (event.target as Element).closest<HTMLElement>('[data-theme-choice]')?.dataset
      .themeChoice;
    if (themes.includes(theme as Theme)) void chooseTheme(theme as Theme);
  });
  qs('retention-days').addEventListener('change', (event) => {
    void saveRetentionDays(Number((event.target as HTMLInputElement).value));
  });
  qs('reset').addEventListener('click', () => {
    void resetPolicy();
  });
  on('policy', renderRetention);
};
