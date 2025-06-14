import { NodeLabel } from "@/projection";
import { PropertyMapping, PropertyMappings } from "@/projection";
import { IdMap } from "@/api";
import { NodePropertyValues } from "@/api/properties";
import { Concurrency } from "@/concurrency";
import { GraphDimensions } from "@/core/loading";
import { NodePropertiesFromStoreBuilder } from "@/core/loading";
import { ValueType } from "@/api";
import { formatWithLocale } from "@/utils";

/**
 * NATIVE NODE PROPERTY IMPORTER - Neo4j database property extraction
 *
 * This is the CORE of graph projection - it reads properties from Neo4j nodes
 * and converts them to efficient CSR storage format.
 *
 * ARCHITECTURE:
 * - Multi-level indexing (Label → Property → Builder)
 * - Concurrent property building
 * - Type validation and conversion
 * - Memory-efficient batch processing
 *
 * PURPOSE:
 * Raw Neo4j → Validated Properties → CSRGraphStore
 */
export class NativeNodePropertyImporter {

  private readonly _buildersByLabel: BuildersByLabel;
  private readonly _buildersByLabelIdAndPropertyId: BuildersByLabelIdAndPropertyId;
  private readonly _containsAnyLabelProjection: boolean;

  static builder(): Builder {
    return new Builder();
  }

  private constructor(
    buildersByLabel: BuildersByLabel,
    buildersByLabelIdAndPropertyId: BuildersByLabelIdAndPropertyId
  ) {
    this._buildersByLabel = buildersByLabel;
    this._buildersByLabelIdAndPropertyId = buildersByLabelIdAndPropertyId;
    this._containsAnyLabelProjection = buildersByLabelIdAndPropertyId.containsAnyLabelProjection();
  }

  // ====================================================================
  // MAIN IMPORT LOGIC - Neo4j node property extraction
  // ====================================================================

  /**
   * Imports all properties for a single Neo4j node
   *
   * @param neoNodeId - Neo4j internal node ID
   * @param labelTokens - Node labels as token IDs
   * @param propertiesReference - Neo4j property cursor reference
   * @param kernelTransaction - Neo4j transaction context
   * @returns Number of properties successfully imported
   */
  importProperties(
    neoNodeId: number,
    labelTokens: NodeLabelTokenSet,
    propertiesReference: PropertyReference,
    kernelTransaction: KernelTransaction
  ): number {
    // This would use Neo4j's PropertyCursor API in real implementation
    // For our TypeScript version, we'll stub this:

    let nodePropertiesRead = 0;

    // Simulate Neo4j property cursor iteration
    const properties = this.getNodeProperties(neoNodeId, kernelTransaction);

    for (const [propertyKey, propertyValue] of properties) {
      nodePropertiesRead += this.importProperty(neoNodeId, labelTokens, propertyKey, propertyValue);
    }

    return nodePropertiesRead;
  }

  /**
   * Builds final NodePropertyValues for CSRGraphStore
   */
  result(idMap: IdMap): Map<PropertyMapping, NodePropertyValues> {
    return this._buildersByLabel.build(idMap);
  }

  // ====================================================================
  // PROPERTY IMPORT LOGIC - Multi-label property handling
  // ====================================================================

  private importProperty(
    neoNodeId: number,
    labelTokens: NodeLabelTokenSet,
    propertyKey: number,
    propertyValue: any
  ): number {
    let propertiesImported = 0;

    // Import property for each label on this node
    for (let i = 0; i < labelTokens.length(); i++) {
      const labelId = labelTokens.get(i);

      if (labelId === GraphDimensions.IGNORE || labelId === GraphDimensions.ANY_LABEL) {
        continue;
      }

      const buildersByPropertyId = this._buildersByLabelIdAndPropertyId.get(labelId);
      if (buildersByPropertyId) {
        propertiesImported += this.setPropertyValue(
          neoNodeId,
          propertyValue,
          propertyKey,
          buildersByPropertyId
        );
      }
    }

    // Handle ANY_LABEL projection (properties from all labels)
    if (this._containsAnyLabelProjection) {
      propertiesImported += this.setPropertyValue(
        neoNodeId,
        propertyValue,
        propertyKey,
        this._buildersByLabelIdAndPropertyId.get(GraphDimensions.ANY_LABEL)!
      );
    }

    return propertiesImported;
  }

  private setPropertyValue(
    neoNodeId: number,
    propertyValue: any,
    propertyId: number,
    buildersByPropertyId: BuildersByPropertyId
  ): number {
    let propertiesImported = 0;

    const builders = buildersByPropertyId.get(propertyId);
    if (!builders) {
      return 0;
    }

    // Validate the property value type
    this.verifyValueType(propertyValue);

    // Convert Neo4j value to GDS value
    const gdsValue = this.convertToGdsValue(propertyValue);

    // Set value in all relevant builders
    for (const builder of builders) {
      builder.set(neoNodeId, gdsValue);
      propertiesImported++;
    }

    return propertiesImported;
  }

  // ====================================================================
  // VALUE TYPE VALIDATION - The key insight!
  // ====================================================================

  /**
   * CRITICAL: Only numeric types are supported in Neo4j GDS!
   * This explains why CSRGraphStore is purely numeric-focused.
   */
  private verifyValueType(value: any): void {
    if (!this.isSupportedValueType(value)) {
      throw new Error(formatWithLocale(
        "Loading of values of type %s is currently not supported. " +
        "Neo4j GDS only supports numeric types: integers, floats, and numeric arrays.",
        typeof value
      ));
    }
  }

  private isSupportedValueType(value: any): boolean {
    // TypeScript equivalent of Java's value type checking
    return (
      // Scalar numeric types
      typeof value === 'number' ||
      typeof value === 'bigint' ||

      // Numeric array types
      value instanceof Int8Array ||
      value instanceof Int16Array ||
      value instanceof Int32Array ||
      value instanceof BigInt64Array ||
      value instanceof Float32Array ||
      value instanceof Float64Array ||

      // Regular arrays of numbers (will be converted to typed arrays)
      (Array.isArray(value) && value.every(v => typeof v === 'number'))
    );
  }

  private convertToGdsValue(value: any): number | number[] | Float32Array | Float64Array {
    // Convert various numeric types to GDS-compatible format
    if (typeof value === 'number' || typeof value === 'bigint') {
      return Number(value);
    }

    if (value instanceof Float32Array || value instanceof Float64Array) {
      return value;
    }

    if (Array.isArray(value)) {
      return new Float64Array(value);
    }

    throw new Error(`Unsupported value type: ${typeof value}`);
  }

  // ====================================================================
  // STUB METHODS - Would use Neo4j APIs in real implementation
  // ====================================================================

  private getNodeProperties(neoNodeId: number, transaction: KernelTransaction): Map<number, any> {
    // In real implementation, this would use Neo4j's PropertyCursor
    // For now, return empty map
    return new Map();
  }
}

// ====================================================================
// BUILDER CLASSES - Multi-level indexing for efficient property access
// ====================================================================

export class Builder {
  private _concurrency: Concurrency = Concurrency.of(4);
  private _propertyMappings?: Map<NodeLabel, PropertyMappings>;
  private _dimensions?: GraphDimensions;

  concurrency(concurrency: Concurrency): Builder {
    this._concurrency = concurrency;
    return this;
  }

  propertyMappings(propertyMappingsByLabel: Map<NodeLabel, PropertyMappings>): Builder {
    this._propertyMappings = propertyMappingsByLabel;
    return this;
  }

  dimensions(dimensions: GraphDimensions): Builder {
    this._dimensions = dimensions;
    return this;
  }

  build(): NativeNodePropertyImporter {
    if (!this._propertyMappings || !this._dimensions) {
      throw new Error("Property mappings and dimensions are required");
    }

    const buildersByLabel = BuildersByLabel.create(
      this._propertyMappings,
      this._concurrency
    );

    const buildersByLabelIdAndPropertyId = BuildersByLabelIdAndPropertyId.create(
      buildersByLabel,
      this._dimensions.tokenNodeLabelMapping(),
      this._dimensions.nodePropertyTokens()
    );

    return new NativeNodePropertyImporter(buildersByLabel, buildersByLabelIdAndPropertyId);
  }
}

// ====================================================================
// SUPPORTING CLASSES - Efficient property builder organization
// ====================================================================

class BuildersByLabel {
  static create(
    propertyMappingsByLabel: Map<NodeLabel, PropertyMappings>,
    concurrency: Concurrency
  ): BuildersByLabel {
    const propertyBuildersByKey = new Map<string, NodePropertiesFromStoreBuilder>();

    // Create unique builders for each property key
    for (const propertyMappings of propertyMappingsByLabel.values()) {
      for (const propertyMapping of propertyMappings.mappings()) {
        if (!propertyBuildersByKey.has(propertyMapping.propertyKey())) {
          propertyBuildersByKey.set(
            propertyMapping.propertyKey(),
            NodePropertiesFromStoreBuilder.of(
              propertyMapping.defaultValue(),
              concurrency
            )
          );
        }
      }
    }

    const instance = new BuildersByLabel();

    // Organize builders by label and property mapping
    for (const [label, propertyMappings] of propertyMappingsByLabel) {
      for (const propertyMapping of propertyMappings.mappings()) {
        const builder = propertyBuildersByKey.get(propertyMapping.propertyKey())!;
        instance.put(label, propertyMapping, builder);
      }
    }

    return instance;
  }

  private readonly _buildersByLabel = new Map<NodeLabel, Map<PropertyMapping, NodePropertiesFromStoreBuilder>>();
  private readonly _propertyMappings = new Map<string, PropertyMapping>();
  private readonly _buildersByPropertyKey = new Map<string, NodePropertiesFromStoreBuilder>();

  private put(
    label: NodeLabel,
    propertyMapping: PropertyMapping,
    builder: NodePropertiesFromStoreBuilder
  ): void {
    this._propertyMappings.set(propertyMapping.propertyKey(), propertyMapping);
    this._buildersByPropertyKey.set(propertyMapping.propertyKey(), builder);

    if (!this._buildersByLabel.has(label)) {
      this._buildersByLabel.set(label, new Map());
    }
    this._buildersByLabel.get(label)!.set(propertyMapping, builder);
  }

  forEach(action: (label: NodeLabel, builders: Map<PropertyMapping, NodePropertiesFromStoreBuilder>) => void): void {
    this._buildersByLabel.forEach(action);
  }

  build(idMap: IdMap): Map<PropertyMapping, NodePropertyValues> {
    const result = new Map<PropertyMapping, NodePropertyValues>();

    for (const [propertyKey, builder] of this._buildersByPropertyKey) {
      const propertyMapping = this._propertyMappings.get(propertyKey)!;
      const propertyValues = builder.build(idMap);
      result.set(propertyMapping, propertyValues);
    }

    return result;
  }
}

class BuildersByLabelIdAndPropertyId {
  static create(
    buildersByLabel: BuildersByLabel,
    labelsByLabelId: Map<number, NodeLabel[]>,
    propertyIds: Map<string, number>
  ): BuildersByLabelIdAndPropertyId {
    const labelIdByLabel = LabelIdByLabel.create(labelsByLabelId);
    const instance = new BuildersByLabelIdAndPropertyId();

    buildersByLabel.forEach((labelIdentifier, builders) => {
      const labelId = labelIdByLabel.get(labelIdentifier);
      for (const [propertyMapping, builder] of builders) {
        const propertyId = propertyIds.get(propertyMapping.neoPropertyKey());
        if (propertyId !== undefined) {
          instance.put(labelId, propertyId, builder);
        }
      }
    });

    return instance;
  }

  private readonly _builders = new Map<number, BuildersByPropertyId>();

  containsAnyLabelProjection(): boolean {
    return this._builders.has(GraphDimensions.ANY_LABEL);
  }

  get(labelId: number): BuildersByPropertyId | undefined {
    return this._builders.get(labelId);
  }

  put(labelId: number, propertyId: number, builder: NodePropertiesFromStoreBuilder): void {
    if (!this._builders.has(labelId)) {
      this._builders.set(labelId, new BuildersByPropertyId());
    }
    this._builders.get(labelId)!.add(propertyId, builder);
  }
}

class BuildersByPropertyId {
  private readonly _builders = new Map<number, NodePropertiesFromStoreBuilder[]>();

  get(propertyId: number): NodePropertiesFromStoreBuilder[] | undefined {
    return this._builders.get(propertyId);
  }

  add(propertyId: number, builder: NodePropertiesFromStoreBuilder): void {
    if (!this._builders.has(propertyId)) {
      this._builders.set(propertyId, []);
    }
    this._builders.get(propertyId)!.push(builder);
  }
}

class LabelIdByLabel {
  static create(mapping: Map<number, NodeLabel[]>): LabelIdByLabel {
    const instance = new LabelIdByLabel();

    for (const [labelId, labels] of mapping) {
      for (const label of labels) {
        instance._labelIdByLabel.set(label, labelId);
      }
    }

    return instance;
  }

  private readonly _labelIdByLabel = new Map<NodeLabel, number>();

  get(label: NodeLabel): number {
    const labelId = this._labelIdByLabel.get(label);
    if (labelId === undefined) {
      throw new Error(`Unknown label: ${label.name}`);
    }
    return labelId;
  }
}

// ====================================================================
// TYPE DEFINITIONS - Neo4j integration types
// ====================================================================

interface NodeLabelTokenSet {
  length(): number;
  get(index: number): number;
}

interface PropertyReference {
  // Neo4j property reference
}

interface KernelTransaction {
  // Neo4j transaction context
}
