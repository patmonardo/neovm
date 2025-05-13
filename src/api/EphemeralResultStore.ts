import { JobId } from '../core/utils/progress/JobId';
import { ResultStore } from './ResultStore';
import { ResultStoreEntry } from './ResultStoreEntry';
import { ClockService } from '../core/utils/ClockService';

/**
 * An in-memory store for algorithm results with automatic expiration.
 */
export class EphemeralResultStore implements ResultStore {
  /**
   * Duration after which entries are automatically removed if not accessed.
   */
  static readonly CACHE_EVICTION_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  /**
   * Map of job IDs to entries with expiration information.
   */
  private resultEntries: Map<string, {
    entry: ResultStoreEntry;
    lastAccess: number;
  }> = new Map();

  /**
   * Cleanup timer reference.
   */
  private cleanupTimer: NodeJS.Timeout;

  /**
   * Creates a new EphemeralResultStore with automatic cleanup.
   */
  constructor() {
    // Schedule cleanup every minute
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Adds a result entry to the store.
   *
   * @param jobId The job ID
   * @param entry The result entry
   */
  add(jobId: JobId, entry: ResultStoreEntry): void {
    this.resultEntries.set(jobId.toString(), {
      entry,
      lastAccess: ClockService.clock().millis()
    });
  }

  /**
   * Gets a result entry if it exists and hasn't expired.
   *
   * @param jobId The job ID
   * @returns The result entry or null if not found
   */
  get(jobId: JobId): ResultStoreEntry | null {
    const key = jobId.toString();
    const cachedItem = this.resultEntries.get(key);

    if (!cachedItem) {
      return null;
    }

    // Update last access time
    cachedItem.lastAccess = ClockService.clock().millis();
    this.resultEntries.set(key, cachedItem);

    return cachedItem.entry;
  }

  /**
   * Checks if an entry exists for the given job ID.
   *
   * @param jobId The job ID
   * @returns True if an entry exists
   */
  hasEntry(jobId: JobId): boolean {
    return this.get(jobId) !== null;
  }

  /**
   * Removes an entry from the store.
   *
   * @param jobId The job ID
   */
  remove(jobId: JobId): void {
    this.resultEntries.delete(jobId.toString());
  }

  /**
   * Removes expired entries from the cache.
   */
  private cleanup(): void {
    const now = ClockService.clock().millis();

    for (const [key, item] of this.resultEntries.entries()) {
      if (now - item.lastAccess > EphemeralResultStore.CACHE_EVICTION_DURATION) {
        this.resultEntries.delete(key);
      }
    }
  }

  /**
   * Stops the cleanup timer when this store is no longer needed.
   * Should be called when the store is being disposed.
   */
  dispose(): void {
    clearInterval(this.cleanupTimer);
  }
}
