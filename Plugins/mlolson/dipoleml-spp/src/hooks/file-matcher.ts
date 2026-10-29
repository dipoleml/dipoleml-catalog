import * as path from "node:path";
import { getSppDir } from "../config/loader.js";

/**
 * Normalize a file path to be relative to the project root
 * Handles both absolute and relative paths
 */
export function normalizeFilePath(filePath: string, projectPath: string): string {
  // If already relative, return as-is
  if (!path.isAbsolute(filePath)) {
    return filePath;
  }

  // Make absolute path relative to project
  const relativePath = path.relative(projectPath, filePath);

  // If the path goes outside the project (starts with ..), return original
  if (relativePath.startsWith("..")) {
    return filePath;
  }

  return relativePath;
}

/**
 * Convert a simple glob pattern to a regex
 * Supports: * (any chars except /), ** (any chars including /), ? (single char)
 */
function globToRegex(pattern: string): RegExp {
  let regex = pattern
    // Escape special regex chars except * and ?
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // **/ at the start or after / should match zero or more directories
    .replace(/\*\*\//g, "<<<GLOBSTAR_SLASH>>>")
    // Remaining ** matches anything
    .replace(/\*\*/g, "<<<GLOBSTAR>>>")
    // * matches anything except path separators
    .replace(/\*/g, "[^/]*")
    // ? matches single character
    .replace(/\?/g, ".")
    // **/ should match zero or more directories (including empty)
    .replace(/<<<GLOBSTAR_SLASH>>>/g, "(?:.*\\/)?")
    // ** matches anything
    .replace(/<<<GLOBSTAR>>>/g, ".*");

  // Anchor to start and end
  return new RegExp(`^${regex}$`);
}

/**
 * Check if a file path matches a pattern
 * Pattern can be:
 * - Exact path: "src/test.ts"
 * - Directory prefix: "src/components/" (matches files in that dir)
 * - Glob pattern: "src/**\/*.ts", "src/*.ts"
 */
export function fileMatchesPattern(
  filePath: string,
  pattern: string,
  projectPath: string
): boolean {
  // Normalize the file path
  const normalizedFile = normalizeFilePath(filePath, projectPath);

  // Normalize the pattern (remove leading ./)
  let normalizedPattern = pattern.replace(/^\.\//, "");

  // If pattern ends with /, it's a directory prefix - match anything inside
  if (normalizedPattern.endsWith("/")) {
    return normalizedFile.startsWith(normalizedPattern);
  }

  // If pattern contains glob characters, use glob matching
  if (normalizedPattern.includes("*") || normalizedPattern.includes("?")) {
    const regex = globToRegex(normalizedPattern);
    return regex.test(normalizedFile);
  }

  // Otherwise, exact match or directory prefix match
  if (normalizedFile === normalizedPattern) {
    return true;
  }

  // Also match if pattern is a directory and file is inside it
  if (normalizedFile.startsWith(normalizedPattern + "/")) {
    return true;
  }

  return false;
}

/**
 * Check if a file matches any of the given patterns
 */
export function fileMatchesPatterns(
  filePath: string,
  patterns: string[],
  projectPath: string
): boolean {
  return patterns.some((pattern) =>
    fileMatchesPattern(filePath, pattern, projectPath)
  );
}

/**
 * Check if a file path is within the .claude-spp directory
 * Handles both local and external (fallback) SPP directories
 */
export function isSppInternalFile(filePath: string, projectPath: string): boolean {
  const sppDir = getSppDir(projectPath);
  const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
  const resolvedFilePath = path.resolve(absoluteFilePath);
  const resolvedSppDir = path.resolve(sppDir);

  return resolvedFilePath.startsWith(resolvedSppDir + path.sep) || resolvedFilePath === resolvedSppDir;
}
