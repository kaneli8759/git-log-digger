/**
 * Git Log Digger - Git Data Contracts
 * Defines core domain models for commits, diffs, and search results.
 */

/**
 * Metadata for a single git commit.
 */
export interface CommitMetadata {
  /** Full 40-character SHA-1 commit hash */
  hash: string;

  /** Abbreviated commit hash (typically 7-10 characters) */
  shortHash: string;

  /** Author's display name */
  authorName: string;

  /** Author's email address */
  authorEmail: string;

  /** ISO 8601 formatted commit date string */
  date: string;

  /** Human-readable relative date (e.g. "2 days ago", "3 months ago") */
  relativeDate: string;

  /** Commit subject line (first line of the commit message) */
  subject: string;

  /** Detailed commit message body (lines following the subject, or empty string) */
  body: string;

  /** Number of lines inserted/added in this commit for the target file */
  insertions: number;

  /** Number of lines deleted in this commit for the target file */
  deletions: number;

  /** Number of files changed in this commit (defaults to 1 for single-file queries) */
  filesChanged: number;
}

/**
 * File content and metadata at a specific commit revision.
 */
export interface FileCommitContent {
  /** Commit hash corresponding to this snapshot */
  commitHash: string;

  /** File path (relative to the repository root or absolute) */
  filePath: string;

  /** Full file content text at this commit */
  content: string;

  /** Parent commit hash, or null/undefined if this is the initial/root commit */
  previousHash?: string | null;
}

/**
 * Line classification in a unified diff.
 * - 'add': Line added in the new commit
 * - 'del': Line deleted from the old commit
 * - 'normal': Unchanged context line
 */
export type DiffLineType = 'add' | 'del' | 'normal';

/**
 * Represents a single parsed line in a unified diff view.
 */
export interface DiffLine {
  /** Diff line type */
  type: DiffLineType;

  /** Line content string (excluding the leading '+', '-', or ' ' diff marker) */
  content: string;

  /** 1-based line number in the original (old) revision. Undefined for added lines. */
  oldLineNumber?: number;

  /** 1-based line number in the new revision. Undefined for deleted lines. */
  newLineNumber?: number;
}

/**
 * Search result item from a Pickaxe search (`git log -S "<query>"`).
 */
export interface PickaxeSearchResult {
  /** Full commit hash where the string occurrence changed */
  commitHash: string;

  /** Abbreviated commit hash */
  shortHash: string;

  /** Author's display name */
  authorName: string;

  /** Human-readable relative date */
  relativeDate: string;

  /** Commit subject line */
  subject: string;

  /** Code/diff snippets containing the matched query */
  matchedSnippets: string[];
}
