// import { NodeLabel } from '@/projection';
// import { FilteredIdMap, IdMap } from '@/api';
// import { IdMapAdapter } from '@/api';
// import { Concurrency } from '@/concurrency';
// import { ShardedLongLongMap } from '@/collections';
// import { HighLimitIdMapBuilder } from './HighLimitIdMapBuilder';
// /**
//  * Two-level ID mapping implementation for handling very large node ID spaces.
//  *
//  * Uses an intermediate mapping layer to compress sparse, high-value original IDs
//  * into a dense, low-value space before applying the final internal mapping.
//  * This approach is memory-efficient for graphs with large gaps in node IDs.
//  *
//  * Architecture:
//  * Original ID → Intermediate ID → Internal ID
//  *
//  * Example:
//  * Original: [1000000, 2000000, 3000000]
//  * Intermediate: [0, 1, 2]
//  * Internal: [0, 1, 2]
//  */
// export class HighLimitIdMap extends IdMapAdapter {
//   private readonly highToLowIdSpace: ShardedLongLongMap;

//   constructor(intermediateIdMap: ShardedLongLongMap, internalIdMap: IdMap) {
//     super(internalIdMap);
//     this.highToLowIdSpace = intermediateIdMap;
//   }

//   override typeId(): string {
//     return `${HighLimitIdMapBuilder.ID}-${super.typeId()}`;
//   }

//   override toOriginalNodeId(mappedNodeId: number): number {
//     // Two-step reverse mapping: Internal → Intermediate → Original
//     const intermediateId = super.toOriginalNodeId(mappedNodeId);
//     return this.highToLowIdSpace.toOriginalNodeId(intermediateId);
//   }

//   override toMappedNodeId(originalNodeId: number): number {
//     // Two-step forward mapping: Original → Intermediate → Internal
//     const intermediateId = this.highToLowIdSpace.toMappedNodeId(originalNodeId);
//     if (intermediateId === IdMap.NOT_FOUND) {
//       return IdMap.NOT_FOUND;
//     }
//     return super.toMappedNodeId(intermediateId);
//   }

//   override containsOriginalId(originalNodeId: number): boolean {
//     // Check if original ID exists in the intermediate mapping
//     const intermediateId = this.highToLowIdSpace.toMappedNodeId(originalNodeId);
//     if (intermediateId === IdMap.NOT_FOUND) {
//       return false;
//     }
//     // Then check if intermediate ID exists in the internal mapping
//     return super.containsOriginalId(intermediateId);
//   }

//   override highestOriginalId(): number {
//     return this.highToLowIdSpace.maxOriginalId();
//   }

//   override withFilteredLabels(
//     nodeLabels: NodeLabel[],
//     concurrency: Concurrency
//   ): FilteredIdMap | null {
//     const filteredIdMap = super.withFilteredLabels(nodeLabels, concurrency);
//     return filteredIdMap
//       ? new FilteredHighLimitIdMap(this.highToLowIdSpace, filteredIdMap)
//       : null;
//   }

//   /**
//    * Check if a type ID represents a HighLimitIdMap.
//    */
//   static isHighLimitIdMap(typeId: string): boolean {
//     return typeId.startsWith(HighLimitIdMapBuilder.ID);
//   }

//   /**
//    * Extract the inner type ID from a HighLimitIdMap type ID.
//    *
//    * @param typeId The full type ID (e.g., "highlimit-compressed")
//    * @returns The inner type ID or null if not extractable
//    */
//   static innerTypeId(typeId: string): string | null {
//     const separatorIndex = typeId.indexOf('-');

//     if (HighLimitIdMap.isHighLimitIdMap(typeId) &&
//         separatorIndex > 0 &&
//         separatorIndex < typeId.length - 1) {

//       const substring = typeId.substring(separatorIndex + 1);
//       return substring === HighLimitIdMapBuilder.ID ? null : substring;
//     }

//     return null;
//   }

//   /**
//    * Get the intermediate mapping structure (for testing/debugging).
//    */
//   getHighToLowIdSpace(): ShardedLongLongMap {
//     return this.highToLowIdSpace;
//   }

//   /**
//    * Get statistics about the two-level mapping.
//    */
//   getMappingStats(): HighLimitIdMapStats {
//     return {
//       typeId: this.typeId(),
//       nodeCount: this.nodeCount(),
//       highestOriginalId: this.highestOriginalId(),
//       intermediateMapSize: this.highToLowIdSpace.size(),
//       compressionRatio: this.calculateCompressionRatio(),
//       memoryUsageMB: this.estimateMemoryUsage() / (1024 * 1024)
//     };
//   }

//   private calculateCompressionRatio(): number {
//     const originalRange = this.highestOriginalId();
//     const compressedRange = this.nodeCount();
//     return originalRange > 0 ? originalRange / compressedRange : 1;
//   }

//   private estimateMemoryUsage(): number {
//     // Rough estimate: intermediate map + internal map
//     const intermediateMemory = this.highToLowIdSpace.size() * 16; // 8 bytes key + 8 bytes value
//     const internalMemory = this.nodeCount() * 8; // Depends on internal implementation
//     return intermediateMemory + internalMemory;
//   }
// }

// /**
//  * Filtered view of a HighLimitIdMap that maintains the two-level mapping structure.
//  */
// class FilteredHighLimitIdMap extends HighLimitIdMap implements FilteredIdMap {
//   private readonly filteredIdMap: FilteredIdMap;

//   constructor(intermediateIdMap: ShardedLongLongMap, filteredIdMap: FilteredIdMap) {
//     super(intermediateIdMap, filteredIdMap);
//     this.filteredIdMap = filteredIdMap;
//   }

//   toFilteredNodeId(rootNodeId: number): number {
//     return this.filteredIdMap.toFilteredNodeId(rootNodeId);
//   }

//   toRootNodeId(mappedNodeId: number): number {
//     return this.filteredIdMap.toRootNodeId(mappedNodeId);
//   }

//   containsRootNodeId(rootNodeId: number): boolean {
//     return this.filteredIdMap.containsRootNodeId(rootNodeId);
//   }

//   /**
//    * Get statistics about the filtered two-level mapping.
//    */
//   getFilteredStats(): FilteredHighLimitIdMapStats {
//     const baseStats = this.getMappingStats();
//     return {
//       ...baseStats,
//       filteredNodeCount: this.filteredIdMap.nodeCount(),
//       filterEfficiency: this.filteredIdMap.nodeCount() / this.nodeCount()
//     };
//   }
// }

// /**
//  * Statistics about HighLimitIdMap performance and memory usage.
//  */
// export interface HighLimitIdMapStats {
//   typeId: string;
//   nodeCount: number;
//   highestOriginalId: number;
//   intermediateMapSize: number;
//   compressionRatio: number;
//   memoryUsageMB: number;
// }

// /**
//  * Extended statistics for filtered HighLimitIdMap.
//  */
// export interface FilteredHighLimitIdMapStats extends HighLimitIdMapStats {
//   filteredNodeCount: number;
//   filterEfficiency: number;
// }
