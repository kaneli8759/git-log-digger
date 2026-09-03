import React from 'react';
import { TokenizedLine } from '../../types';
import {
  getTokenStyle,
  getDiffLineBackground,
} from '../../highlighter/token-engine';

interface StaticNativeLayerProps {
  lines: TokenizedLine[];
  lineHeight?: number;
  targetLineNumber?: number | null;
  targetKeyword?: string;
}

/**
 * 靜態原生連貫層 (StaticNativeLayer)
 * 當 isAnimating === false (靜止時) 渲染。
 * 核心設計理念：
 * 使用標準連貫的 <pre><code> DOM 結構，徹底解決原版 Git History 擴充套件
 * 因絕對定位/Canvas 切割導致的「選取破損、換行消失、縮排錯位」問題。
 * 100% 保留滑鼠原生反白拖曳、全選與 Cmd+C / Ctrl+C 複製完整性。
 */
export const StaticNativeLayer: React.FC<StaticNativeLayerProps> = ({
  lines,
  lineHeight = 22,
  targetLineNumber,
  targetKeyword,
}) => {
  return (
    <pre
      className="static-layer m-0 p-0 w-full min-w-max select-text cursor-text selection:bg-[var(--vscode-editor-selectionBackground,#264f78)] selection:text-[var(--vscode-editor-selectionForeground,inherit)]"
      style={{
        lineHeight: `${lineHeight}px`,
        fontSize: 'var(--vscode-editor-font-size, 13px)',
        fontFamily:
          "var(--vscode-editor-font-family, Menlo, Monaco, 'Courier New', monospace)",
        tabSize: 4,
      }}
    >
      <code className="block w-full min-w-max font-inherit">
        {lines.map((line, idx) => {
          const isTarget = targetLineNumber === line.lineNumber;
          const bg = isTarget
            ? 'var(--vscode-editor-findMatchHighlightBackground, rgba(234, 179, 8, 0.28))'
            : getDiffLineBackground(line.diffType);

          return (
            <div
              key={`static-line-${line.lineNumber}-${idx}`}
              id={`code-line-${line.lineNumber}`}
              data-line-number={line.lineNumber}
              data-diff-type={line.diffType}
              className={`code-line flex items-center px-4 w-full min-w-max whitespace-pre transition-colors duration-200 ${
                isTarget
                  ? 'ring-1 ring-amber-400/80 shadow-sm'
                  : 'hover:bg-[var(--vscode-editor-lineHighlightBackground,rgba(255,255,255,0.03))]'
              }`}
              style={{
                height: `${lineHeight}px`,
                backgroundColor: bg,
              }}
            >
              {line.tokens.length > 0 ? (
                line.tokens.map((token, tIdx) => {
                  const tokenContent = token.content;
                  const isKeywordMatch =
                    isTarget &&
                    targetKeyword &&
                    tokenContent.toLowerCase().includes(targetKeyword.toLowerCase());

                  return (
                    <span
                      key={`tok-${idx}-${tIdx}`}
                      className={`${getTokenStyle(token.type)} ${
                        isKeywordMatch ? 'bg-amber-400 text-black font-semibold rounded px-0.5' : ''
                      }`}
                    >
                      {tokenContent}
                    </span>
                  );
                })
              ) : (
                // 處理空行以保證原生連貫選取時能正常抓取空行換行符
                <span className="inline-block w-0 text-transparent select-none">
                  &#8203;
                </span>
              )}
            </div>
          );
        })}
      </code>
    </pre>
  );
};
