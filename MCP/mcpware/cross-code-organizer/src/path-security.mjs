import { posix, win32 } from "node:path";

function pathApi(platform) {
  return platform === "win32" ? win32 : posix;
}

/**
 * Normalize an absolute path using the target operating system's rules.
 * Windows path comparisons are case-insensitive.
 */
export function normalizedPath(filePath, platform = process.platform) {
  const resolved = pathApi(platform).resolve(filePath);
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

/**
 * Return true only when filePath is root itself or a real descendant of root.
 * `relative()` avoids prefix bugs (`C:\repo` vs `C:\repo-old`) and handles
 * drive roots, UNC shares, mixed separators, and Windows path casing.
 */
export function isPathWithin(filePath, root, platform = process.platform) {
  const api = pathApi(platform);
  if (!filePath || !root || !api.isAbsolute(filePath) || !api.isAbsolute(root)) return false;

  const candidate = normalizedPath(filePath, platform);
  const allowedRoot = normalizedPath(root, platform);
  const rel = api.relative(allowedRoot, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${api.sep}`) && !api.isAbsolute(rel));
}
