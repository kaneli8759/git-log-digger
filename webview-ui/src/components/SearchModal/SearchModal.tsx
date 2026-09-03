import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useHistoryStore } from '../../stores/history.store';
import { useVscodeRpc } from '../../hooks/useVscodeRpc';
import { PickaxeSearchResult } from '../../types';
import {
  Search,
  History,
  FileCode2,
  X,
  ArrowRight,
  Calendar,
  User,
  Loader2,
  Sparkles,
  GitCommit,
  CheckCircle2,
  CornerDownLeft,
} from 'lucide-react';

interface SearchModalProps {
  className?: string;
  onJumpToLine?: (lineNumber: number) => void;
}

/**
 * 雙軌搜尋視窗 (SearchModal)
 * 支援：
 * 1. 單一 Commit 搜尋 (Cmd+F)：在當前代碼快照中即時搜尋關鍵字，列出行號並支援點擊跳轉高亮
 * 2. 跨歷史 Pickaxe 搜尋 (Cmd+Shift+F)：呼叫 Git 本機 `git log -S`，列出歷史中包含關鍵字變更的所有 Commits，點擊直接時光穿梭！
 */
export const SearchModal: React.FC<SearchModalProps> = ({
  className = '',
  onJumpToLine,
}) => {
  const {
    isSearchModalOpen,
    setIsSearchModalOpen,
    searchMode,
    setSearchMode,
    currentContent,
    commits,
    goToIndex,
    searchResults,
    setSearchResults,
    jumpToLine,
    setPendingSearchKeyword,
  } = useHistoryStore();

  const { requestPickaxeSearch } = useVscodeRpc();

  const [keyword, setKeyword] = useState('');
  const [isSearchingPickaxe, setIsSearchingPickaxe] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 當 Modal 開啟時自動選中輸入框
  useEffect(() => {
    if (isSearchModalOpen) {
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setKeyword('');
      setSelectedIndex(0);
    }
  }, [isSearchModalOpen]);

  // 當 keyword 或模式改變時重置選取索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [keyword, searchMode]);

  // 單一 Commit 代碼內部即時行搜尋
  const singleFileMatches = useMemo(() => {
    if (searchMode !== 'single' || !keyword.trim()) return [];

    const lines = currentContent.split('\n');
    const q = keyword.toLowerCase();
    const matches: { lineNumber: number; text: string; matchIndex: number }[] = [];

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      const matchIdx = lower.indexOf(q);
      if (matchIdx !== -1) {
        matches.push({
          lineNumber: index + 1,
          text: line,
          matchIndex: matchIdx,
        });
      }
    });

    return matches;
  }, [searchMode, keyword, currentContent]);

  // 發起 Pickaxe 跨歷史搜尋
  const handlePickaxeSearch = useCallback(() => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    setIsSearchingPickaxe(true);
    setSearchResults([]);
    setSelectedIndex(0);
    requestPickaxeSearch(trimmed);
  }, [keyword, requestPickaxeSearch, setSearchResults]);

  // 當 searchResults 更新時關閉 Pickaxe Loading
  useEffect(() => {
    if (searchResults.length > 0) {
      setIsSearchingPickaxe(false);
      setSelectedIndex(0);
    }
  }, [searchResults]);

  // 點擊單檔搜尋結果跳轉行
  const handleSelectLineMatch = useCallback((lineNumber: number) => {
    jumpToLine(lineNumber, keyword.trim());
    if (onJumpToLine) {
      onJumpToLine(lineNumber);
    }
    setIsSearchModalOpen(false);
  }, [jumpToLine, keyword, onJumpToLine, setIsSearchModalOpen]);

  // 點擊 Pickaxe 歷史結果，精準穿梭至該 Commit 並自動定位至該關鍵字行
  const handleJumpToCommit = useCallback((commitHash: string) => {
    const targetIdx = commits.findIndex(
      (c) => c.hash.toLowerCase() === commitHash.toLowerCase()
    );

    if (targetIdx !== -1) {
      if (keyword.trim()) {
        setPendingSearchKeyword(keyword.trim());
      }
      goToIndex(targetIdx);
      setIsSearchModalOpen(false);
    } else {
      console.warn(`[Pickaxe Jump]: Commit hash ${commitHash} not found in commits array.`);
    }
  }, [commits, goToIndex, keyword, setIsSearchModalOpen, setPendingSearchKeyword]);

  // 處理按鍵事件 (Enter: 跳轉或搜尋, ArrowDown/Up: 切換項目, Esc: 關閉)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSearchModalOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchMode === 'single' && singleFileMatches.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % singleFileMatches.length);
      } else if (searchMode === 'pickaxe' && searchResults.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % searchResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchMode === 'single' && singleFileMatches.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + singleFileMatches.length) % singleFileMatches.length);
      } else if (searchMode === 'pickaxe' && searchResults.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchMode === 'single') {
        if (singleFileMatches.length > 0) {
          const target = singleFileMatches[selectedIndex] || singleFileMatches[0];
          if (target) {
            handleSelectLineMatch(target.lineNumber);
          }
        }
      } else if (searchMode === 'pickaxe') {
        if (searchResults.length > 0 && selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleJumpToCommit(searchResults[selectedIndex].commitHash);
        } else {
          handlePickaxeSearch();
        }
      }
    }
  };

  if (!isSearchModalOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsSearchModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Git History & Code Search Modal"
    >
      <div
        className={`relative w-full max-w-2xl bg-[var(--vscode-editorWidget-background,#252526)] border border-[var(--vscode-widget-border,#333333)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-[var(--vscode-foreground,#cccccc)] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 雙軌模式切換分頁 Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--vscode-widget-border,#333333)] bg-[var(--vscode-sideBarSectionHeader-background,rgba(255,255,255,0.02))]">
          <div className="flex items-center gap-2">
            {/* Tab 1: 單一 Commit 搜尋 */}
            <button
              onClick={() => {
                setSearchMode('single');
                inputRef.current?.focus();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                searchMode === 'single'
                  ? 'bg-[var(--vscode-button-background,#0e639c)] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>當前檔案搜尋</span>
              <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-neutral-300">
                ⌘F
              </kbd>
            </button>

            {/* Tab 2: 跨歷史 Pickaxe 搜尋 */}
            <button
              onClick={() => {
                setSearchMode('pickaxe');
                inputRef.current?.focus();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                searchMode === 'pickaxe'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>跨歷史 Pickaxe 搜尋</span>
              <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-neutral-300">
                ⌘⇧F
              </kbd>
            </button>
          </div>

          {/* 關閉按鈕 */}
          <button
            onClick={() => setIsSearchModalOpen(false)}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="關閉 (Esc)"
            aria-label="Close search modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 搜尋輸入欄 */}
        <div className="p-4 border-b border-[var(--vscode-widget-border,#333333)]">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                searchMode === 'single'
                  ? '在當前版本代碼中搜尋文字...'
                  : '輸入欲追蹤的變更關鍵字（按下 Enter 執行 git log -S 穿梭歷史）...'
              }
              className="w-full pl-9 pr-24 py-2.5 text-sm rounded-lg bg-[var(--vscode-input-background,#1e1e1e)] text-[var(--vscode-input-foreground,#cccccc)] border border-[var(--vscode-input-border,#3c3c3c)] placeholder-neutral-500 focus:outline-none focus:border-[var(--vscode-focusBorder,#007fd4)] transition-colors font-mono"
            />

            {searchMode === 'pickaxe' && (
              <button
                onClick={handlePickaxeSearch}
                disabled={!keyword.trim() || isSearchingPickaxe}
                className="absolute right-2 flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-[var(--vscode-button-background,#0e639c)] hover:bg-[var(--vscode-button-hoverBackground,#1177bb)] text-white disabled:opacity-40 transition-colors font-sans"
              >
                {isSearchingPickaxe ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CornerDownLeft className="w-3.5 h-3.5" />
                )}
                <span>搜尋</span>
              </button>
            )}
          </div>
        </div>

        {/* 結果展示區 */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-white/5 scrollbar-thin scrollbar-thumb-neutral-700 max-h-[50vh]">
          {/* 模式 1: 當前檔案搜尋結果 */}
          {searchMode === 'single' && (
            <div>
              {!keyword.trim() ? (
                <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                  <Search className="w-8 h-8 stroke-1 text-neutral-600" />
                  <p>輸入關鍵字即可即時搜尋當前版本的程式碼內容</p>
                </div>
              ) : singleFileMatches.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500">
                  <p>在當前版本中找不到「{keyword}」</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[11px] text-neutral-400 font-medium">
                    找到 {singleFileMatches.length} 處匹配結果：
                  </div>
                  {singleFileMatches.map(({ lineNumber, text, matchIndex }, idx) => {
                    const before = text.slice(0, matchIndex);
                    const match = text.slice(matchIndex, matchIndex + keyword.length);
                    const after = text.slice(matchIndex + keyword.length);
                    const isSelected = idx === selectedIndex;

                    return (
                      <div
                        key={lineNumber}
                        ref={(el) => {
                          if (isSelected && el) {
                            el.scrollIntoView({ block: 'nearest' });
                          }
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelectLineMatch(lineNumber)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group text-xs font-mono transition-colors ${
                          isSelected
                            ? 'bg-[var(--vscode-list-activeSelectionBackground,#094771)] text-white ring-1 ring-[var(--vscode-focusBorder,#007fd4)]'
                            : 'hover:bg-[var(--vscode-list-hoverBackground,rgba(255,255,255,0.06))]'
                        }`}
                      >
                        <span className={`w-10 text-right flex-shrink-0 ${isSelected ? 'text-amber-300 font-bold' : 'text-neutral-500'}`}>
                          L{lineNumber}
                        </span>
                        <div className={`flex-1 truncate ${isSelected ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                          <span>{before}</span>
                          <mark className="bg-amber-400/40 text-amber-100 font-semibold px-0.5 rounded">
                            {match}
                          </mark>
                          <span>{after}</span>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-black/40 text-neutral-200 border border-white/20 flex items-center gap-1">
                            <span>前往</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 模式 2: Pickaxe 跨歷史搜尋結果 */}
          {searchMode === 'pickaxe' && (
            <div>
              {isSearchingPickaxe ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400 text-xs">
                  <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                  <p>正在跨歷史時空穿梭檢索 (`git log -S "{keyword}"`)...</p>
                </div>
              ) : !keyword.trim() && searchResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                  <History className="w-8 h-8 stroke-1 text-neutral-600" />
                  <p>輸入字詞並按下 Enter，精準尋找歷史中哪次提交「新增」或「刪除」了這段代碼</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500">
                  <p>在檔案歷史中找不到包含「{keyword}」變更的 Commit</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="px-3 py-1.5 text-[11px] text-neutral-400 font-medium flex items-center justify-between">
                    <span>歷史中共找到 {searchResults.length} 次變更提交：</span>
                    <span className="text-amber-400/80">上下鍵選擇 / Enter 或點擊立即穿梭</span>
                  </div>

                  {searchResults.map((res: PickaxeSearchResult, idx: number) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={res.commitHash}
                        ref={(el) => {
                          if (isSelected && el) {
                            el.scrollIntoView({ block: 'nearest' });
                          }
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleJumpToCommit(res.commitHash)}
                        className={`group flex flex-col gap-1.5 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'border-amber-400 bg-[var(--vscode-list-activeSelectionBackground,#094771)] ring-1 ring-amber-400/80'
                            : 'border-neutral-800 bg-neutral-900/40 hover:bg-[var(--vscode-list-hoverBackground,rgba(255,255,255,0.06))] hover:border-amber-500/40'
                        }`}
                      >
                      {/* Commit 標頭 */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                            {res.shortHash}
                          </span>
                          <span className="font-medium text-neutral-200 group-hover:text-white truncate max-w-md">
                            {res.subject}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{res.authorName}</span>
                          </div>
                          <span>•</span>
                          <span>{res.relativeDate}</span>
                        </div>
                      </div>

                      {/* 匹配的差異片段 Snippets */}
                      {res.matchedSnippets && res.matchedSnippets.length > 0 && (
                        <div className="mt-1 p-2 rounded bg-black/40 border border-neutral-800/80 font-mono text-[11px] space-y-0.5 overflow-x-auto">
                          {res.matchedSnippets.slice(0, 5).map((snippet, sIdx) => {
                            const isAdd = snippet.startsWith('+');
                            const isDel = snippet.startsWith('-');
                            return (
                              <div
                                key={sIdx}
                                className={`truncate ${
                                  isAdd
                                    ? 'text-emerald-400 bg-emerald-950/20'
                                    : isDel
                                    ? 'text-rose-400 bg-rose-950/20'
                                    : 'text-neutral-400'
                                }`}
                              >
                                {snippet}
                              </div>
                            );
                          })}
                          {res.matchedSnippets.length > 5 && (
                            <div className="text-neutral-500 text-[10px] pt-1">
                              +{res.matchedSnippets.length - 5} 更多變更行...
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部提示欄 */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--vscode-widget-border,#333333)] bg-[var(--vscode-sideBarSectionHeader-background,rgba(0,0,0,0.2))] text-[11px] text-neutral-400">
          <div className="flex items-center gap-3">
            <span>
              按 <kbd className="px-1 py-0.2 rounded bg-neutral-800 border border-neutral-700 font-mono text-[10px]">Esc</kbd> 關閉視窗
            </span>
            <span>
              按 <kbd className="px-1 py-0.2 rounded bg-neutral-800 border border-neutral-700 font-mono text-[10px]">Enter</kbd> 搜尋或前往
            </span>
          </div>
          <span className="text-neutral-500">Git Log Digger Pickaxe Engine</span>
        </div>
      </div>
    </div>
  );
};
