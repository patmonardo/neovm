import { Configuration } from "@/annotations/Configuration";
import { GraphProjectConfig } from "./GraphProjectConfig";
import { ConcurrencyValidatorService } from "../concurrency/ConcurrencyValidatorService";
import { CypherMapWrapper } from "@/core/CypherMapWrapper";
import { Concurrency } from "../concurrency/Concurrency";
import { ConcurrencyConfig } from "./ConcurrencyConfig";

/**
 * Configuration for projecting a graph from another graph
 */
@Configuration
export abstract class GraphProjectFromGraphConfig extends GraphProjectConfig {
  /**
   * Returns a map representation for procedure result fields
   */
  @Configuration.Ignore
  asProcedureResultConfigurationField(): Record<string, any> {
    const result = this.originalConfig().asProcedureResultConfigurationField();

    // Add all entries from toMap()
    for (const [key, value] of Object.entries(this.toMap())) {
      result[key] = value;
    }

    // result["nodeFilter"] = this.nodeFilter();
    // result["relationshipFilter"] = this.relationshipFilter();
    return result;
  }

  /**
   * Returns the target graph name
   */
  @Configuration.Parameter()
  graphName(): string {
    return this.originalConfig().graphName();
  }

  /**
   * Returns the source graph name
   */
  @Configuration.Parameter()
  fromGraphName(): string {
    return this.originalConfig().graphName();
  }

  /**
   * Returns the original graph configuration
   */
  @Configuration.Parameter()
  originalConfig(): GraphProjectConfig {
    return this.originalConfig();
  }

  /**
   * Returns the concurrency level for this operation
   */
  concurrency(): number {
    return ConcurrencyConfig.DEFAULT_CONCURRENCY;
  }

  /**
   * Returns a typed concurrency object
   */
  @Configuration.Ignore
  typedConcurrency(): Concurrency {
    return new Concurrency(this.concurrency());
  }

  /**
   * Validates the concurrency settings
   */
  @Configuration.Check
  validateConcurrency(): void {
    ConcurrencyValidatorService.validator().validate(
      this.concurrency(),
      "concurrency",
      ConcurrencyConfig.CONCURRENCY_LIMITATION
    );
  }

  /**
   * Returns the concurrency level for read operations
   * Overrides the base method and ignores it to not expose it to the user.
   */
  @Configuration.Ignore
  override readConcurrency(): Concurrency {
    return this.typedConcurrency();
  }

  /**
   * Returns parameter values for this configuration
   */
  parameters(): Record<string, any> {
    return {};
  }

  /**
   * Returns the node count
   * Inherited, but ignored config key
   */
  @Configuration.Ignore
  override nodeCount(): number {
    return -1;
  }

  /**
   * Returns the relationship count
   * Inherited, but ignored config key
   */
  @Configuration.Ignore
  override relationshipCount(): number {
    return -1;
  }

  /**
   * Whether to validate relationships
   * Inherited, but ignored config key
   */
  @Configuration.Ignore
  override validateRelationships(): boolean {
    return false;
  }

  /**
   * Factory method to create a new instance
   */
  static of(
    username: string,
    graphName: string,
    fromGraphName: string,
    nodeFilter: string,
    relationshipFilter: string,
    originalConfig: GraphProjectConfig,
    procedureConfig: CypherMapWrapper
  ): GraphProjectFromGraphConfig {
    return new GraphProjectFromGraphConfigImpl(
      username,
      graphName,
      fromGraphName,
      nodeFilter,
      relationshipFilter,
      originalConfig,
      procedureConfig
    );
  }
}

/**
 * Implementation of GraphProjectFromGraphConfig
 * This provides a concrete implementation for use with the factory method
 */
class GraphProjectFromGraphConfigImpl extends GraphProjectFromGraphConfig {
  private readonly _username: string;
  private readonly _graphName: string;
  private readonly _fromGraphName: string;
  private readonly _nodeFilter: string;
  private readonly _relationshipFilter: string;
  private readonly _originalConfig: GraphProjectConfig;
  private readonly _procedureConfig: CypherMapWrapper;

  constructor(
    username: string,
    graphName: string,
    fromGraphName: string,
    nodeFilter: string,
    relationshipFilter: string,
    originalConfig: GraphProjectConfig,
    procedureConfig: CypherMapWrapper
  ) {
    super();
    this._username = username;
    this._graphName = graphName;
    this._fromGraphName = fromGraphName;
    this._nodeFilter = nodeFilter;
    this._relationshipFilter = relationshipFilter;
    this._originalConfig = originalConfig;
    this._procedureConfig = procedureConfig;
  }

  graphName(): string {
    return this._graphName;
  }

  fromGraphName(): string {
    return this._fromGraphName;
  }

  nodeFilter(): string {
    return this._nodeFilter;
  }

  relationshipFilter(): string {
    return this._relationshipFilter;
  }

  originalConfig(): GraphProjectConfig {
    return this._originalConfig;
  }

  override username(): string {
    return this._username;
  }

  toMap(): Record<string, any> {
    return {
      graphName: this.graphName(),
      fromGraphName: this.fromGraphName(),
      nodeFilter: this.nodeFilter(),
      relationshipFilter: this.relationshipFilter(),
    };
  }
}
