import React, { useState, useEffect } from 'react';
import { useHistoryStore } from './stores/history.store';
import { useVscodeRpc } from './hooks/useVscodeRpc';
import { useKeyboard } from './hooks/useKeyboard';
import { CodeViewer } from './components/CodeViewer';
import { TimelineDrawer } from './components/TimelineDrawer';
import { ControlBar } from './components/ControlBar';
import { SearchModal } from './components/SearchModal';
import {
  GitCommit,
  History,
  Search,
  FileCode,
  GitCompare,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';

/**
 * Git Log Digger Webview 主應用 (App)
 * 整合：
 * 1. 頂部工作台 Header (檔名、路徑、當前 Commit 資訊、視圖切換、抽屜與搜尋開關)
 * 2. 左側可收合歷史時間軸抽屜 (TimelineDrawer)
 * 3. 核心雙層 DOM 代碼檢視器 (CodeViewer)
 * 4. 底部播放與操作控制列 (ControlBar)
 * 5. 雙軌搜尋彈窗 (SearchModal)
 * 6. 全域鍵盤快捷鍵 (useKeyboard) 與 VS Code RPC 通訊 (useVscodeRpc)
 */
export const App: React.FC = () => {
  const {
    fileName,
    filePath,
    commits,
    currentIndex,
    isDrawerOpen,
    toggleDrawer,
    openSearchModal,
    handleHostMessage,
    isLoading,
    jumpToLine,
  } = useHistoryStore();

  const { requestInitData } = useVscodeRpc(handleHostMessage);

  // 註冊全域快捷鍵監聽
  useKeyboard();

  // 檢視模式：全檔快照 (snapshot) 或差異檢視 (diff)
  const [viewMode, setViewMode] = useState<'snapshot' | 'diff'>('snapshot');

  // 初始化向 Extension Host 請求本機 Git 資料
  useEffect(() => {
    requestInitData();
  }, [requestInitData]);

  const currentCommit = commits[currentIndex];
  const totalCommits = commits.length;

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--vscode-editor-background,#1e1e1e)] text-[var(--vscode-editor-foreground,#d4d4d4)] overflow-hidden select-none">
      {/* 頂部工作台 Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--vscode-widget-border,#2b2b2b)] bg-[var(--vscode-editorWidget-background,#181818)] z-30 flex-shrink-0 gap-3">
        {/* 左側：抽屜切換鈕、檔案資訊 */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={toggleDrawer}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              isDrawerOpen
                ? 'bg-[var(--vscode-button-background,#0e639c)] text-white'
                : 'bg-[var(--vscode-button-secondaryBackground,#313131)] text-neutral-200 hover:bg-[var(--vscode-button-secondaryHoverBackground,#3c3c3c)]'
            }`}
            title="切換歷史時間軸抽屜 (Esc)"
            aria-label="Toggle history timeline drawer"
          >
            {isDrawerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            <span className="hidden sm:inline">時間軸</span>
            {totalCommits > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30">
                {totalCommits}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 truncate">
            <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">
                {fileName || 'Git Log Digger'}
              </span>
              {filePath && (
                <span className="text-[10px] text-neutral-400 truncate max-w-xs md:max-w-md hidden sm:inline" title={filePath}>
                  {filePath}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 中間：當前選中 Commit 簡短摘要 */}
        {currentCommit && (
          <div className="hidden md:flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 truncate max-w-md lg:max-w-lg">
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold flex-shrink-0">
              {currentCommit.shortHash}
            </span>
            <span className="truncate text-neutral-200" title={currentCommit.subject}>
              {currentCommit.subject}
            </span>
            <span className="text-neutral-500 text-[11px] flex-shrink-0">•</span>
            <span className="text-neutral-400 text-[11px] flex-shrink-0">
              {currentCommit.relativeDate}
            </span>
          </div>
        )}

        {/* 右側：視圖切換與搜尋按鈕 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* 快照 / Diff 模式切換 */}
          <div className="flex items-center p-0.5 rounded bg-[var(--vscode-input-background,#252526)] border border-[var(--vscode-input-border,#3c3c3c)] text-xs">
            <button
              onClick={() => setViewMode('snapshot')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                viewMode === 'snapshot'
                  ? 'bg-[var(--vscode-button-background,#0e639c)] text-white shadow-sm font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="全檔快照模式"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Snapshot</span>
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                viewMode === 'diff'
                  ? 'bg-[var(--vscode-button-background,#0e639c)] text-white shadow-sm font-medium'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="差異 Diff 模式"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Diff</span>
            </button>
          </div>

          {/* 搜尋按鈕 (Cmd+F / Cmd+Shift+F) */}
          <button
            onClick={() => openSearchModal('single')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-[var(--vscode-button-secondaryBackground,#313131)] hover:bg-[var(--vscode-button-secondaryHoverBackground,#3c3c3c)] text-[var(--vscode-button-secondaryForeground,#ffffff)] transition-colors border border-white/5"
            title="開啟雙軌搜尋 (Cmd+F / Cmd+Shift+F)"
            aria-label="Open search modal"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">搜尋</span>
            <kbd className="hidden sm:inline text-[10px] font-mono px-1 py-0.2 rounded bg-black/30 text-neutral-300">
              ⌘F
            </kbd>
          </button>
        </div>
      </header>

      {/* 主體佈局：左側抽屜 + 中央代碼檢視器 + 底部播放列 */}
      <div className="relative flex flex-1 h-full w-full overflow-hidden">
        {/* 左側歷史時間軸抽屜 */}
        <TimelineDrawer />

        {/* 右側中央工作區 */}
        <main className="relative flex flex-col flex-1 h-full w-full overflow-hidden">
          {/* 代碼檢視器 */}
          <div className="relative flex-1 h-full w-full overflow-hidden">
            <CodeViewer viewMode={viewMode} />
          </div>

          {/* 底部播放控制列 */}
          <ControlBar />
        </main>
      </div>

      {/* 雙軌搜尋 Modal (Cmd+F / Cmd+Shift+F) */}
      <SearchModal onJumpToLine={(lineNumber) => jumpToLine(lineNumber)} />
    </div>
  );
};
