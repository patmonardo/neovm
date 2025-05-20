import { AdjacencyList } from "@/api/AdjacencyList";
import { AdjacencyCursor } from "@/api/AdjacencyCursor";
import { AdjacencyProperties } from "@/api/AdjacencyProperties";
import { CompositeRelationshipIterator } from "@/api/CompositeRelationshipIterator";
import { PropertyCursor } from "@/api/properties/relationships";
import { RelationshipConsumer } from "@/api/properties/relationships";

export class CSRCompositeRelationshipIterator
  implements CompositeRelationshipIterator
{
  private readonly propertyKeysArr: string[];
  private readonly adjacencyList: AdjacencyList;
  private readonly inverseAdjacencyList?: AdjacencyList;
  private readonly properties: AdjacencyProperties[];
  private readonly propertyBuffer: number[];
  private readonly inverseProperties: AdjacencyProperties[];
  private readonly adjacencyCursor: AdjacencyCursor;
  private readonly inverseAdjacencyCursor?: AdjacencyCursor;
  private readonly propertyCursors: PropertyCursor[];
  private readonly inversePropertyCursors: PropertyCursor[];

  constructor(
    adjacencyList: AdjacencyList,
    inverseAdjacencyList: AdjacencyList | null,
    propertyKeys: string[],
    properties: AdjacencyProperties[],
    inverseProperties: AdjacencyProperties[]
  ) {
    const propertyCount = propertyKeys.length;
    if (properties.length !== propertyCount)
      throw new Error("Properties length must match propertyKeys length");
    this.adjacencyList = adjacencyList;
    this.inverseAdjacencyList = inverseAdjacencyList ?? undefined;
    this.propertyKeysArr = propertyKeys;
    this.properties = properties;
    this.inverseProperties = inverseProperties;
    this.propertyBuffer = new Array(propertyCount);
    this.adjacencyCursor = adjacencyList.rawAdjacencyCursor();
    this.inverseAdjacencyCursor = inverseAdjacencyList
      ? inverseAdjacencyList.rawAdjacencyCursor()
      : undefined;
    this.propertyCursors = properties.map((p) => p.rawPropertyCursor());
    this.inversePropertyCursors = inverseProperties.map((p) =>
      p.rawPropertyCursor()
    );
  }

  degree(nodeId: number): number {
    return this.adjacencyList.degree(nodeId);
  }

  forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void {
    this.forEachRelationshipInternal(
      nodeId,
      consumer,
      this.adjacencyList,
      this.properties,
      this.adjacencyCursor,
      this.propertyCursors
    );
  }

  forEachInverseRelationship(
    nodeId: number,
    consumer: RelationshipConsumer
  ): void {
    if (!this.inverseAdjacencyList || !this.inverseAdjacencyCursor) {
      throw new Error(
        "Cannot create composite iterator on a relationship type that is not inverse indexed"
      );
    }
    this.forEachRelationshipInternal(
      nodeId,
      consumer,
      this.inverseAdjacencyList,
      this.inverseProperties,
      this.inverseAdjacencyCursor,
      this.inversePropertyCursors
    );
  }

  private forEachRelationshipInternal(
    nodeId: number,
    consumer: RelationshipConsumer,
    adjacency: AdjacencyList,
    props: AdjacencyProperties[],
    reuseAdjacencyCursor: AdjacencyCursor,
    reusePropertyCursors: PropertyCursor[]
  ): void {
    adjacency.adjacencyCursor(reuseAdjacencyCursor, nodeId);
    if (!reuseAdjacencyCursor.hasNextVLong()) return;
    const propertyCount = this.propertyKeysArr.length;
    for (let i = 0; i < propertyCount; i++) {
      props[i].propertyCursor(reusePropertyCursors[i], nodeId);
    }
    while (reuseAdjacencyCursor.hasNextVLong()) {
      const target = reuseAdjacencyCursor.nextVLong();
      for (let i = 0; i < propertyCount; i++) {
        this.propertyBuffer[i] = Number(reusePropertyCursors[i].nextLong());
      }
      if (!consumer.consume(nodeId, target, this.propertyBuffer)) break;
    }
  }

  propertyKeys(): string[] {
    return this._propertyKeys;
  }

  concurrentCopy(): CompositeRelationshipIterator {
    return new CSRCompositeRelationshipIterator(
      this.adjacencyList,
      this.inverseAdjacencyList ?? null,
      this.propertyKeysArr,
      this.properties,
      this.inverseProperties
    );
  }
}
