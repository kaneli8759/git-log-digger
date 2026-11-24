# Changelog / 版本紀錄

All notable changes to the **Git Log Digger** extension will be documented in this file.  
此文件記錄 **Git Log Digger** 擴充套件的所有重要變更與更新歷程。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.6] - 2026-11-05

### 🧹 Removed / 移除
- **Custom Updater Removal (移除自製更新機制)**:
  - Removed obsolete custom `updateUrl` configuration and `checkForUpdates` command. The extension now relies entirely on the official VS Code Marketplace native update delivery.  
    *(移除已不再需要的 `git-log-digger.updateUrl` 設定與 `checkForUpdates` 命令，全面採用 VS Code 市集原生更新管道)*

---

## [0.1.5] - 2026-11-05

### 📝 Documentation / 文檔
- **Bilingual Documentation (中英文雙語文檔)**:
  - Overhauled marketplace documentation with comprehensive English and Traditional Chinese guides.  
    *(全面重構擴充套件詳細說明，提供完整中英文雙語支援)*
  - Added dedicated Changelog tab for VS Code Marketplace and Extension view.  
    *(新增標準規範之版本紀錄頁面)*

---

## [0.1.4] - 2026-11-05

### 🚀 Improved / 優化
- **Flawless Code Copying & Selection (代碼複製與縮排排版全面修正)**:
  - **Inline Text Flow Restoration**: Removed Flexbox container wrapping on code lines, reverting to native inline text flow. This completely resolves missing indentation and whitespace distortion when selecting code with a mouse.  
    *(移除代碼行容器的 Flexbox 佈局，恢復標準原生 Inline 文字流，徹底根除滑鼠反白複製代碼時縮排空白遺失與錯位)*
  - **Empty Lines Preservation**: Fixed an issue where empty lines were skipped due to `select-none`, ensuring empty lines are 100% retained during multi-line selection.  
    *(修復空行被 `select-none` 忽略的缺陷，確保跨行選取時空行 100% 完整保留，解決程式碼區塊黏在一起的問題)*
  - **Clipboard Plain-Text Sanitization**: Implemented native `onCopy` interception to filter out zero-width spaces (`\u200B`) and prevent rich-text HTML styling contamination. Fully compatible with languages like Dart, Flutter, TypeScript, etc.  
    *(加入原生 `onCopy` 攔截，自動過濾零寬字符並防止富文本 HTML 污染)*
  - **Unified Diff Indentation**: Corrected Markdown diff generation logic to strictly comply with Unified Diff standards, stripping superfluous leading whitespace.  
    *(修正 Markdown 差異生成邏輯，遵循標準 Unified Diff 格式規範，移除每行前綴多餘的空白字元)*

---

## [0.1.3] - 2026-09-03

### 🚀 Added / 新增
- **Configurable Editor Split Mode (可自訂分頁開啟模式)**:
  - By default, the Git Log Digger time machine now opens directly within the current editor tab group instead of forcing a split window (`Beside`).  
    *(預設直接在當前編輯器分頁群組開啟，不再強制分割視窗)*
  - Added `git-log-digger.openBeside` setting, allowing users to toggle their preferred window layout.  
    *(新增 `git-log-digger.openBeside` 設定項，可依偏好切換分割或單一分頁模式)*
- **Auto-Update Service Integration (自動更新機制)**:
  - Added background update checking integration for seamless version notices and upgrades.  
    *(整合更新服務，支援背景版本檢查)*

---

## [0.1.2] - 2026-09-03

### 🚀 Improved / 優化
- **Full Keyboard Navigation in Search Modal (搜尋視窗完整鍵盤操作支援)**:
  - Press `Enter` in the search input to instantly navigate to the matching commit.  
    *(搜尋輸入框中按 `Enter` 鍵立即跳轉至選取的歷史提交)*
  - Added smooth navigation using `↑` (Up Arrow) and `↓` (Down Arrow) keys to switch through matching commits.  
    *(支援上下方向鍵平滑切換搜尋結果清單)*

---

## [0.1.1] - 2026-09-03

### 🐛 Fixed / 修復
- **Auto-scroll & Code Highlight (搜尋定位與高亮修正)**:
  - Automatically scrolls to the target line and highlights matching code blocks smoothly when jumping into a commit from search results.  
    *(自搜尋結果跳轉至 Commit 時，自動平滑滾動至目標行並醒目高亮)*

---

## [0.1.0] - 2026-09-03

### 🚀 Initial Release / 初始版本發布
- **Local-First Animated Git Evolution Time Machine**:
  - Fluid spring physics animations during history scrubbing and playback.  
    *(流暢彈簧物理動畫，動態呈現程式碼歷史演化)*
- **Dual DOM Architecture**:
  - Transitions automatically between animated rendering mode and standard `<pre><code>` mode for instant text selection.  
    *(雙層 DOM 架構：播放時呈現彈簧動畫，靜止檢視時無縫切換至標準連貫 `<pre><code>`)*
- **Dual-Track Search**:
  - `Cmd + F` for in-commit text search with real-time highlighting.  
    *(當前 Commit 內文即時搜尋)*
  - `Cmd + Shift + F` for Git Pickaxe search (`git log -S`) across all commit histories in milliseconds.  
    *(跨歷史 Git Pickaxe 時光穿梭搜尋)*
- **Native Theme Integration**:
  - Seamlessly inherits IDE theme CSS variables for light/dark mode parity.  
    *(完美繼承 VS Code / Antigravity IDE 深淺色主題)*
