import { MemoryEstimation } from "@/mem";
import { Concurrency } from "@/concurrency";
import { ArrayIdMap } from "@/core/loading";
import { ArrayIdMapBuilder } from "@/core/loading";
import { GrowingArrayIdMapBuilder } from "@/core/loading";
import { HighLimitIdMap } from "@/core/loading";
import { HighLimitIdMapBuilder } from "@/core/loading";
import { IdMapBuilder } from "@/core/loading";
import { IdMapBehavior } from "./IdMapBehavior";

export class OpenGdsIdMapBehavior implements IdMapBehavior {
  /**
   * Creates an IdMapBuilder based on optional maxOriginalId and nodeCount.
   * Prefers nodeCount if available, otherwise derives capacity from maxOriginalId.
   * Falls back to a GrowingArrayIdMapBuilder if neither is sufficient.
   */
  public create(
    concurrency: Concurrency, // Note: concurrency is not used in this specific branch in the Java code
    maxOriginalId?: number,
    nodeCount?: number
  ): IdMapBuilder;

  /**
   * Creates an IdMapBuilder based on a specific ID string, concurrency,
   * and optional maxOriginalId and nodeCount.
   * Supports "array" and "highlimit" ID types.
   */
  public create(
    id: string,
    concurrency: Concurrency,
    maxOriginalId?: number,
    nodeCount?: number
  ): IdMapBuilder;

  // Implementation of the overloaded create method
  public create(
    idOrConcurrency: string | Concurrency,
    concurrencyOrMaxOriginalId?: Concurrency | number,
    maxOriginalIdOrNodeCount?: number,
    optionalNodeCount?: number
  ): IdMapBuilder {
    if (typeof idOrConcurrency === "string") {
      // Signature: create(id: string, concurrency: Concurrency, maxOriginalId?: number, nodeCount?: number)
      const id = idOrConcurrency;
      const concurrency = concurrencyOrMaxOriginalId as Concurrency;
      const maxOriginalId = maxOriginalIdOrNodeCount;
      const nodeCount = optionalNodeCount;

      const idLowerCase = id.toLowerCase(); // Using default locale, similar to Locale.US for ASCII comparisons

      if (idLowerCase === ArrayIdMapBuilder.ID) {
        // Delegate to the other create overload
        return this.create(concurrency, maxOriginalId, nodeCount);
      }

      if (HighLimitIdMap.isHighLimitIdMap(idLowerCase)) {
        // We do not pass in the highest original id to the nested id map builder
        // since initializing a HighLimitIdMap is typically a situation where the
        // external ids may exceed the storage capabilities of the nested id map.
        // Instead, we _know_ that the highest original id for the nested id map
        // will be nodeCount - 1 as this is what the HighLimitIdMap guarantees.
        const maxIntermediateId =
          nodeCount !== undefined ? nodeCount - 1 : undefined;

        let innerBuilder: IdMapBuilder;
        const innerTypeId = HighLimitIdMap.innerTypeId(idLowerCase);

        if (innerTypeId) {
          innerBuilder = this.create(
            innerTypeId,
            concurrency,
            maxIntermediateId,
            nodeCount
          );
        } else {
          innerBuilder = this.create(concurrency, maxIntermediateId, nodeCount);
        }
        return HighLimitIdMapBuilder.of(concurrency, innerBuilder);
      }
      // Fallback for unrecognized ID
      return this.create(concurrency, maxOriginalId, nodeCount);
    } else {
      // Signature: create(concurrency: Concurrency, maxOriginalId?: number, nodeCount?: number)
      // const concurrency = idOrConcurrency as Concurrency; // Concurrency not used here
      const maxOriginalId = concurrencyOrMaxOriginalId as number | undefined;
      const nodeCount = maxOriginalIdOrNodeCount;

      let capacity: number | undefined = undefined;

      if (nodeCount !== undefined) {
        capacity = nodeCount;
      } else if (maxOriginalId !== undefined) {
        capacity = maxOriginalId + 1;
      }

      if (capacity !== undefined) {
        return ArrayIdMapBuilder.of(capacity);
      } else {
        return GrowingArrayIdMapBuilder.of();
      }
    }
  }

  /**
   * Provides a memory estimation, defaulting to ArrayIdMap's estimation.
   */
  public memoryEstimation(): MemoryEstimation {
    // Assuming ArrayIdMap.memoryEstimation() is a static method
    return ArrayIdMap.memoryEstimation();
  }
}
