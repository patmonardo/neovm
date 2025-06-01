/**
 * READABLE GROUPS - GROUP LOOKUP INTERFACE
 *
 * Interface for looking up groups by ID or name during batch imports.
 * Includes EMPTY implementation for cases with no groups.
 */

import { Group } from './Group';

export interface ReadableGroups {
  get(id: number): Group;
  get(name: string): Group;
  size(): number;
}

export namespace ReadableGroups {
  /**
   * Empty implementation that throws for any access.
   * Used when no groups are defined.
   */
  export const EMPTY: ReadableGroups = {
    get(idOrName: number | string): Group {
      if (typeof idOrName === 'number') {
        throw new Error(`No group by id ${idOrName}`);
      } else {
        throw new Error(`No group by name '${idOrName}'`);
      }
    },

    size(): number {
      return 0;
    }
  };
}
