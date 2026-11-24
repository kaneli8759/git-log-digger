// ============================================================================
// Git Data Contracts
// ============================================================================

export interface CommitMetadata {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  relativeDate: string;
  subject: string;
  body: string;
  insertions: number;
  deletions: number;
  filesChanged: number;
}

export interface FileCommitContent {
  commitHash: string;
  filePath: string;
  content: string;
  previousHash?: string;
}

export type DiffLineType = 'add' | 'del' | 'normal';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface PickaxeSearchResult {
  commitHash: string;
  shortHash: string;
  authorName: string;
  relativeDate: string;
  subject: string;
  matchedSnippets: string[];
}

// ============================================================================
// Tokenizer Contracts
// ============================================================================

export type TokenType =
  | 'keyword'
  | 'builtin'
  | 'string'
  | 'comment'
  | 'number'
  | 'boolean'
  | 'function'
  | 'class'
  | 'variable'
  | 'operator'
  | 'punctuation'
  | 'tag'
  | 'attribute'
  | 'plain';

export interface CodeToken {
  type: TokenType;
  content: string;
}

export interface TokenizedLine {
  lineNumber: number;
  tokens: CodeToken[];
  rawText: string;
  diffType: DiffLineType;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// ============================================================================
// RPC Communication Contracts (Webview <-> Host)
// ============================================================================

export type WebviewToHostMessage =
  | { type: 'REQ_INIT_DATA'; payload?: { filePath?: string }; command?: string; requestId?: string }
  | {
      type: 'REQ_COMMIT_CONTENT';
      payload: { commitHash: string; filePath?: string; previousHash?: string };
      command?: string;
      requestId?: string;
    }
  | {
      type: 'REQ_PICKAXE_SEARCH';
      payload: { query: string; filePath?: string };
      command?: string;
      requestId?: string;
    }
  | {
      type: 'REQ_COPY_TO_CLIPBOARD';
      payload: { text: string; message?: string; label?: string; showNotification?: boolean };
      command?: string;
      requestId?: string;
    }
  | {
      type: 'REQ_OPEN_DIFF';
      payload: { commitHash: string; previousHash?: string; filePath?: string };
      command?: string;
      requestId?: string;
    };

export type HostToWebviewMessage =
  | {
      type: 'RES_INIT_DATA';
      payload: {
        filePath: string;
        fileName: string;
        repoRoot: string;
        commits: CommitMetadata[];
        initialContent?: string;
        initialDiff?: DiffLine[];
      };
    }
  | {
      type: 'RES_COMMIT_CONTENT';
      payload: {
        commitHash: string;
        content: string;
        diffLines: DiffLine[];
      };
    }
  | {
      type: 'RES_PICKAXE_SEARCH';
      payload: {
        query: string;
        results: PickaxeSearchResult[];
      };
    }
  | {
      type: 'EVENT_THEME_CHANGED';
      payload: {
        kind: 'dark' | 'light' | 'high-contrast';
      };
    }
  | {
      type: 'EVENT_ERROR';
      payload: {
        message: string;
      };
    };

// ============================================================================
// VS Code Webview API Definition
// ============================================================================

export interface VsCodeApi<TState = unknown> {
  postMessage(message: unknown): void;
  getState(): TState | undefined;
  setState(state: TState): TState;
}
