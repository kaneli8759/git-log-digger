/**
 * Git Log Digger - Webview <-> Host Messaging Protocol
 * Strongly-typed bidirectional communication contracts.
 */

import type { CommitMetadata, DiffLine, PickaxeSearchResult } from './git.types';

// ============================================================================
// Webview -> Host Messages (Requests)
// ============================================================================

export interface ReqInitDataPayload {
  /** Optional file path if requesting history for a specific file */
  filePath?: string;
}

export interface ReqCommitContentPayload {
  /** Commit SHA to fetch content for */
  commitHash: string;

  /** File path relative to repo or absolute path */
  filePath: string;

  /** Optional parent commit hash for diff generation */
  previousHash?: string;
}

export interface ReqPickaxeSearchPayload {
  /** Search string for git log -S */
  query: string;

  /** File path to search within */
  filePath: string;
}

export interface ReqCopyToClipboardPayload {
  /** Text content to copy to the clipboard */
  text: string;

  /** Optional label identifying what was copied (e.g. 'Commit Hash', 'Snippet') */
  label?: string;

  /** Whether to display a VS Code toast notification (default: true) */
  showNotification?: boolean;
}

export interface ReqOpenDiffPayload {
  /** Target commit hash */
  commitHash: string;

  /** Base/parent commit hash to diff against */
  previousHash?: string;

  /** Target file path */
  filePath: string;
}

export type WebviewToHostMessage =
  | {
      command: 'REQ_INIT_DATA';
      payload?: ReqInitDataPayload;
      requestId?: string;
    }
  | {
      command: 'REQ_COMMIT_CONTENT';
      payload: ReqCommitContentPayload;
      requestId?: string;
    }
  | {
      command: 'REQ_PICKAXE_SEARCH';
      payload: ReqPickaxeSearchPayload;
      requestId?: string;
    }
  | {
      command: 'REQ_COPY_TO_CLIPBOARD';
      payload: ReqCopyToClipboardPayload;
      requestId?: string;
    }
  | {
      command: 'REQ_OPEN_DIFF';
      payload: ReqOpenDiffPayload;
      requestId?: string;
    };

// ============================================================================
// Host -> Webview Messages (Responses and Events)
// ============================================================================

export interface ResInitDataPayload {
  /** Repository root path */
  repoRoot: string;

  /** Target file absolute path */
  filePath: string;

  /** Target file path relative to repoRoot */
  relativePath: string;

  /** Parsed list of commits for the file */
  commits: CommitMetadata[];

  /** Currently selected or active commit hash */
  currentCommitHash?: string;
}

export interface ResCommitContentPayload {
  /** Commit hash */
  commitHash: string;

  /** Previous/parent commit hash if available */
  previousHash?: string | null;

  /** File path */
  filePath: string;

  /** Full file content at this commit */
  content: string;

  /** Parsed diff lines comparing with previous commit */
  diff: DiffLine[];
}

export interface ResPickaxeSearchPayload {
  /** Search query string */
  query: string;

  /** File path searched */
  filePath: string;

  /** Matching commits and diff snippets */
  results: PickaxeSearchResult[];
}

export interface EventThemeChangedPayload {
  /** VS Code ColorThemeKind enum value (1=Light, 2=Dark, 3=HighContrast, 4=HighContrastLight) */
  themeKind: number;

  /** Convenience boolean for dark mode styling */
  isDark: boolean;
}

export interface EventErrorPayload {
  /** Request command that caused the error, if applicable */
  command?: string;

  /** Human-readable error message */
  message: string;

  /** Error identifier or code */
  code?: string;

  /** Additional error details or stack trace */
  details?: unknown;
}

export type HostToWebviewMessage =
  | {
      command: 'RES_INIT_DATA';
      payload: ResInitDataPayload;
      responseId?: string;
    }
  | {
      command: 'RES_COMMIT_CONTENT';
      payload: ResCommitContentPayload;
      responseId?: string;
    }
  | {
      command: 'RES_PICKAXE_SEARCH';
      payload: ResPickaxeSearchPayload;
      responseId?: string;
    }
  | {
      command: 'EVENT_THEME_CHANGED';
      payload: EventThemeChangedPayload;
    }
  | {
      command: 'EVENT_ERROR';
      payload: EventErrorPayload;
      responseId?: string;
    };

// ============================================================================
// Type Guards
// ============================================================================

export function isWebviewToHostMessage(data: unknown): data is WebviewToHostMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const cmd = (data as { command?: unknown }).command;
  return (
    typeof cmd === 'string' &&
    [
      'REQ_INIT_DATA',
      'REQ_COMMIT_CONTENT',
      'REQ_PICKAXE_SEARCH',
      'REQ_COPY_TO_CLIPBOARD',
      'REQ_OPEN_DIFF',
    ].includes(cmd)
  );
}

export function isHostToWebviewMessage(data: unknown): data is HostToWebviewMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const cmd = (data as { command?: unknown }).command;
  return (
    typeof cmd === 'string' &&
    [
      'RES_INIT_DATA',
      'RES_COMMIT_CONTENT',
      'RES_PICKAXE_SEARCH',
      'EVENT_THEME_CHANGED',
      'EVENT_ERROR',
    ].includes(cmd)
  );
}
