import { NodePropertyValues } from "../../api/properties/nodes/NodePropertyValues";
import { NodeProperty } from "./NodeProperty";
import { Task } from "../utils/progress/tasks/Task";
import { Tasks } from "../utils/progress/tasks/Tasks";

/**
 * Exports node properties to a target system (typically a Neo4j database).
 * Handles batching of write operations and progress tracking.
 */
export interface NodePropertyExporter {
  /**
   * Writes a property with the given key and values.
   * 
   * @param property The property key
   * @param properties The property values
   */
  write(property: string, properties: NodePropertyValues): void;

  /**
   * Writes a node property.
   * 
   * @param nodeProperty The node property to write
   */
  write(nodeProperty: NodeProperty): void;

  /**
   * Writes multiple node properties.
   * 
   * @param nodeProperties The collection of node properties to write
   */
  write(nodeProperties: Set<NodeProperty>): void;

  /**
   * Returns the number of properties written so far.
   * 
   * @returns The count of properties written
   */
  propertiesWritten(): number;
}

/**
 * Constants and utility methods for NodePropertyExporter.
 */
export namespace NodePropertyExporter {
  /**
   * Minimum batch size for efficient property writing.
   */
  export const MIN_BATCH_SIZE = 10_000;

  /**
   * Maximum batch size for property writing to avoid excessive memory usage.
   */
  export const MAX_BATCH_SIZE = 100_000;

  /**
   * Creates a base task for property writing operation.
   * 
   * @param operationName Name of the operation
   * @param taskVolume Volume of the task (typically node count)
   * @returns A task for progress tracking
   */
  export function baseTask(operationName: string, taskVolume: number): Task {
    return Tasks.leaf(`${operationName} :: WriteNodeProperties`, taskVolume);
  }

  /**
   * Creates an inner task for property writing operation.
   * 
   * @param innerName Name of the inner operation
   * @param taskVolume Volume of the task
   * @returns A task for progress tracking
   */
  export function innerTask(innerName: string, taskVolume: number): Task {
    return Tasks.leaf(innerName, taskVolume);
  }
}