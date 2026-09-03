import React, { useMemo, useRef, useEffect } from 'react';
import { useHistoryStore } from '../../stores/history.store';
import { tokenizeCode } from '../../highlighter/token-engine';
import { Gutter } from './Gutter';
import { AnimatedTokenLayer } from './AnimatedTokenLayer';
import { StaticNativeLayer } from './StaticNativeLayer';
import { TokenizedLine } from '../../types';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface CodeViewerProps {
  content?: string;
  isAnimatingOverride?: boolean;
  viewMode?: 'snapshot' | 'diff';
}

/**
 * 核心代碼檢視器 (CodeViewer)
 * 實作專利級雙層 DOM 架構：
 * 1. isAnimating === true: 掛載 AnimatedTokenLayer 呈現平滑彈簧位移與淡入淡出動畫
 * 2. isAnimating === false: 自動無縫切換至 StaticNativeLayer 原生連貫 pre/code 結構，保留 100% 複製與文字選取
 */
export const CodeViewer: React.FC<CodeViewerProps> = ({
  content: propContent,
  isAnimatingOverride,
  viewMode = 'snapshot',
}) => {
  const {
    currentContent: storeContent,
    diffLines,
    isAnimating: storeAnimating,
    isLoading,
    commits,
    currentIndex,
  } = useHistoryStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 取得有效內容
  const content = propContent !== undefined ? propContent : storeContent;
  const isAnimating = isAnimatingOverride !== undefined ? isAnimatingOverride : storeAnimating;
  const currentCommit = commits[currentIndex];

  // 根據 viewMode 切分 Token
  const tokenizedLines: TokenizedLine[] = useMemo(() => {
    if (viewMode === 'diff' && diffLines.length > 0) {
      return tokenizeCode(diffLines);
    }
    return tokenizeCode(content, diffLines);
  }, [content, diffLines, viewMode]);

  // 當切換 Commit 時，適度平滑重置或保持視圖
  useEffect(() => {
    // 若需要可同步滾動位置
  }, [currentIndex]);

  const isEmpty = tokenizedLines.length === 0 && !isLoading;

  return (
    <div className="relative flex flex-col flex-1 h-full w-full overflow-hidden bg-[var(--vscode-editor-background,#1e1e1e)] text-[var(--vscode-editor-foreground,#d4d4d4)] font-mono">
      {/* 狀態導覽小工具（雙層 DOM 狀態指示） */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-[var(--vscode-editorRuler-foreground,rgba(128,128,128,0.2))] bg-[var(--vscode-editorWidget-background,#252526)] select-none">
        <div className="flex items-center gap-2">
          {currentCommit ? (
            <>
              <span className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--vscode-badge-background,#4d4d4d)] text-[var(--vscode-badge-foreground,#ffffff)] font-medium">
                {currentCommit.shortHash}
              </span>
              <span className="text-[var(--vscode-descriptionForeground,#858585)] truncate max-w-xs">
                {currentCommit.subject}
              </span>
            </>
          ) : (
            <span className="text-[var(--vscode-descriptionForeground,#858585)]">
              No commit selected
            </span>
          )}
        </div>

        {/* 雙層 DOM 狀態與統計標籤 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {isAnimating ? (
              <span className="flex items-center gap-1 text-[#4ec9b0] text-[11px] animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Spring Motion</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--vscode-descriptionForeground,#858585)] text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />
                <span>Native Selection</span>
              </span>
            )}
          </div>
          <span className="text-[var(--vscode-descriptionForeground,#858585)] text-[11px]">
            {tokenizedLines.length} lines
          </span>
        </div>
      </div>

      {/* 載入遮罩 */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--vscode-editor-background,#1e1e1e)] bg-opacity-70 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-sm text-[var(--vscode-editor-foreground,#d4d4d4)] bg-[var(--vscode-editorWidget-background,#252526)] px-4 py-2 rounded-md shadow-lg border border-[var(--vscode-widget-border,rgba(128,128,128,0.3))]">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--vscode-progressBar-background,#0e70c0)]" />
            <span>Loading snapshot...</span>
          </div>
        </div>
      )}

      {/* 代碼與行號主滾動視圖 */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--vscode-descriptionForeground,#858585)] p-6 select-none">
          <p className="text-sm">No content to display or file is empty at this commit.</p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex-1 flex overflow-auto relative custom-scrollbar select-text"
        >
          {/* 左側：行號與差異欄 */}
          <div className="sticky left-0 z-10 shrink-0 h-fit">
            <Gutter lines={tokenizedLines} />
          </div>

          {/* 右側：雙層 DOM 代碼主體 */}
          <div className="flex-1 min-w-0 h-fit">
            {isAnimating ? (
              // 動畫層：彈簧位移與過渡特效
              <AnimatedTokenLayer lines={tokenizedLines} />
            ) : (
              // 靜態層：標準連貫 pre/code，保證滑鼠反白與複製 100% 完整無損
              <StaticNativeLayer lines={tokenizedLines} />
            )}
          </div>
        </div>
      )}

      {/* 自訂捲軸樣式 */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--vscode-scrollbarSlider-background, rgba(121, 121, 121, 0.4));
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7));
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: var(--vscode-scrollbarSlider-activeBackground, rgba(191, 191, 191, 0.6));
        }
      `}</style>
    </div>
  );
};
