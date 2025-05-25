import { PropertyMapping } from '@/PropertyMapping';
import { PropertyMappings } from '@/PropertyMappings';
import { GraphStore } from '@/api/GraphStore';
import { IdMap } from '@/api/IdMap';
import { TransactionContext } from '@/transaction/TransactionContext';
import { formatWithLocale } from '@/utils/StringFormatting';
import { NotFoundException } from '@/graphdb/NotFoundException';
import { Log } from '@/logging/Log';

/**
 * Record containing functions that can retrieve Neo4j node properties by node ID.
 * These are properties that exist in the original Neo4j database but aren't stored
 * in the GraphStore itself (additional properties for export).
 */
export class NeoNodeProperties {
  constructor(
    public readonly neoNodeProperties: Map<string, (nodeId: number) => any>
  ) {}

  /**
   * Creates NeoNodeProperties from property mappings if any are provided.
   *
   * @param graphStore The GraphStore containing the nodes
   * @param transactionContext Context for accessing Neo4j database
   * @param propertyMappings Mappings defining which additional properties to fetch
   * @param log Logger for warnings
   * @returns Optional NeoNodeProperties instance, or undefined if no mappings provided
   */
  static of(
    graphStore: GraphStore,
    transactionContext: TransactionContext,
    propertyMappings: PropertyMappings,
    log: Log
  ): NeoNodeProperties | undefined {
    if (propertyMappings.isEmpty()) {
      return undefined;
    }

    const neoNodePropertiesMap = new Map<string, (nodeId: number) => any>();

    for (const propertyMapping of propertyMappings.stream()) {
      neoNodePropertiesMap.set(
        propertyMapping.neoPropertyKey(),
        NeoProperties.of(
          transactionContext,
          graphStore.nodes(),
          propertyMapping,
          log
        )
      );
    }

    return new NeoNodeProperties(neoNodePropertiesMap);
  }

  /**
   * Gets the map of property functions.
   */
  neoNodeProperties(): Map<string, (nodeId: number) => any> {
    return this.neoNodeProperties;
  }

  /**
   * Returns a string representation of this NeoNodeProperties.
   */
  toString(): string {
    return `NeoNodeProperties{neoNodeProperties=${Array.from(this.neoNodeProperties.keys())}}`;
  }

  /**
   * Checks equality with another NeoNodeProperties.
   */
  equals(other: NeoNodeProperties): boolean {
    if (this.neoNodeProperties.size !== other.neoNodeProperties.size) {
      return false;
    }

    for (const key of this.neoNodeProperties.keys()) {
      if (!other.neoNodeProperties.has(key)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns a hash code for this NeoNodeProperties.
   */
  hashCode(): number {
    let hash = 17;
    for (const key of this.neoNodeProperties.keys()) {
      hash = hash * 31 + key.length;
    }
    return hash;
  }
}

/**
 * Implementation of property lookup function that retrieves properties from Neo4j.
 * Handles missing nodes gracefully by using default values and logging warnings.
 */
class NeoProperties {
  private readonly transactionContext: TransactionContext;
  private readonly idMap: IdMap;
  private readonly propertyMapping: PropertyMapping;
  private readonly log: Log;

  /**
   * Factory method that creates a property lookup function.
   *
   * @param transactionContext Context for accessing Neo4j database
   * @param idMap ID mapping between GraphStore and Neo4j IDs
   * @param propertyMapping Configuration for the property to retrieve
   * @param log Logger for warnings
   * @returns Function that can retrieve property values by node ID
   */
  static of(
    transactionContext: TransactionContext,
    idMap: IdMap,
    propertyMapping: PropertyMapping,
    log: Log
  ): (nodeId: number) => any {
    return new NeoProperties(transactionContext, idMap, propertyMapping, log).apply.bind(
      new NeoProperties(transactionContext, idMap, propertyMapping, log)
    );
  }

  private constructor(
    transactionContext: TransactionContext,
    idMap: IdMap,
    propertyMapping: PropertyMapping,
    log: Log
  ) {
    this.transactionContext = transactionContext;
    this.idMap = idMap;
    this.propertyMapping = propertyMapping;
    this.log = log;
  }

  /**
   * Retrieves the property value for the given node ID.
   *
   * @param nodeId The GraphStore node ID
   * @returns The property value from Neo4j, or default value if node not found
   */
  apply(nodeId: number): any {
    return this.transactionContext.apply((tx, ktx) => {
      const neo4jNodeId = this.idMap.toOriginalNodeId(nodeId);

      try {
        const node = tx.getNodeById(neo4jNodeId);
        return node.getProperty(
          this.propertyMapping.neoPropertyKey(),
          this.propertyMapping.defaultValue().getObject()
        );
      } catch (error) {
        if (error instanceof NotFoundException) {
          const defaultValue = this.propertyMapping.defaultValue().getObject();

          // WARN because we have a default value and can proceed.
          // We don't log the exception to not flood the log with stacktraces.
          // The exception doesn't tell anything more than we already do in the log message.
          // It is also likely that once we run into missing nodes, we will get more than just one.
          // Putting a million log lines for a million missing nodes isn't great, but it's better
          // than putting a million stacktraces into the log.
          this.log.warn(
            formatWithLocale(
              "Could not find the node with the id '%d' - using the default value for the property '%s' (%s).",
              neo4jNodeId,
              this.propertyMapping.neoPropertyKey(),
              defaultValue
            )
          );

          return defaultValue;
        }

        // Re-throw other types of errors
        throw error;
      }
    });
  }
}
