/**
 * GRAPH DROP NODE PROPERTIES RESULT - SIMPLE DATA CONTAINER
 *
 * Result of dropping node properties from a graph.
 */

export class GraphDropNodePropertiesResult {
  public readonly graphName: string;
  public readonly nodeProperties: readonly string[];
  public readonly propertiesRemoved: number;

  constructor(
    graphName: string,
    nodeProperties: string[],
    propertiesRemoved: number
  ) {
    this.graphName = graphName;
    // Sort and freeze like Java does
    this.nodeProperties = Object.freeze([...nodeProperties].sort());
    this.propertiesRemoved = propertiesRemoved;
  }
}
