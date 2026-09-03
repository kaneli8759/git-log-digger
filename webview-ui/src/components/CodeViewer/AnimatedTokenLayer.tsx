import React from 'react';
import { TokenizedLine } from '../../types';
import {
  getTokenStyle,
  getDiffLineBackground,
} from '../../highlighter/token-engine';

interface AnimatedTokenLayerProps {
  lines: TokenizedLine[];
  lineHeight?: number;
}

/**
 * 彈簧物理與過渡動畫層 (AnimatedTokenLayer)
 * 僅在 isAnimating === true 時渲染。
 * 透過 CSS 彈簧曲線 (cubic-bezier) 與級聯延遲呈現程式碼行的新增、位移與淡入動效。
 */
export const AnimatedTokenLayer: React.FC<AnimatedTokenLayerProps> = ({
  lines,
  lineHeight = 22,
}) => {
  return (
    <div
      className="animated-layer w-full min-w-max select-none pointer-events-none relative overflow-hidden"
      style={{
        lineHeight: `${lineHeight}px`,
        fontSize: 'var(--vscode-editor-font-size, 13px)',
        fontFamily:
          "var(--vscode-editor-font-family, Menlo, Monaco, 'Courier New', monospace)",
      }}
    >
      {lines.map((line, idx) => {
        const isAdded = line.diffType === 'add';
        const isDeleted = line.diffType === 'del';
        const staggerDelay = Math.min(idx * 6, 180);

        return (
          <div
            key={`animated-line-${line.lineNumber}-${idx}`}
            className="flex items-center px-4 w-full min-w-max whitespace-pre transform transition-all duration-350"
            style={{
              height: `${lineHeight}px`,
              backgroundColor: getDiffLineBackground(line.diffType),
              // 彈簧物理效果 (Spring motion easing)
              transitionTimingFunction: isAdded
                ? 'cubic-bezier(0.34, 1.45, 0.64, 1)' // 彈簧過衝
                : 'cubic-bezier(0.16, 1, 0.3, 1)',   // 平滑阻尼
              transitionDuration: isAdded ? '420ms' : '320ms',
              transitionDelay: `${staggerDelay}ms`,
              transform: isAdded
                ? 'translateY(0) scale(1)'
                : isDeleted
                ? 'scale(0.98)'
                : 'none',
              animation: isAdded
                ? 'springLineIn 420ms cubic-bezier(0.34, 1.45, 0.64, 1) forwards'
                : undefined,
              opacity: isDeleted ? 0.6 : 1,
            }}
          >
            {line.tokens.map((token, tIdx) => (
              <span
                key={`tok-${idx}-${tIdx}`}
                className={`${getTokenStyle(token.type)} transition-colors duration-200`}
              >
                {token.content}
              </span>
            ))}
          </div>
        );
      })}

      <style>{`
        @keyframes springLineIn {
          0% {
            opacity: 0;
            transform: translateY(6px) scale(0.99);
          }
          70% {
            opacity: 1;
            transform: translateY(-1px) scale(1.002);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
