import { Configuration } from "@/annotations/Configuration";
import { BaseConfig } from "./BaseConfig";
import { ConcurrencyValidatorService } from "../concurrency/ConcurrencyValidatorService";
import { validateNoWhiteCharacter } from "@/core/StringIdentifierValidations";
import { Username } from "@/core/Username";
import { Concurrency } from "../concurrency/Concurrency";
import { ConcurrencyConfig } from "./ConcurrencyConfig";

/**
 * Configuration for graph projection operations
 */
@Configuration
export abstract class GraphProjectConfig extends BaseConfig {
  // Constants as static properties
  static readonly IMPLICIT_GRAPH_NAME = "";
  static readonly NODE_COUNT_KEY = "nodeCount";
  static readonly RELATIONSHIP_COUNT_KEY = "relationshipCount";
  static readonly READ_CONCURRENCY_KEY = "readConcurrency";
  static readonly VALIDATE_RELATIONSHIPS_KEY = "validateRelationships";

  /**
   * Creates an empty graph project config with the specified name
   */
  static emptyWithName(
    userName: string,
    graphName: string
  ): GraphProjectConfig {
    return new GraphCatalogConfigImpl(userName, graphName);
  }

  /**
   * Validates a graph name
   */
  static validateName(input: string): string | null {
    return validateNoWhiteCharacter(input, "graphName");
  }

  /**
   * Returns a map representation for procedure result fields
   */
  @Configuration.Ignore
  asProcedureResultConfigurationField(): Record<string, any> {
    return this.cleansed(this.toMap(), this.outputFieldDenylist());
  }

  /**
   * Helper method to remove keys from a map
   */
  @Configuration.Ignore
  cleansed(
    map: Record<string, any>,
    keysToIgnore: Set<string>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(map)) {
      if (!keysToIgnore.has(key)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Returns the username for this configuration
   */
  @Configuration.Parameter()
  username(): string {
    return Username.EMPTY_USERNAME.username();
  }

  /**
   * Returns the graph name
   */
  @Configuration.Parameter()
  @Configuration.ConvertWith("GraphProjectConfig.validateName")
  graphName(): string {
    return GraphProjectConfig.IMPLICIT_GRAPH_NAME;
  }

  /**
   * Returns the read concurrency configuration
   */
  @Configuration.Key(GraphProjectConfig.READ_CONCURRENCY_KEY)
  @Configuration.ConvertWith("ConcurrencyConfig.parse")
  @Configuration.ToMapValue("ConcurrencyConfig.render")
  readConcurrency(): Concurrency {
    return ConcurrencyConfig.TYPED_DEFAULT_CONCURRENCY;
  }

  /**
   * Returns the node count
   */
  @Configuration.Key(GraphProjectConfig.NODE_COUNT_KEY)
  nodeCount(): number {
    return -1;
  }

  /**
   * Returns the relationship count
   */
  @Configuration.Key(GraphProjectConfig.RELATIONSHIP_COUNT_KEY)
  relationshipCount(): number {
    return -1;
  }

  /**
   * Whether this is a fictitious loading configuration
   */
  @Configuration.Ignore
  isFictitiousLoading(): boolean {
    return this.nodeCount() > -1 || this.relationshipCount() > -1;
  }

  /**
   * Whether to validate relationships
   */
  @Configuration.Key(GraphProjectConfig.VALIDATE_RELATIONSHIPS_KEY)
  validateRelationships(): boolean {
    return false;
  }

  /**
   * Validates the read concurrency configuration
   */
  @Configuration.Check
  validateReadConcurrency(): void {
    ConcurrencyValidatorService.validator().validate(
      this.readConcurrency().value(),
      GraphProjectConfig.READ_CONCURRENCY_KEY,
      ConcurrencyConfig.CONCURRENCY_LIMITATION
    );
  }

  /**
   * Returns the fields that should be excluded from output
   */
  @Configuration.Ignore
  outputFieldDenylist(): Set<string> {
    return new Set();
  }
}

/**
 * Basic implementation of GraphProjectConfig used by the emptyWithName method
 * This is kept private and only used by the static factory method
 */
class GraphCatalogConfigImpl extends GraphProjectConfig {
  private readonly _username: string;
  private readonly _graphName: string;

  constructor(username: string, graphName: string) {
    super();
    this._username = username;
    this._graphName = graphName;
  }

  username(): string {
    return this._username;
  }

  graphName(): string {
    return this._graphName;
  }

  asProcedureResultConfigurationField(): Record<string, any> {
    return {
      username: this.username(),
      graphName: this.graphName(),
    };
  }

  toMap(): Record<string, any> {
    return {
      username: this.username(),
      graphName: this.graphName(),
    };
  }
}
