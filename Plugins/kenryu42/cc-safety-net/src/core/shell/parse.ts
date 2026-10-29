import {
  type CommandParserLimits,
  type CommandProgram,
  DEFAULT_COMMAND_PARSER_LIMITS,
  type ShellKind,
} from './model';
import { parsePosixCommand } from './posix';
import { parsePowerShellCommand, shouldUsePowerShellParser } from './powershell';

export { DEFAULT_COMMAND_PARSER_LIMITS };

export function parseCommand(
  source: string,
  dialect: ShellKind = 'auto',
  limits: CommandParserLimits = DEFAULT_COMMAND_PARSER_LIMITS,
): CommandProgram {
  if (
    dialect === 'powershell' ||
    (dialect === 'auto' &&
      shouldUsePowerShellParser(source.slice(0, limits.maxInputLength), limits))
  ) {
    return parsePowerShellCommand(source, limits);
  }
  return parsePosixCommand(source, limits);
}
