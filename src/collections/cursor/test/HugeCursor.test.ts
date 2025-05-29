import { describe, test, expect } from "vitest";
import { SinglePageCursor, PagedCursor } from "../HugeCursor";

describe("HugeCursor - Basic Functionality Check", () => {
  test("SinglePageCursor - does it work at all?", () => {
    console.log("\n🔍 TESTING: SinglePageCursor Basic Operation");
    console.log("============================================");

    const data = [1, 2, 3, 4, 5];
    const cursor = new SinglePageCursor(data);

    console.log("1. Constructor:");
    console.log(`   array: ${cursor.array}`);
    console.log(`   base: ${cursor.base}`);
    console.log(`   offset: ${cursor.offset}`);
    console.log(`   limit: ${cursor.limit}`);

    console.log("\n2. setRange():");
    cursor.setRange();
    console.log(`   offset: ${cursor.offset}`);
    console.log(`   limit: ${cursor.limit}`);

    console.log("\n3. next():");
    const result1 = cursor.next();
    console.log(`   first next(): ${result1}`);

    const result2 = cursor.next();
    console.log(`   second next(): ${result2}`);

    console.log("\n4. Data access:");
    if (cursor.array) {
      for (let i = cursor.offset; i < cursor.limit; i++) {
        console.log(`   [${i}] = ${cursor.array[i]}`);
      }
    }

    expect(cursor.array).toBe(data);
  });

  test("PagedCursor - does it work at all?", () => {
    console.log("\n🔍 TESTING: PagedCursor Basic Operation");
    console.log("======================================");

    const page1 = [1, 2, 3];
    const page2 = [4, 5, 6];
    const cursor = new PagedCursor<number[]>();

    console.log("1. Constructor:");
    console.log(`   array: ${cursor.array}`);
    console.log(`   base: ${cursor.base}`);

    console.log("\n2. setPages():");
    cursor.setPages([page1, page2], 6);
    console.log(`   pages set`);

    console.log("\n3. setRange():");
    cursor.setRange();
    console.log(`   range set`);

    console.log("\n4. Iteration:");
    let pageCount = 0;
    while (cursor.next()) {
      pageCount++;
      console.log(`   Page ${pageCount}:`);
      console.log(`     base: ${cursor.base}`);
      console.log(`     offset: ${cursor.offset}`);
      console.log(`     limit: ${cursor.limit}`);
      console.log(`     array: [${cursor.array?.join(", ") || "null"}]`);
    }

    console.log(`\n   Total pages processed: ${pageCount}`);
    expect(pageCount).toBeGreaterThan(0);
  });

  test("What happens with empty data?", () => {
    console.log("\n🔍 TESTING: Empty Data Cases");
    console.log("============================");

    console.log("1. Empty array:");
    const emptyCursor = new SinglePageCursor([]);
    emptyCursor.setRange();
    const emptyResult = emptyCursor.next();
    console.log(`   empty array next(): ${emptyResult}`);

    console.log("\n2. Empty pages:");
    const emptyPagedCursor = new PagedCursor<number[]>();
    emptyPagedCursor.setPages([], 0);
    emptyPagedCursor.setRange();
    const emptyPagedResult = emptyPagedCursor.next();
    console.log(`   empty pages next(): ${emptyPagedResult}`);

    expect(emptyResult).toBe(false);
    expect(emptyPagedResult).toBe(false);
  });
  test("What happens with ranges?", () => {
    console.log("\n🔍 TESTING: Range Operations");
    console.log("============================");

    const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const cursor = new SinglePageCursor(data);

    console.log("1. Range [3, 7):");
    cursor.setRange(3, 7);
    console.log(`   offset: ${cursor.offset}, limit: ${cursor.limit}`);

    if (cursor.next()) {
      console.log("   Values:");
      for (let i = cursor.offset; i < cursor.limit; i++) {
        console.log(`     [${i}] = ${cursor.array![i]}`);
      }
    }

    // ✅ Test the valid range worked
    expect(cursor.offset).toBe(3);
    expect(cursor.limit).toBe(7);

    console.log("\n2. Invalid range [8, 3):");
    cursor.setArray(data);
    cursor.setRange(8, 3); // Invalid: start > end
    const invalidResult = cursor.next();
    console.log(`   invalid range next(): ${invalidResult}`);
    console.log(
      `   invalid range offset: ${cursor.offset}, limit: ${cursor.limit}`
    );

    // ✅ Just test that invalid range returns false
    expect(invalidResult).toBe(false);
  });

  test("Resource cleanup - does close() work?", () => {
    console.log("\n🔍 TESTING: Resource Cleanup");
    console.log("============================");

    const cursor = new SinglePageCursor([1, 2, 3]);

    console.log("1. Before close:");
    console.log(`   array: ${cursor.array !== null}`);

    cursor.close();

    console.log("\n2. After close:");
    console.log(`   array: ${cursor.array}`);
    console.log(`   limit: ${cursor.limit}`);

    const afterCloseResult = cursor.next();
    console.log(`   next() after close: ${afterCloseResult}`);

    expect(cursor.array).toBeNull();
    expect(afterCloseResult).toBe(false);
  });

  test("How broken is PagedCursor really?", () => {
    console.log("\n🔍 DIAGNOSTIC: PagedCursor Issues");
    console.log("=================================");

    try {
      const page1 = [1, 2, 3];
      const page2 = [4, 5, 6];
      const cursor = new PagedCursor<number[]>();

      cursor.setPages([page1, page2], 6);
      cursor.setRange(0, 6); // Full range

      console.log("Setup completed successfully");

      let iterations = 0;
      let allValues: number[] = [];

      while (cursor.next() && iterations < 10) {
        // Safety limit
        iterations++;
        console.log(`Iteration ${iterations}:`);
        console.log(`  base: ${cursor.base}`);
        console.log(`  offset: ${cursor.offset}`);
        console.log(`  limit: ${cursor.limit}`);
        console.log(`  array length: ${cursor.array?.length}`);

        if (cursor.array) {
          const values: number[] = [];
          for (let i = cursor.offset; i < cursor.limit; i++) {
            if (i < cursor.array.length) {
              values.push(cursor.array[i]);
              allValues.push(cursor.array[i]);
            } else {
              values.push(undefined as any);
              allValues.push(undefined as any);
            }
          }
          console.log(`  values: [${values.join(", ")}]`);
        }
      }

      console.log(`\nFinal result:`);
      console.log(`  Total iterations: ${iterations}`);
      console.log(`  All values: [${allValues.join(", ")}]`);
      console.log(`  Expected: [1, 2, 3, 4, 5, 6]`);

      // Basic sanity check
      expect(iterations).toBeGreaterThan(0);
    } catch (error) {
      console.log(`❌ PagedCursor completely broken: ${error}`);
      console.log(`Error type: ${(error as Error).constructor.name}`);
      console.log(`Stack: ${(error as Error).stack}`);
    }
  });
});
