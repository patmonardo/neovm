import { Group } from '@/batchimport/api/input/Group';
import { InputEntityVisitor } from '@/batchimport/api/input/InputEntityVisitor';
import { ReadableGroups } from '@/batchimport/api/input/ReadableGroups';

/**
 * Interface for visiting entity IDs with different ID handling strategies.
 * Provides abstraction over how IDs are passed to InputEntityVisitor,
 * supporting both direct IDs and group-based ID mapping.
 */
export interface EntityLongIdVisitor {
  /**
   * Visits a node ID, delegating to the appropriate visitor method.
   *
   * @param visitor The InputEntityVisitor to receive the ID
   * @param id The node ID to visit
   */
  visitNodeId(visitor: InputEntityVisitor, id: number): void;

  /**
   * Visits a source (start) node ID for relationships.
   *
   * @param visitor The InputEntityVisitor to receive the ID
   * @param id The source node ID to visit
   */
  visitSourceId(visitor: InputEntityVisitor, id: number): void;

  /**
   * Visits a target (end) node ID for relationships.
   *
   * @param visitor The InputEntityVisitor to receive the ID
   * @param id The target node ID to visit
   */
  visitTargetId(visitor: InputEntityVisitor, id: number): void;
}

/**
 * Default implementation that passes IDs directly without group mapping.
 */
class ActualEntityLongIdVisitor implements EntityLongIdVisitor {
  visitNodeId(visitor: InputEntityVisitor, id: number): void {
    visitor.id(id);
  }

  visitSourceId(visitor: InputEntityVisitor, id: number): void {
    visitor.startId(id);
  }

  visitTargetId(visitor: InputEntityVisitor, id: number): void {
    visitor.endId(id);
  }
}

/**
 * Implementation that includes group information with IDs.
 * Used when ID mapping/grouping is required.
 */
class MappingEntityLongIdVisitor implements EntityLongIdVisitor {
  private readonly globalGroup: Group;

  constructor(globalGroup: Group) {
    this.globalGroup = globalGroup;
  }

  visitNodeId(visitor: InputEntityVisitor, id: number): void {
    visitor.idWithGroup(id, this.globalGroup);
  }

  visitSourceId(visitor: InputEntityVisitor, id: number): void {
    visitor.startIdWithGroup(id, this.globalGroup);
  }

  visitTargetId(visitor: InputEntityVisitor, id: number): void {
    visitor.endIdWithGroup(id, this.globalGroup);
  }
}

/**
 * Static implementations and factory methods for EntityLongIdVisitor.
 */
export namespace EntityLongIdVisitor {
  /**
   * Default implementation that passes IDs directly to visitors.
   */
  export const ACTUAL: EntityLongIdVisitor = new ActualEntityLongIdVisitor();

  /**
   * Creates a mapping visitor that includes group information with IDs.
   *
   * @param readableGroups The groups configuration
   * @returns A new mapping visitor instance
   */
  export function mapping(readableGroups: ReadableGroups): EntityLongIdVisitor {
    return new MappingEntityLongIdVisitor(readableGroups.get(null));
  }
}
