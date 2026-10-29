import { filterDestructiveCommandMatch } from '@/core/policy/effective-rules';
import { destructiveCommandMatch } from '@/core/rules/destructive';
import type { DestructiveCommandRuleMatch } from '@/core/rules/types';
import type { CommandWord } from '@/core/shell/model';
import { REASON_GIT_METADATA_PROTECTION } from '@/gate/guards/git-metadata-protection';
import { analysisWordText } from './command-words';
import {
  classifyRecursiveDeleteTarget,
  createRecursiveDeleteTargetContext,
  deleteTargetWordFacts,
  hasOnlyScopedDeleteTargets,
  type ScopedDeleteTargetOptions,
} from './recursive-delete-targets';

const REASON_RSYNC_DELETE =
  'rsync --delete permanently removes destination files missing from the source. Mirror only into explicit paths inside the current directory or under /tmp, /var/tmp, or $TMPDIR.';
const REASON_RSYNC_DELETE_ROOT_HOME =
  'rsync --delete targeting root or home directory is extremely dangerous and always blocked.';
const VALUE_SHORT_OPTION = /[efBMT@]/;
const VALUE_LONG_OPTIONS = new Set([
  'address',
  'backup-dir',
  'block-size',
  'bwlimit',
  'cc',
  'checksum-choice',
  'checksum-seed',
  'chmod',
  'chown',
  'compare-dest',
  'compress-choice',
  'compress-level',
  'contimeout',
  'copy-as',
  'copy-dest',
  'debug',
  'early-input',
  'exclude',
  'exclude-from',
  'files-from',
  'filter',
  'groupmap',
  'iconv',
  'include',
  'include-from',
  'info',
  'link-dest',
  'log-file',
  'log-file-format',
  'log-format',
  'max-alloc',
  'max-delete',
  'max-size',
  'min-size',
  'modify-window',
  'only-write-batch',
  'out-format',
  'outbuf',
  'partial-dir',
  'password-file',
  'port',
  'protocol',
  'read-batch',
  'remote-option',
  'rsh',
  'rsync-path',
  'skip-compress',
  'sockopts',
  'stderr',
  'stop-after',
  'stop-at',
  'suffix',
  'temp-dir',
  'timeout',
  'usermap',
  'write-batch',
  'zc',
  'zl',
]);

export function analyzeRsyncMatch(
  words: readonly CommandWord[],
  context: ScopedDeleteTargetOptions,
): DestructiveCommandRuleMatch | null {
  const operands: CommandWord[] = [];
  let deletes = false;
  let pastDoubleDash = false;
  let index = 1;
  while (index < words.length) {
    const word = words[index];
    const text = word ? analysisWordText(word) : '';
    index++;
    if (!word) continue;
    if (pastDoubleDash || text === '-' || !text.startsWith('-')) {
      operands.push(word);
      continue;
    }
    if (text === '--') {
      pastDoubleDash = true;
      continue;
    }
    if (text.startsWith('--')) {
      deletes ||= text === '--del' || text.startsWith('--dele');
      if (!text.includes('=') && VALUE_LONG_OPTIONS.has(text.slice(2))) index++;
      continue;
    }
    if (text.slice(1).search(VALUE_SHORT_OPTION) === text.length - 2) index++;
  }

  const destinations = operands
    .slice(1)
    .filter((operand) => !isRemoteOperand(analysisWordText(operand)));
  if (!deletes || destinations.length === 0) return null;

  const ctx = createRecursiveDeleteTargetContext({
    ...context,
    allowPaths: context.policy?.destructiveCommandAllowPaths,
    posixShell: true,
  });
  const kinds = destinations.flatMap((destination) => {
    const facts = deleteTargetWordFacts(destination);
    return (facts.expandedTargets ?? [analysisWordText(destination)]).map(
      (target) =>
        classifyRecursiveDeleteTarget(target, ctx, {
          targetIsLiteral: facts.expandedTargets !== undefined || facts.targetIsLiteral,
          tmpdirWordSplittingProtected: facts.tmpdirWordSplittingProtected,
        }).kind,
    );
  });
  if (kinds.includes('root_or_home_target')) {
    return destructiveCommandMatch(
      'rm.recursive-force-root-or-home',
      REASON_RSYNC_DELETE_ROOT_HOME,
    );
  }
  if (kinds.includes('git_metadata_target')) {
    return destructiveCommandMatch('rm.git-metadata', REASON_GIT_METADATA_PROTECTION);
  }
  if (hasOnlyScopedDeleteTargets(destinations, context)) return null;
  return filterDestructiveCommandMatch(
    destructiveCommandMatch('rsync.delete', REASON_RSYNC_DELETE),
    context.policy,
  );
}

function isRemoteOperand(text: string): boolean {
  return !/[$`]/.test(text) && /^[^/]*:/.test(text);
}
