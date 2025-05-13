import { NodeLabel } from "../../NodeLabel"; // Adjust path
import { FilteredIdMap } from "../../api/FilteredIdMap"; // Adjust path
import { IdMap, ID_MAP_NOT_FOUND } from "../../api/IdMap"; // Adjust path
import { IdMapAdapter } from "../../api/IdMapAdapter"; // Adjust path
import { Concurrency } from "../concurrency/Concurrency"; // Adjust path
import {
  ShardedLongLongMap,
  SHARDED_LONG_LONG_MAP_NOT_FOUND,
} from "../utils/paged/ShardedLongLongMap"; // Adjust path
import { Optional } from "../../utils/Optional"; // Adjust path
import { HighLimitIdMapBuilder } from "./HighLimitIdMapBuilder";
import { OptionalLong } from "../utils/OptionalLong"; // Adjust path

export class HighLimitIdMap extends IdMapAdapter {
  private readonly highToLowIdSpace: ShardedLongLongMap;
  // Use the same NOT_FOUND sentinel consistently
  private static readonly NOT_FOUND = ID_MAP_NOT_FOUND;

  constructor(intermediateIdMap: ShardedLongLongMap, internalIdMap: IdMap) {
    super(internalIdMap);
    this.highToLowIdSpace = intermediateIdMap;
  }

  public override typeId(): string {
    return HighLimitIdMapBuilder.ID + "-" + super.typeId();
  }

  public override toOriginalNodeId(mappedNodeId: number): number {
    return this.highToLowIdSpace.toOriginalNodeId(
      super.toOriginalNodeId(mappedNodeId)
    );
  }

  public override toMappedNodeId(originalNodeId: number): number {
    const mappedNodeId = this.highToLowIdSpace.toMappedNodeId(originalNodeId);
    if (mappedNodeId === SHARDED_LONG_LONG_MAP_NOT_FOUND) {
      // Use the specific NOT_FOUND from the source
      return HighLimitIdMap.NOT_FOUND;
    }
    return super.toMappedNodeId(mappedNodeId);
  }

  public override containsOriginalId(originalNodeId: number): boolean {
    const mappedNodeId = this.highToLowIdSpace.toMappedNodeId(originalNodeId);
    if (mappedNodeId === SHARDED_LONG_LONG_MAP_NOT_FOUND) {
      return false;
    }
    return super.containsOriginalId(mappedNodeId);
  }

  public override highestOriginalId(): number {
    return this.highToLowIdSpace.maxOriginalId();
  }

  public override withFilteredLabels(
    nodeLabels: ReadonlyArray<NodeLabel>,
    concurrency: Concurrency
  ): Optional<FilteredIdMap> {
    return super
      .withFilteredLabels(nodeLabels, concurrency)
      .map(
        (filteredIdMap) =>
          new HighLimitIdMap.FilteredHighLimitIdMap(
            this.highToLowIdSpace,
            filteredIdMap
          )
      );
  }

  public static isHighLimitIdMap(typeId: string): boolean {
    return typeId.startsWith(HighLimitIdMapBuilder.ID);
  }

  public static innerTypeId(typeId: string): Optional<string> {
    const separatorIndex = typeId.indexOf("-");
    if (
      HighLimitIdMap.isHighLimitIdMap(typeId) &&
      separatorIndex > 0 &&
      separatorIndex < typeId.length - 1
    ) {
      const substring = typeId.substring(separatorIndex + 1);
      return substring === HighLimitIdMapBuilder.ID
        ? Optional.empty()
        : Optional.of(substring);
    }
    return Optional.empty();
  }
}

// Nested class equivalent using a namespace
export namespace HighLimitIdMap {
  export class FilteredHighLimitIdMap
    extends HighLimitIdMap
    implements FilteredIdMap
  {
    private readonly _filteredIdMapDelegate: FilteredIdMap; // Renamed to avoid conflict

    constructor(
      intermediateIdMap: ShardedLongLongMap,
      filteredIdMapDelegate: FilteredIdMap
    ) {
      // The 'super' call needs an IdMap. FilteredIdMap is an IdMap.
      super(intermediateIdMap, filteredIdMapDelegate);
      this._filteredIdMapDelegate = filteredIdMapDelegate;
    }

    // Implement FilteredIdMap specific methods by delegating
    public toFilteredNodeId(rootNodeId: number): number {
      return this._filteredIdMapDelegate.toFilteredNodeId(rootNodeId);
    }

    public toRootNodeId(mappedNodeId: number): number {
      return this._filteredIdMapDelegate.toRootNodeId(mappedNodeId);
    }

    public containsRootNodeId(rootNodeId: number): boolean {
      return this._filteredIdMapDelegate.containsRootNodeId(rootNodeId);
    }

    // This method is from FilteredIdMap interface, ensure it's implemented
    // It was also on our IdMapAdapter, so super.rootNodeCount() would call the delegate's version.
    public override rootNodeCount(): OptionalLong {
      return this._filteredIdMapDelegate.rootNodeCount();
    }

    // If FilteredIdMap has rootIdMap, delegate it
    public rootIdMap?(): IdMap {
      return this._filteredIdMapDelegate.rootIdMap
        ? this._filteredIdMapDelegate.rootIdMap()
        : undefined;
    }
  }
}
