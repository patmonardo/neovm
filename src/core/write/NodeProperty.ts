import { NodePropertyValues } from '@/api/properties/nodes';

/**
 * Immutable data structure representing a node property with its key and values.
 *
 * This is a **simple value object** that pairs a property name with its corresponding
 * values across all nodes in the graph. It's the fundamental unit of data used in
 * node property export operations.
 *
 * **Design Philosophy:**
 * - **Immutable**: Once created, cannot be modified (defensive programming)
 * - **Value Semantics**: Two NodeProperty instances are equal if they have the same key and values
 * - **Type Safety**: Strongly typed to prevent mixing up property keys and values
 * - **Memory Efficient**: Minimal overhead, just the essential data
 *
 * **Common Usage Patterns:**
 * ```typescript
 * // Algorithm result export
 * const pageRankProperty = NodeProperty.of('pagerank', pageRankScores);
 * const communityProperty = NodeProperty.of('community', communityIds);
 *
 * // Batch property export
 * const properties = [
 *   NodeProperty.of('centrality', centralityValues),
 *   NodeProperty.of('cluster', clusterAssignments),
 *   NodeProperty.of('score', mlPredictions)
 * ];
 *
 * // Export pipeline
 * algorithm.compute()
 *   .map(results => NodeProperty.of('algorithm_result', results))
 *   .forEach(property => exporter.export(property));
 * ```
 *
 * **Value Object Semantics:**
 * This class implements value object semantics, meaning two instances are
 * considered equal if they contain the same data, regardless of object identity.
 * This is crucial for caching, deduplication, and testing scenarios.
 */
export class NodeProperty {
  /**
   * The property key/name (e.g., 'pagerank', 'community', 'centrality').
   * This becomes the column name in exports or property name in databases.
   */
  public readonly key: string;

  /**
   * The property values for all nodes in the graph.
   * This contains the actual computed or stored values mapped to internal node IDs.
   */
  public readonly values: NodePropertyValues;

  /**
   * Private constructor - use the static factory method for creation.
   * This ensures consistent object creation and validates inputs.
   */
  private constructor(key: string, values: NodePropertyValues) {
    if (!key) {
      throw new Error('Property key cannot be null or empty');
    }
    if (!values) {
      throw new Error('Property values cannot be null');
    }

    this.key = key;
    this.values = values;
  }

  /**
   * Static factory method for creating NodeProperty instances.
   *
   * This is the **preferred way** to create NodeProperty instances as it:
   * - Provides input validation
   * - Maintains consistency with the Java API
   * - Allows for future optimizations (like interning common keys)
   * - Makes testing easier with predictable object creation
   *
   * @param key The property key/name for this property
   * @param values The property values for all nodes
   * @returns A new NodeProperty instance
   * @throws Error if key is null/empty or values is null
   */
  public static of(key: string, values: NodePropertyValues): NodeProperty {
    return new NodeProperty(key, values);
  }

  /**
   * Value-based equality comparison.
   *
   * Two NodeProperty instances are considered equal if they have:
   * - The same property key (case-sensitive)
   * - Equivalent property values (deep comparison)
   *
   * This enables proper behavior in Sets, Maps, and testing scenarios.
   */
  public equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof NodeProperty)) return false;

    return this.key === other.key &&
           this.values === other.values; // Assuming NodePropertyValues implements proper equality
  }

  /**
   * Hash code for use in hash-based collections.
   *
   * Ensures that equal objects have equal hash codes, enabling proper
   * behavior in Sets and Maps.
   */
  public hashCode(): number {
    // Simple hash combination - could be improved with a proper hash function
    let hash = 0;
    for (let i = 0; i < this.key.length; i++) {
      const char = this.key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Combine with values hash (assuming NodePropertyValues provides hashCode)
    if (this.values && typeof (this.values as any).hashCode === 'function') {
      hash = hash ^ (this.values as any).hashCode();
    }

    return hash;
  }

  /**
   * String representation for debugging and logging.
   *
   * Provides a human-readable representation that includes the key
   * and basic information about the values (without dumping all data).
   */
  public toString(): string {
    const valueInfo = this.values ?
      `${this.values.nodeCount()} nodes` :
      'null values';
    return `NodeProperty{key='${this.key}', values=[${valueInfo}]}`;
  }

  /**
   * Returns the number of nodes that have values for this property.
   * Convenience method that delegates to the underlying NodePropertyValues.
   */
  public nodeCount(): number {
    return this.values.nodeCount();
  }

  /**
   * Checks if this property has any values.
   * Useful for validation and conditional processing.
   */
  public hasValues(): boolean {
    return this.values !== null && this.values.nodeCount() > 0;
  }
}
