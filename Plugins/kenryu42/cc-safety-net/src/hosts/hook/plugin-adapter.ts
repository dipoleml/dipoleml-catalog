import {
  type CwdDenial,
  createCwdDenial,
  createFailedClosedDenial,
  createMalformedToolCallDenial,
  formatIntegrationError,
  type IntegrationDenial,
  projectGuardDenial,
} from '@/core/denial';
import { createProcessEnvironment, type PathResolver } from '@/core/environment';
import { ENV_FLAGS, envTruthy, shouldRecordAllowedCommands } from '@/core/policy/env';
import type { PolicySnapshotOptions } from '@/core/policy/snapshot';
import type { ToolInvocation } from '@/gate/invocation';
import { type GuardDependencies, GuardEvaluationError } from '@/gate/pipeline';
import { writeIntegrationDenialAudit } from '@/hosts/audit';
import { evaluateRuntimeGuard } from '@/hosts/runtime';

export type MalformedToolCall = {
  malformed: true;
  denial: IntegrationDenial;
  cwd: string | null;
};

export type PluginHandlerOptions = {
  guardDependencies?: Partial<GuardDependencies>;
  policyOptions?: Omit<PolicySnapshotOptions, 'cwd'>;
};

export type PluginToolCallHost<Event, Context, Result> = {
  agent: string;
  debugLabel: string;
  extract: (
    event: Event,
    ctx: Context,
    paths: PathResolver,
  ) => MalformedToolCall | ToolInvocation | undefined;
  getSessionId: (event: Event, ctx: Context) => string | undefined;
  allow: Result;
  block: (denial: IntegrationDenial) => Result;
  includeEvidenceOnError: (toolCall: ToolInvocation) => boolean;
  cancelled?: (ctx: Context) => boolean;
};

export function malformedToolCall(
  cwd: string | null,
  denial: Pick<IntegrationDenial, 'command' | 'toolName'> = {},
): MalformedToolCall {
  return { malformed: true, denial: createMalformedToolCallDenial(denial), cwd };
}

export function failedClosedToolCall(
  cwd: string | null,
  denial: Pick<IntegrationDenial, 'command' | 'toolName'> = {},
): MalformedToolCall {
  return { malformed: true, denial: createFailedClosedDenial(denial), cwd };
}

export function refusedCwdToolCall(
  cause: CwdDenial,
  denial: Pick<IntegrationDenial, 'command' | 'toolName'>,
): MalformedToolCall {
  return { malformed: true, denial: createCwdDenial(cause, denial), cwd: cause.cwd };
}

export function createPluginToolCallHandler<Event, Context, Result>(
  host: PluginToolCallHost<Event, Context, Result>,
  options: PluginHandlerOptions = {},
): (event: Event, ctx: Context) => Result {
  return (event, ctx) => {
    try {
      return handlePluginToolCall(event, ctx, host, options);
    } catch (error) {
      console.error('CC Safety Net error:', error);
      return host.block(createFailedClosedDenial());
    }
  };
}

function handlePluginToolCall<Event, Context, Result>(
  event: Event,
  ctx: Context,
  host: PluginToolCallHost<Event, Context, Result>,
  options: PluginHandlerOptions,
): Result {
  const environment = createProcessEnvironment();
  if (host.cancelled?.(ctx)) return host.block(createFailedClosedDenial());

  const toolCall = host.extract(event, ctx, environment.paths);
  if (!toolCall) return host.allow;

  const getSessionId = () => host.getSessionId(event, ctx);
  if ('malformed' in toolCall) {
    writeIntegrationDenialAudit(environment, toolCall.denial, getSessionId, {
      agent: host.agent,
      toolName: toolCall.denial.toolName,
      cwd: toolCall.cwd,
    });
    return host.block(toolCall.denial);
  }

  const project = (
    evaluation: Parameters<typeof projectGuardDenial>[0],
    includeEvidence: boolean,
  ) => {
    const denial = projectGuardDenial(evaluation, { includeEvidence });
    return denial ? host.block(denial) : host.allow;
  };

  try {
    const evaluation = evaluateRuntimeGuard(environment, toolCall, {
      guard: {
        auditAllowed: shouldRecordAllowedCommands(environment.env),
        policyOptions: options.policyOptions,
        dependencies: options.guardDependencies,
      },
      audit: { agent: host.agent, getSessionId },
    });
    return project(evaluation, true);
  } catch (error) {
    if (!(error instanceof GuardEvaluationError)) throw error;
    if (envTruthy(ENV_FLAGS.debug, environment.env)) {
      console.error(
        `CC Safety Net debug: ${host.debugLabel} analysis failed: ${formatIntegrationError(error.cause)}`,
      );
    }
    return project(error.evaluation, host.includeEvidenceOnError(toolCall));
  }
}
