import { DeletionResult } from "./DeletionResult"; // Adjust path as needed

export class GraphDropRelationshipResult {
  public readonly graphName: string;
  public readonly relationshipType: string;
  public readonly deletedRelationships: number; // Assuming long fits into number, otherwise use number
  public readonly deletedProperties: ReadonlyMap<string, number>; // Assuming Map<String, Long>

  constructor(
    graphName: string,
    relationshipType: string,
    deletionResult: DeletionResult
  ) {
    this.graphName = graphName;
    this.relationshipType = relationshipType;
    this.deletedRelationships = Number(deletionResult.deletedRelationships()); // Coerce if number

    // Convert Java Map to TypeScript ReadonlyMap and ensure values are numbers
    const propertiesMap = new Map<string, number>();
    deletionResult.deletedProperties().forEach((value, key) => {
      propertiesMap.set(key, Number(value)); // Coerce if number
    });
    this.deletedProperties = propertiesMap;
  }
}
