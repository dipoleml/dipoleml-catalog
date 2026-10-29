export const rulePromptText = (prompt: {
  rulesData: { rulebooks: readonly { name: string }[] } | null;
  rulesScope: string;
  projectPath: string;
  request: string;
}) => {
  const names = prompt.rulesData?.rulebooks.map((rulebook) => rulebook.name) ?? [];
  return [
    'Use the cc-safety-net skill for this request.',
    'If that skill is not available, run `npx -y cc-safety-net rule doc` first and treat its output as the source of truth for schema, paths, and validation.',
    '',
    prompt.rulesScope === 'project'
      ? `Scope: this project - ${prompt.projectPath.trim()}`
      : 'Scope: all projects (user scope)',
    `Existing rulebooks (names must stay unique across both scopes): ${names.length > 0 ? names.join(', ') : 'none'}`,
    '',
    prompt.request.trim(),
  ].join('\n');
};
