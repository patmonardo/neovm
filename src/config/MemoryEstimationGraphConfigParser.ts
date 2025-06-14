import { GraphProjectConfig } from '@/config';
import { CypherMapWrapper } from '@/core';
import { GraphProjectFromStoreConfig } from '@/projection/GraphProjectFromStoreConfig';

/**
 * Parser for graph configuration objects to create appropriate GraphProjectConfig instances.
 * Can parse both store-based and Cypher-based graph configurations.
 */
export class MemoryEstimationGraphConfigParser {
  // Configuration key constants
  private static readonly NODE_PROJECTION_KEY = GraphProjectFromStoreConfig.NODE_PROJECTION_KEY;
  private static readonly RELATIONSHIP_PROJECTION_KEY = GraphProjectFromStoreConfig.RELATIONSHIP_PROJECTION_KEY;
  private static readonly NODE_QUERY_KEY = GraphProjectFromCypherConfig.NODE_QUERY_KEY;
  private static readonly RELATIONSHIP_QUERY_KEY = GraphProjectFromCypherConfig.RELATIONSHIP_QUERY_KEY;

  /**
   * Username of the user creating the graph.
   */
  private readonly username: string;

  /**
   * Creates a new MemoryEstimationGraphConfigParser.
   *
   * @param username The username of the user creating the graph
   */
  constructor(username: string) {
    this.username = username;
  }

  /**
   * Parses a graph configuration and returns the appropriate GraphProjectConfig implementation.
   *
   * @param graphConfig The graph configuration object
   * @returns A GraphProjectConfig instance based on the configuration
   */
  public parse(graphConfig: Record<string, any>): GraphProjectConfig {
    const createConfigMapWrapper = CypherMapWrapper.create(graphConfig);

    const result = createConfigMapWrapper.verifyMutuallyExclusivePairs(
      MemoryEstimationGraphConfigParser.NODE_PROJECTION_KEY,
      MemoryEstimationGraphConfigParser.RELATIONSHIP_PROJECTION_KEY,
      MemoryEstimationGraphConfigParser.NODE_QUERY_KEY,
      MemoryEstimationGraphConfigParser.RELATIONSHIP_QUERY_KEY,
      "Missing information for implicit graph creation."
    );

    if (result === CypherMapWrapper.PairResult.FIRST_PAIR) {
      return GraphProjectFromStoreConfig.fromProcedureConfig(this.username, createConfigMapWrapper);
    } else {
      return GraphProjectFromCypherConfig.fromProcedureConfig(this.username, createConfigMapWrapper);
    }
  }
}
