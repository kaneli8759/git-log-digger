/**
 * Git Log Digger - Extension Host Lifecycle Entrypoint
 * Registers commands, text document content providers, status bar widgets, and manages cleanup.
 */

import * as vscode from 'vscode';
import { GitLogDiggerContentProvider, GitLogDiggerPanel } from './controllers';
import { registerOpenHistoryCommand, registerSearchHistoryCommand } from './commands';
import { gitCacheService, updaterService } from './services';

let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Extension activation callback invoked by VS Code host.
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('[Git Log Digger] Extension activated.');

  // 1. Register Virtual Document Content Provider for VS Code Native Diff Editor
  const contentProvider = new GitLogDiggerContentProvider();
  const providerDisposable = vscode.workspace.registerTextDocumentContentProvider(
    GitLogDiggerContentProvider.scheme,
    contentProvider
  );
  context.subscriptions.push(providerDisposable, contentProvider);

  // 2. Register Commands
  const openHistoryCmd = registerOpenHistoryCommand(context);
  const searchHistoryCmd = registerSearchHistoryCommand(context);
  const checkUpdatesCmd = vscode.commands.registerCommand(
    'git-log-digger.checkForUpdates',
    async () => {
      await updaterService.checkForUpdates(context, false);
    }
  );
  context.subscriptions.push(openHistoryCmd, searchHistoryCmd, checkUpdatesCmd);

  // 3. Silent auto-update check on startup (delayed 3s)
  setTimeout(() => {
    updaterService.checkForUpdates(context, true).catch(() => {});
  }, 3000);

  // 3. Create Status Bar Item for quick access
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'git-log-digger.openHistory';
  statusBarItem.text = '$(history) Git Digger';
  statusBarItem.tooltip = 'Open Git Log Digger time-machine for current file';
  context.subscriptions.push(statusBarItem);

  // Update status bar visibility when active editor changes
  const updateStatusBar = (editor?: vscode.TextEditor): void => {
    if (statusBarItem) {
      if (editor && editor.document && editor.document.uri.scheme === 'file' && !editor.document.isUntitled) {
        statusBarItem.show();
      } else {
        statusBarItem.hide();
      }
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => updateStatusBar(editor))
  );

  // Initialize status bar for currently focused editor
  updateStatusBar(vscode.window.activeTextEditor);
}

/**
 * Extension deactivation callback invoked during shutdown or reload.
 */
export function deactivate(): void {
  console.log('[Git Log Digger] Deactivating extension...');

  // Dispose all open webview panels
  GitLogDiggerPanel.disposeAll();

  // Clear LRU caches
  gitCacheService.clear();

  // Hide status bar
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}
