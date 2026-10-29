import { repoUrl } from './format';
import type { Messages } from './locales/en';
import type { IntegrationRow, UpdateStatus } from './types';

export const groupIntegrations = <T extends Pick<IntegrationRow, 'status' | 'version'>>(
  rows: T[],
) => ({
  installed: rows.filter((row) => row.status === 'active'),
  available: rows.filter((row) => row.status !== 'active' && row.version !== null),
  missing: rows.filter((row) => row.status !== 'active' && row.version === null),
});

export const attentionItems = (
  facts: {
    targets: Pick<IntegrationRow, 'label' | 'status'>[] | null;
    update: UpdateStatus | null;
    errors: number;
    suspects: number;
    days: number;
  },
  t: Messages,
) =>
  [
    ...(facts.targets ?? [])
      .filter((row) => row.status === 'disabled')
      .map((row) => ({
        text: t.hookDisabledAttention(row.label),
        href: '#integrations',
      })),
    facts.suspects > 0
      ? {
          text: t.suspectAttention(facts.suspects, facts.days),
          href: '#activity?decision=suspect',
        }
      : null,
    facts.errors > 0
      ? {
          text: t.guardErrorAttention(facts.errors, facts.days),
          href: '#activity?decision=error',
        }
      : null,
    facts.update?.updateAvailable
      ? {
          text: t.updateAttention(facts.update.latestVersion ?? ''),
          href: `${repoUrl}/releases`,
        }
      : null,
  ].filter((item) => item !== null);
