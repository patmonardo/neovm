import { MemoryEstimations } from "./MemoryEstimations"; // Used for RESIDENT_MEMORY constant
import { MemoryRange } from "./MemoryRange";

/**
 * A tree shaped description of an object that has resources residing in memory.
 * This corresponds to the MemoryTree interface in Java.
 */
export interface MemoryTree {
  /**
   * Returns a textual description for this component.
   * @returns Description string
   */
  description(): string;

  /**
   * Returns the resident memory of this component.
   * @returns Memory usage range
   */
  memoryUsage(): MemoryRange;

  /**
   * Returns nested resources of this component.
   * In Java, this is a default method returning an empty list.
   * Implementers of this interface should provide their own logic.
   * @returns Collection of component memory trees
   */
  components(): MemoryTree[];

  /**
   * Recursively formats this part of the memory tree.
   * @param currentIndent The current indentation string.
   * @param sb The string builder (array of strings) to append to.
   */
  _formatTreeRec(currentIndent: string, sb: string[]): void;
}

/**
 * Provides utility functions and constants related to the MemoryTree interface,
 * similar to static methods and default method helpers in the Java MemoryTree interface.
 */
export namespace MemoryTree {
  /**
   * Null implementation of MemoryTree.
   * Corresponds to `MemoryTree.NULL_TREE` in Java.
   */
  export const NULL_TREE: MemoryTree = {
    description(): string {
      return "";
    },
    memoryUsage(): MemoryRange {
      return MemoryRange.empty();
    },
    components(): MemoryTree[] {
      return [];
    },
    _formatTreeRec(currentIndent: string, sb: string[]): void {
      // No operation for null tree
    },
  } as MemoryTree; // Type assertion to satisfy TypeScript's type system
}

/**
 * Returns an empty memory tree.
 * Corresponds to `MemoryTree.empty()` in Java.
 * @returns An empty memory tree
 */
export function empty(): MemoryTree {
  return MemoryTree.NULL_TREE;
}

/**
 * Finds the resident memory component if present.
 * Corresponds to the default `residentMemory()` method in Java's MemoryTree.
 * @param tree The memory tree to search
 * @returns The resident memory component, or undefined if not found
 */
export function residentMemory(tree: MemoryTree): MemoryTree | undefined {
  return tree
    .components()
    .find(
      (component) =>
        component.description() === MemoryEstimations.RESIDENT_MEMORY
    );
}

/**
 * Renders the memory tree as a map structure.
 * Corresponds to the default `renderMap()` method in Java's MemoryTree.
 * @param tree The memory tree to render
 * @returns A map representation of the memory tree
 */
export function renderMap(tree: MemoryTree): Record<string, any> {
  const root: Record<string, any> = {
    name: tree.description(),
    memoryUsage: tree.memoryUsage().toString(), // Assuming MemoryRange has a good toString()
  };

  const componentsData = tree.components().map(renderMap); // Recursive call
  if (componentsData.length > 0) {
    root.components = componentsData;
  }

  return root;
}

/**
 * Internal helper for rendering the memory tree to a string array.
 * Corresponds to the static `render(StringBuilder, MemoryTree, int)` in Java.
 * @param sb String array to append to
 * @param tree The memory tree to render
 * @param depth Current depth in the tree
 */
function renderInternal(sb: string[], tree: MemoryTree, depth: number): void {
  for (let i = 1; i < depth; i++) {
    sb.push("    "); // Standard indentation
  }

  if (depth > 0) {
    sb.push("|-- ");
  }

  sb.push(tree.description());
  sb.push(": ");
  sb.push(tree.memoryUsage().toString());
  sb.push("\n"); // Using \n, equivalent to System.lineSeparator() for general text output

  for (const component of tree.components()) {
    renderInternal(sb, component, depth + 1);
  }
}

/**
 * Renders the memory requirements into a human-readable string representation.
 * Corresponds to the default `render()` method in Java's MemoryTree.
 * @param tree The memory tree to render
 * @returns A string representation of the memory tree
 */
export function render(tree: MemoryTree): string {
  const sb: string[] = [];
  renderInternal(sb, tree, 0);
  return sb.join("");
}
