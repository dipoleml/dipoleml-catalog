const reportIssueUrl =
  'https://github.com/kenryu42/cc-safety-net/issues/new?template=false_positive.yml';

const reportUrlLimit = 8000;
const titleCommandLimit = 80;

export const reportTitle = (ruleId: string | undefined, command: string) => {
  const firstLine = command.trim().split('\n')[0] ?? '';
  const shown =
    firstLine.length > titleCommandLimit ? `${firstLine.slice(0, titleCommandLimit)}…` : firstLine;
  return `[False Positive]: ${ruleId ? `${ruleId} ` : ''}blocked \`${shown}\``;
};

const endsAtPathBoundary = (following: string) => following === '' || /^[/\\\s'"]/.test(following);
export const scrubReportPaths = (text: string, cwd?: string | null, home?: string | null) =>
  [
    [cwd, '<project>'],
    [home, '~'],
  ].reduce(
    (scrubbed, [from, to]) =>
      from
        ? scrubbed
            .split(from)
            .reduce((joined, part) => joined + (endsAtPathBoundary(part) ? to : from) + part)
        : scrubbed,
    text,
  );
const buildReportUrl = (fields: Record<string, string>) => {
  const url = new URL(reportIssueUrl);
  Object.entries(fields)
    .filter(([, value]) => value)
    .forEach(([field, value]) => {
      url.searchParams.set(field, value);
    });
  return url.toString();
};

export const buildReportRequest = (
  fields: Record<string, string>,
  dropped: string[] = [],
): { url: string; dropped: string[] } => {
  const url = buildReportUrl(fields);
  if (url.length <= reportUrlLimit) return { url, dropped };
  const largest = Object.entries(fields)
    .filter(([, value]) => value)
    .sort((left, right) => right[1].length - left[1].length)[0];
  if (!largest) return { url, dropped };
  return buildReportRequest({ ...fields, [largest[0]]: '' }, [...dropped, largest[0]]);
};
