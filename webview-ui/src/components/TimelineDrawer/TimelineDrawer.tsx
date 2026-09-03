import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useHistoryStore } from '../../stores/history.store';
import { CommitMetadata } from '../../types';
import {
  GitCommit,
  X,
  Search,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';

interface TimelineDrawerProps {
  className?: string;
}

/**
 * 左側可收合歷史時間軸抽屜 (TimelineDrawer)
 * 特色：
 * 1. 展開/收合平滑過渡動畫
 * 2. Commit 清單：shortHash、作者、相對時間、commit message、+增/-減行數 badge
 * 3. 當前選取的 Commit 顯著高亮，支援點擊直接切換
 * 4. 自動滾動 (scrollIntoView) 確保當前選取版本始終在視野內
 * 5. 即時搜尋過濾 (依訊息、作者、雜湊過濾)
 */
export const TimelineDrawer: React.FC<TimelineDrawerProps> = ({ className = '' }) => {
  const {
    commits,
    currentIndex,
    isDrawerOpen,
    setIsDrawerOpen,
    goToIndex,
    isPlaying,
  } = useHistoryStore();

  const [filterKeyword, setFilterKeyword] = useState('');
  const activeItemRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // 根據搜尋關鍵字即時過濾 commit 清單（同時保留原始 index 便於 goToIndex）
  const filteredCommitsWithIndex = useMemo(() => {
    if (!filterKeyword.trim()) {
      return commits.map((c, idx) => ({ commit: c, originalIndex: idx }));
    }
    const q = filterKeyword.toLowerCase().trim();
    return commits
      .map((c, idx) => ({ commit: c, originalIndex: idx }))
      .filter(({ commit }) => {
        return (
          commit.subject.toLowerCase().includes(q) ||
          commit.authorName.toLowerCase().includes(q) ||
          commit.shortHash.toLowerCase().includes(q) ||
          (commit.body && commit.body.toLowerCase().includes(q))
        );
      });
  }, [commits, filterKeyword]);

  // 當 currentIndex 改變且抽屜開啟時，自動將選中項滾動到視野中
  useEffect(() => {
    if (isDrawerOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: isPlaying ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
  }, [currentIndex, isDrawerOpen, isPlaying]);

  if (!isDrawerOpen) {
    return null;
  }

  return (
    <aside
      className={`relative z-20 flex flex-col h-full w-80 sm:w-96 flex-shrink-0 bg-[var(--vscode-sideBar-background,#181818)] border-r border-[var(--vscode-sideBar-border,#282828)] shadow-2xl transition-all duration-300 ease-in-out select-none overflow-hidden ${className}`}
      aria-label="Commit History Timeline Drawer"
    >
      {/* 頂部標題列 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--vscode-sideBar-border,#282828)] bg-[var(--vscode-sideBarSectionHeader-background,rgba(255,255,255,0.02))]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--vscode-sideBarTitle-foreground,#bbbbbb)]">
            Commit 歷史時間軸
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--vscode-badge-background,#4d4d4d)] text-[var(--vscode-badge-foreground,#ffffff)]">
            {currentIndex + 1} / {commits.length}
          </span>
        </div>

        <button
          onClick={() => setIsDrawerOpen(false)}
          className="p-1 rounded hover:bg-[var(--vscode-toolbar-hoverBackground,rgba(255,255,255,0.1))] text-[var(--vscode-foreground,#cccccc)] hover:text-white transition-colors"
          title="關閉歷史抽屜 (Esc)"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 搜尋過濾輸入框 */}
      <div className="p-3 border-b border-[var(--vscode-sideBar-border,#282828)]">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="過濾訊息、作者或雜湊 (Commit)..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded bg-[var(--vscode-input-background,#252526)] text-[var(--vscode-input-foreground,#cccccc)] border border-[var(--vscode-input-border,#3c3c3c)] placeholder-neutral-500 focus:outline-none focus:border-[var(--vscode-focusBorder,#007fd4)] transition-colors"
          />
          {filterKeyword && (
            <button
              onClick={() => setFilterKeyword('')}
              className="absolute right-2 text-neutral-400 hover:text-neutral-200"
              title="清除搜尋"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Commit 歷史清單 */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto divide-y divide-[var(--vscode-sideBar-border,rgba(255,255,255,0.05))] scrollbar-thin scrollbar-thumb-neutral-700"
      >
        {commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-500 text-xs gap-2">
            <GitCommit className="w-8 h-8 stroke-1 text-neutral-600" />
            <p>無可用的 Git 提交歷史</p>
          </div>
        ) : filteredCommitsWithIndex.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-500 text-xs gap-2">
            <Search className="w-6 h-6 stroke-1 text-neutral-600" />
            <p>找不到符合「{filterKeyword}」的 Commit</p>
          </div>
        ) : (
          filteredCommitsWithIndex.map(({ commit, originalIndex }) => {
            const isSelected = originalIndex === currentIndex;

            return (
              <div
                key={commit.hash}
                ref={isSelected ? activeItemRef : null}
                onClick={() => goToIndex(originalIndex)}
                className={`group relative flex flex-col gap-1.5 px-3.5 py-3 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-[var(--vscode-list-activeSelectionBackground,#094771)] text-[var(--vscode-list-activeSelectionForeground,#ffffff)] shadow-inner'
                    : 'hover:bg-[var(--vscode-list-hoverBackground,rgba(255,255,255,0.04))] text-[var(--vscode-sideBar-foreground,#cccccc)]'
                }`}
              >
                {/* 選中左側亮條指示器 */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--vscode-focusBorder,#007fd4)]" />
                )}

                {/* 第一行：雜湊、相對時間、選中標記 */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-medium ${
                        isSelected
                          ? 'bg-blue-600/40 text-blue-200 border border-blue-400/40'
                          : 'bg-neutral-800 text-neutral-300 border border-neutral-700/50 group-hover:border-neutral-600'
                      }`}
                      title={`完整 Hash: ${commit.hash}`}
                    >
                      {commit.shortHash}
                    </span>
                    {originalIndex === 0 && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                        最新
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] opacity-75">
                    <Calendar className="w-3 h-3" />
                    <span>{commit.relativeDate}</span>
                  </div>
                </div>

                {/* 第二行：Commit Message */}
                <div
                  className={`text-xs font-medium line-clamp-2 leading-relaxed ${
                    isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'
                  }`}
                  title={commit.subject}
                >
                  {commit.subject}
                </div>

                {/* 第三行：作者與增減行數徽章 */}
                <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px]">
                  <div className="flex items-center gap-1 text-neutral-400 truncate max-w-[150px]">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{commit.authorName}</span>
                  </div>

                  {/* 增減行數 Badge */}
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {commit.insertions > 0 && (
                      <span
                        className="px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-semibold"
                        title={`新增 ${commit.insertions} 行`}
                      >
                        +{commit.insertions}
                      </span>
                    )}
                    {commit.deletions > 0 && (
                      <span
                        className="px-1 py-0.2 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40 font-semibold"
                        title={`刪除 ${commit.deletions} 行`}
                      >
                        -{commit.deletions}
                      </span>
                    )}
                    {commit.insertions === 0 && commit.deletions === 0 && (
                      <span className="text-neutral-500 text-[10px]">0 變更</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 抽屜底部狀態欄 */}
      <div className="px-4 py-2 text-[11px] text-neutral-400 border-t border-[var(--vscode-sideBar-border,#282828)] bg-[var(--vscode-sideBarSectionHeader-background,rgba(0,0,0,0.2))] flex items-center justify-between">
        <span>共 {commits.length} 個 Commit 版本</span>
        <span className="text-neutral-500">點擊任意版本立即時光跳轉</span>
      </div>
    </aside>
  );
};
