import { z } from "zod";

/**
 * Supported VCS types
 */
export type VcsType = "git" | "hg";

/**
 * Commit info for display
 */
export interface CommitInfo {
  shortHash: string;
  title: string;
  date: Date;
}

/**
 * Line count result
 */
export interface LineCounts {
  humanLines: number;
  claudeLines: number;
  humanCommits: number;
  claudeCommits: number;
  fromCache: boolean;
  commitsScanned: number;
}

/**
 * Cache schema for VCS history line counts
 */
export const VcsHistoryCacheSchema = z.object({
  userEmail: z.string(),
  lastCommit: z.string(),
  humanLines: z.number().int().min(0),
  claudeLines: z.number().int().min(0),
  humanCommits: z.number().int().min(0),
  claudeCommits: z.number().int().min(0),
});

export type VcsHistoryCache = z.infer<typeof VcsHistoryCacheSchema>;

/**
 * Commit with parent info
 */
export interface CommitWithParent {
  hash: string;
  parent: string | null;
}

/**
 * VCS Provider interface - implemented by git and hg providers
 */
export interface VcsProvider {
  /** The VCS type */
  readonly type: VcsType;

  /** Check if we're in a repository of this type */
  isRepo(projectPath: string): boolean;

  /** Get the current HEAD/tip commit hash */
  getHeadCommitHash(projectPath: string): string | null;

  /** Get total number of commits in the repo */
  getTotalCommitCount(projectPath: string): number;

  /** Get info about a specific commit */
  getCommitInfo(projectPath: string, commitHash: string): CommitInfo | null;

  /** Get the full commit message */
  getFullCommitMessage(projectPath: string, commitHash: string): string;

  /** Get the hash of the Nth commit (1-indexed, chronological order) */
  getNthCommitHash(projectPath: string, n: number): string | null;

  /** Check if a commit is an ancestor of HEAD */
  isAncestor(projectPath: string, commit: string): boolean;

  /** Get current user email/identifier */
  getCurrentUserEmail(projectPath: string): string;

  /**
   * Get commit hashes from startCommit (exclusive) to endCommit (inclusive)
   * Returns array of { hash, parent } objects, oldest first
   */
  getCommitRange(
    projectPath: string,
    startCommit: string | null,
    endCommit: string,
    since?: Date
  ): CommitWithParent[];

  /**
   * Get line diff stats for a commit
   * Returns { added, removed } line counts
   */
  getLineDiff(
    projectPath: string,
    commitHash: string,
    parentHash: string | null
  ): { added: number; removed: number };

  /**
   * Calculate line counts from VCS history with caching
   */
  getLineCounts(projectPath: string): LineCounts;

  /**
   * Get line counts with optional filters
   */
  getLineCountsWithWindow(
    projectPath: string,
    options: { since: Date | null; afterCommit?: string | null }
  ): LineCounts;

  /** Clear the cache */
  clearCache(projectPath: string): void;
}
