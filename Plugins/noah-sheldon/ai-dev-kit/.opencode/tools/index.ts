export const runTests = async () => "npm test"
export const checkCoverage = async () => "npm run test -- --coverage"
export const securityAudit = async () => "npm audit --production"
export const formatCode = async () => "npm run lint"
export const lintCheck = async () => "npm run lint"
export const gitSummary = async () => "git status --short"
export const changedFiles = async () => "git diff --name-only"

