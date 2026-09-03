import {
  TokenType,
  CodeToken,
  TokenizedLine,
  DiffLine,
  DiffLineType,
} from '../types';

/**
 * 詞法分析規則表
 * 依序比對，優先匹配長語彙、註解與字串
 */
const TOKEN_PATTERNS: Array<{ type: TokenType; regex: RegExp }> = [
  // 註解 (支援 //, #, /* ... */, <!-- ... -->)
  { type: 'comment', regex: /^(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/ },
  // 字串 (支援雙引號、單引號、ES6 Template Literals)
  { type: 'string', regex: /^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/ },
  // 數值 (十六進位、浮點數、科學記號)
  { type: 'number', regex: /^(0x[0-9a-fA-F]+|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/ },
  // 布林值與 Null 語義
  { type: 'boolean', regex: /^\b(true|false|null|undefined|nil|None|True|False)\b/ },
  // 常見程式語言關鍵字 (TS, JS, Rust, Go, Python, C++, Java, Dart)
  {
    type: 'keyword',
    regex:
      /^\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|class|interface|type|enum|extends|implements|import|export|from|as|async|await|try|catch|finally|throw|new|this|super|typeof|instanceof|void|delete|in|of|yield|public|private|protected|readonly|static|def|elif|fn|mut|pub|struct|impl|package|func|select|defer|go|val|final|override)\b/,
  },
  // 內建型別
  {
    type: 'builtin',
    regex:
      /^\b(string|number|boolean|symbol|any|unknown|never|object|int|float|double|char|bool|list|dict|set|tuple|Option|Result|Vec|Promise|Array|Map|Set|Record)\b/,
  },
  // 函式調用 (識別後方帶括號之識別碼)
  { type: 'function', regex: /^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/ },
  // 變數與識別字
  { type: 'variable', regex: /^[a-zA-Z_$][a-zA-Z0-9_$]*/ },
  // 運算子
  {
    type: 'operator',
    regex:
      /^(=>|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|<<|>>|\+|-|\*|\/|%|&|\||\^|~|!|<|>|\?|:)/,
  },
  // 標點符號
  { type: 'punctuation', regex: /^([{}()[\];,.]|\.\.\.)/ },
  // 空格與純文字兜底
  { type: 'plain', regex: /^\s+/ },
  { type: 'plain', regex: /^./ },
];

/**
 * 將單行字串切分為 Token 陣列
 */
export function tokenizeLine(rawText: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let cursor = 0;
  const len = rawText.length;

  while (cursor < len) {
    const slice = rawText.slice(cursor);
    let matched = false;

    for (const { type, regex } of TOKEN_PATTERNS) {
      const match = regex.exec(slice);
      if (match && match[0].length > 0) {
        const text = match[0];
        tokens.push({ type, content: text });
        cursor += text.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // 安全邊界兜底
      tokens.push({ type: 'plain', content: rawText[cursor] });
      cursor++;
    }
  }

  return tokens;
}

/**
 * 將完整檔案內容依行切分並標記語法 Token 與 Diff (+ / -) 狀態
 */
export function tokenizeSnapshot(
  content: string,
  diffLines?: DiffLine[]
): TokenizedLine[] {
  if (!content) return [];

  const rawLines = content.split(/\r?\n/);
  
  // 建立 added line number 快速查詢表
  const addedLinesSet = new Set<number>();
  if (diffLines && diffLines.length > 0) {
    for (const diff of diffLines) {
      if (diff.type === 'add' && diff.newLineNumber !== undefined) {
        addedLinesSet.add(diff.newLineNumber);
      }
    }
  }

  return rawLines.map((rawText, idx) => {
    const lineNum = idx + 1;
    const isAdded = addedLinesSet.has(lineNum);
    return {
      lineNumber: lineNum,
      tokens: tokenizeLine(rawText),
      rawText,
      diffType: isAdded ? 'add' : 'normal',
      newLineNumber: lineNum,
    };
  });
}

/**
 * 將 DiffLine 差異列表切分並標記語法 Token
 */
export function tokenizeDiffLines(diffLines: DiffLine[]): TokenizedLine[] {
  if (!diffLines || diffLines.length === 0) return [];

  return diffLines.map((line, idx) => {
    return {
      lineNumber: idx + 1,
      tokens: tokenizeLine(line.content),
      rawText: line.content,
      diffType: line.type,
      oldLineNumber: line.oldLineNumber,
      newLineNumber: line.newLineNumber,
    };
  });
}

/**
 * 智慧切分引擎：自動判斷輸入為單一內容快照或 Diff 差異列表
 */
export function tokenizeCode(
  contentOrDiff: string | DiffLine[],
  diffLines?: DiffLine[]
): TokenizedLine[] {
  if (Array.isArray(contentOrDiff)) {
    return tokenizeDiffLines(contentOrDiff);
  }
  return tokenizeSnapshot(contentOrDiff, diffLines);
}

/**
 * 取得 TokenType 對應之樣式類別（符合 VS Code 主題高亮慣例）
 */
export function getTokenStyle(type: TokenType): string {
  switch (type) {
    case 'keyword':
      return 'text-[#c586c0] font-semibold'; // VS Code 紫色
    case 'string':
      return 'text-[#ce9178]'; // VS Code 橘紅
    case 'comment':
      return 'text-[#6a9955] italic'; // VS Code 綠色斜體
    case 'number':
      return 'text-[#b5cea8]'; // VS Code 淡青綠
    case 'boolean':
      return 'text-[#569cd6] font-medium'; // VS Code 天藍
    case 'builtin':
      return 'text-[#4ec9b0]'; // VS Code 青綠型別
    case 'function':
      return 'text-[#dcdcaa]'; // VS Code 淡黃
    case 'variable':
      return 'text-[#9cdcfe]'; // VS Code 淺藍
    case 'operator':
      return 'text-[#d4d4d4]'; // VS Code 運算子灰白
    case 'punctuation':
      return 'text-[#cccccc]'; // VS Code 符號灰
    case 'tag':
      return 'text-[#569cd6]';
    case 'attribute':
      return 'text-[#9cdcfe]';
    case 'plain':
    default:
      return 'text-[var(--vscode-editor-foreground,#d4d4d4)]';
  }
}

/**
 * 取得差異行背景色彩（遵循 VS Code 原生 Diff 變數）
 */
export function getDiffLineBackground(diffType: DiffLineType): string {
  switch (diffType) {
    case 'add':
      return 'var(--vscode-diffEditor-insertedLineBackground, rgba(46, 160, 67, 0.18))';
    case 'del':
      return 'var(--vscode-diffEditor-removedLineBackground, rgba(248, 81, 73, 0.18))';
    case 'normal':
    default:
      return 'transparent';
  }
}

/**
 * 取得差異符號標記與色彩
 */
export function getDiffGutterSign(diffType: DiffLineType): {
  symbol: string;
  className: string;
} {
  switch (diffType) {
    case 'add':
      return { symbol: '+', className: 'text-[#3fb950] font-bold' };
    case 'del':
      return { symbol: '-', className: 'text-[#f85149] font-bold' };
    case 'normal':
    default:
      return { symbol: ' ', className: 'text-transparent' };
  }
}
