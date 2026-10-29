#!/usr/bin/env bun

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseSync } from 'oxc-parser';

const STRIP_INTERNAL_TAG = /^\/\*\* @internal \*\/$/;
const LINT_SUPPRESSION_WITH_REASON =
  /^\/\/ oxlint-disable-next-line [\w@/-]+(?:, *[\w@/-]+)* -- \S/;
const EXPECTED_TYPE_ERROR_WITH_REASON = /^\/\/ @ts-expect-error \S/;
const COMMENTS_ALLOWED_WITHOUT_ENTRY = [
  STRIP_INTERNAL_TAG,
  LINT_SUPPRESSION_WITH_REASON,
  EXPECTED_TYPE_ERROR_WITH_REASON,
];

const SOURCE_FILE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const ALLOWLIST_PATH = 'scripts/comment-allowlist.json';

const SAY_IT_IN_CODE = `Make the code say it with a clearer name, a named value or a type, and delete the comment. Only the maintainer adds entries to ${ALLOWLIST_PATH}, for facts about external tools the code cannot express. Fix each one by following .agents/skills/ccsn-no-comments/SKILL.md.`;
const FIX_STALE_ENTRIES = `A stale entry's comment is gone, edited, moved to another file or hidden by a syntax error. Fix each one by following .agents/skills/ccsn-no-comments/SKILL.md.`;

export function checkComments(
  files: readonly { path: string; text: string }[],
  allowlist: Readonly<Record<string, readonly string[]>>,
) {
  const parsedFiles = files.map((file) => ({ ...file, parsed: parseSync(file.path, file.text) }));
  const commentsByPath = new Map(
    parsedFiles.map((file) => [
      file.path,
      file.parsed.comments.map((comment) => ({
        path: file.path,
        line: file.text.slice(0, comment.start).split('\n').length,
        column: comment.start - file.text.lastIndexOf('\n', comment.start - 1),
        text: file.text.slice(comment.start, comment.end),
      })),
    ]),
  );
  return {
    unparsableFiles: parsedFiles.flatMap((file) =>
      file.parsed.errors.slice(0, 1).map((error) => ({ path: file.path, message: error.message })),
    ),
    disallowedComments: [...commentsByPath.values()]
      .flat()
      .filter(
        (comment) =>
          !COMMENTS_ALLOWED_WITHOUT_ENTRY.some((pattern) => pattern.test(comment.text)) &&
          !allowlist[comment.path]?.includes(comment.text),
      ),
    staleAllowlistEntries: Object.entries(allowlist).flatMap(([path, texts]) =>
      texts
        .filter((text) => !commentsByPath.get(path)?.some((comment) => comment.text === text))
        .map((text) => ({ path, text })),
    ),
  };
}

if (import.meta.main) {
  const result = checkComments(
    execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter((path) => SOURCE_FILE.test(path) && !path.startsWith('dist/') && existsSync(path))
      .sort()
      .map((path) => ({ path, text: readFileSync(path, 'utf8') })),
    JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')),
  );
  const firstLine = (text: string) => text.split('\n')[0];
  const report = [
    ...result.unparsableFiles.map((file) => `${file.path}  cannot be parsed: ${file.message}`),
    ...result.disallowedComments.map(
      (comment) => `${comment.path}:${comment.line}:${comment.column}  ${firstLine(comment.text)}`,
    ),
    ...(result.disallowedComments.length > 0 ? [SAY_IT_IN_CODE] : []),
    ...result.staleAllowlistEntries.map(
      (entry) => `${ALLOWLIST_PATH}  stale entry for ${entry.path}: ${firstLine(entry.text)}`,
    ),
    ...(result.staleAllowlistEntries.length > 0 ? [FIX_STALE_ENTRIES] : []),
  ];
  if (report.length > 0) {
    console.error(report.join('\n'));
    process.exit(1);
  }
}
