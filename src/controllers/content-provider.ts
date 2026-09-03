/**
 * Git Log Digger - TextDocumentContentProvider for VS Code Diff View
 * Provides virtual document content for git commit snapshots without writing temporary files.
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { GitService, gitService } from '../services';

export interface DiffDocumentParams {
  repoRoot: string;
  commitHash: string;
  relativePath: string;
  empty?: boolean;
}

export class GitLogDiggerContentProvider implements vscode.TextDocumentContentProvider {
  public static readonly scheme = 'git-log-digger-diff';

  private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidChange: vscode.Event<vscode.Uri> = this._onDidChange.event;

  constructor(private readonly _gitService: GitService = gitService) {}

  /**
   * Generates a virtual URI for a specific commit snapshot of a file.
   * Path includes the original file extension so VS Code provides accurate syntax highlighting.
   */
  public static buildUri(repoRoot: string, commitHash: string, relativePath: string): vscode.Uri {
    const fileName = path.basename(relativePath);
    const params: DiffDocumentParams = {
      repoRoot,
      commitHash,
      relativePath,
    };

    return vscode.Uri.from({
      scheme: GitLogDiggerContentProvider.scheme,
      path: `/${commitHash.slice(0, 8)}/${fileName}`,
      query: encodeURIComponent(JSON.stringify(params)),
    });
  }

  /**
   * Generates a virtual URI representing an empty document (e.g., base of the root commit).
   */
  public static buildEmptyUri(relativePath: string = 'empty.txt'): vscode.Uri {
    const fileName = path.basename(relativePath);
    const params: DiffDocumentParams = {
      repoRoot: '',
      commitHash: '',
      relativePath,
      empty: true,
    };

    return vscode.Uri.from({
      scheme: GitLogDiggerContentProvider.scheme,
      path: `/empty/${fileName}`,
      query: encodeURIComponent(JSON.stringify(params)),
    });
  }

  /**
   * Resolves the text content for the given virtual document URI.
   */
  public async provideTextDocumentContent(
    uri: vscode.Uri,
    _token: vscode.CancellationToken
  ): Promise<string> {
    try {
      if (!uri.query) {
        return '';
      }

      const decoded = decodeURIComponent(uri.query);
      const params = JSON.parse(decoded) as DiffDocumentParams;

      if (params.empty || !params.commitHash) {
        return '';
      }

      return await this._gitService.getFileContentAtCommit(
        params.repoRoot,
        params.commitHash,
        params.relativePath
      );
    } catch (err) {
      return `// [Git Log Digger] Error reading file snapshot at commit:\n// ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  }

  /**
   * Fires onDidChange event to refresh content if needed.
   */
  public refresh(uri: vscode.Uri): void {
    this._onDidChange.fire(uri);
  }

  public dispose(): void {
    this._onDidChange.dispose();
  }
}
