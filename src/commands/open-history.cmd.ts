/**
 * Git Log Digger - Open History Command
 * Accurately resolves target file path from active editor, explorer context, or command palette,
 * validates git tracking, and launches the time-machine Webview panel.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { GitError, gitService } from '../services';
import { GitLogDiggerPanel } from '../controllers';

/**
 * Resolves the absolute path to the target file from different VS Code invocation contexts:
 * 1. Explorer context menu click (uri argument)
 * 2. Editor title icon or editor context menu (uri argument)
 * 3. Command Palette (inspects activeTextEditor or prompts file picker)
 */
export async function resolveTargetFilePath(uri?: vscode.Uri): Promise<string | undefined> {
  // Case 1 & 2: Direct Uri provided by context menu or editor title button
  if (uri && uri.fsPath) {
    return uri.fsPath;
  }

  // Case 3a: Active text editor document
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document) {
    if (activeEditor.document.isUntitled) {
      vscode.window.showWarningMessage(
        'Git Log Digger: Untitled files have no Git history. Please save the file first.'
      );
      return undefined;
    }

    if (activeEditor.document.uri.scheme === 'file') {
      return activeEditor.document.uri.fsPath;
    }
  }

  // Case 3b: No active editor; open file picker dialog
  const selectedUris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Dig Git History',
    title: 'Select a file to inspect its Git history',
  });

  if (selectedUris && selectedUris.length > 0) {
    return selectedUris[0].fsPath;
  }

  return undefined;
}

/**
 * Executes the Open File History command logic.
 */
export async function openHistoryCommand(
  extensionUri: vscode.Uri,
  uri?: vscode.Uri
): Promise<GitLogDiggerPanel | undefined> {
  const targetPath = await resolveTargetFilePath(uri);
  if (!targetPath) {
    return undefined;
  }

  // Guard: Verify target path exists on disk
  if (!fs.existsSync(targetPath)) {
    vscode.window.showErrorMessage(
      `Git Log Digger: File does not exist on disk: ${targetPath}`
    );
    return undefined;
  }

  // Guard: Visualizer operates on files, not directories
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      vscode.window.showWarningMessage(
        'Git Log Digger currently visualizes single file evolution. Please select a specific file.'
      );
      return undefined;
    }
  } catch (err) {
    vscode.window.showErrorMessage(
      `Git Log Digger: Unable to access path: ${targetPath}`
    );
    return undefined;
  }

  // Guard: Ensure file belongs to a valid Git repository
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
        `Git Log Digger: Failed to detect Git repository for "${fileName}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
    return undefined;
  }

  // Render or reveal the WebviewPanel
  return GitLogDiggerPanel.render(extensionUri, targetPath);
}

/**
 * Registers the open history command with VS Code.
 */
export function registerOpenHistoryCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'git-log-digger.openHistory',
    (uri?: vscode.Uri) => openHistoryCommand(context.extensionUri, uri)
  );
}
