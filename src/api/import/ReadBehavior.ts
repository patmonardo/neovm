
/**
 * READ BEHAVIOUR - IMPORT FILTERING & CONTROL
 *
 * Controls which nodes, relationships, and properties get imported.
 * Provides filtering, ID translation, and error handling during batch import.
 */

// Simple token holders replacement (avoid Neo4j dependency)
export interface SimpleTokenHolders {
  getOrCreateLabelId(label: string): number;
  getOrCreateTypeId(type: string): number;
  getOrCreatePropertyId(property: string): number;
  getLabelName(id: number): string | null;
  getTypeName(id: number): string | null;
  getPropertyName(id: number): string | null;
}

export interface ReadBehaviour {
  // Node filtering
  shouldIncludeNode(nodeId: number, labels: string[]): boolean;
  translateNodeId(nodeId: number): number;

  // Relationship filtering
  shouldIncludeRelationship(
    startNodeId: number,
    endNodeId: number,
    relationshipId: number,
    relationshipType: string
  ): boolean;

  translateRelationshipId(relationshipId: number): number;
  translateRelationshipStartNodeId(relationshipId: number, startNodeId: number, endNodeId: number): number;
  translateRelationshipEndNodeId(relationshipId: number, startNodeId: number, endNodeId: number): number;

  // Label and property filtering
  filterLabels(labels: string[]): string[];
  shouldIncludeNodeProperty(propertyKey: string, labels: string[], completeMatch: boolean): boolean;
  shouldIncludeRelationshipProperty(propertyKey: string, relationshipType: string): boolean;

  // Statistics and error handling
  unused(): void;
  removed(): void;
  error(format: string, ...parameters: any[]): void;
  errorWithException(e: Error, format: string, ...parameters: any[]): void;

  // Token management (simplified)
  decorateTokenHolders(actual: SimpleTokenHolders): SimpleTokenHolders;
}

export namespace ReadBehaviour {
  /**
   * Adapter base class with sensible defaults.
   * Override only the methods you need to customize.
   */
  export class Adapter implements ReadBehaviour {
    shouldIncludeNode(nodeId: number, labels: string[]): boolean {
      return true;
    }

    translateNodeId(nodeId: number): number {
      return nodeId;
    }

    shouldIncludeRelationship(
      startNodeId: number,
      endNodeId: number,
      relationshipId: number,
      relationshipType: string
    ): boolean {
      return true;
    }

    translateRelationshipId(relationshipId: number): number {
      return relationshipId;
    }

    translateRelationshipStartNodeId(
      relationshipId: number,
      startNodeId: number,
      endNodeId: number
    ): number {
      return startNodeId;
    }

    translateRelationshipEndNodeId(
      relationshipId: number,
      startNodeId: number,
      endNodeId: number
    ): number {
      return endNodeId;
    }

    filterLabels(labels: string[]): string[] {
      return labels;
    }

    shouldIncludeNodeProperty(
      propertyKey: string,
      labels: string[],
      completeMatch: boolean
    ): boolean {
      return true;
    }

    shouldIncludeRelationshipProperty(
      propertyKey: string,
      relationshipType: string
    ): boolean {
      return true;
    }

    unused(): void {
      // Default: do nothing
    }

    removed(): void {
      // Default: do nothing
    }

    error(format: string, ...parameters: any[]): void {
      // Default: ignore errors
    }

    errorWithException(e: Error, format: string, ...parameters: any[]): void {
      // Default: ignore errors
    }

    decorateTokenHolders(actual: SimpleTokenHolders): SimpleTokenHolders {
      return actual;
    }
  }
  /**
   * Strict behavior that throws on any error.
   * Use for development and high-quality data scenarios.
   */
  export const INCLUSIVE_STRICT: ReadBehaviour = new (class extends Adapter {
    error(format: string, ...parameters: any[]): void {
      const message = this.formatMessage(format, parameters);
      throw new Error(message);
    }

    errorWithException(e: Error, format: string, ...parameters: any[]): void {
      const message = this.formatMessage(format, parameters);
      throw new Error(`${message}: ${e.message}`, { cause: e });
    }

    private formatMessage(format: string, parameters: any[]): string {
      return format.replace(/%s/g, () => String(parameters.shift() || ""));
    }
  })();

  /**
   * Permissive behavior that accepts everything.
   * Use for exploratory data import and prototyping.
   */
  export const PERMISSIVE: ReadBehaviour = new Adapter();
}
