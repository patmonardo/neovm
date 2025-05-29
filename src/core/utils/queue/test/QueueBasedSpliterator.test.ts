import {
  QueueBasedSpliterator,
  createStreamingIterator,
  SpliteratorCharacteristics,
} from "../QueueBasedSpliterator";

describe("QueueBasedSpliterator - Direct Usage Tests", () => {

  test("characteristics and metadata work", () => {
    const flag = { assertRunning() {} };
    const spliterator = createStreamingIterator(null as any, "END", flag as any, 10);

    expect(spliterator.characteristics()).toBe(SpliteratorCharacteristics.NONNULL);
    expect(spliterator.estimateSize()).toBe(Number.MAX_SAFE_INTEGER);
    expect(spliterator.trySplit()).toBeNull();
    expect(spliterator.timeoutInSeconds).toBe(10);
  });

  test("factory method with default timeout", () => {
    const flag = { assertRunning() {} };
    const spliterator = createStreamingIterator(null as any, "END", flag as any);

    expect(spliterator).toBeInstanceOf(QueueBasedSpliterator);
    expect(spliterator.timeoutInSeconds).toBe(30);
  });

  test("spliterator constants are defined", () => {
    expect(SpliteratorCharacteristics.NONNULL).toBe(0x00000100);
    expect(SpliteratorCharacteristics.ORDERED).toBe(0x00000010);
    expect(SpliteratorCharacteristics.DISTINCT).toBe(0x00000001);
    expect(SpliteratorCharacteristics.SIZED).toBe(0x00000040);
  });

  test("empty iteration ends immediately", () => {
    const flag = { assertRunning() {} };
    const spliterator = createStreamingIterator(null as any, "END", flag as any, 1);

    let count = 0;
    const result = spliterator.tryAdvance(() => count++);

    expect(result).toBe(false);
    expect(count).toBe(0);
  });

  test("cancellation throws error", () => {
    let cancelled = false;
    const flag = {
      assertRunning() {
        if (cancelled) throw new Error("Cancelled");
      }
    };

    const spliterator = createStreamingIterator(null as any, "END", flag as any, 1);

    cancelled = true;

    expect(() => {
      spliterator.tryAdvance(() => {});
    }).toThrow("Cancelled");
  });
});
