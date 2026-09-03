import React from 'react';
import { TokenizedLine } from '../../types';
import { getDiffGutterSign } from '../../highlighter/token-engine';

interface GutterProps {
  lines: TokenizedLine[];
  lineHeight?: number;
}

export const Gutter: React.FC<GutterProps> = ({ lines, lineHeight = 22 }) => {
  return (
    <div
      className="select-none flex flex-col text-right font-mono pr-3 pl-2 border-r border-[var(--vscode-editorRuler-foreground,rgba(128,128,128,0.2))] bg-[var(--vscode-editorGutter-background,var(--vscode-editor-background,#1e1e1e))]"
      style={{
        lineHeight: `${lineHeight}px`,
        fontSize: 'var(--vscode-editor-font-size, 13px)',
      }}
      aria-hidden="true"
    >
      {lines.map((line, idx) => {
        const sign = getDiffGutterSign(line.diffType);
        const displayLineNumber = line.newLineNumber ?? line.lineNumber ?? idx + 1;

        return (
          <div
            key={`gutter-${idx}`}
            className="flex items-center justify-end gap-1.5 h-[22px] group"
            style={{ height: `${lineHeight}px` }}
          >
            {/* 差異符號 (+ / - / 空格) */}
            <span
              className={`w-3 text-center text-xs select-none ${sign.className}`}
              title={line.diffType === 'add' ? 'Added in this commit' : line.diffType === 'del' ? 'Deleted' : ''}
            >
              {sign.symbol}
            </span>

            {/* 行號 */}
            <span className="w-8 text-[var(--vscode-editorLineNumber-foreground,#858585)] group-hover:text-[var(--vscode-editorLineNumber-activeForeground,#c6c6c6)] text-xs tabular-nums">
              {line.diffType === 'del' ? (line.oldLineNumber ?? '') : displayLineNumber}
            </span>
          </div>
        );
      })}
    </div>
  );
};
