import { create } from 'zustand';
import {
  CommitMetadata,
  DiffLine,
  PickaxeSearchResult,
  HostToWebviewMessage,
} from '../types';
import { postHostMessage } from '../hooks/useVscodeRpc';

let animationTimer: ReturnType<typeof setTimeout> | null = null;

export interface HistoryState {
  // 狀態
  commits: CommitMetadata[];
  currentIndex: number;
  currentContent: string;
  diffLines: DiffLine[];
  isPlaying: boolean;
  playbackSpeed: number;
  isAnimating: boolean;
  isDrawerOpen: boolean;
  searchQuery: string;
  searchResults: PickaxeSearchResult[];
  isSearchModalOpen: boolean;
  searchMode: 'single' | 'pickaxe';

  // 擴充中繼狀態
  filePath: string;
  fileName: string;
  repoRoot: string;
  isLoading: boolean;
  theme: 'dark' | 'light' | 'high-contrast';
  contentCache: Record<string, { content: string; diffLines: DiffLine[] }>;

  // 操作
  setCommits: (commits: CommitMetadata[]) => void;
  goToIndex: (index: number) => void;
  nextCommit: () => void;
  prevCommit: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setIsAnimating: (isAnimating: boolean) => void;
  fetchCommitContent: (hash: string) => void;

  // UI 與通訊輔助操作
  toggleDrawer: () => void;
  setIsDrawerOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: PickaxeSearchResult[]) => void;
  setIsSearchModalOpen: (isOpen: boolean) => void;
  setSearchMode: (mode: 'single' | 'pickaxe') => void;
  openSearchModal: (mode?: 'single' | 'pickaxe') => void;
  setInitialData: (data: {
    filePath: string;
    fileName: string;
    repoRoot: string;
    commits: CommitMetadata[];
    initialContent?: string;
    initialDiff?: DiffLine[];
  }) => void;
  setCommitContent: (hash: string, content: string, diffLines: DiffLine[]) => void;
  handleHostMessage: (msg: HostToWebviewMessage) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  // 初始狀態
  commits: [],
  currentIndex: 0,
  currentContent: '',
  diffLines: [],
  isPlaying: false,
  playbackSpeed: 1.0,
  isAnimating: false,
  isDrawerOpen: false,
  searchQuery: '',
  searchResults: [],
  isSearchModalOpen: false,
  searchMode: 'single',

  filePath: '',
  fileName: '',
  repoRoot: '',
  isLoading: false,
  theme: 'dark',
  contentCache: {},

  // 操作實作
  setCommits: (commits: CommitMetadata[]) => {
    set({ commits, currentIndex: 0 });
    if (commits.length > 0) {
      get().fetchCommitContent(commits[0].hash);
    }
  },

  goToIndex: (index: number) => {
    const { commits, currentIndex, playbackSpeed, contentCache } = get();
    if (index < 0 || index >= commits.length || index === currentIndex) {
      return;
    }

    const targetCommit = commits[index];
    if (!targetCommit) return;

    // 啟動動畫狀態 (AnimatedTokenLayer 激活)
    set({ currentIndex: index, isAnimating: true });

    // 設定動畫結算定時器：動畫結束後切換為 StaticNativeLayer 確保原生複製無損
    if (animationTimer) {
      clearTimeout(animationTimer);
    }
    const settleDuration = Math.max(250, Math.round(420 / playbackSpeed));
    animationTimer = setTimeout(() => {
      set({ isAnimating: false });
    }, settleDuration);

    // 檢查快取
    const cached = contentCache[targetCommit.hash];
    if (cached) {
      set({
        currentContent: cached.content,
        diffLines: cached.diffLines,
        isLoading: false,
      });
    } else {
      set({ isLoading: true });
      get().fetchCommitContent(targetCommit.hash);
    }
  },

  nextCommit: () => {
    const { currentIndex, commits, goToIndex, isPlaying } = get();
    if (currentIndex < commits.length - 1) {
      goToIndex(currentIndex + 1);
    } else if (isPlaying) {
      // 播到最新或最後一筆時自動暫停
      set({ isPlaying: false });
    }
  },

  prevCommit: () => {
    const { currentIndex, goToIndex } = get();
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1);
    }
  },

  togglePlay: () => {
    const { isPlaying, currentIndex, commits, goToIndex } = get();
    const nextState = !isPlaying;

    if (nextState) {
      // 若在最後一筆點擊播放，回到第一筆開始
      if (currentIndex >= commits.length - 1) {
        goToIndex(0);
      }
    }
    set({ isPlaying: nextState });
  },

  setSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
  },

  setIsAnimating: (isAnimating: boolean) => {
    set({ isAnimating });
  },

  fetchCommitContent: (hash: string) => {
    const { filePath } = get();
    postHostMessage({
      type: 'REQ_COMMIT_CONTENT',
      payload: { commitHash: hash, filePath },
    });
  },

  toggleDrawer: () => {
    set((state) => ({ isDrawerOpen: !state.isDrawerOpen }));
  },

  setIsDrawerOpen: (isOpen: boolean) => {
    set({ isDrawerOpen: isOpen });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSearchResults: (results: PickaxeSearchResult[]) => {
    set({ searchResults: results });
  },

  setIsSearchModalOpen: (isOpen: boolean) => {
    set({ isSearchModalOpen: isOpen });
  },

  setSearchMode: (mode: 'single' | 'pickaxe') => {
    set({ searchMode: mode });
  },

  openSearchModal: (mode?: 'single' | 'pickaxe') => {
    set({
      isSearchModalOpen: true,
      ...(mode ? { searchMode: mode } : {}),
    });
  },

  setInitialData: (data) => {
    const { filePath, fileName, repoRoot, commits, initialContent, initialDiff } = data;
    const initialHash = commits[0]?.hash;
    const cache: Record<string, { content: string; diffLines: DiffLine[] }> = {};

    if (initialHash && initialContent !== undefined) {
      cache[initialHash] = {
        content: initialContent,
        diffLines: initialDiff || [],
      };
    }

    set({
      filePath,
      fileName,
      repoRoot,
      commits,
      currentIndex: 0,
      currentContent: initialContent || '',
      diffLines: initialDiff || [],
      contentCache: cache,
      isLoading: false,
    });

    // 若未附帶初始內容但有 commits，發起請求
    if (commits.length > 0 && initialContent === undefined) {
      get().fetchCommitContent(commits[0].hash);
    }
  },

  setCommitContent: (hash: string, content: string, diffLines: DiffLine[]) => {
    const { commits, currentIndex, contentCache } = get();
    const updatedCache = {
      ...contentCache,
      [hash]: { content, diffLines },
    };

    const currentCommit = commits[currentIndex];
    if (currentCommit && currentCommit.hash === hash) {
      set({
        currentContent: content,
        diffLines,
        contentCache: updatedCache,
        isLoading: false,
      });
    } else {
      set({ contentCache: updatedCache });
    }
  },

  handleHostMessage: (msg: HostToWebviewMessage) => {
    switch (msg.type) {
      case 'RES_INIT_DATA':
        get().setInitialData(msg.payload);
        break;
      case 'RES_COMMIT_CONTENT': {
        const payload = msg.payload;
        get().setCommitContent(
          payload.commitHash,
          payload.content,
          payload.diffLines || []
        );
        break;
      }
      case 'RES_PICKAXE_SEARCH':
        set({ searchResults: msg.payload.results });
        break;
      case 'EVENT_THEME_CHANGED': {
        const kind = msg.payload.kind;
        set({ theme: kind === 'light' ? 'light' : 'dark' });
        break;
      }
      case 'EVENT_ERROR':
        console.error('[Host Error Event]:', msg.payload.message);
        set({ isLoading: false });
        break;
    }
  },
}));
