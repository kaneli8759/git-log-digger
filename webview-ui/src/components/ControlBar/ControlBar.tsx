import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHistoryStore } from '../../stores/history.store';
import { useVscodeRpc } from '../../hooks/useVscodeRpc';
import { DiffLine } from '../../types';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileCode2,
  GitCompare,
  ExternalLink,
  Check,
  Gauge,
  Sparkles,
} from 'lucide-react';

interface ControlBarProps {
  className?: string;
}

const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0];

/**
 * 底部播放控制列 (ControlBar)
 * 功能：
 * 1. 上一筆 / 下一筆單步按鈕（提示快捷鍵 Left / Right）
 * 2. 播放 / 暫停按鈕（點擊後自動依時序演化推進）
 * 3. 時間軸進度 Slider 滑桿（即時拖曳穿梭）
 * 4. 播放倍速切換（0.5x, 1.0x, 1.5x, 2.0x）
 * 5. [Copy Snapshot] 按鈕（一鍵複製當前 Commit 全檔內容）
 * 6. [Copy Diff] 按鈕（一鍵複製 Markdown 格式差異）
 * 7. [Open in IDE Diff] 按鈕（在 VS Code / Antigravity 原生 Diff 視窗開啟對照）
 */
export const ControlBar: React.FC<ControlBarProps> = ({ className = '' }) => {
  const {
    commits,
    currentIndex,
    currentContent,
    diffLines,
    isPlaying,
    playbackSpeed,
    prevCommit,
    nextCommit,
    togglePlay,
    goToIndex,
    setSpeed,
  } = useHistoryStore();

  const { copyToClipboard, openDiffInIde } = useVscodeRpc();

  // 複製視覺反饋狀態
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const [copiedDiff, setCopiedDiff] = useState(false);

  const currentCommit = commits[currentIndex];
  // 在 Git Log 由新到舊排序中，前一個版本（父版本）為 currentIndex + 1
  const previousCommit = currentIndex < commits.length - 1 ? commits[currentIndex + 1] : undefined;

  // 自動演化定時器
  useEffect(() => {
    if (!isPlaying) return;

    // 依據倍速決定演化間隔
    const intervalMs = Math.round(1100 / playbackSpeed);
    const timer = setInterval(() => {
      nextCommit();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, nextCommit]);

  // 複製當前 Commit 全檔快照
  const handleCopySnapshot = useCallback(() => {
    if (!currentCommit) return;
    copyToClipboard(
      currentContent,
      `已複製 Commit ${currentCommit.shortHash} 的全檔代碼快照`
    );
    setCopiedSnapshot(true);
    setTimeout(() => setCopiedSnapshot(false), 2000);
  }, [copyToClipboard, currentContent, currentCommit]);

  // 複製 Markdown Diff
  const handleCopyDiff = useCallback(() => {
    if (!currentCommit) return;

    let formattedDiffBody = '';
    if (diffLines && diffLines.length > 0) {
      formattedDiffBody = diffLines
        .map((line: DiffLine) => {
          if (line.type === 'add') return `+ ${line.content}`;
          if (line.type === 'del') return `- ${line.content}`;
          return `  ${line.content}`;
        })
        .join('\n');
    } else {
      formattedDiffBody = '// 無差異內容或為初始提交 (Initial Commit)';
    }

    const markdown = [
      `### Git Log Digger Diff: ${currentCommit.shortHash} - ${currentCommit.subject}`,
      `> **作者**: ${currentCommit.authorName} (${currentCommit.authorEmail})`,
      `> **時間**: ${currentCommit.date} (${currentCommit.relativeDate})`,
      `> **變更統計**: +${currentCommit.insertions} / -${currentCommit.deletions}`,
      '',
      '```diff',
      formattedDiffBody,
      '```',
    ].join('\n');

    copyToClipboard(markdown, `已複製 Commit ${currentCommit.shortHash} 的 Markdown Diff`);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  }, [copyToClipboard, currentCommit, diffLines]);

  // 在 IDE 原生 Diff 視窗開啟
  const handleOpenInIdeDiff = useCallback(() => {
    if (!currentCommit) return;
    openDiffInIde(currentCommit.hash, previousCommit?.hash);
  }, [openDiffInIde, currentCommit, previousCommit]);

  // 循環切換倍速
  const handleCycleSpeed = useCallback(() => {
    const currentSpeedIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentSpeedIndex + 1) % SPEED_OPTIONS.length;
    setSpeed(SPEED_OPTIONS[nextIndex]);
  }, [playbackSpeed, setSpeed]);

  const hasCommits = commits.length > 0;
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= commits.length - 1;

  return (
    <footer
      className={`relative z-10 flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 bg-[var(--vscode-editorWidget-background,#202020)] border-t border-[var(--vscode-widget-border,#2d2d2d)] text-[var(--vscode-foreground,#cccccc)] shadow-xl select-none gap-3 sm:gap-2 ${className}`}
      aria-label="Playback and Snapshot Controls"
    >
      {/* 左區：播放控制器與步進按鈕 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* 上一筆 (ArrowLeft) */}
        <button
          onClick={prevCommit}
          disabled={!hasCommits || isFirst}
          className="flex items-center justify-center w-8 h-8 rounded bg-[var(--vscode-button-secondaryBackground,#313131)] hover:bg-[var(--vscode-button-secondaryHoverBackground,#3c3c3c)] text-[var(--vscode-button-secondaryForeground,#ffffff)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
          title="上一版本 (快捷鍵: Left Arrow)"
          aria-label="Previous Commit"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 播放 / 暫停 (Space) */}
        <button
          onClick={togglePlay}
          disabled={!hasCommits}
          className={`flex items-center justify-center w-9 h-9 rounded-md font-semibold transition-all duration-200 active:scale-95 shadow-md ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
              : 'bg-[var(--vscode-button-background,#0e639c)] hover:bg-[var(--vscode-button-hoverBackground,#1177bb)] text-[var(--vscode-button-foreground,#ffffff)]'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title={isPlaying ? '暫停播放 (快捷鍵: Space)' : '自動時序演化播放 (快捷鍵: Space)'}
          aria-label={isPlaying ? 'Pause Playback' : 'Start Playback'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* 下一筆 (ArrowRight) */}
        <button
          onClick={nextCommit}
          disabled={!hasCommits || isLast}
          className="flex items-center justify-center w-8 h-8 rounded bg-[var(--vscode-button-secondaryBackground,#313131)] hover:bg-[var(--vscode-button-secondaryHoverBackground,#3c3c3c)] text-[var(--vscode-button-secondaryForeground,#ffffff)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
          title="下一版本 (快捷鍵: Right Arrow)"
          aria-label="Next Commit"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* 倍速切換按鈕 */}
        <button
          onClick={handleCycleSpeed}
          className="flex items-center gap-1 ml-1 px-2 py-1 rounded text-xs font-mono font-medium bg-[var(--vscode-badge-background,#3a3d41)] hover:bg-[var(--vscode-toolbar-hoverBackground,rgba(255,255,255,0.1))] text-[var(--vscode-badge-foreground,#ffffff)] transition-colors"
          title="切換演化播放速度 (0.5x, 1.0x, 1.5x, 2.0x)"
          aria-label="Playback Speed"
        >
          <Gauge className="w-3 h-3 text-neutral-400" />
          <span>{playbackSpeed.toFixed(1)}x</span>
        </button>
      </div>

      {/* 中區：時間軸進度 Slider 滑桿 */}
      <div className="flex items-center gap-3 w-full sm:max-w-md md:max-w-lg lg:max-w-xl px-2">
        <span className="text-[11px] font-mono text-neutral-400 flex-shrink-0">
          {hasCommits ? `${currentIndex + 1} / ${commits.length}` : '0 / 0'}
        </span>

        <div className="relative flex-1 flex items-center group">
          <input
            type="range"
            min={0}
            max={Math.max(0, commits.length - 1)}
            value={currentIndex}
            disabled={!hasCommits}
            onChange={(e) => goToIndex(Number(e.target.value))}
            className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[var(--vscode-button-background,#0e639c)] focus:outline-none transition-all"
            aria-label="Timeline scrubber"
          />
        </div>

        {/* 當前版本 Hash 徽章 */}
        {currentCommit && (
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 flex-shrink-0 hidden md:inline-block"
            title={`Commit Hash: ${currentCommit.hash}`}
          >
            {currentCommit.shortHash}
          </span>
        )}
      </div>

      {/* 右區：複製與 IDE Diff 整合功能按鈕 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Copy Snapshot 按鈕 */}
        <button
          onClick={handleCopySnapshot}
          disabled={!currentCommit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-[var(--vscode-button-secondaryBackground,#313131)] hover:bg-[var(--vscode-button-secondaryHoverBackground,#3c3c3c)] text-[var(--vscode-button-secondaryForeground,#ffffff)] disabled:opacity-40 transition-all duration-150 active:scale-95 border border-white/5"
          title="一鍵複製此版本完整檔案代碼快照"
          aria-label="Copy Snapshot"
        >
          {copiedSnapshot ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">已複製快照</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Snapshot</span>
            </>
          )}
        </button>

        {/* Copy Diff 按鈕 */}
        <button
          onClick={handleCopyDiff}
          disabled={!currentCommit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-[var(--vscode-button-secondaryBackground,#313131)] hover:bg-[var(--vscode-button-secondaryHoverBackground,#3c3c3c)] text-[var(--vscode-button-secondaryForeground,#ffffff)] disabled:opacity-40 transition-all duration-150 active:scale-95 border border-white/5"
          title="複製 Markdown 格式差異（便於貼至 PR 或 Chat）"
          aria-label="Copy Diff Markdown"
        >
          {copiedDiff ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">已複製 Diff</span>
            </>
          ) : (
            <>
              <GitCompare className="w-3.5 h-3.5" />
              <span>Copy Diff</span>
            </>
          )}
        </button>

        {/* Open in IDE Diff 按鈕 */}
        <button
          onClick={handleOpenInIdeDiff}
          disabled={!currentCommit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-[var(--vscode-button-background,#0e639c)] hover:bg-[var(--vscode-button-hoverBackground,#1177bb)] text-[var(--vscode-button-foreground,#ffffff)] disabled:opacity-40 transition-all duration-150 active:scale-95 shadow-sm"
          title="在 VS Code / Antigravity 原生 Diff 視窗開啟與前一版本的對比"
          aria-label="Open in IDE Diff"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Open in IDE Diff</span>
          <span className="lg:hidden">IDE Diff</span>
        </button>
      </div>
    </footer>
  );
};
