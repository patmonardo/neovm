import { RecordsBatchBuffer } from "./RecordsBatchBuffer";
import { NodeLabelTokenSet } from "./NodeLabelTokenSet";

/**
 * Specialized batch buffer for node data that handles node IDs, properties, and labels.
 * Extends the base RecordsBatchBuffer with node-specific functionality.
 *
 * @template PROPERTY_REF Type of property references stored for each node
 */
export class NodesBatchBuffer<PROPERTY_REF> extends RecordsBatchBuffer {
  private readonly _hasLabelInformation: boolean;
  private readonly _labelTokens: (NodeLabelTokenSet | null)[];
  private readonly _propertyReferences: (PROPERTY_REF | null)[] | null;

  constructor(config: NodesBatchBufferConfig<PROPERTY_REF>) {
    super(config.capacity);
    this._hasLabelInformation = config.hasLabelInformation ?? false;
    this._labelTokens = new Array<NodeLabelTokenSet | null>(
      config.capacity
    ).fill(null);
    this._propertyReferences = config.readProperty
      ? new Array<PROPERTY_REF | null>(config.capacity).fill(null)
      : null;
  }

  /**
   * Add a node to the batch buffer.
   *
   * @param nodeId           The node ID (original ID from source)
   * @param propertyReference Reference to property data for this node
   * @param labelTokens      Set of label tokens for this node
   */
  add(
    nodeId: number,
    propertyReference: PROPERTY_REF | null,
    labelTokens: NodeLabelTokenSet | null
  ): void {
    const len = this.length++;
    this.buffer[len] = nodeId;

    if (this._propertyReferences && propertyReference !== null) {
      this._propertyReferences[len] = propertyReference;
    }

    if (this._labelTokens && labelTokens !== null) {
      this._labelTokens[len] = labelTokens;
    }
  }

  /**
   * Get the property references array.
   * Returns null if property reading is disabled.
   */
  propertyReferences(): (PROPERTY_REF | null)[] | null {
    return this._propertyReferences;
  }

  /**
   * Check if this buffer contains label information.
   */
  hasLabelInformation(): boolean {
    return this._hasLabelInformation;
  }

  /**
   * Get the label tokens array.
   */
  labelTokens(): (NodeLabelTokenSet | null)[] {
    return this._labelTokens;
  }

  /**
   * Get the current batch of node IDs (up to current length).
   */
  batch(): number[] {
    return this.buffer.slice(0, this.length);
  }

  /**
   * Clear the buffer for reuse while preserving capacity.
   */
  clear(): void {
    // super.clear();

    // Clear label tokens
    this._labelTokens.fill(null);

    // Clear property references if they exist
    if (this._propertyReferences) {
      this._propertyReferences.fill(null);
    }
  }

  /**
   * Get statistics about buffer usage.
   */
  getBufferStats(): NodesBatchBufferStats {
    const memoryUsage = this.calculateMemoryUsage();

    return {
      capacity: this.capacity(),
      length: this.length,
      utilizationRatio: this.length / this.capacity(),
      hasLabelInformation: this._hasLabelInformation,
      hasPropertyReferences: this._propertyReferences !== null,
      memoryUsageBytes: memoryUsage,
      memoryUsageMB: memoryUsage / (1024 * 1024),
    };
  }

  private calculateMemoryUsage(): number {
    // let usage = super.calculateMemoryUsage(); // Base buffer memory

    // Add label tokens memory (estimate)
    let usage = this._labelTokens.length * 32; // Rough estimate per label token set

    // Add property references memory (estimate)
    if (this._propertyReferences) {
      usage += this._propertyReferences.length * 8; // Pointer size
    }

    return usage;
  }

  /**
   * Validate buffer consistency.
   */
  validate(): BufferValidationResult {
    const issues: string[] = [];

    try {
      // Check array lengths match capacity
      if (this._labelTokens.length !== this.capacity()) {
        issues.push(
          `Label tokens array length (${
            this._labelTokens.length
          }) does not match capacity (${this.capacity()})`
        );
      }

      if (
        this._propertyReferences &&
        this._propertyReferences.length !== this.capacity()
      ) {
        issues.push(
          `Property references array length (${
            this._propertyReferences.length
          }) does not match capacity (${this.capacity()})`
        );
      }

      // Check that data exists for all entries up to length
      for (let i = 0; i < this.length; i++) {
        if (this._hasLabelInformation && !this._labelTokens[i]) {
          issues.push(`Missing label tokens at index ${i}`);
        }

        if (this._propertyReferences && !this._propertyReferences[i]) {
          issues.push(`Missing property reference at index ${i}`);
        }
      }
    } catch (error) {
      issues.push(`Validation error: ${(error as Error).message}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      stats: this.getBufferStats(),
    };
  }
}

/**
 * Configuration for creating a NodesBatchBuffer.
 */
export interface NodesBatchBufferConfig<PROPERTY_REF> {
  capacity: number;
  hasLabelInformation?: boolean;
  readProperty?: boolean;
}

/**
 * Statistics about a NodesBatchBuffer.
 */
export interface NodesBatchBufferStats {
  capacity: number;
  length: number;
  utilizationRatio: number;
  hasLabelInformation: boolean;
  hasPropertyReferences: boolean;
  memoryUsageBytes: number;
  memoryUsageMB: number;
}

/**
 * Result of buffer validation.
 */
export interface BufferValidationResult {
  isValid: boolean;
  issues: string[];
  stats: NodesBatchBufferStats;
}

/**
 * Factory for creating NodesBatchBuffer instances with common configurations.
 */
export class NodesBatchBufferFactory {
  /**
   * Create a buffer for nodes with only IDs (no labels or properties).
   */
  static idOnly<PROPERTY_REF>(
    capacity: number
  ): NodesBatchBuffer<PROPERTY_REF> {
    return new NodesBatchBuffer<PROPERTY_REF>({
      capacity,
      hasLabelInformation: false,
      readProperty: false,
    });
  }

  /**
   * Create a buffer for nodes with labels but no properties.
   */
  static withLabels<PROPERTY_REF>(
    capacity: number
  ): NodesBatchBuffer<PROPERTY_REF> {
    return new NodesBatchBuffer<PROPERTY_REF>({
      capacity,
      hasLabelInformation: true,
      readProperty: false,
    });
  }

  /**
   * Create a buffer for nodes with properties but no labels.
   */
  static withProperties<PROPERTY_REF>(
    capacity: number
  ): NodesBatchBuffer<PROPERTY_REF> {
    return new NodesBatchBuffer<PROPERTY_REF>({
      capacity,
      hasLabelInformation: false,
      readProperty: true,
    });
  }

  /**
   * Create a full-featured buffer with both labels and properties.
   */
  static full<PROPERTY_REF>(capacity: number): NodesBatchBuffer<PROPERTY_REF> {
    return new NodesBatchBuffer<PROPERTY_REF>({
      capacity,
      hasLabelInformation: true,
      readProperty: true,
    });
  }

  /**
   * Create a buffer based on import requirements.
   */
  static forImport<PROPERTY_REF>(
    capacity: number,
    importConfig: ImportConfig
  ): NodesBatchBuffer<PROPERTY_REF> {
    return new NodesBatchBuffer<PROPERTY_REF>({
      capacity,
      hasLabelInformation: importConfig.includeLabels,
      readProperty: importConfig.includeProperties,
    });
  }
}

/**
 * Import configuration for determining buffer features.
 */
export interface ImportConfig {
  includeLabels: boolean;
  includeProperties: boolean;
}
