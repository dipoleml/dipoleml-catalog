import { accessSync, constants, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  type CwdDenial,
  type CwdProblem,
  createCwdDenial,
  createFailedClosedDenial,
  createMalformedToolCallDenial,
  type IntegrationDenial,
} from '@/core/denial';
import type { PathResolver } from '@/core/environment';
import { isUnsupportedWindowsNamespacePath } from '@/core/paths/canonicalization';
import {
  getCommandFromToolInput,
  getNonCommandToolInputKind,
  ToolInputLimitError,
} from '@/core/tool-input';
import type { CommandToolKind, ToolCallContext, ToolRoute } from './invocation';

type HookDenyOutput = (denial: IntegrationDenial) => void;

export function isUsableDirectory(path: string): boolean {
  try {
    if (!statSync(path).isDirectory()) return false;
    accessSync(path, constants.R_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveContainedCwd(
  requestedCwd: string,
  trustedRoots: readonly string[],
  paths: PathResolver,
): string | undefined {
  if (isUnsupportedWindowsNamespacePath(requestedCwd)) return undefined;

  const roots = trustedRoots.flatMap((root) => canonicalDirectory(root, paths));
  if (!roots[0]) return undefined;

  const requested = canonicalDirectory(
    isAbsolute(requestedCwd) ? requestedCwd : resolve(roots[0], requestedCwd),
    paths,
  )[0];
  if (!requested) return undefined;

  return roots.some((root) => isSameOrInsidePath(requested, root)) ? requested : undefined;
}

export function resolveCanonicalCwd(
  requestedCwd: string,
  baseCwd: string,
  paths: PathResolver,
): string | undefined {
  if (isUnsupportedWindowsNamespacePath(requestedCwd)) return undefined;
  return canonicalDirectory(
    isAbsolute(requestedCwd) ? requestedCwd : resolve(baseCwd, requestedCwd),
    paths,
  )[0];
}

export function firstTrustedRoot(
  trustedRoots: readonly string[],
  paths: PathResolver,
): string | undefined {
  return trustedRoots.flatMap((root) => canonicalDirectory(root, paths))[0];
}

export function cwdProblem(requestedCwd: string, baseCwd: string, paths: PathResolver): CwdProblem {
  return resolveCanonicalCwd(requestedCwd, baseCwd, paths) ? 'outside-workspace' : 'unusable';
}

function canonicalDirectory(path: string, paths: PathResolver): string[] {
  const realPath = paths.realpath(path);
  if (realPath === null) return [];
  return paths.isDirectory(realPath) ? [realPath] : [];
}

export function isSameOrInsidePath(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/** @internal */
export const HOOK_INPUT_MAX_BYTES = 8 * 1024 * 1024;

export async function readBoundedHookInput(
  input: (AsyncIterable<Buffer | Uint8Array | string> | Iterable<Buffer | Uint8Array | string>) & {
    destroy?: () => unknown;
    cancel?: () => unknown;
  },
): Promise<string> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of input) {
    const buffer =
      typeof chunk === 'string'
        ? Buffer.from(chunk, 'utf-8')
        : Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    bytes += buffer.byteLength;
    if (bytes > HOOK_INPUT_MAX_BYTES) {
      stopHookInput(input);
      throw new Error('hook input byte limit exceeded');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, bytes).toString('utf-8');
}

function stopHookInput(input: { destroy?: () => unknown; cancel?: () => unknown }): void {
  const stop = input.destroy ?? input.cancel;
  if (!stop) return;
  try {
    Promise.resolve(stop.call(input)).catch(() => {});
  } catch {}
}

export function parseHookJson<T>(
  inputText: string,
  outputDeny: HookDenyOutput,
  strictReason: string,
): T | undefined {
  try {
    return JSON.parse(inputText) as T;
  } catch {
    outputDeny({ reason: strictReason });
    return undefined;
  }
}

export function getToolRoute(
  toolName: string,
  commandTools: ReadonlyMap<string, CommandToolKind>,
): ToolRoute {
  const shell = commandTools.get(toolName);
  return shell ? { kind: 'command', shell } : { kind: getNonCommandToolInputKind(toolName) };
}

export function resolveStandardHookContext(
  cwdInput: unknown,
  toolInput: unknown,
  toolName: string,
  outputDeny: HookDenyOutput,
  paths: PathResolver,
  processCwd: string,
): ToolCallContext | null {
  const requestedCwd = cwdInput === undefined ? processCwd : cwdInput;
  if (typeof requestedCwd !== 'string' || requestedCwd.trim() === '') {
    outputFailedClosed(outputDeny, toolInput, toolName);
    return null;
  }
  const cwd = firstTrustedRoot([requestedCwd], paths);
  if (cwd) return { configCwd: cwd, executionCwd: cwd };

  outputCwdDenial(outputDeny, toolInput, toolName, {
    directory: 'session',
    problem: 'unusable',
    cwd: requestedCwd,
  });
  return null;
}

export function outputFailedClosed(
  outputDeny: HookDenyOutput,
  toolInput?: unknown,
  toolName?: string,
): void {
  outputDeny(createFailedClosedDenial({ command: readableCommand(toolInput), toolName }));
}

export function outputMalformedToolCall(
  outputDeny: HookDenyOutput,
  toolInput?: unknown,
  toolName?: string,
): void {
  outputDeny(createMalformedToolCallDenial({ command: readableCommand(toolInput), toolName }));
}

export function outputCwdDenial(
  outputDeny: HookDenyOutput,
  toolInput: unknown,
  toolName: string,
  cause: CwdDenial,
): void {
  outputDeny(createCwdDenial(cause, { command: readableCommand(toolInput), toolName }));
}

function readableCommand(toolInput: unknown): string | undefined {
  try {
    return getCommandFromToolInput(toolInput);
  } catch (error) {
    if (!(error instanceof ToolInputLimitError)) throw error;
    return undefined;
  }
}
