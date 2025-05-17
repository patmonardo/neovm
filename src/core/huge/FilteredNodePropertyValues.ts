import { ValueType } from "@/api/ValueType";
import { DefaultValue } from "@/api/DefaultValue";
import { NodePropertyValues } from "@/api/properties/nodes";
import { FilteredIdMap } from "@/api/FilteredIdMap";
import { NodeFilteredGraph } from "./NodeFilteredGraph";

export abstract class FilteredNodePropertyValues implements NodePropertyValues {
  protected readonly properties: NodePropertyValues;
  protected readonly graph: FilteredIdMap;

  protected abstract translateId(nodeId: number): number;

  constructor(properties: NodePropertyValues, graph: FilteredIdMap) {
    if (!properties) throw new Error("properties must not be undefined");
    if (!graph) throw new Error("graph must not be undefined");
    this.properties = properties;
    this.graph = graph;
  }

  hasValue(nodeId: number): boolean {
    const translatedId = this.translateId(nodeId);
    if (translatedId < 0) {
      return false;
    }
    return this.properties.hasValue(translatedId);
  }

  doubleValue(nodeId: number): number {
    return this.properties.doubleValue(this.translateId(nodeId));
  }

  longValue(nodeId: number): number {
    return this.properties.longValue(this.translateId(nodeId));
  }

  floatArrayValue(nodeId: number): Float32Array {
    return this.properties.floatArrayValue(this.translateId(nodeId));
  }

  doubleArrayValue(nodeId: number): Float64Array {
    return this.properties.doubleArrayValue(this.translateId(nodeId));
  }

  longArrayValue(nodeId: number): number[] {
    return this.properties.longArrayValue(this.translateId(nodeId));
  }

  getObject(nodeId: number): unknown {
    return this.properties.getObject(this.translateId(nodeId));
  }

  valueType(): ValueType {
    return this.properties.valueType();
  }

  dimension(): number | undefined {
    return this.properties.dimension();
  }

  getMaxLongPropertyValue(): number | undefined {
    if (this.valueType() === ValueType.LONG) {
      let currentMax = Number.MIN_SAFE_INTEGER;
      this.graph.forEachNode((id: number) => {
        currentMax = Math.max(currentMax, this.longValue(id));
        return true;
      });
      return currentMax === Number.MIN_SAFE_INTEGER ? undefined : currentMax;
    } else if (this.valueType() === ValueType.DOUBLE) {
      let currentMax = -Infinity;
      this.graph.forEachNode((id: number) => {
        currentMax = Math.max(currentMax, this.doubleValue(id));
        return true;
      });
      return currentMax === -Infinity ? undefined : Math.trunc(currentMax);
    } else {
      return undefined;
    }
  }

  getMaxDoublePropertyValue(): number | undefined {
    if (this.valueType() === ValueType.LONG) {
      let currentMax = Number.MIN_SAFE_INTEGER;
      this.graph.forEachNode((id: number) => {
        currentMax = Math.max(currentMax, this.longValue(id));
        return true;
      });
      return currentMax === Number.MIN_SAFE_INTEGER ? undefined : currentMax;
    } else if (this.valueType() === ValueType.DOUBLE) {
      let currentMax = -Infinity;
      this.graph.forEachNode((id: number) => {
        currentMax = Math.max(currentMax, this.doubleValue(id));
        return true;
      });
      return currentMax === -Infinity ? undefined : currentMax;
    } else {
      return undefined;
    }
  }

  nodeCount(): number {
    return this.graph.nodeCount();
  }
}

// This class is used when the ID space of the wrapped properties is wider than the id space used to retrieve node properties.
export class FilteredToOriginalNodePropertyValues extends FilteredNodePropertyValues {
  constructor(properties: NodePropertyValues, graph: NodeFilteredGraph) {
    super(properties, graph);
  }

  protected translateId(nodeId: number): number {
    return (this.graph as NodeFilteredGraph).toRootNodeId(nodeId);
  }
}

// This class is used when the ID space of the wrapped properties is smaller than the id space used to retrieve node properties.
export class OriginalToFilteredNodePropertyValues extends FilteredNodePropertyValues {
  private constructor(properties: NodePropertyValues, graph: FilteredIdMap) {
    super(properties, graph);
  }

  static create(properties: NodePropertyValues, graph: FilteredIdMap): NodePropertyValues {
    return new OriginalToFilteredNodePropertyValues(properties, graph);
  }

  doubleValue(nodeId: number): number {
    const translatedId = this.translateId(nodeId);
    if (translatedId < 0) {
      return DefaultValue.DOUBLE_DEFAULT_FALLBACK;
    }
    return this.properties.doubleValue(translatedId);
  }

  longValue(nodeId: number): number {
    const translatedId = this.translateId(nodeId);
    if (translatedId < 0) {
      return DefaultValue.LONG_DEFAULT_FALLBACK;
    }
    return this.properties.longValue(translatedId);
  }

  floatArrayValue(nodeId: number): Float32Array  {
    const translatedId = this.translateId(nodeId);
    if (translatedId < 0) {
      return DefaultValue.DEFAULT.floatArrayValue();
    }
    return this.properties.floatArrayValue(translatedId);
  }

  doubleArrayValue(nodeId: number): Float64Array {
    const translatedId = this.translateId(nodeId);
    if (translatedId < 0) {
      return DefaultValue.DEFAULT.doubleArrayValue();
    }
    return this.properties.doubleArrayValue(translatedId);
  }

  longArrayValue(nodeId: number): number[] {
    const translatedId = this.translateId(nodeId);
    if (translatedId < 0) {
      return DefaultValue.DEFAULT.longArrayValue();
    }
    return this.properties.longArrayValue(translatedId);
  }

  getObject(nodeId: number): unknown {
    const translatedId = this.translateId(nodeId);
    if (translatedId < 0) {
      return null;
    }
    return this.properties.getObject(translatedId);
  }

  protected translateId(nodeId: number): number {
    return this.graph.toFilteredNodeId(nodeId);
  }
}
