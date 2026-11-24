import { useEffect } from 'react';
import { useHistoryStore } from '../stores/history.store';

/**
 * 全域鍵盤快捷鍵 Hook
 * 監聽：
 * - Space: 播放 / 暫停 (若在輸入框中則忽略)
 * - ArrowLeft / ArrowRight: 上一筆 / 下一筆 Commit (若在輸入框中則忽略)
 * - Cmd+F / Ctrl+F: 開啟單檔搜尋 (Single Commit Search)
 * - Cmd+Shift+F / Ctrl+Shift+F: 開啟跨歷史 Pickaxe 搜尋
 * - Esc: 關閉搜尋彈窗或時間軸抽屜
 */
export function useKeyboard() {
  const togglePlay = useHistoryStore((state) => state.togglePlay);
  const prevCommit = useHistoryStore((state) => state.prevCommit);
  const nextCommit = useHistoryStore((state) => state.nextCommit);
  const isSearchModalOpen = useHistoryStore((state) => state.isSearchModalOpen);
  const setIsSearchModalOpen = useHistoryStore((state) => state.setIsSearchModalOpen);
  const openSearchModal = useHistoryStore((state) => state.openSearchModal);
  const isDrawerOpen = useHistoryStore((state) => state.isDrawerOpen);
  const setIsDrawerOpen = useHistoryStore((state) => state.setIsDrawerOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // 1. Cmd + Shift + F / Ctrl + Shift + F: 跨歷史 Pickaxe 搜尋
      if (modifierKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        e.stopPropagation();
        openSearchModal('pickaxe');
        return;
      }

      // 2. Cmd + F / Ctrl + F: 單檔搜尋
      if (modifierKey && !e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        openSearchModal('single');
        return;
      }

      // 3. Escape: 優先關閉搜尋視窗，其次關閉時間軸抽屜
      if (e.key === 'Escape') {
        if (isSearchModalOpen) {
          e.preventDefault();
          setIsSearchModalOpen(false);
          return;
        }
        if (isDrawerOpen) {
          e.preventDefault();
          setIsDrawerOpen(false);
          return;
        }
      }

      // 若目前焦點在輸入元素中，以下播放/導航快捷鍵不觸發
      if (isInput) {
        return;
      }

      // 4. Space: 播放 / 暫停
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
        return;
      }

      // 5. ArrowLeft: 前一版本
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCommit();
        return;
      }

      // 6. ArrowRight: 後一版本
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCommit();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    togglePlay,
    prevCommit,
    nextCommit,
    isSearchModalOpen,
    setIsSearchModalOpen,
    openSearchModal,
    isDrawerOpen,
    setIsDrawerOpen,
  ]);
}
