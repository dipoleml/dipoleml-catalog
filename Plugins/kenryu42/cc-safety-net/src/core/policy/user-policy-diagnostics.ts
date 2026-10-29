import { formatIssues, sortIssues } from './rules-config';
import { USER_POLICY_FIELDS, validateUserPolicy } from './store';

export function salvageUserPolicy(config: unknown, home: string) {
  const validated = validateUserPolicy(config, home);
  return {
    policy: validated.policy,
    errors: formatIssues(
      sortIssues(validated.issues, USER_POLICY_FIELDS, (issue) => issue.kind === 'custom'),
      ' ',
      ' ',
    ),
  };
}

export function getUserPolicyDiagnostics(config: unknown, home: string): string[] {
  return salvageUserPolicy(config, home).errors;
}
