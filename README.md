# 🚀 Git Log Digger

> **Deep dive into the animated history of your codebase.**  
> 專為 **VS Code** 與 **Antigravity IDE** 打造的 Local-First 動態代碼歷史時光機。

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![Platform](https://img.shields.io/badge/platform-VS%20Code%20%7C%20Antigravity%20IDE-orange.svg)](#)

---

## ✨ 核心特色

1. **Local-First 本機優先架構**：
   - 零 Token、零外連、零 API Rate Limit 限制。
   - 完美支援企業內部 GitLab、Bitbucket、自建私有 Git 儲存庫，零資安隱私風險。
2. **雙層 DOM 渲染（解決原版選取複製破損痛點）**：
   - **動畫演化中**：彈簧物理平滑位移與淡入淡出。
   - **靜止檢視時**：自動無縫切換為標準連貫 `<pre><code>`，100% 保留滑鼠原生拖曳反白選取、完整保留換行符號與縮排複製。
3. **雙軌歷史搜尋與時光穿梭**：
   - `Cmd + F`：當前 Commit 快照內文字即時搜尋與高亮。
   - `Cmd + Shift + F`：跨歷史 Pickaxe 搜尋（底層 `git log -S "<query>"`），毫秒級找出包含關鍵字增減的歷史節點並一鍵穿梭。
4. **原生 IDE 主題完美融合**：
   - 完整繼承 VS Code / Antigravity IDE 原生色彩變數（`--vscode-editor-background` 等），深淺色主題切換秒級同步。
5. **完整播放控制器與一鍵匯出**：
   - 支援 0.5x ~ 2.0x 演化播放、單步步進、時間軸拉桿。
   - 一鍵複製全檔快照、Markdown Diff 差異，或切換至 VS Code 原生 Diff Editor。

---

## 🛠️ 開發與建置

### 安裝依賴
```bash
npm install
npm --prefix webview-ui install
```

### 建置專案
```bash
# 同時建置 Webview 前端與 Extension Host
npm run build

# 或單獨建置
npm run build:webview
npm run build:extension
```

### 偵錯執行
在 VS Code 或 Antigravity IDE 中按下 `F5` 啟動 **Extension Development Host**。

---

## 快捷鍵一覽

| 快捷鍵 | 功能 |
|---|---|
| `Space` | 播放 / 暫停歷史演化 |
| `ArrowLeft` / `ArrowRight` | 上一筆 / 下一筆 Commit 步進 |
| `Cmd + F` / `Ctrl + F` | 當前 Commit 內容即時搜尋 |
| `Cmd + Shift + F` / `Ctrl + Shift + F` | 跨歷史 Pickaxe 時光穿梭搜尋 |
| `Esc` | 關閉搜尋視窗或收合時間軸抽屜 |
