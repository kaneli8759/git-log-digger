/**
 * Git Log Digger - Cache Service
 * High-performance, memory-bounded LRU Cache for Git operations.
 */

import type { DiffLine } from '../contracts/git.types';

/**
 * Generic Least Recently Used (LRU) Cache backed by ES6 Map.
 * Provides O(1) time complexity for get, set, has, and delete operations.
 */
export class LruCache<K, V> {
  private readonly _capacity: number;
  private readonly _cache: Map<K, V>;

  constructor(capacity: number = 50) {
    if (capacity <= 0) {
      throw new Error('LRU Cache capacity must be a positive integer.');
    }
    this._capacity = Math.floor(capacity);
    this._cache = new Map<K, V>();
  }

  /**
   * Current number of stored entries.
   */
  public get size(): number {
    return this._cache.size;
  }

  /**
   * Maximum allowed capacity before eviction occurs.
   */
  public get capacity(): number {
    return this._capacity;
  }

  /**
   * Checks if a key exists without affecting its recency order.
   */
  public has(key: K): boolean {
    return this._cache.has(key);
  }

  /**
   * Retrieves an item and marks it as most recently used.
   */
  public get(key: K): V | undefined {
    if (!this._cache.has(key)) {
      return undefined;
    }
    const value = this._cache.get(key)!;
    // Re-insert to refresh insertion order (move to MRU end)
    this._cache.delete(key);
    this._cache.set(key, value);
    return value;
  }

  /**
   * Peeks at a value without updating its recency position.
   */
  public peek(key: K): V | undefined {
    return this._cache.get(key);
  }

  /**
   * Stores an item. Evicts the least recently used entry if capacity is exceeded.
   */
  public set(key: K, value: V): this {
    if (this._cache.has(key)) {
      // Remove existing to refresh insertion order
      this._cache.delete(key);
    } else if (this._cache.size >= this._capacity) {
      // Evict least recently used (first key in map iterator)
      const oldestKey = this._cache.keys().next().value;
      if (oldestKey !== undefined) {
        this._cache.delete(oldestKey);
      }
    }
    this._cache.set(key, value);
    return this;
  }

  /**
   * Deletes a specific entry by key.
   */
  public delete(key: K): boolean {
    return this._cache.delete(key);
  }

  /**
   * Clears all cached entries.
   */
  public clear(): void {
    this._cache.clear();
  }

  /**
   * Returns an iterator of keys in order from oldest to newest.
   */
  public keys(): IterableIterator<K> {
    return this._cache.keys();
  }

  /**
   * Returns an iterator of values in order from oldest to newest.
   */
  public values(): IterableIterator<V> {
    return this._cache.values();
  }

  /**
   * Returns an iterator of [key, value] pairs in order from oldest to newest.
   */
  public entries(): IterableIterator<[K, V]> {
    return this._cache.entries();
  }
}

/**
 * Specialized Git Cache Service holding caches for file contents and diff lines.
 */
export class GitCacheService {
  private readonly _contentCache: LruCache<string, string>;
  private readonly _diffCache: LruCache<string, DiffLine[]>;

  constructor(capacity: number = 50) {
    this._contentCache = new LruCache<string, string>(capacity);
    this._diffCache = new LruCache<string, DiffLine[]>(capacity);
  }

  private _createKey(commitHash: string, relativePath: string): string {
    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${commitHash}:${normalizedPath}`;
  }

  // --- File Content Cache ---

  public getContent(commitHash: string, relativePath: string): string | undefined {
    return this._contentCache.get(this._createKey(commitHash, relativePath));
  }

  public setContent(commitHash: string, relativePath: string, content: string): void {
    this._contentCache.set(this._createKey(commitHash, relativePath), content);
  }

  public hasContent(commitHash: string, relativePath: string): boolean {
    return this._contentCache.has(this._createKey(commitHash, relativePath));
  }

  // --- Diff Cache ---

  public getDiff(commitHash: string, relativePath: string): DiffLine[] | undefined {
    return this._diffCache.get(this._createKey(commitHash, relativePath));
  }

  public setDiff(commitHash: string, relativePath: string, diff: DiffLine[]): void {
    this._diffCache.set(this._createKey(commitHash, relativePath), diff);
  }

  public hasDiff(commitHash: string, relativePath: string): boolean {
    return this._diffCache.has(this._createKey(commitHash, relativePath));
  }

  // --- Management ---

  public clear(): void {
    this._contentCache.clear();
    this._diffCache.clear();
  }
}

/** Default global git cache service singleton */
export const gitCacheService = new GitCacheService(50);
