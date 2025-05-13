import { JobId } from '../core/utils/progress/JobId';
import { ResultStore } from './ResultStore';
import { ResultStoreEntry } from './ResultStoreEntry';

/**
 * An empty implementation of ResultStore that does nothing.
 * This follows the null object pattern.
 */
export class EmptyResultStore implements ResultStore {
  /**
   * Does nothing with the provided result entry.
   * 
   * @param _jobId Ignored job ID
   * @param _entry Ignored result entry
   */
  add(_jobId: JobId, _entry: ResultStoreEntry): void {
    // No-op
  }

  /**
   * Always throws an error since no entries exist.
   * 
   * @param jobId The job ID to look up
   * @throws Error Always throws an error indicating no result exists
   */
  get(jobId: JobId): ResultStoreEntry {
    throw new Error(`No result found for job ${jobId.toString()}`);
  }

  /**
   * Always returns false since this store contains no entries.
   * 
   * @param _jobId Ignored job ID
   * @returns Always false
   */
  hasEntry(_jobId: JobId): boolean {
    return false;
  }

  /**
   * Does nothing since there are no entries to remove.
   * 
   * @param _jobId Ignored job ID
   */
  remove(_jobId: JobId): void {
    // No-op
  }
}