/**
 * INPUT ENTITY VISITOR - STREAMING PROTOCOL CORE
 *
 * Receives calls for extracted data from InputChunk. This callback design allows for
 * specific methods using primitives and other optimizations, to avoid garbage.
 * Central streaming protocol for all batch import operations.
 */

import { Group } from './Group';

// Define IdSequence interface (from Neo4j)
export interface IdSequence {
  nextId(): number;
}

export abstract class InputEntityVisitor {
  // Property methods
  abstract propertyId(nextProp: number): boolean;
  abstract properties(properties: ArrayBuffer, offloaded: boolean): boolean;
  abstract property(key: string, value: any): boolean;
  abstract property(propertyKeyId: number, value: any): boolean;

  // Node ID methods
  abstract id(id: number): boolean;
  abstract id(id: any, group: Group): boolean;
  abstract id(id: any, group: Group, idSequence: IdSequence): boolean;

  // Node label methods
  abstract labels(labels: string[]): boolean;
  abstract labelField(labelField: number): boolean;

  // Relationship ID methods
  abstract startId(id: number): boolean;
  abstract startId(id: any, group: Group): boolean;
  abstract endId(id: number): boolean;
  abstract endId(id: any, group: Group): boolean;

  // Relationship type methods
  abstract type(type: number): boolean;
  abstract type(type: string): boolean;

  // Entity lifecycle methods
  abstract endOfEntity(): Promise<void>;
  abstract reset(): void;
  abstract close(): Promise<void>;
}

export namespace InputEntityVisitor {
  /**
   * Adapter implementation that accepts all input but does nothing.
   * Perfect base class for specific visitors that only care about certain methods.
   */
  export class Adapter extends InputEntityVisitor {
    property(key: string, value: any): boolean;
    property(propertyKeyId: number, value: any): boolean;
    property(keyOrId: string | number, value: any): boolean {
      return true; // Accept all properties
    }

    properties(properties: ArrayBuffer, offloaded: boolean): boolean {
      return true;
    }

    propertyId(nextProp: number): boolean {
      return true;
    }

    id(id: number): boolean;
    id(id: any, group: Group): boolean;
    id(id: any, group: Group, idSequence: IdSequence): boolean;
    id(id: any, group?: Group, idSequence?: IdSequence): boolean {
      return true; // Accept all IDs
    }

    labels(labels: string[]): boolean {
      return true;
    }

    startId(id: number): boolean;
    startId(id: any, group: Group): boolean;
    startId(id: any, group?: Group): boolean {
      return true;
    }

    endId(id: number): boolean;
    endId(id: any, group: Group): boolean;
    endId(id: any, group?: Group): boolean {
      return true;
    }

    type(type: number): boolean;
    type(type: string): boolean;
    type(type: string | number): boolean {
      return true;
    }

    labelField(labelField: number): boolean {
      return true;
    }

    async endOfEntity(): Promise<void> {
      // Default: do nothing
    }

    reset(): void {
      // Default: do nothing
    }

    async close(): Promise<void> {
      // Default: do nothing
    }
  }

  /**
   * Delegate implementation that forwards all calls to another visitor.
   * Perfect for adding middleware/interceptors to the streaming pipeline.
   */
  export class Delegate extends InputEntityVisitor {
    constructor(private readonly actual: InputEntityVisitor) {
      super();
    }

    propertyId(nextProp: number): boolean {
      return this.actual.propertyId(nextProp);
    }

    properties(properties: ArrayBuffer, offloaded: boolean): boolean {
      return this.actual.properties(properties, offloaded);
    }

    property(key: string, value: any): boolean;
    property(propertyKeyId: number, value: any): boolean;
    property(keyOrId: string | number, value: any): boolean {
      if (typeof keyOrId === 'string') {
        return this.actual.property(keyOrId, value);
      } else {
        return this.actual.property(keyOrId, value);
      }
    }

    id(id: number): boolean;
    id(id: any, group: Group): boolean;
    id(id: any, group: Group, idSequence: IdSequence): boolean;
    id(id: any, group?: Group, idSequence?: IdSequence): boolean {
      if (typeof id === 'number' && !group) {
        return this.actual.id(id);
      } else if (group && !idSequence) {
        return this.actual.id(id, group);
      } else if (group && idSequence) {
        return this.actual.id(id, group, idSequence);
      } else {
        return this.actual.id(id as number);
      }
    }

    labels(labels: string[]): boolean {
      return this.actual.labels(labels);
    }

    labelField(labelField: number): boolean {
      return this.actual.labelField(labelField);
    }

    startId(id: number): boolean;
    startId(id: any, group: Group): boolean;
    startId(id: any, group?: Group): boolean {
      if (typeof id === 'number' && !group) {
        return this.actual.startId(id);
      } else {
        return this.actual.startId(id, group!);
      }
    }

    endId(id: number): boolean;
    endId(id: any, group: Group): boolean;
    endId(id: any, group?: Group): boolean {
      if (typeof id === 'number' && !group) {
        return this.actual.endId(id);
      } else {
        return this.actual.endId(id, group!);
      }
    }

    type(type: number): boolean;
    type(type: string): boolean;
    type(type: string | number): boolean {
      if (typeof type === 'string') {
        return this.actual.type(type);
      } else {
        return this.actual.type(type);
      }
    }

    async endOfEntity(): Promise<void> {
      return this.actual.endOfEntity();
    }

    reset(): void {
      this.actual.reset();
    }

    async close(): Promise<void> {
      return this.actual.close();
    }
  }

  /**
   * NULL visitor that accepts everything and does nothing.
   * Useful for testing and no-op scenarios.
   */
  export const NULL = new Adapter();

  /**
   * Create an adapter visitor for cases where you only need specific methods.
   */
  export function createAdapter(): Adapter {
    return new Adapter();
  }

  /**
   * Create a delegate visitor that wraps another visitor.
   */
  export function createDelegate(actual: InputEntityVisitor): Delegate {
    return new Delegate(actual);
  }
}
