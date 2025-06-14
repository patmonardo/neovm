import { JobId } from '@/core/utils/progress';
import { ResultStoreEntry } from './ResultStoreEntry';

/**
 * A store for write results that are not immediately persisted in the database.
 * This is mainly used for the session architecture, where algorithm results are first
 * written into this store and then streamed via arrow to persist them in a
 * remote database.
 */
export interface ResultStore {
  /**
   * Stores a shallow entry representing result store data in this store given a JobId.
   *
   * @param jobId The ID of the job that produced the result
   * @param entry The result entry to store
   */
  add(jobId: JobId, entry: ResultStoreEntry): void;

  /**
   * Retrieves a ResultStoreEntry from this store.
   *
   * @param jobId The ID of the job whose result should be retrieved
   * @returns The stored result entry
   */
  get(jobId: JobId): ResultStoreEntry | null;

  /**
   * Checks if this store contains an entry for the given JobId.
   *
   * @param jobId The ID to check
   * @returns True if an entry exists for this job ID
   */
  hasEntry(jobId: JobId): boolean;

  /**
   * Removes a stored entry based on the given JobId.
   *
   * @param jobId The ID of the job whose result should be removed
   */
  remove(jobId: JobId): void;
}


/**
 * Implementation of an empty result store that contains no entries.
 */
class EmptyResultStore implements ResultStore {
  add(_jobId: JobId, _entry: ResultStoreEntry): void {
    // No-op
  }

  get(jobId: JobId): ResultStoreEntry {
    throw new Error(`No result found for job ${jobId}`);
  }

  hasEntry(_jobId: JobId): boolean {
    return false;
  }

  remove(_jobId: JobId): void {
    // No-op
  }
}

/**
 * Utility methods and constants for ResultStore.
 */
export namespace ResultStore {
  /**
   * An empty implementation of ResultStore that contains no entries.
   */
  export const EMPTY: ResultStore = new EmptyResultStore();
}
