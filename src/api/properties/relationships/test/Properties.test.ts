import { AdjacencyProperties } from "@/api";
import { Properties } from "../Properties";

describe("Properties", () => {
  let mockAdjacencyProps: AdjacencyProperties;

  beforeEach(() => {
    // Create a mock for AdjacencyProperties
    mockAdjacencyProps = {
      degree: vitest.fn().mockReturnValue(3),
      propertyCursor: vitest.fn(),
      // Add other required methods from AdjacencyProperties
    } as unknown as AdjacencyProperties;
  });

  test("should create Properties with factory method", () => {
    // Create Properties instance
    const props = Properties.of(mockAdjacencyProps, 100, 42);

    // Verify properties are correctly stored
    expect(props.propertiesList()).toBe(mockAdjacencyProps);
    expect(props.elementCount()).toBe(100);
    expect(props.defaultPropertyValue()).toBe(42);
  });

  test("should return correct values from accessor methods", () => {
    const props = Properties.of(mockAdjacencyProps, 250, -1);

    expect(props.propertiesList()).toBe(mockAdjacencyProps);
    expect(props.elementCount()).toBe(250);
    expect(props.defaultPropertyValue()).toBe(-1);
  });

  // test("should work with PropertyCursor", () => {
  //   // Create a mock cursor
  //   const mockCursor = {
  //     init: vitest.fn(),
  //     hasNextLong: vitest.fn().mockReturnValueOnce(true).mockReturnValue(false),
  //     nextLong: vitest.fn().mockReturnValue(42),
  //     close: vitest.fn(),
  //   };

  //   mockAdjacencyProps.propertyCursor = vitest.fn().mockReturnValue(mockCursor);

  //   const props = Properties.of(mockAdjacencyProps, 100, 0);

  //   // Get cursor for a specific node
  //   const cursor = props.propertiesList().propertyCursor(5, null as any);

  //   // Verify cursor behavior
  //   expect(cursor.hasNextLong()).toBe(true);
  //   expect(cursor.nextLong()).toBe(42);
  //   expect(cursor.hasNextLong()).toBe(false);

  //   // Verify that propertyCursor was called with the right nodeId
  //   expect(mockAdjacencyProps.propertyCursor).toHaveBeenCalledWith(5);
  // });

  test("should handle default values correctly", () => {
    // Create properties with a default value
    const props = Properties.of(mockAdjacencyProps, 10, 999);
    expect(props.defaultPropertyValue()).toBe(999);

    // This test would be expanded based on how default values are actually used
    // in the system (which isn't completely clear from the code snippets)
  });
});
