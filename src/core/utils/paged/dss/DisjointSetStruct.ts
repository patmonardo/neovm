import { LongNodePropertyValues } from '../../../core/graph/LongNodePropertyValues';

/**
 * Disjoint-set-struct is a data structure that keeps track of a set
 * of elements partitioned into a number of disjoint (non-overlapping) subsets.
 *
 * @see <a href="https://en.wikipedia.org/wiki/Disjoint-set_data_structure">Wiki</a>
 */
export interface DisjointSetStruct {
  /**
   * Joins the set of p (Sp) with set of q (Sq).
   *
   * @param p an item of Sp
   * @param q an item of Sq
   */
  union(p: number, q: number): void;

  /**
   * Find set Id of element p.
   *
   * @param nodeId the element in the set we are looking for
   * @returns an id of the set it belongs to
   */
  setIdOf(nodeId: number): number;

  /**
   * Check if p and q belong to the same set.
   * Use only in tests.
   *
   * @param p a set item
   * @param q a set item
   * @returns true if both items belong to the same set, false otherwise
   */
  sameSet(p: number, q: number): boolean;

  /**
   * Number of elements stored in the data structure.
   *
   * @returns element count
   */
  size(): number;

  /**
   * Wraps the DisjointSetStruct in an LongNodeProperties interface
   *
   * @returns wrapped DisjointSetStruct
   */
  asNodeProperties(): LongNodePropertyValues;
}

/**
 * Extension methods for DisjointSetStruct.
 */
export namespace DisjointSetStruct {
  /**
   * Default implementation of asNodeProperties() for DisjointSetStruct.
   * 
   * @param dss The DisjointSetStruct to wrap
   * @returns A LongNodePropertyValues wrapper
   */
  export function defaultAsNodeProperties(dss: DisjointSetStruct): LongNodePropertyValues {
    return {
      longValue(nodeId: number): number {
        return dss.setIdOf(nodeId);
      },

      nodeCount(): number {
        return dss.size();
      }
    };
  }
}