/**
 * Git Log Digger - Git Service
 * Native Git integration via child_process.execFile (command injection-safe).
 */

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { CommitMetadata, DiffLine, PickaxeSearchResult } from '../contracts/git.types';
import { GitCacheService, gitCacheService } from './cache.service';

/**
 * Custom error class for Git command execution failures.
 */
export class GitError extends Error {
  public readonly command: string;
  public readonly exitCode: number | null;
  public readonly stderr: string;
  public readonly stdout: string;

  constructor(message: string, command: string, exitCode: number | null, stderr: string, stdout: string) {
    super(message);
    this.name = 'GitError';
    this.command = command;
    this.exitCode = exitCode;
    this.stderr = stderr;
    this.stdout = stdout;
  }
}

export interface GitServiceOptions {
  /** Custom cache service instance. Defaults to global gitCacheService. */
  cacheService?: GitCacheService;
  /** Maximum execution timeout in milliseconds. Defaults to 30000ms. */
  timeout?: number;
  /** Maximum buffer size in bytes for git output. Defaults to 20MB. */
  maxBuffer?: number;
}

export class GitService {
  private readonly _cacheService: GitCacheService;
  private readonly _timeout: number;
  private readonly _maxBuffer: number;

  constructor(options?: GitServiceOptions) {
    this._cacheService = options?.cacheService ?? gitCacheService;
    this._timeout = options?.timeout ?? 30000;
    this._maxBuffer = options?.maxBuffer ?? 20 * 1024 * 1024; // 20 MB
  }

  /**
   * Access to cache service.
   */
  public get cacheService(): GitCacheService {
    return this._cacheService;
  }

  /**
   * Executes a git command safely using child_process.execFile to prevent shell injection.
   */
  private _execGit(
    args: string[],
    options: { cwd?: string; maxBuffer?: number; timeout?: number } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const execOptions: childProcess.ExecFileOptions = {
        cwd: options.cwd,
        timeout: options.timeout ?? this._timeout,
        maxBuffer: options.maxBuffer ?? this._maxBuffer,
        env: {
          ...process.env,
          // Force English output and UTF-8 encoding for reliable parsing
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
          GIT_TERMINAL_PROMPT: '0',
        },
      };

      childProcess.execFile('git', args, execOptions, (error, stdout, stderr) => {
        const stdoutStr = typeof stdout === 'string' ? stdout : stdout?.toString('utf8') ?? '';
        const stderrStr = typeof stderr === 'string' ? stderr : stderr?.toString('utf8') ?? '';

        if (error) {
          const cmdStr = `git ${args.join(' ')}`;
          reject(
            new GitError(
              `Git command failed: ${cmdStr}\n${stderrStr || error.message}`,
              cmdStr,
              typeof error.code === 'number' ? error.code : null,
              stderrStr,
              stdoutStr
            )
          );
          return;
        }

        resolve({ stdout: stdoutStr, stderr: stderrStr });
      });
    });
  }

  /**
   * Normalizes a file path relative to git repository root using forward slashes.
   */
  private _normalizeGitPath(rawPath: string): string {
    return rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
  }

  /**
   * Resolves the root directory of the git repository containing the target file/directory.
   * @param filePath Absolute path to a file or directory.
   * @returns Absolute path to the repository root.
   */
  public async getRepoRoot(filePath: string): Promise<string> {
    let workingDir = filePath;
    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (!stat.isDirectory()) {
          workingDir = path.dirname(filePath);
        }
      } else {
        workingDir = path.dirname(filePath);
      }
    } catch {
      workingDir = path.dirname(filePath);
    }

    try {
      const { stdout } = await this._execGit(['rev-parse', '--show-toplevel'], { cwd: workingDir });
      const repoRoot = stdout.trim();
      if (!repoRoot) {
        throw new Error(`Invalid repository root received for: ${filePath}`);
      }
      return path.resolve(repoRoot);
    } catch (err) {
      if (err instanceof GitError) {
        throw new GitError(
          `Directory is not inside a git repository: ${workingDir}`,
          err.command,
          err.exitCode,
          err.stderr,
          err.stdout
        );
      }
      throw err;
    }
  }

  /**
   * Retrieves full commit history and line statistics for a given file.
   * Follows file renames across history using `--follow`.
   * @param filePath Absolute path to the file.
   * @returns List of parsed commit metadata in reverse chronological order.
   */
  public async getFileCommits(filePath: string): Promise<CommitMetadata[]> {
    const repoRoot = await this.getRepoRoot(filePath);
    const relPath = path.isAbsolute(filePath) ? path.relative(repoRoot, filePath) : filePath;
    const gitPath = this._normalizeGitPath(relPath);

    const args = [
      'log',
      '--follow',
      '--format=%H|%h|%an|%ae|%ad|%ar|%s',
      '--numstat',
      '--date=iso',
      '--',
      gitPath,
    ];

    const { stdout } = await this._execGit(args, { cwd: repoRoot });
    return this._parseFileCommits(stdout);
  }

  /**
   * Parses git log --numstat output into CommitMetadata array.
   */
  private _parseFileCommits(rawOutput: string): CommitMetadata[] {
    const lines = rawOutput.split(/\r?\n/);
    const commits: CommitMetadata[] = [];
    let currentCommit: CommitMetadata | null = null;

    // Pattern for commit header: %H|%h|%an|%ae|%ad|%ar|%s
    const commitHeaderRegex = /^([0-9a-fA-F]{40})\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|(.*)$/;
    // Pattern for numstat line: insertions \t deletions \t filename
    const numstatRegex = /^(\d+|-)\t(\d+|-)\t(.*)$/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const headerMatch = trimmed.match(commitHeaderRegex);
      if (headerMatch) {
        if (currentCommit) {
          commits.push(currentCommit);
        }

        currentCommit = {
          hash: headerMatch[1],
          shortHash: headerMatch[2],
          authorName: headerMatch[3],
          authorEmail: headerMatch[4],
          date: headerMatch[5],
          relativeDate: headerMatch[6],
          subject: headerMatch[7],
          body: '',
          insertions: 0,
          deletions: 0,
          filesChanged: 0,
        };
        continue;
      }

      const numstatMatch = trimmed.match(numstatRegex);
      if (numstatMatch && currentCommit) {
        const insStr = numstatMatch[1];
        const delStr = numstatMatch[2];
        const ins = insStr === '-' ? 0 : parseInt(insStr, 10);
        const del = delStr === '-' ? 0 : parseInt(delStr, 10);

        currentCommit.insertions += isNaN(ins) ? 0 : ins;
        currentCommit.deletions += isNaN(del) ? 0 : del;
        currentCommit.filesChanged += 1;
      }
    }

    if (currentCommit) {
      commits.push(currentCommit);
    }

    // Default filesChanged to 1 for single-file tracking if numstat wasn't emitted (e.g. binary or rename)
    for (const commit of commits) {
      if (commit.filesChanged === 0) {
        commit.filesChanged = 1;
      }
    }

    return commits;
  }

  /**
   * Retrieves the full content of a file at a specific commit hash.
   * Leverages LRU Cache to avoid redundant git operations.
   * @param repoRoot Absolute path to repository root.
   * @param commitHash SHA-1 commit hash.
   * @param relativePath Relative file path within repository.
   */
  public async getFileContentAtCommit(
    repoRoot: string,
    commitHash: string,
    relativePath: string
  ): Promise<string> {
    const gitPath = this._normalizeGitPath(relativePath);

    const cached = this._cacheService.getContent(commitHash, gitPath);
    if (cached !== undefined) {
      return cached;
    }

    const args = ['show', `${commitHash}:${gitPath}`];
    try {
      const { stdout } = await this._execGit(args, { cwd: repoRoot });
      this._cacheService.setContent(commitHash, gitPath, stdout);
      return stdout;
    } catch (err) {
      if (err instanceof GitError) {
        // If file didn't exist at this commit (e.g. added later or deleted), handle gracefully
        if (err.stderr.includes('does not exist in') || err.stderr.includes('exists on disk, but not in')) {
          return '';
        }
      }
      throw err;
    }
  }

  /**
   * Retrieves and parses unified diff lines for a specific commit and file.
   * Compares commitHash against commitHash~1, with automatic fallback for root commits.
   * Leverages LRU Cache to maximize performance.
   * @param repoRoot Absolute path to repository root.
   * @param commitHash SHA-1 commit hash.
   * @param relativePath Relative file path within repository.
   */
  public async getCommitDiff(
    repoRoot: string,
    commitHash: string,
    relativePath: string
  ): Promise<DiffLine[]> {
    const gitPath = this._normalizeGitPath(relativePath);

    const cached = this._cacheService.getDiff(commitHash, gitPath);
    if (cached !== undefined) {
      return cached;
    }

    let rawDiff = '';
    try {
      // Standard diff against parent commit
      const res = await this._execGit(['diff', `${commitHash}~1`, commitHash, '--', gitPath], {
        cwd: repoRoot,
      });
      rawDiff = res.stdout;
    } catch {
      // If commitHash~1 does not exist (initial/root commit), diff against Git's empty tree
      // 4b825dc642cb6eb9a060e54bf8d69288fbee4904 is the universal SHA for an empty tree
      const emptyTreeHash = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
      const fallbackRes = await this._execGit(['diff', emptyTreeHash, commitHash, '--', gitPath], {
        cwd: repoRoot,
      });
      rawDiff = fallbackRes.stdout;
    }

    const diffLines = this.parseUnifiedDiff(rawDiff);
    this._cacheService.setDiff(commitHash, gitPath, diffLines);
    return diffLines;
  }

  /**
   * Parses unified diff raw text into structured DiffLine objects.
   */
  public parseUnifiedDiff(rawDiff: string): DiffLine[] {
    const lines = rawDiff.split(/\r?\n/);
    const diffLines: DiffLine[] = [];

    let oldLine = 0;
    let newLine = 0;
    let inHunk = false;

    // Hunk header format: @@ -startOld[,countOld] +startNew[,countNew] @@
    const hunkHeaderRegex = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/;

    for (const line of lines) {
      const hunkMatch = line.match(hunkHeaderRegex);
      if (hunkMatch) {
        oldLine = parseInt(hunkMatch[1], 10);
        newLine = parseInt(hunkMatch[2], 10);
        inHunk = true;
        continue;
      }

      if (!inHunk) {
        continue;
      }

      if (line.startsWith('+')) {
        diffLines.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: newLine++,
        });
      } else if (line.startsWith('-')) {
        diffLines.push({
          type: 'del',
          content: line.slice(1),
          oldLineNumber: oldLine++,
        });
      } else if (line.startsWith(' ')) {
        diffLines.push({
          type: 'normal',
          content: line.slice(1),
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
      // Note: lines starting with '\' (e.g. '\ No newline at end of file') are ignored
    }

    return diffLines;
  }

  /**
   * Performs a millisecond-level Git Pickaxe search (`git log -S "<query>"`).
   * Finds commits that changed the number of occurrences of the specified string.
   * @param repoRoot Absolute path to repository root.
   * @param filePath Absolute or relative path to target file.
   * @param query Search query string.
   */
  public async searchPickaxe(
    repoRoot: string,
    filePath: string,
    query: string
  ): Promise<PickaxeSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const relPath = path.isAbsolute(filePath) ? path.relative(repoRoot, filePath) : filePath;
    const gitPath = this._normalizeGitPath(relPath);

    const args = [
      'log',
      `-S${query}`,
      '--follow',
      '--format=%H|%h|%an|%ar|%s',
      '-p',
      '--',
      gitPath,
    ];

    const { stdout } = await this._execGit(args, { cwd: repoRoot });
    return this._parsePickaxeResults(stdout, query);
  }

  /**
   * Parses pickaxe output (`git log -S -p`) into PickaxeSearchResult array.
   */
  private _parsePickaxeResults(rawOutput: string, query: string): PickaxeSearchResult[] {
    const lines = rawOutput.split(/\r?\n/);
    const results: PickaxeSearchResult[] = [];

    // Header format: %H|%h|%an|%ar|%s
    const headerRegex = /^([0-9a-fA-F]{40})\|([^|]*)\|([^|]*)\|([^|]*)\|(.*)$/;
    const queryLower = query.toLowerCase();

    let currentItem: PickaxeSearchResult | null = null;
    let currentSnippets: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(headerRegex);
      if (headerMatch) {
        if (currentItem) {
          currentItem.matchedSnippets = currentSnippets;
          results.push(currentItem);
        }

        currentSnippets = [];
        currentItem = {
          commitHash: headerMatch[1],
          shortHash: headerMatch[2],
          authorName: headerMatch[3],
          relativeDate: headerMatch[4],
          subject: headerMatch[5],
          matchedSnippets: [],
        };
        continue;
      }

      // Collect matching diff lines containing the query
      if (currentItem) {
        if (
          (line.startsWith('+') || line.startsWith('-')) &&
          line.toLowerCase().includes(queryLower)
        ) {
          // Avoid duplicate identical snippets in the same commit
          const trimmedLine = line.trim();
          if (!currentSnippets.includes(trimmedLine)) {
            currentSnippets.push(trimmedLine);
          }
        }
      }
    }

    if (currentItem) {
      currentItem.matchedSnippets = currentSnippets;
      results.push(currentItem);
    }

    return results;
  }
}

/** Default global git service singleton */
export const gitService = new GitService();
