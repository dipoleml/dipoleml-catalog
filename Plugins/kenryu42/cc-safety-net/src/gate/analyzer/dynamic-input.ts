export function solveDynamicInput(
  token: string,
  start: number,
  length: number,
  target: string,
): string | null {
  const prefix = token.slice(0, start);
  const suffix = token.slice(start + length);
  return target.startsWith(prefix) && target.endsWith(suffix)
    ? target.slice(prefix.length, target.length - suffix.length)
    : null;
}

export function substitutionAddsExecutableSource<
  T extends { kind: string; tokenIndex: number; value: string },
>(
  existing: readonly T[],
  candidates: Iterable<string>,
  substituted: (candidate: string) => readonly T[],
): boolean {
  const key = (source: T) => `${source.tokenIndex}\0${source.kind}\0${source.value}`;
  const known = new Set(existing.map(key));
  return Array.from(candidates).some((candidate) =>
    substituted(candidate).some((source) => !known.has(key(source))),
  );
}
