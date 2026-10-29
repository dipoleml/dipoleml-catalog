export const formatRelativeTime = (value: string | Date): string => {
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return '';
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
};

export const commandSignature = (source: string | undefined): string | null => {
  const tokens = (source ?? '')
    .trim()
    .split(/\s+/)
    .filter((token) => token && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(token));
  const binary = tokens[0]?.split('/').pop();
  if (!binary) return null;
  const next = tokens[1];
  return next && /^[a-z][a-z0-9-]*$/.test(next) ? `${binary} ${next}` : binary;
};

export function findSuspectEntries<
  T extends {
    decision?: string;
    sessionId?: string;
    segment?: string;
    command?: string;
    failureStage?: string;
  },
>(entries: readonly T[]): Set<T> {
  const signatureKey = (entry: T) =>
    `${entry.sessionId}\n${commandSignature(entry.segment || entry.command)}`;
  const denials = entries.filter((entry) => entry.decision !== 'allow');
  const repeats = denials
    .filter((entry) => entry.sessionId)
    .reduce(
      (counts, entry) =>
        counts.set(signatureKey(entry), (counts.get(signatureKey(entry)) ?? 0) + 1),
      new Map<string, number>(),
    );
  return new Set(
    denials.filter((entry) => entry.failureStage || (repeats.get(signatureKey(entry)) ?? 0) >= 2),
  );
}
