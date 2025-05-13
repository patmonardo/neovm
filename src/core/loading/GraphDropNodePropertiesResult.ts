/**
 * Represents the result of an operation that drops node properties from a graph.
 */
export class GraphDropNodePropertiesResult {
  /**
   * The name of the graph from which node properties were dropped.
   */
  public readonly graphName: string;

  /**
   * A list of the names of the node properties that were dropped.
   * This list is sorted alphabetically.
   */
  public readonly nodeProperties: string[];

  /**
   * The total number of property entries removed across all nodes for the specified properties.
   */
  public readonly propertiesRemoved: number;

  /**
   * Constructs a new GraphDropNodePropertiesResult.
   * @param graphName The name of the graph.
   * @param nodeProperties A list of node property names that were dropped.
   * @param propertiesRemoved The total count of property entries removed.
   */
  constructor(graphName: string, nodeProperties: string[], propertiesRemoved: number) {
    this.graphName = graphName;
    // Ensure the nodeProperties list is sorted, similar to the Java constructor.
    this.nodeProperties = [...nodeProperties].sort();
    this.propertiesRemoved = propertiesRemoved;
  }
}
