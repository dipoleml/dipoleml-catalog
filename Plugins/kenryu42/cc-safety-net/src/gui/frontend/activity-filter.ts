import { commandSignature } from '@/audit/display';
import { viewHash } from './format';
import type { FeedEntry } from './types';

export type Decision = 'all' | 'deny' | 'allow' | 'error' | 'suspect';
export const initialActivityFilters = () => ({
  days: 7,
  decision: 'deny' as Decision,
  agent: 'all',
  query: '',
  command: '',
});
type ActivityFilters = ReturnType<typeof initialActivityFilters>;
const decisions = new Set<string>(['all', 'deny', 'allow', 'error', 'suspect']);

export const activityFiltersFromParams = (params: URLSearchParams): ActivityFilters => {
  const defaults = initialActivityFilters();
  const days = Number(params.get('days'));
  const decision = params.get('decision') ?? '';
  return {
    days: Number.isInteger(days) && days > 0 ? days : defaults.days,
    decision: decisions.has(decision) ? (decision as Decision) : defaults.decision,
    agent: params.get('agent') ?? defaults.agent,
    query: params.get('q') ?? defaults.query,
    command: params.get('command') ?? defaults.command,
  };
};

export const activityHash = (filters: ActivityFilters) => {
  const defaults = initialActivityFilters();
  return viewHash('activity', [
    ['days', String(filters.days), String(defaults.days)],
    ['decision', filters.decision, defaults.decision],
    ['agent', filters.agent, defaults.agent],
    ['q', filters.query, defaults.query],
    ['command', filters.command, defaults.command],
  ]);
};

export const visibleEntries = <T extends FeedEntry>(
  entries: T[],
  filters: ActivityFilters,
  suspects: Set<T>,
) =>
  entries.filter((entry) => {
    const decisionMatches = {
      all: true,
      deny: entry.decision !== 'allow',
      allow: entry.decision === 'allow',
      error: Boolean(entry.failureStage),
      suspect: suspects.has(entry),
    }[filters.decision];
    if (!decisionMatches) return false;
    if (filters.agent !== 'all' && (entry.agent || 'unknown') !== filters.agent) return false;
    if (filters.command)
      return commandSignature(entry.segment || entry.command) === filters.command;
    return [entry.ruleId, entry.segment || entry.command]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(filters.query.trim().toLowerCase());
  });
