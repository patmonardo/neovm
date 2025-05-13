import { NodeLabel } from "../NodeLabel";
import { RelationshipType } from "../RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { ResultStore } from "@/api/ResultStore";
import { Configuration } from "@/annotations/Configuration";
import { ConcurrencyConfig } from "./ConcurrencyConfig";
import { Concurrency } from "../concurrency/Concurrency";
import { ConcurrencyValidatorService } from "../concurrency/ConcurrencyValidatorService";

/**
 * Configuration for algorithms that write results back to Neo4j
 */
@Configuration
export abstract class WriteConfig extends ConcurrencyConfig {
  // Constants as static properties
  static readonly WRITE_CONCURRENCY_KEY = "writeConcurrency";

  /**
   * Returns the concurrency level for write operations
   */
  @Configuration.Key(WriteConfig.WRITE_CONCURRENCY_KEY)
  @Configuration.ConvertWith("WriteConfig.parse")
  @Configuration.ToMapValue("WriteConfig.render")
  writeConcurrency(): Concurrency {
    return this.concurrency();
  }

  /**
   * Validates the write concurrency settings
   */
  @Configuration.Check
  validateWriteConcurrency(): void {
    ConcurrencyValidatorService.validator().validate(
      this.writeConcurrency().value(),
      WriteConfig.WRITE_CONCURRENCY_KEY,
      ConcurrencyConfig.CONCURRENCY_LIMITATION
    );
  }

  /**
   * Returns whether to write to the result store
   */
  writeToResultStore(): boolean {
    return false;
  }

  /**
   * Resolves the appropriate result store based on configuration
   */
  @Configuration.Ignore
  resolveResultStore(resultStore: ResultStore): ResultStore | undefined {
    return this.writeToResultStore() ? resultStore : undefined;
  }

  /**
   * Validates that the graph supports write operations
   */
  @Configuration.GraphStoreValidationCheck
  validateGraphIsSuitableForWrite(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    if (!graphStore.capabilities().canWriteToLocalDatabase?.()) {
      throw new Error("Graph is not writable");
    }
  }

  /**
   * Parse user input into a concurrency value
   */
  static parse(input: any): Concurrency {
    return ConcurrencyConfig.parse(input);
  }

  /**
   * Convert a concurrency value to a serializable form
   */
  static render(concurrency: Concurrency): any {
    return ConcurrencyConfig.render(concurrency);
  }
}
