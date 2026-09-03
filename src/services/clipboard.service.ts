/**
 * Git Log Digger - Clipboard Service
 * Encapsulates VS Code native clipboard and notification APIs.
 */

import * as vscode from 'vscode';

export class ClipboardService {
  /**
   * Writes text to the system clipboard and optionally presents an information message toast.
   * @param text String content to write to clipboard.
   * @param notifyMessage Optional message to show in VS Code information notification.
   */
  public async writeText(text: string, notifyMessage?: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(text);
      if (notifyMessage) {
        await vscode.window.showInformationMessage(notifyMessage);
      }
    } catch (err) {
      const errorMsg = `Failed to copy to clipboard: ${err instanceof Error ? err.message : String(err)}`;
      vscode.window.showErrorMessage(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Reads the current string content from the system clipboard.
   */
  public async readText(): Promise<string> {
    try {
      return await vscode.env.clipboard.readText();
    } catch (err) {
      const errorMsg = `Failed to read from clipboard: ${err instanceof Error ? err.message : String(err)}`;
      vscode.window.showErrorMessage(errorMsg);
      throw new Error(errorMsg);
    }
  }
}

/** Default global clipboard service singleton */
export const clipboardService = new ClipboardService();
