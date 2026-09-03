import { useEffect, useCallback } from 'react';
import {
  VsCodeApi,
  WebviewToHostMessage,
  HostToWebviewMessage,
} from '../types';

declare function acquireVsCodeApi<T = unknown>(): VsCodeApi<T>;

let vsCodeApiInstance: VsCodeApi | null = null;

/**
 * 取得 VS Code Webview API 單例
 * 確保在生命週期中僅呼叫一次 acquireVsCodeApi()，並提供本機 Dev 模式的優雅降級
 */
export function getVsCodeApi(): VsCodeApi {
  if (!vsCodeApiInstance) {
    if (typeof acquireVsCodeApi === 'function') {
      try {
        vsCodeApiInstance = acquireVsCodeApi();
      } catch (e) {
        console.warn('acquireVsCodeApi call failed, falling back to mock:', e);
      }
    }

    if (!vsCodeApiInstance) {
      // 瀏覽器端除錯或預覽環境 Fallback
      vsCodeApiInstance = {
        postMessage: (msg: unknown) => {
          console.debug('[Mock VSCode Webview RPC -> Host]:', msg);
        },
        getState: () => undefined,
        setState: (state: unknown) => state,
      };
    }
  }
  return vsCodeApiInstance;
}

/**
 * 型別安全向 Extension Host 發送訊息 (同時注入 command 與 type 確保跨端相容)
 */
export function postHostMessage(message: WebviewToHostMessage): void {
  const api = getVsCodeApi();
  const dualMessage = {
    ...message,
    command: (message as any).command || (message as any).type,
    type: (message as any).type || (message as any).command,
  };
  api.postMessage(dualMessage);
}

/**
 * 自訂 Hook: 提供型別安全的 VS Code Webview RPC 監聽與訊息發送
 */
export function useVscodeRpc(
  onMessage?: (message: HostToWebviewMessage) => void
) {
  useEffect(() => {
    if (!onMessage) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && typeof data === 'object' && ('type' in data || 'command' in data)) {
        const normalized = {
          ...data,
          type: data.type || data.command,
          command: data.command || data.type,
        } as HostToWebviewMessage;
        onMessage(normalized);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onMessage]);

  const requestInitData = useCallback((filePath?: string) => {
    postHostMessage({ type: 'REQ_INIT_DATA', payload: { filePath } });
  }, []);

  const requestCommitContent = useCallback(
    (commitHash: string, filePath?: string, previousHash?: string) => {
      postHostMessage({
        type: 'REQ_COMMIT_CONTENT',
        payload: { commitHash, filePath, previousHash },
      });
    },
    []
  );

  const requestPickaxeSearch = useCallback((query: string, filePath?: string) => {
    postHostMessage({
      type: 'REQ_PICKAXE_SEARCH',
      payload: { query, filePath },
    });
  }, []);

  const copyToClipboard = useCallback(
    (text: string, message?: string, label?: string, showNotification: boolean = true) => {
      postHostMessage({
        type: 'REQ_COPY_TO_CLIPBOARD',
        payload: { text, message, label, showNotification },
      });
    },
    []
  );

  const openDiffInIde = useCallback(
    (commitHash: string, previousHash?: string, filePath?: string) => {
      postHostMessage({
        type: 'REQ_OPEN_DIFF',
        payload: { commitHash, previousHash, filePath },
      });
    },
    []
  );

  return {
    postMessage: postHostMessage,
    getVsCodeApi,
    requestInitData,
    requestCommitContent,
    requestPickaxeSearch,
    copyToClipboard,
    openDiffInIde,
  };
}
