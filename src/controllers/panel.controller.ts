/**
 * Git Log Digger - Panel Controller
 * Manages WebviewPanel lifecycle, CSP injection, asset URI rewriting, and host-webview RPC dispatching.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  GitError,
  GitService,
  gitService,
  GitCacheService,
  gitCacheService,
  ClipboardService,
  clipboardService,
} from '../services';
import {
  CommitMetadata,
  DiffLine,
  WebviewToHostMessage,
  HostToWebviewMessage,
  isWebviewToHostMessage,
  ResInitDataPayload,
  ResCommitContentPayload,
  ResPickaxeSearchPayload,
  EventThemeChangedPayload,
  EventErrorPayload,
} from '../contracts';
import { GitLogDiggerContentProvider } from './content-provider';

export class GitLogDiggerPanel {
  public static readonly viewType = 'git-log-digger';
  private static readonly _panels: Map<string, GitLogDiggerPanel> = new Map();

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _filePath: string;
  private readonly _gitService: GitService;
  private readonly _cacheService: GitCacheService;
  private readonly _clipboardService: ClipboardService;
  private _disposables: vscode.Disposable[] = [];
  private _isDisposed = false;

  /**
   * Retrieves or creates a GitLogDiggerPanel for the specified file.
   * If a panel for the given file is already open, reveals it.
   */
  public static render(
    extensionUri: vscode.Uri,
    filePath: string,
    initialSearchQuery?: string
  ): GitLogDiggerPanel {
    const normalizedPath = path.resolve(filePath);

    if (GitLogDiggerPanel._panels.has(normalizedPath)) {
      const existingPanel = GitLogDiggerPanel._panels.get(normalizedPath)!;
      existingPanel.reveal();
      if (initialSearchQuery) {
        existingPanel.triggerSearch(initialSearchQuery);
      }
      return existingPanel;
    }

    const fileName = path.basename(normalizedPath);
    const panel = vscode.window.createWebviewPanel(
      GitLogDiggerPanel.viewType,
      `Git Log: ${fileName}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview')],
      }
    );

    const diggerPanel = new GitLogDiggerPanel(panel, extensionUri, normalizedPath);
    GitLogDiggerPanel._panels.set(normalizedPath, diggerPanel);

    if (initialSearchQuery) {
      diggerPanel.triggerSearch(initialSearchQuery);
    }

    return diggerPanel;
  }

  /**
   * Closes and disposes all active panels.
   */
  public static disposeAll(): void {
    for (const panel of GitLogDiggerPanel._panels.values()) {
      panel.dispose();
    }
    GitLogDiggerPanel._panels.clear();
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    filePath: string,
    gitSvc: GitService = gitService,
    cacheSvc: GitCacheService = gitCacheService,
    clipboardSvc: ClipboardService = clipboardService
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._filePath = filePath;
    this._gitService = gitSvc;
    this._cacheService = cacheSvc;
    this._clipboardService = clipboardSvc;

    // Set webview tab icon
    this._panel.iconPath = {
      light: vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'favicon.ico'),
      dark: vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'favicon.ico'),
    };

    // Load webview HTML content
    this._updateHtml();

    // Hook panel lifecycle events
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Register active theme change listener
    vscode.window.onDidChangeActiveColorTheme(
      (theme) => this._notifyThemeChanged(theme),
      null,
      this._disposables
    );

    // Listen to messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (rawMessage: unknown) => this._onDidReceiveMessage(rawMessage),
      null,
      this._disposables
    );
  }

  /**
   * Reveals the webview panel beside the current active editor.
   */
  public reveal(): void {
    if (!this._isDisposed) {
      this._panel.reveal(vscode.ViewColumn.Beside);
    }
  }

  /**
   * Dispatches an external search trigger to the webview UI.
   */
  public async triggerSearch(query: string): Promise<void> {
    try {
      const repoRoot = await this._gitService.getRepoRoot(this._filePath);
      const results = await this._gitService.searchPickaxe(repoRoot, this._filePath, query);

      await this._postMessage({
        command: 'RES_PICKAXE_SEARCH',
        payload: {
          query,
          filePath: this._filePath,
          results,
        },
      });
    } catch (err) {
      this._notifyError('REQ_PICKAXE_SEARCH', err);
    }
  }

  /**
   * Main dispatch router for messages received from the Webview.
   */
  private async _onDidReceiveMessage(rawMessage: unknown): Promise<void> {
    if (!rawMessage || typeof rawMessage !== 'object') {
      return;
    }

    // Support both 'command' (from src/contracts/messages.ts) and 'type' (from webview-ui)
    const msgObj = rawMessage as Record<string, any>;
    const command = msgObj.command || msgObj.type;
    const requestId = msgObj.requestId;

    try {
      switch (command) {
        case 'REQ_INIT_DATA':
          await this._handleReqInitData(msgObj.payload, requestId);
          break;

        case 'REQ_COMMIT_CONTENT':
          await this._handleReqCommitContent(msgObj.payload, requestId);
          break;

        case 'REQ_PICKAXE_SEARCH':
          await this._handleReqPickaxeSearch(msgObj.payload, requestId);
          break;

        case 'REQ_COPY_TO_CLIPBOARD':
          await this._handleReqCopyToClipboard(msgObj.payload, requestId);
          break;

        case 'REQ_OPEN_DIFF':
          await this._handleReqOpenDiff(msgObj.payload, requestId);
          break;

        default:
          console.warn(`[GitLogDiggerPanel] Unhandled webview command: ${command}`);
          break;
      }
    } catch (error) {
      this._notifyError(command, error, requestId);
    }
  }

  /**
   * Handles REQ_INIT_DATA: Reads git history for the file and responds with RES_INIT_DATA.
   */
  private async _handleReqInitData(payload?: { filePath?: string }, requestId?: string): Promise<void> {
    const targetPath = payload?.filePath || this._filePath;
    const repoRoot = await this._gitService.getRepoRoot(targetPath);
    const relativePath = path.isAbsolute(targetPath)
      ? path.relative(repoRoot, targetPath)
      : targetPath;
    const fileName = path.basename(targetPath);

    const commits = await this._gitService.getFileCommits(targetPath);

    let initialContent: string | undefined;
    let initialDiff: DiffLine[] | undefined;

    // Pre-fetch the latest commit content & diff for instant initial render
    if (commits.length > 0) {
      const latestHash = commits[0].hash;
      try {
        initialContent = await this._gitService.getFileContentAtCommit(
          repoRoot,
          latestHash,
          relativePath
        );
        initialDiff = await this._gitService.getCommitDiff(repoRoot, latestHash, relativePath);
      } catch (err) {
        console.warn('[GitLogDiggerPanel] Failed to pre-fetch initial commit content:', err);
      }
    }

    const resPayload: ResInitDataPayload & {
      fileName: string;
      initialContent?: string;
      initialDiff?: DiffLine[];
    } = {
      repoRoot,
      filePath: targetPath,
      relativePath,
      fileName,
      commits,
      currentCommitHash: commits.length > 0 ? commits[0].hash : undefined,
      initialContent,
      initialDiff,
    };

    await this._postMessage({
      command: 'RES_INIT_DATA',
      payload: resPayload,
      responseId: requestId,
    });
  }

  /**
   * Handles REQ_COMMIT_CONTENT: Retrieves commit snapshot and diff via CacheService & GitService.
   */
  private async _handleReqCommitContent(
    payload: { commitHash: string; filePath?: string; previousHash?: string },
    requestId?: string
  ): Promise<void> {
    const targetPath = payload.filePath || this._filePath;
    const commitHash = payload.commitHash;
    const repoRoot = await this._gitService.getRepoRoot(targetPath);
    const relativePath = path.isAbsolute(targetPath)
      ? path.relative(repoRoot, targetPath)
      : targetPath;

    // Fetch snapshot content and parsed diff concurrently
    const [content, diff] = await Promise.all([
      this._gitService.getFileContentAtCommit(repoRoot, commitHash, relativePath),
      this._gitService.getCommitDiff(repoRoot, commitHash, relativePath),
    ]);

    const resPayload: ResCommitContentPayload & { diffLines: DiffLine[] } = {
      commitHash,
      previousHash: payload.previousHash ?? null,
      filePath: targetPath,
      content,
      diff,
      diffLines: diff,
    };

    await this._postMessage({
      command: 'RES_COMMIT_CONTENT',
      payload: resPayload,
      responseId: requestId,
    });
  }

  /**
   * Handles REQ_PICKAXE_SEARCH: Searches history using git log -S.
   */
  private async _handleReqPickaxeSearch(
    payload: { query: string; filePath?: string },
    requestId?: string
  ): Promise<void> {
    const targetPath = payload.filePath || this._filePath;
    const query = payload.query;
    const repoRoot = await this._gitService.getRepoRoot(targetPath);

    const results = await this._gitService.searchPickaxe(repoRoot, targetPath, query);

    const resPayload: ResPickaxeSearchPayload = {
      query,
      filePath: targetPath,
      results,
    };

    await this._postMessage({
      command: 'RES_PICKAXE_SEARCH',
      payload: resPayload,
      responseId: requestId,
    });
  }

  /**
   * Handles REQ_COPY_TO_CLIPBOARD: Writes text to clipboard using ClipboardService.
   */
  private async _handleReqCopyToClipboard(
    payload: { text: string; label?: string; message?: string; showNotification?: boolean },
    _requestId?: string
  ): Promise<void> {
    const { text, label, message, showNotification } = payload;
    let notifyMsg: string | undefined;

    if (showNotification !== false) {
      if (message) {
        notifyMsg = message;
      } else if (label) {
        notifyMsg = `Copied ${label} to clipboard`;
      } else {
        notifyMsg = 'Copied to clipboard';
      }
    }

    await this._clipboardService.writeText(text, notifyMsg);
  }

  /**
   * Handles REQ_OPEN_DIFF: Opens VS Code native Diff Editor comparing commit snapshots.
   */
  private async _handleReqOpenDiff(
    payload: { commitHash: string; previousHash?: string; filePath?: string },
    _requestId?: string
  ): Promise<void> {
    const targetPath = payload.filePath || this._filePath;
    const { commitHash, previousHash } = payload;
    const repoRoot = await this._gitService.getRepoRoot(targetPath);
    const relativePath = path.isAbsolute(targetPath)
      ? path.relative(repoRoot, targetPath)
      : targetPath;
    const fileName = path.basename(targetPath);

    // Left side: previous commit snapshot or empty virtual document
    const leftUri = previousHash
      ? GitLogDiggerContentProvider.buildUri(repoRoot, previousHash, relativePath)
      : GitLogDiggerContentProvider.buildEmptyUri(relativePath);

    // Right side: current commit snapshot
    const rightUri = GitLogDiggerContentProvider.buildUri(repoRoot, commitHash, relativePath);

    const prevShort = previousHash ? previousHash.slice(0, 7) : 'empty';
    const currShort = commitHash.slice(0, 7);
    const diffTitle = `${fileName} (${prevShort} ↔ ${currShort})`;

    await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, diffTitle, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });
  }

  /**
   * Notifies the webview when active VS Code color theme changes.
   */
  private _notifyThemeChanged(theme: vscode.ColorTheme): void {
    const isDark =
      theme.kind === vscode.ColorThemeKind.Dark ||
      theme.kind === vscode.ColorThemeKind.HighContrast;

    const kind = isDark ? 'dark' : 'light';

    const payload: EventThemeChangedPayload & { kind: 'dark' | 'light' | 'high-contrast' } = {
      themeKind: theme.kind,
      isDark,
      kind,
    };

    this._postMessage({
      command: 'EVENT_THEME_CHANGED',
      payload,
    });
  }

  /**
   * Sends structured error event to webview.
   */
  private _notifyError(command: string, error: unknown, requestId?: string): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const code = error instanceof GitError ? `GIT_${error.exitCode}` : undefined;

    const payload: EventErrorPayload = {
      command,
      message: errorMsg,
      code,
      details: error,
    };

    this._postMessage({
      command: 'EVENT_ERROR',
      payload,
      responseId: requestId,
    });
  }

  /**
   * Sends a typed message to the Webview, providing both 'command' and 'type' for dual-protocol compatibility.
   */
  private _postMessage(message: {
    command: string;
    payload: unknown;
    responseId?: string;
  }): Thenable<boolean> {
    if (this._isDisposed) {
      return Promise.resolve(false);
    }
    // Include both command and type for flawless interoperability
    const dualEnvelope = {
      ...message,
      type: message.command,
    };
    return this._panel.webview.postMessage(dualEnvelope);
  }

  /**
   * Generates a 32-character cryptographic random nonce.
   */
  private _getNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Loads dist/webview/index.html, rewrites assets to vscode-webview resource URIs,
   * injects CSP and nonces, or renders a loading skeleton if build is not present.
   */
  private _updateHtml(): void {
    const webview = this._panel.webview;
    const distWebviewUri = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview');
    const indexPath = path.join(distWebviewUri.fsPath, 'index.html');
    const nonce = this._getNonce();

    // Strict Content Security Policy
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource}`,
      `connect-src ${webview.cspSource} https:`,
    ].join('; ');

    const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

    if (fs.existsSync(indexPath)) {
      try {
        let html = fs.readFileSync(indexPath, 'utf8');

        // Rewrite relative and absolute asset references
        // e.g. src="/assets/index-xxx.js" or href="./assets/index-xxx.css"
        html = html.replace(
          /(href|src)=["'](?:(?:\.\/|\/)?)assets\/([^"']+)["']/g,
          (_match, attr, assetRelPath) => {
            const assetUri = webview.asWebviewUri(
              vscode.Uri.joinPath(distWebviewUri, 'assets', assetRelPath)
            );
            return `${attr}="${assetUri.toString()}"`;
          }
        );

        // Inject nonce into script tags that don't already have one
        html = html.replace(/<script(?![^>]*\bnonce=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);

        // Inject CSP meta tag
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>\n    ${cspMetaTag}`);
        } else {
          html = `${cspMetaTag}\n${html}`;
        }

        webview.html = html;
        return;
      } catch (err) {
        console.error('[GitLogDiggerPanel] Error reading dist/webview/index.html:', err);
      }
    }

    // Fallback UI if webview assets are not yet compiled
    webview.html = this._getFallbackHtml(cspMetaTag);
  }

  /**
   * Fallback HTML display when frontend dist assets are compiling or unavailable.
   */
  private _getFallbackHtml(cspMetaTag: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${cspMetaTag}
  <title>Git Log Digger</title>
  <style>
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background-color: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      user-select: none;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--vscode-progressBar-background, #007acc);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h3 {
      margin: 0 0 8px 0;
      font-size: 15px;
      font-weight: 500;
    }
    p {
      margin: 0;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #888888);
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h3>Git Log Digger</h3>
  <p>Loading codebase history...</p>
</body>
</html>`;
  }

  /**
   * Disposes the panel and associated subscriptions.
   */
  public dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;

    GitLogDiggerPanel._panels.delete(this._filePath);
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        try {
          disposable.dispose();
        } catch (err) {
          console.error('[GitLogDiggerPanel] Error disposing resource:', err);
        }
      }
    }
  }
}
