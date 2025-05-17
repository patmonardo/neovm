// import { MemoryInfo, MemoryInfoConfig } from "./MemoryInfo";
// import { MemoryTracker } from "./MemoryTracker";
// import { BlockStatistics } from "./BlockStatistics";
// import { Optional } from "@/utils/Optional";

// export namespace MemoryInfoUtil {
//   export function fromTracker(
//     memoryTracker: MemoryTracker,
//     blockStatistics?: BlockStatistics
//   ): MemoryInfo {
//     const config: MemoryInfoConfig = {
//       pages: memoryTracker.pages(),
//       heapAllocations: memoryTracker.heapAllocations(),
//       nativeAllocations: memoryTracker.nativeAllocations(),
//       pageSizes: memoryTracker.pageSizes(),
//       headerBits: memoryTracker.headerBits(),
//       headerAllocations: memoryTracker.headerAllocations(),
//     };

//     if (blockStatistics) {
//       config.blockCount = Optional.of(blockStatistics.blockCount());
//       config.blockLengths = Optional.of(blockStatistics.blockLengths());
//       config.stdDevBits = Optional.of(blockStatistics.stdDevBits());
//       config.meanBits = Optional.of(blockStatistics.meanBits());
//       config.medianBits = Optional.of(blockStatistics.medianBits());
//       config.maxBits = Optional.of(blockStatistics.maxBits());
//       config.minBits = Optional.of(blockStatistics.minBits());
//       config.indexOfMinValue = Optional.of(blockStatistics.indexOfMinValue());
//       config.indexOfMaxValue = Optional.of(blockStatistics.indexOfMaxValue());
//       config.headTailDiffBits = Optional.of(blockStatistics.headTailDiffBits());
//       config.bestMaxDiffBits = Optional.of(blockStatistics.bestMaxDiffBits());
//       config.pforExceptions = Optional.of(blockStatistics.exceptions());
//     }

//     return MemoryInfo.of(config);
//   }
// }
