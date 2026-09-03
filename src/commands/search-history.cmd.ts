/**
 * Git Log Digger - Search History (Pickaxe) Command
 * Prompts user for a search query (pre-filled with current text selection if available),
 * resolves file context, and opens the history panel with Pickaxe search results.
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { GitError, gitService } from '../services';
import { GitLogDiggerPanel } from '../controllers';
import { resolveTargetFilePath } from './open-history.cmd';

/**
 * Executes the Search File History (Pickaxe) command logic.
 */
export async function searchHistoryCommand(
  extensionUri: vscode.Uri,
  uri?: vscode.Uri
): Promise<GitLogDiggerPanel | undefined> {
  const targetPath = await resolveTargetFilePath(uri);
  if (!targetPath) {
    return undefined;
  }

  // Guard: Ensure file belongs to a Git repository
  try {
    await gitService.getRepoRoot(targetPath);
  } catch (err) {
    const fileName = path.basename(targetPath);
    if (err instanceof GitError) {
      vscode.window.showErrorMessage(
        `Git Log Digger: "${fileName}" is not part of a Git repository.`
      );
    } else {
      vscode.window.showErrorMessage(
        `Git Log Digger: Failed to detect Git repository for "${fileName}".`
      );
    }
    return undefined;
  }

  // Pre-fill query with selected text in editor if available
  let prefillQuery = '';
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.fsPath === targetPath && !editor.selection.isEmpty) {
    const selectedText = editor.document.getText(editor.selection).trim();
    // Only prefill if single line and reasonably sized
    if (selectedText && !selectedText.includes('\n') && selectedText.length <= 100) {
      prefillQuery = selectedText;
    }
  }

  const fileName = path.basename(targetPath);
  const query = await vscode.window.showInputBox({
    prompt: `Search Git Pickaxe (-S) history for ${fileName}`,
    placeHolder: 'Enter string or symbol to find commits that introduced or removed it...',
    value: prefillQuery,
    validateInput: (text) => {
      if (!text || text.trim().length === 0) {
        return 'Please enter a non-empty search query.';
      }
      return null;
    },
  });

  if (!query || query.trim().length === 0) {
    return undefined;
  }

  // Open the panel and trigger the pickaxe search
  return GitLogDiggerPanel.render(extensionUri, targetPath, query.trim());
}

/**
 * Registers the search history command with VS Code.
 */
export function registerSearchHistoryCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'git-log-digger.searchHistory',
    (uri?: vscode.Uri) => searchHistoryCommand(context.extensionUri, uri)
  );
}
