/**
 * COLLECTOR - ERROR AND VALIDATION COLLECTION
 *
 * Collects various types of errors and violations during batch import.
 * Abstract base class with namespace containing default implementations.
 * Powerful pattern for handling import validation consistently.
 */

import { Group } from './Group';

// Need to define EntityType enum (from Neo4j)
export enum EntityType {
  NODE = "NODE",
  RELATIONSHIP = "RELATIONSHIP"
}

export abstract class Collector {
  abstract collectBadRelationship(
    startId: any,
    startIdGroup: Group,
    type: any,
    endId: any,
    endIdGroup: Group,
    specificValue: any
  ): void;

  abstract collectDuplicateNode(id: any, actualId: number, group: Group): void;

  abstract collectEntityViolatingConstraint(
    id: any,
    actualId: number,
    properties: Map<string, any>,
    constraintDescription: string,
    entityType: EntityType
  ): void;

  abstract collectRelationshipViolatingConstraint(
    properties: Map<string, any>,
    constraintDescription: string,
    startId: any,
    startIdGroup: Group,
    type: string,
    endId: any,
    endIdGroup: Group
  ): void;

  abstract collectExtraColumns(source: string, row: number, value: string): void;

  abstract collectSchemaCommandFailure(entityType: EntityType, failureMessage: string): void;

  abstract badEntries(): number;

  abstract isCollectingBadRelationships(): boolean;

  // AutoCloseable pattern
  abstract close(): void;
}

export namespace Collector {
  /**
   * Empty collector that silently ignores all errors.
   * Useful for permissive imports where you want to continue despite issues.
   */
  export const EMPTY = new class extends Collector {
    collectExtraColumns(source: string, row: number, value: string): void {
      // Silently ignore
    }

    close(): void {
      // Nothing to close
    }

    badEntries(): number {
      return 0;
    }

    collectBadRelationship(
      startId: any,
      startIdGroup: Group,
      type: any,
      endId: any,
      endIdGroup: Group,
      specificValue: any
    ): void {
      // Silently ignore
    }

    collectDuplicateNode(id: any, actualId: number, group: Group): void {
      // Silently ignore
    }

    collectEntityViolatingConstraint(
      id: any,
      actualId: number,
      properties: Map<string, any>,
      constraintDescription: string,
      entityType: EntityType
    ): void {
      // Silently ignore
    }

    collectRelationshipViolatingConstraint(
      properties: Map<string, any>,
      constraintDescription: string,
      startId: any,
      startIdGroup: Group,
      type: string,
      endId: any,
      endIdGroup: Group
    ): void {
      // Silently ignore
    }

    collectSchemaCommandFailure(entityType: EntityType, failureMessage: string): void {
      // Silently ignore
    }

    isCollectingBadRelationships(): boolean {
      return true;
    }
  };

  /**
   * Strict collector that throws exceptions for any error.
   * Useful for development and cases where data quality must be perfect.
   */
  export const STRICT = new class extends Collector {
    collectExtraColumns(source: string, row: number, value: string): void {
      throw new Error(`Bad extra column '${value}' index:${row} in '${source}'`);
    }

    close(): void {
      // Nothing to close
    }

    badEntries(): number {
      return 0;
    }

    collectBadRelationship(
      startId: any,
      startIdGroup: Group,
      type: any,
      endId: any,
      endIdGroup: Group,
      specificValue: any
    ): void {
      throw new Error(
        `Bad relationship (${startId}:${startIdGroup})-[${type}]->(${endId}:${endIdGroup}) ${specificValue}`
      );
    }

    collectDuplicateNode(id: any, actualId: number, group: Group): void {
      throw new Error(`Bad duplicate node ${id}:${group} id:${actualId}`);
    }

    collectEntityViolatingConstraint(
      id: any,
      actualId: number,
      properties: Map<string, any>,
      constraintDescription: string,
      entityType: EntityType
    ): void {
      const entityName = entityType === EntityType.NODE ? "node" : "relationship";
      const propsStr = JSON.stringify(Object.fromEntries(properties));
      throw new Error(
        `Bad ${entityName} with properties ${propsStr} violating constraint ${constraintDescription} id:${id}`
      );
    }

    collectRelationshipViolatingConstraint(
      properties: Map<string, any>,
      constraintDescription: string,
      startId: any,
      startIdGroup: Group,
      type: string,
      endId: any,
      endIdGroup: Group
    ): void {
      const propsStr = JSON.stringify(Object.fromEntries(properties));
      throw new Error(
        `Bad relationship (${startId}:${startIdGroup})-[${type}]->(${endId}:${endIdGroup}) with properties ${propsStr} violating constraint ${constraintDescription}`
      );
    }

    collectSchemaCommandFailure(entityType: EntityType, failureMessage: string): void {
      throw new Error(failureMessage);
    }

    isCollectingBadRelationships(): boolean {
      return false;
    }
  };

  /**
   * Logging collector that collects errors into arrays for later processing.
   * Useful for batch processing where you want to see all errors at once.
   */
  export class LoggingCollector extends Collector {
    private readonly errors: string[] = [];
    private badEntryCount = 0;

    collectExtraColumns(source: string, row: number, value: string): void {
      this.errors.push(`Extra column '${value}' at row ${row} in '${source}'`);
      this.badEntryCount++;
    }

    collectBadRelationship(
      startId: any,
      startIdGroup: Group,
      type: any,
      endId: any,
      endIdGroup: Group,
      specificValue: any
    ): void {
      this.errors.push(
        `Bad relationship (${startId}:${startIdGroup})-[${type}]->(${endId}:${endIdGroup}) ${specificValue}`
      );
      this.badEntryCount++;
    }

    collectDuplicateNode(id: any, actualId: number, group: Group): void {
      this.errors.push(`Duplicate node ${id}:${group} id:${actualId}`);
      this.badEntryCount++;
    }

    collectEntityViolatingConstraint(
      id: any,
      actualId: number,
      properties: Map<string, any>,
      constraintDescription: string,
      entityType: EntityType
    ): void {
      const entityName = entityType === EntityType.NODE ? "node" : "relationship";
      const propsStr = JSON.stringify(Object.fromEntries(properties));
      this.errors.push(
        `${entityName} ${id} with properties ${propsStr} violates constraint ${constraintDescription}`
      );
      this.badEntryCount++;
    }

    collectRelationshipViolatingConstraint(
      properties: Map<string, any>,
      constraintDescription: string,
      startId: any,
      startIdGroup: Group,
      type: string,
      endId: any,
      endIdGroup: Group
    ): void {
      const propsStr = JSON.stringify(Object.fromEntries(properties));
      this.errors.push(
        `Relationship (${startId}:${startIdGroup})-[${type}]->(${endId}:${endIdGroup}) with properties ${propsStr} violates constraint ${constraintDescription}`
      );
      this.badEntryCount++;
    }

    collectSchemaCommandFailure(entityType: EntityType, failureMessage: string): void {
      this.errors.push(`Schema failure for ${entityType}: ${failureMessage}`);
      this.badEntryCount++;
    }

    badEntries(): number {
      return this.badEntryCount;
    }

    isCollectingBadRelationships(): boolean {
      return true;
    }

    close(): void {
      if (this.errors.length > 0) {
        console.warn(`Import completed with ${this.errors.length} errors:`);
        this.errors.forEach(error => console.warn(`  ${error}`));
      }
    }

    getErrors(): string[] {
      return [...this.errors];
    }

    clearErrors(): void {
      this.errors.length = 0;
      this.badEntryCount = 0;
    }
  }
}
