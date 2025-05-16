import {
  Orientation,
  RawValues,
  StringFormatting,
  AdjacencyBuffer,
  RelationshipsBatchBuffer,
  PropertyReader,
  SingleTypeRelationshipImporter,
  Aggregation, // Assuming Aggregation is needed by AdjacencyBuffer or PropertyReader
  // Mock types for instantiation example:
  MockAdjacencyBuffer,
  createMockRelationshipsBatchBuffer,
  createMockPropertyReader,
  MockImportMetaData
} from './importerTypes'; // Adjust path as needed

// The @Value.Style annotation is for Immutables, which generates builder classes.
// We translate the @Builder.Factory method directly.

export abstract class ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
  protected readonly adjacencyBuffer: AdjacencyBuffer;
  protected readonly relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>;
  protected readonly propertyReader: PropertyReader<PROPERTY_REF>;

  // Simulating @Builder.Factory
  public static create<PROPERTY_REF>( // Renamed from 'of' for clarity in TS
    adjacencyBuffer: AdjacencyBuffer,
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    importMetaData: SingleTypeRelationshipImporter.ImportMetaData,
    propertyReader: PropertyReader<PROPERTY_REF>
  ): ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
    const orientation = importMetaData.projection().orientation();
    const loadProperties = importMetaData.projection().properties().hasMappings();

    if (orientation === Orientation.UNDIRECTED) {
      return loadProperties
        ? new UndirectedWithProperties<PROPERTY_REF>(
            adjacencyBuffer,
            relationshipsBatchBuffer,
            propertyReader
          )
        : new Undirected<PROPERTY_REF>(adjacencyBuffer, relationshipsBatchBuffer, propertyReader);
    } else if (orientation === Orientation.NATURAL) {
      return loadProperties
        ? new NaturalWithProperties<PROPERTY_REF>(
            adjacencyBuffer,
            relationshipsBatchBuffer,
            propertyReader
          )
        : new Natural<PROPERTY_REF>(adjacencyBuffer, relationshipsBatchBuffer, propertyReader);
    } else if (orientation === Orientation.REVERSE) {
      return loadProperties
        ? new ReverseWithProperties<PROPERTY_REF>(
            adjacencyBuffer,
            relationshipsBatchBuffer,
            propertyReader
          )
        : new Reverse<PROPERTY_REF>(adjacencyBuffer, relationshipsBatchBuffer, propertyReader);
    } else {
      throw new Error( // Changed from IllegalArgumentException
        StringFormatting.formatWithLocale("Unexpected orientation: %s", orientation)
      );
    }
  }

  protected constructor(
    adjacencyBuffer: AdjacencyBuffer,
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    propertyReader: PropertyReader<PROPERTY_REF>
  ) {
    this.adjacencyBuffer = adjacencyBuffer;
    this.relationshipsBatchBuffer = relationshipsBatchBuffer;
    this.propertyReader = propertyReader;
  }

  public abstract importRelationships(): number; // Returns long in Java

  // TODO: remove, once Cypher loading uses RelationshipsBuilder
  public buffer(): RelationshipsBatchBuffer<PROPERTY_REF> {
    return this.relationshipsBatchBuffer;
  }

  protected sourceBuffer(): RelationshipsBatchBuffer<PROPERTY_REF> {
    return this.relationshipsBatchBuffer;
  }

  protected targetBuffer(): AdjacencyBuffer {
    return this.adjacencyBuffer;
  }

  protected importRelationshipsInternal( // Renamed from importRelationships to avoid clash with abstract
    sourceBufferView: RelationshipsBatchBuffer.View<PROPERTY_REF>,
    properties: number[][] | null,
    targetBufferInstance: AdjacencyBuffer // Passed explicitly, though it's this.adjacencyBuffer
  ): number {
    const batch = sourceBufferView.batch(); // sourceId1, targetId1, sourceId2, targetId2, ...
    const batchLength = sourceBufferView.batchLength(); // Number of elements in batch (rels * 2)
    const offsets = sourceBufferView.spareInts(); // To store offsets for each unique source node
    const targets = sourceBufferView.spareLongs(); // To store target nodes grouped by source

    if (batchLength === 0) {
        return 0;
    }

    let source: number, target: number;
    let prevSource = batch[0]; // First source node
    let currentOffsetInTargets = 0; // Current write position in the `targets` array
    let uniqueSourceNodesCount = 0; // Number of unique source nodes encountered

    for (let i = 0; i < batchLength; i += 2) {
      source = batch[i];
      target = batch[i + 1]; // Corrected: batch[1 + i] in Java is batch[i+1] in 0-indexed loop

      // If rels come in chunks for same source node
      // then we can skip adding an extra offset
      if (source > prevSource) { // Assuming batch is sorted by source node
        offsets[uniqueSourceNodesCount++] = currentOffsetInTargets;
        prevSource = source;
      } else if (i === 0) { // For the very first source node
        // The Java code implies offsets[0] will be 0 if the first source is new.
        // This condition ensures the first offset is recorded if the loop starts with a new source.
        // However, the Java logic `prevSource = batch[0]` and then `if (source > prevSource)`
        // means the first offset is written *before* processing the first source's targets if it's a new source.
        // Let's adjust to match the Java logic more closely:
        // The first offset (0) for the first source node is implicitly handled by how offsets are filled.
        // The critical part is `offsets[nodesLength++] = offset;` when source changes.
      }
      targets[currentOffsetInTargets++] = target;
    }
    // Add the final offset for the last group of source nodes
    offsets[uniqueSourceNodesCount++] = currentOffsetInTargets;

    targetBufferInstance.addAll(
      batch, // The original batch (contains source IDs)
      targets, // Compacted target IDs
      properties,
      offsets, // Offsets for each unique source
      uniqueSourceNodesCount // Number of unique source nodes
    );

    return batchLength / 2; // Number of relationships processed
  }
}

// --- Concrete Implementations ---

class Undirected<PROPERTY_REF> extends ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
  constructor(
    adjacencyBuffer: AdjacencyBuffer,
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    propertyReader: PropertyReader<PROPERTY_REF>
  ) {
    super(adjacencyBuffer, relationshipsBatchBuffer, propertyReader);
  }

  public override importRelationships(): number {
    const bySource = this.sourceBuffer().changeToSourceOrder();
    const importedOut = this.importRelationshipsInternal(bySource, null, this.targetBuffer());
    const byTarget = this.sourceBuffer().changeToTargetOrder();
    const importedIn = this.importRelationshipsInternal(byTarget, null, this.targetBuffer());
    return RawValues.combineIntInt(importedOut + importedIn, 0);
  }
}

class UndirectedWithProperties<PROPERTY_REF> extends ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
  constructor(
    adjacencyBuffer: AdjacencyBuffer,
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    propertyReader: PropertyReader<PROPERTY_REF>
  ) {
    super(adjacencyBuffer, relationshipsBatchBuffer, propertyReader);
  }

  public override importRelationships(): number {
    const targetBuffer = this.targetBuffer();
    const bySource = this.sourceBuffer().changeToSourceOrder();
    const outProperties = this.propertyReader.readProperties(
      bySource,
      targetBuffer.getPropertyKeyIds(),
      targetBuffer.getDefaultValues(),
      targetBuffer.getAggregations(),
      targetBuffer.atLeastOnePropertyToLoad()
    );
    const importedOut = this.importRelationshipsInternal(bySource, outProperties, targetBuffer);

    const byTarget = this.sourceBuffer().changeToTargetOrder();
    const inProperties = this.propertyReader.readProperties(
      byTarget,
      targetBuffer.getPropertyKeyIds(),
      targetBuffer.getDefaultValues(),
      targetBuffer.getAggregations(),
      targetBuffer.atLeastOnePropertyToLoad()
    );
    const importedIn = this.importRelationshipsInternal(byTarget, inProperties, targetBuffer);

    return RawValues.combineIntInt(importedOut + importedIn, importedOut + importedIn);
  }
}

class Natural<PROPERTY_REF> extends ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
  constructor(
    adjacencyBuffer: AdjacencyBuffer,
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    propertyReader: PropertyReader<PROPERTY_REF>
  ) {
    super(adjacencyBuffer, relationshipsBatchBuffer, propertyReader);
  }

  public override importRelationships(): number {
    const bySource = this.sourceBuffer().changeToSourceOrder();
    const importedCount = this.importRelationshipsInternal(bySource, null, this.targetBuffer());
    return RawValues.combineIntInt(importedCount, 0);
  }
}

class NaturalWithProperties<PROPERTY_REF> extends ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
  constructor(
    adjacencyBuffer: AdjacencyBuffer,
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    propertyReader: PropertyReader<PROPERTY_REF>
  ) {
    super(adjacencyBuffer, relationshipsBatchBuffer, propertyReader);
  }

  public override importRelationships(): number {
    const targetBuffer = this.targetBuffer();
    const propertiesProducer = this.sourceBuffer().changeToSourceOrder();
    const outProperties = this.propertyReader.readProperties(
      propertiesProducer,
      targetBuffer.getPropertyKeyIds(),
      targetBuffer.getDefaultValues(),
      targetBuffer.getAggregations(),
      targetBuffer.atLeastOnePropertyToLoad()
    );
    const importedOut = this.importRelationshipsInternal(
      propertiesProducer,
      outProperties,
      targetBuffer
    );
    return RawValues.combineIntInt(importedOut, importedOut);
  }
}

class Reverse<PROPERTY_REF> extends ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
  constructor(
    adjacencyBuffer: AdjacencyBuffer,
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    propertyReader: PropertyReader<PROPERTY_REF>
  ) {
    super(adjacencyBuffer, relationshipsBatchBuffer, propertyReader);
  }

  public override importRelationships(): number {
    const byTarget = this.sourceBuffer().changeToTargetOrder();
    const importedCount = this.importRelationshipsInternal(byTarget, null, this.targetBuffer());
    return RawValues.combineIntInt(importedCount, 0);
  }
}

class ReverseWithProperties<PROPERTY_REF> extends ThreadLocalSingleTypeRelationshipImporter<PROPERTY_REF> {
  constructor(
    adjacencyBuffer: AdjacencyBuffer,
    relationshipsBatchBuffer: RelationshipsBatchBuffer<PROPERTY_REF>,
    propertyReader: PropertyReader<PROPERTY_REF>
  ) {
    super(adjacencyBuffer, relationshipsBatchBuffer, propertyReader);
  }

  public override importRelationships(): number {
    const targetBuffer = this.targetBuffer();
    const byTarget = this.sourceBuffer().changeToTargetOrder();
    const inProperties = this.propertyReader.readProperties(
      byTarget,
      targetBuffer.getPropertyKeyIds(),
      targetBuffer.getDefaultValues(),
      targetBuffer.getAggregations(),
      targetBuffer.atLeastOnePropertyToLoad()
    );
    const importedIn = this.importRelationshipsInternal(byTarget, inProperties, targetBuffer);
    return RawValues.combineIntInt(importedIn, importedIn);
  }
}
