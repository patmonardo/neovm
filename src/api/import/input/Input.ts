/**
 * INPUT - BATCH IMPORT MAIN INTERFACE
 *
 * Unifies all data input for batch imports. Core streaming interface
 * with simplified schema management adapted for GDS.
 */

import { Collector } from './Collector';
import { IdType } from './IdType';
import { ReadableGroups } from './ReadableGroups';
import { InputIterable } from '../InputIterable';
import { PropertySizeCalculator } from './PropertySizeCalculator';

// Simplified estimates record (no complex schema stuff)
export interface Estimates {
  numberOfNodes: number;
  numberOfRelationships: number;
  numberOfNodeProperties: number;
  numberOfRelationshipProperties: number;
  sizeOfNodeProperties: number;
  sizeOfRelationshipProperties: number;
  numberOfNodeLabels: number;
}

export interface Input {
  /**
   * Provides all node data for an import.
   */
  nodes(badCollector: Collector): InputIterable;

  /**
   * Provides all relationship data for an import.
   */
  relationships(badCollector: Collector): InputIterable;

  /**
   * ID type which matches the type of ids this Input generates.
   */
  idType(): IdType;

  /**
   * Accessor for id groups that this input has.
   */
  groups(): ReadableGroups;

  /**
   * Validates input and estimates graph size.
   */
  validateAndEstimate(valueSizeCalculator: PropertySizeCalculator): Promise<Estimates>;

  // SIMPLIFIED SCHEMA METHODS - Adapted for GDS

  /**
   * Schema information referenced by this input.
   * Simplified version that returns GDS-compatible schema info.
   */
  referencedNodeSchema(): Map<string, any>;

  /**
   * Schema commands to apply after import.
   * For GDS: node labels, relationship types, property keys.
   */
  schemaCommands(): any[];

  /**
   * Cleanup resources.
   */
  close(): Promise<void>;
}

export namespace Input {
  /**
   * Simple factory method for creating Input instances.
   */
  export function create(
    nodes: InputIterable,
    relationships: InputIterable,
    idType: IdType,
    estimates: Estimates,
    groups: ReadableGroups
  ): Input {
    return new SimpleInput(nodes, relationships, idType, estimates, groups);
  }

  /**
   * Create estimates when you know the numbers.
   */
  export function knownEstimates(
    numberOfNodes: number,
    numberOfRelationships: number,
    numberOfNodeProperties: number,
    numberOfRelationshipProperties: number,
    sizeOfNodeProperties: number,
    sizeOfRelationshipProperties: number,
    numberOfNodeLabels: number
  ): Estimates {
    return {
      numberOfNodes,
      numberOfRelationships,
      numberOfNodeProperties,
      numberOfRelationshipProperties,
      sizeOfNodeProperties,
      sizeOfRelationshipProperties,
      numberOfNodeLabels
    };
  }

  /**
   * Delegate pattern for wrapping Input implementations.
   */
  export class Delegate implements Input {
    constructor(protected readonly delegate: Input) {}

    nodes(badCollector: Collector): InputIterable {
      return this.delegate.nodes(badCollector);
    }

    relationships(badCollector: Collector): InputIterable {
      return this.delegate.relationships(badCollector);
    }

    idType(): IdType {
      return this.delegate.idType();
    }

    groups(): ReadableGroups {
      return this.delegate.groups();
    }

    async validateAndEstimate(valueSizeCalculator: PropertySizeCalculator): Promise<Estimates> {
      return this.delegate.validateAndEstimate(valueSizeCalculator);
    }

    referencedNodeSchema(): Map<string, any> {
      return this.delegate.referencedNodeSchema();
    }

    schemaCommands(): any[] {
      return this.delegate.schemaCommands();
    }

    async close(): Promise<void> {
      return this.delegate.close();
    }
  }
}

// Simple implementation
class SimpleInput implements Input {
  constructor(
    private readonly _nodes: InputIterable,
    private readonly _relationships: InputIterable,
    private readonly _idType: IdType,
    private readonly _estimates: Estimates,
    private readonly _groups: ReadableGroups
  ) {}

  nodes(badCollector: Collector): InputIterable {
    return this._nodes;
  }

  relationships(badCollector: Collector): InputIterable {
    return this._relationships;
  }

  idType(): IdType {
    return this._idType;
  }

  groups(): ReadableGroups {
    return this._groups;
  }

  async validateAndEstimate(valueSizeCalculator: PropertySizeCalculator): Promise<Estimates> {
    return this._estimates;
  }

  referencedNodeSchema(): Map<string, any> {
    return new Map(); // TODO: Implement GDS schema mapping
  }

  schemaCommands(): any[] {
    return []; // TODO: Implement GDS schema commands
  }

  async close(): Promise<void> {
    // Cleanup if needed
  }
}
