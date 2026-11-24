# 🚀 Git Log Digger

<p align="center">
  <strong>Deep dive into the animated evolution of your codebase.</strong><br>
  <em>專為 <b>VS Code</b> 與 <b>Antigravity IDE</b> 打造的 Local-First 動態代碼歷史時光機。</em>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=kane-li-dev-6934.git-log-digger"><img src="https://img.shields.io/visual-studio-marketplace/v/kane-li-dev-6934.git-log-digger.svg?style=flat-square&color=blue" alt="Marketplace Version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=kane-li-dev-6934.git-log-digger"><img src="https://img.shields.io/visual-studio-marketplace/i/kane-li-dev-6934.git-log-digger.svg?style=flat-square&color=green" alt="Installs"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-VS%20Code%20%7C%20Antigravity-orange.svg?style=flat-square" alt="Platform">
</p>

---

<p align="center">
  <strong>Language / 語言：</strong>
  <a href="#-english"><b>English</b></a> &nbsp;|&nbsp; 
  <a href="#-繁體中文"><b>繁體中文</b></a>
</p>

---

<a name="english"></a>
## 🌐 English

**Git Log Digger** brings your commit history to life. Instead of wading through static and fragmented diff blocks, it transforms any file's Git history into an interactive, physics-driven time machine. Watch code lines morph, emerge, and retire as you scrub through time.

### ✨ Key Features

- 🎬 **Animated History Player**:
  - Scrub smoothly through commits with spring-physics animations.
  - Line-by-line animated transitions visualize additions, modifications, and deletions naturally.
  - Playback controls: 0.5x ~ 2.0x speeds, single-step stepping, and an interactive timeline slider.
- ⚡ **Dual-Track Search & Time Travel**:
  - `Cmd + F` / `Ctrl + F`: Instant real-time text filter and highlighting within the current commit snapshot.
  - `Cmd + Shift + F` / `Ctrl + Shift + F`: **Git Pickaxe Search** (powered by `git log -S "<query>"`). Find exactly which commit introduced or removed a symbol, function, or keyword across history in milliseconds.
- 📋 **Flawless Code Copying & Selection (Dual-layer DOM)**:
  - Enjoy physics animations during playback, while automatically switching to a standard cohesive `<pre><code>` block when stationary.
  - Guarantees 100% native mouse drag-to-select behavior with preserved indentation, intact blank lines, and zero zero-width space (`\u200B`) pollution.
- 🎨 **Native IDE Theme Integration**:
  - Inherits VS Code / Antigravity editor CSS tokens directly (editor background, syntax tokens, border accents), delivering a unified look in both Dark and Light modes.
- 🔒 **Local-First & 100% Private**:
  - Operates purely on your local Git binary.
  - No cloud services, no telemetry, no AI tokens, and no rate limits. Ideal for enterprise firewalls and private Git repositories.

---

### 🕹️ How to Use

1. **Editor Tab Button**: Click the **Git Log Digger (History)** icon in the top-right corner of any open editor tab.
2. **Context Menu**: Right-click inside any editor file or on any file in the File Explorer and choose **"Git Log Digger: Open File History"**.
3. **Command Palette**: Press `Cmd + Shift + P` (or `Ctrl + Shift + P`) and run:
   - `Git Log Digger: Open File History`
   - `Git Log Digger: Search File History (Pickaxe)`

---

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|:---|:---|
| `Space` | Play / Pause history animation |
| `←` / `→` (Left / Right Arrow) | Step to previous / next commit |
| `Cmd + F` / `Ctrl + F` | Instant text search within current commit |
| `Cmd + Shift + F` / `Ctrl + Shift + F` | Cross-commit Git Pickaxe time-travel search |
| `↑` / `↓` (Up / Down Arrow) | Navigate between search results |
| `Enter` | Jump immediately to selected search result |
| `Esc` | Close search modal or collapse timeline drawer |

---

### ⚙️ Extension Settings

| Setting | Type | Default | Description |
|:---|:---|:---|:---|
| `git-log-digger.openBeside` | `boolean` | `false` | When enabled, opens the time machine in a split window beside the active editor. When disabled, opens in the current active tab. |

---

<br>

<a name="繁體中文"></a>
## 🇹🇼 繁體中文

**Git Log Digger** 是一款讓代碼歷史「活過來」的動態時光機。跳脫傳統靜態且割裂的 Diff 檢視模式，它將任意檔案的 Git 提交歷程轉化為生動流暢的物理動畫演化過程，讓你直觀感受代碼如何誕生、演進與重構。

### ✨ 核心亮點

- 🎬 **動態歷史演化時光機**：
  - 具備流暢彈簧物理動畫，滑動時間軸即可見證代碼增刪重組的即時流動。
  - 完整播放控制器：支援 0.5x ~ 2.0x 倍速播放、單步步進前進/後退，以及互動式時間軸拉桿。
- ⚡ **雙軌歷史搜尋與 Pickaxe 時光穿梭**：
  - `Cmd + F` / `Ctrl + F`：當前 Commit 快照內的即時文字搜尋與高亮。
  - `Cmd + Shift + F` / `Ctrl + Shift + F`：**Git Pickaxe 時光穿梭搜尋**（底層執行毫秒級 `git log -S "<query>"`），瞬間精準找出某個變數、函式或關鍵字是在歷史上的哪次提交被加入或刪除。
- 📋 **極致完美的代碼選取與複製（獨家雙層 DOM 架構）**：
  - **動畫播放時**：提供絲滑平暢的位移與淡入淡出動畫。
  - **靜止檢視時**：無縫切換為標準原生連貫 `<pre><code>`，100% 保留滑鼠原生反白拖曳選取。
  - 徹底根除傳統 Webview 代碼工具的縮排跑版、空行丟失問題，並自動過濾零寬字符（`\u200B`）與富文本污染。
- 🎨 **原生 IDE 主題深度融合**：
  - 完整繼承 VS Code / Antigravity 原生色彩變數（背景色、邊框色、語法高亮對比），深淺色主題切換隨系統秒級同步。
- 🔒 **本機優先（Local-First）與企業級隱私**：
  - 100% 透過本機原生 Git 指令運算，零外部網路連線、無須 API Token、無呼叫限制，完美相容內部私有儲存庫與高資安隔離環境。

---

### 🕹️ 如何使用

1. **分頁標題按鈕**：點擊開啟檔案右上角的 **時光機歷史圖示**。
2. **右鍵選單**：在編輯器任意位置或左側檔案總管（Explorer）檔案上點選右鍵，選擇 **「Git Log Digger: Open File History」**。
3. **命令選擇區（Command Palette）**：按下 `Cmd + Shift + P`（或 `Ctrl + Shift + P`），輸入並執行：
   - `Git Log Digger: Open File History`（開啟時光機）
   - `Git Log Digger: Search File History (Pickaxe)`（開啟 Pickaxe 歷史搜尋）

---

### ⌨️ 快捷鍵一覽

| 快捷鍵 | 功能說明 |
|:---|:---|
| `Space` | 播放 / 暫停歷史演化動畫 |
| `←` / `→` (左右方向鍵) | 步進至上一個 / 下一個 Commit |
| `Cmd + F` / `Ctrl + F` | 當前 Commit 快照內文即時搜尋 |
| `Cmd + Shift + F` / `Ctrl + Shift + F` | 跨歷史 Pickaxe 時光穿梭搜尋 |
| `↑` / `↓` (上下方向鍵) | 在搜尋結果清單中切換 |
| `Enter` | 立即跳轉至選取的搜尋結果 Commit |
| `Esc` | 關閉搜尋視窗或收合時間軸抽屜 |

---

### ⚙️ 擴充套件設定

| 設定項目 | 類型 | 預設值 | 說明 |
|:---|:---|:---|:---|
| `git-log-digger.openBeside` | `boolean` | `false` | 開啟時光機時是否以分割視窗 (Beside) 呈現。預設關閉（直接在當前分頁中開啟，不割裂視窗）。 |

---

### 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 開源授權條款。  
歡迎查看 [CHANGELOG.md](CHANGELOG.md) 了解最新更新紀錄！
