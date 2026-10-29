import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import {
  type VcsProvider,
  type CommitInfo,
  type LineCounts,
  type VcsHistoryCache,
  type CommitWithParent,
  VcsHistoryCacheSchema,
} from "./types.js";
import { getSppDir } from "../config/loader.js";

const CACHE_FILENAME = ".vcs_history_cache.json";

/**
 * Git VCS Provider implementation
 */
export class GitProvider implements VcsProvider {
  readonly type = "git" as const;

  isRepo(projectPath: string): boolean {
    try {
      execSync("git rev-parse --git-dir", { cwd: projectPath, stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  getHeadCommitHash(projectPath: string): string | null {
    try {
      return execSync("git rev-parse HEAD", {
        cwd: projectPath,
        encoding: "utf-8",
      }).trim();
    } catch {
      return null;
    }
  }

  getTotalCommitCount(projectPath: string): number {
    try {
      const output = execSync("git rev-list --count HEAD", {
        cwd: projectPath,
        encoding: "utf-8",
      });
      return parseInt(output.trim(), 10) || 0;
    } catch {
      return 0;
    }
  }

  getCommitInfo(projectPath: string, commitHash: string): CommitInfo | null {
    try {
      const output = execSync(`git log -1 --format="%h%x00%s%x00%cI" ${commitHash}`, {
        cwd: projectPath,
        encoding: "utf-8",
      }).trim();

      if (!output) {
        return null;
      }

      const [shortHash, title, dateStr] = output.split("\0");
      return {
        shortHash,
        title,
        date: new Date(dateStr),
      };
    } catch {
      return null;
    }
  }

  getFullCommitMessage(projectPath: string, commitHash: string): string {
    return execSync(`git log -1 --format="%B" ${commitHash}`, {
      cwd: projectPath,
      encoding: "utf-8",
    });
  }

  getNthCommitHash(projectPath: string, n: number): string | null {
    try {
      const output = execSync(`git rev-list --reverse HEAD`, {
        cwd: projectPath,
        encoding: "utf-8",
      });

      const commits = output.trim().split("\n").filter(Boolean);
      if (commits.length >= n) {
        return commits[n - 1];
      }
      return null;
    } catch {
      return null;
    }
  }

  isAncestor(projectPath: string, commit: string): boolean {
    try {
      execSync(`git merge-base --is-ancestor ${commit} HEAD`, {
        cwd: projectPath,
        stdio: "ignore",
      });
      return true;
    } catch {
      return false;
    }
  }

  getCurrentUserEmail(projectPath: string): string {
    const gitUser = execSync("git config user.email", {
      cwd: projectPath,
      encoding: "utf-8",
    }).trim();
    if (!gitUser) {
      throw new Error("git user.email is not set.");
    }
    return gitUser;
  }

  getCommitRange(
    projectPath: string,
    startCommit: string | null,
    endCommit: string,
    since?: Date
  ): CommitWithParent[] {
    try {
      const range = startCommit ? `${startCommit}..${endCommit}` : endCommit;

      const sinceArg = since ? `--since="${since.toISOString()}"` : "";
      const userEmail = this.getCurrentUserEmail(projectPath);
      const authorArg = userEmail ? `--author="${userEmail}"` : "";
      const cmd = `git log --reverse --format="%H %P" ${authorArg} ${sinceArg} ${range}`.trim();

      const output = execSync(cmd, {
        cwd: projectPath,
        encoding: "utf-8",
      });

      const commits: CommitWithParent[] = [];

      for (const line of output.split("\n")) {
        if (!line.trim()) continue;
        const parts = line.trim().split(" ");
        const hash = parts[0];
        const parent = parts[1] || null;
        commits.push({ hash, parent });
      }

      return commits;
    } catch {
      return [];
    }
  }

  getLineDiff(
    projectPath: string,
    commitHash: string,
    parentHash: string | null
  ): { added: number; removed: number } {
    let added = 0;
    let removed = 0;

    try {
      let diffCmd: string;
      if (parentHash) {
        diffCmd = `git diff --numstat ${parentHash} ${commitHash}`;
      } else {
        // First commit - diff against empty tree
        diffCmd = `git diff --numstat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 ${commitHash}`;
      }

      const numstat = execSync(diffCmd, {
        cwd: projectPath,
        encoding: "utf-8",
      });

      for (const line of numstat.split("\n")) {
        if (!line.trim()) continue;
        const parts = line.split("\t");
        if (parts.length >= 2) {
          const addedCount = parseInt(parts[0], 10);
          const removedCount = parseInt(parts[1], 10);
          if (!isNaN(addedCount)) {
            added += addedCount;
          }
          if (!isNaN(removedCount)) {
            removed += removedCount;
          }
        }
      }
    } catch {
      // Ignore errors (e.g., binary files)
    }

    return { added, removed };
  }

  private getCachePath(projectPath: string): string {
    return path.join(getSppDir(projectPath), CACHE_FILENAME);
  }

  private loadCache(projectPath: string): VcsHistoryCache | null {
    const cachePath = this.getCachePath(projectPath);

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(cachePath, "utf-8");
      const json = JSON.parse(raw);
      return VcsHistoryCacheSchema.parse(json);
    } catch {
      return null;
    }
  }

  private saveCache(projectPath: string, cache: VcsHistoryCache): void {
    const cachePath = this.getCachePath(projectPath);
    const sppDir = path.dirname(cachePath);

    if (!fs.existsSync(sppDir)) {
      fs.mkdirSync(sppDir, { recursive: true });
    }

    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n", "utf-8");
  }

  clearCache(projectPath: string): void {
    const cachePath = this.getCachePath(projectPath);
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  }

  private parseCommit(
    projectPath: string,
    commitHash: string,
    parentHash: string | null
  ): { humanLines: number; claudeLines: number; isClaudeCommit: boolean } {
    const message = this.getFullCommitMessage(projectPath, commitHash);
    const isClaude = /Co-Authored-By:.*Claude/i.test(message);

    const { added, removed } = this.getLineDiff(projectPath, commitHash, parentHash);
    const totalLines = added + removed;

    return {
      humanLines: isClaude ? 0 : totalLines,
      claudeLines: isClaude ? totalLines : 0,
      isClaudeCommit: isClaude,
    };
  }

  getLineCounts(projectPath: string): LineCounts {
    if (!this.isRepo(projectPath)) {
      throw new Error("Must be a git repo");
    }

    const head = this.getHeadCommitHash(projectPath);
    if (!head) {
      // Empty repo with no commits - return zero counts
      return {
        humanLines: 0,
        claudeLines: 0,
        humanCommits: 0,
        claudeCommits: 0,
        fromCache: false,
        commitsScanned: 0,
      };
    }

    const currentGitUser = this.getCurrentUserEmail(projectPath);

    const cache = this.loadCache(projectPath);

    if (cache && cache.lastCommit === head && cache.userEmail === currentGitUser) {
      return {
        humanLines: cache.humanLines,
        claudeLines: cache.claudeLines,
        humanCommits: cache.humanCommits,
        claudeCommits: cache.claudeCommits,
        fromCache: true,
        commitsScanned: 0,
      };
    }

    let startCommit: string | null = null;
    let humanLines = 0;
    let claudeLines = 0;
    let humanCommits = 0;
    let claudeCommits = 0;

    if (cache && cache.userEmail === currentGitUser && this.isAncestor(projectPath, cache.lastCommit)) {
      startCommit = cache.lastCommit;
      humanLines = cache.humanLines;
      claudeLines = cache.claudeLines;
      humanCommits = cache.humanCommits;
      claudeCommits = cache.claudeCommits;
    }

    const commits = this.getCommitRange(projectPath, startCommit, head);

    for (const { hash, parent } of commits) {
      const result = this.parseCommit(projectPath, hash, parent);
      humanLines += result.humanLines;
      claudeLines += result.claudeLines;
      if (result.isClaudeCommit) {
        claudeCommits++;
      } else {
        humanCommits++;
      }
    }

    this.saveCache(projectPath, {
      userEmail: currentGitUser,
      lastCommit: head,
      humanLines,
      claudeLines,
      humanCommits,
      claudeCommits,
    });

    return {
      humanLines,
      claudeLines,
      humanCommits,
      claudeCommits,
      fromCache: false,
      commitsScanned: commits.length,
    };
  }

  getLineCountsWithWindow(
    projectPath: string,
    options: { since: Date | null; afterCommit?: string | null }
  ): LineCounts {
    if (options.since === null && !options.afterCommit) {
      return this.getLineCounts(projectPath);
    }

    if (!this.isRepo(projectPath)) {
      throw new Error("Must be a git repo");
    }

    const head = this.getHeadCommitHash(projectPath);
    if (!head) {
      // Empty repo with no commits - return zero counts
      return {
        humanLines: 0,
        claudeLines: 0,
        humanCommits: 0,
        claudeCommits: 0,
        fromCache: false,
        commitsScanned: 0,
      };
    }

    const startCommit = options.afterCommit ?? null;
    const commits = this.getCommitRange(projectPath, startCommit, head, options.since ?? undefined);

    let humanLines = 0;
    let claudeLines = 0;
    let humanCommits = 0;
    let claudeCommits = 0;

    for (const { hash, parent } of commits) {
      const result = this.parseCommit(projectPath, hash, parent);
      humanLines += result.humanLines;
      claudeLines += result.claudeLines;
      if (result.isClaudeCommit) {
        claudeCommits++;
      } else {
        humanCommits++;
      }
    }

    return {
      humanLines,
      claudeLines,
      humanCommits,
      claudeCommits,
      fromCache: false,
      commitsScanned: commits.length,
    };
  }
}
