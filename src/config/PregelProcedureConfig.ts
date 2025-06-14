import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { GraphStore } from "@/api";
import { CypherMapWrapper } from "@/core";
import { Partitioning } from "@/pregel";
import { PregelConfig } from "./PregelConfig";

/**
 * Configuration for executing Pregel algorithms as Neo4j procedures.
 * Extends the base PregelConfig with options for writing/mutating properties.
 */
export interface PregelProcedureConfig
  extends PregelConfig,
    WritePropertyConfig,
    MutateNodePropertyConfig {
  /**
   * Property name to write results to (for 'write' mode)
   */
  writeProperty(): string;

  /**
   * Property name to mutate with results (for 'mutate' mode)
   */
  mutateProperty(): string;

  /**
   * Validates that the graph store can support write operations
   */
  validateGraphIsSuitableForWrite(
    graphStore: GraphStore,
    selectedLabels: Collection<NodeLabel>,
    selectedRelationshipTypes: Collection<RelationshipType>
  ): void;
}

/**
 * Base implementation with default values
 */
export abstract class BasePregelProcedureConfig
  implements PregelProcedureConfig
{
  // Implement all the required methods from parent interfaces

  // From PregelConfig (and its parent interfaces)
  abstract nodeLabels(): string[];
  abstract relationshipTypes(): string[];
  abstract concurrency(): number;
  abstract maxIterations(): number;
  abstract relationshipWeightProperty(): string | undefined;
  abstract isAsynchronous(): boolean;
  abstract partitioning(): Partitioning;
  abstract useForkJoin(): boolean;
  abstract trackSender(): boolean;

  // From WritePropertyConfig
  writeProperty(): string {
    return "";
  }

  // From MutateNodePropertyConfig
  mutateProperty(): string {
    return "";
  }

  /**
   * Validates that the graph store can support write operations.
   * Only validates if writeProperty is set.
   */
  validateGraphIsSuitableForWrite(
    graphStore: GraphStore,
    selectedLabels: Collection<NodeLabel>,
    selectedRelationshipTypes: Collection<RelationshipType>
  ): void {
    // Only validate if we're actually writing
    if (this.writeProperty() === "") {
      return;
    }

    if (
      !graphStore.capabilities().canWriteToLocalDatabase() &&
      !graphStore.capabilities().canWriteToRemoteDatabase()
    ) {
      throw new Error(
        "The provided graph does not support `write` execution mode."
      );
    }
  }
}

/**
 * Factory function for creating PregelProcedureConfig instances
 */
export function createPregelProcedureConfig(
  userInput: CypherMapWrapper
): PregelProcedureConfig {
  // In a real implementation, this would parse the CypherMapWrapper
  // and create a concrete instance with the specified values
  return new PregelProcedureConfigImpl(userInput);
}

/**
 * Implementation class (would be private in the actual implementation)
 */
class PregelProcedureConfigImpl implements PregelProcedureConfig {
  private readonly config: any;

  constructor(userInput: CypherMapWrapper) {
    this.config = userInput.toMap();
  }

  // Implementation of all required methods
  // These would extract values from the CypherMapWrapper
  nodeLabels(): string[] {
    return this.config.nodeLabels || [];
  }

  relationshipTypes(): string[] {
    return this.config.relationshipTypes || [];
  }

  // ... implement all other methods ...

  writeProperty(): string {
    return this.config.writeProperty || "";
  }

  mutateProperty(): string {
    return this.config.mutateProperty || "";
  }

  validateGraphIsSuitableForWrite(
    graphStore: GraphStore,
    selectedLabels: Collection<NodeLabel>,
    selectedRelationshipTypes: Collection<RelationshipType>
  ): void {
    if (this.writeProperty() === "") {
      return;
    }

    if (
      !graphStore.capabilities().canWriteToLocalDatabase() &&
      !graphStore.capabilities().canWriteToRemoteDatabase()
    ) {
      throw new Error(
        "The provided graph does not support `write` execution mode."
      );
    }
  }

  // Implement remaining methods with sensible defaults
  concurrency(): number {
    return 4;
  }
  maxIterations(): number {
    return 10;
  }
  relationshipWeightProperty(): string | undefined {
    return undefined;
  }
  isAsynchronous(): boolean {
    return false;
  }
  partitioning(): any {
    return "RANGE";
  } // Assuming Partitioning enum from previous file
  useForkJoin(): boolean {
    return this.partitioning() === "AUTO";
  }
  trackSender(): boolean {
    return false;
  }
}
