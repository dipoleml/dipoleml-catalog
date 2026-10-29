/**
 * Backward compatibility re-exports from VCS module
 * @deprecated Import from "../vcs/index.js" instead
 */

export {
  getLineCounts,
  getLineCountsWithWindow,
  getHeadCommitHash,
  getTotalCommitCount,
  getCommitInfo,
  clearCache,
  type LineCounts,
  type CommitInfo,
} from "../vcs/index.js";

// Also export the getNthCommitHash function for backward compatibility
import { getProvider } from "../vcs/index.js";

export function getNthCommitHash(projectPath: string, n: number): string | null {
  try {
    return getProvider(projectPath).getNthCommitHash(projectPath, n);
  } catch {
    return null;
  }
}
