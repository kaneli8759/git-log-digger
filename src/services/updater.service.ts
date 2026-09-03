/**
 * Git Log Digger - Auto Updater Service
 * Supports silent update checks and one-click in-place upgrade via Google Apps Script & Google Drive.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

export interface RemoteUpdateInfo {
  name?: string;
  version: string;
  filename?: string;
  fileId?: string;
  downloadUrl: string;
  changelog?: string;
  error?: string;
}

export class UpdaterService {
  private static readonly DEFAULT_UPDATE_URL =
    'https://script.google.com/a/macros/mail.chungyo.net/s/AKfycbyjUgrKcVpl0VXlGYhR6n8iB-S1mg27oIlSKu_aGW_5YKusyrhXCbmh2CA-NtzAvfOq/exec';

  /**
   * 取得設定中自訂的更新網址或預設 Google Apps Script 網址
   */
  public getUpdateUrl(): string {
    const config = vscode.workspace.getConfiguration('git-log-digger');
    return config.get<string>('updateUrl') || UpdaterService.DEFAULT_UPDATE_URL;
  }

  /**
   * 檢查是否有新版本
   * @param context 擴充套件上下文
   * @param silent 是否靜默執行（啟動時若為最新版或超時不打擾使用者；手動點選時才跳提示）
   */
  public async checkForUpdates(
    context: vscode.ExtensionContext,
    silent: boolean = true
  ): Promise<void> {
    const currentVersion: string =
      context.extension.packageJSON?.version || '0.0.0';
    const updateUrl = this.getUpdateUrl();

    if (!updateUrl) {
      if (!silent) {
        vscode.window.showWarningMessage('尚未設定 Git Log Digger 更新伺服器網址。');
      }
      return;
    }

    try {
      // 5 秒逾時保護，防止網路不通卡死
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(updateUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          Accept: 'application/json',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let info: RemoteUpdateInfo;
      try {
        info = JSON.parse(text);
      } catch {
        // 若回傳 HTML（例如遇到 SSO 登入頁面）
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          throw new Error('更新伺服器回傳了網頁登入頁面（可能需將權限設為任何人皆可存取）。');
        }
        throw new Error('無法解析更新伺服器回傳的 JSON 資料。');
      }

      if (info.error) {
        if (!silent) {
          vscode.window.showInformationMessage(`更新檢查提示：${info.error}`);
        }
        return;
      }

      if (!info.version || !info.downloadUrl) {
        if (!silent) {
          vscode.window.showWarningMessage('更新伺服器未提供有效的版本或下載資訊。');
        }
        return;
      }

      const hasNewVersion = this.compareSemver(info.version, currentVersion) > 0;

      if (hasNewVersion) {
        const changelogMsg = info.changelog ? `\n\n更新內容：\n${info.changelog}` : '';
        const action = await vscode.window.showInformationMessage(
          `🎉 Git Log Digger 發現新版本 v${info.version} (目前為 v${currentVersion})！${changelogMsg}`,
          '立即一鍵更新',
          '稍後再說'
        );

        if (action === '立即一鍵更新') {
          await this.downloadAndInstall(info.downloadUrl, info.version, info.filename);
        }
      } else {
        if (!silent) {
          vscode.window.showInformationMessage(
            `Git Log Digger 目前已是最新版本 (v${currentVersion})。`
          );
        }
      }
    } catch (err: any) {
      if (!silent) {
        vscode.window.showErrorMessage(`檢查更新失敗：${err?.message || err}`);
      }
    }
  }

  /**
   * 下載並自動安裝 VSIX 覆蓋升級
   */
  private async downloadAndInstall(
    downloadUrl: string,
    version: string,
    filename?: string
  ): Promise<void> {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `正在下載並安裝 Git Log Digger v${version}...`,
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: '正在下載安裝包...' });

          const response = await fetch(downloadUrl, {
            redirect: 'follow',
          });

          if (!response.ok) {
            throw new Error(`下載失敗 HTTP ${response.status}: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // 驗證是否真的抓到 VSIX (ZIP 檔案 magic number: PK..)
          if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
            throw new Error('下載的檔案非有效的 VSIX 安裝包，可能是 Google Drive 下載權限問題。');
          }

          const tempVsixPath = path.join(
            os.tmpdir(),
            filename || `git-log-digger-${version}.vsix`
          );

          await fs.promises.writeFile(tempVsixPath, buffer);

          progress.report({ message: '正在更新擴充套件...' });

          // 呼叫 VS Code 內建安裝指令進行無痛升級
          await vscode.commands.executeCommand(
            'workbench.extensions.installExtension',
            vscode.Uri.file(tempVsixPath)
          );

          // 清理暫存檔
          try {
            await fs.promises.unlink(tempVsixPath);
          } catch {
            // 忽略暫存清理錯誤
          }

          // 提示使用者重新載入視窗
          const reloadAction = await vscode.window.showInformationMessage(
            `✅ Git Log Digger 已成功升級至 v${version}！請重新載入視窗以啟用新版功能。`,
            '立即重新載入'
          );

          if (reloadAction === '立即重新載入') {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`自動更新失敗：${err?.message || err}`);
        }
      }
    );
  }

  /**
   * 語意化版本比對 (semver)
   * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  public compareSemver(v1: string, v2: string): number {
    const clean1 = v1.replace(/^v/, '');
    const clean2 = v2.replace(/^v/, '');
    const p1 = clean1.split('.').map(Number);
    const p2 = clean2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const n1 = isNaN(p1[i]) ? 0 : p1[i];
      const n2 = isNaN(p2[i]) ? 0 : p2[i];
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }
}

export const updaterService = new UpdaterService();
