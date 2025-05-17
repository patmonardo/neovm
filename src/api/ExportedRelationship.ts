import { GdsValue as Value} from '@/values';

/**
 * Represents a relationship that is being exported from the graph,
 * including its source node, target node, and associated property values.
 */
export class ExportedRelationship {
  /**
   * Creates a new exported relationship.
   *
   * @param sourceNode The ID of the source node
   * @param targetNode The ID of the target node
   * @param values Array of property values associated with this relationship
   */
  constructor(
    readonly sourceNode: number,
    readonly targetNode: number,
    readonly values: Value[]
  ) {}
}
