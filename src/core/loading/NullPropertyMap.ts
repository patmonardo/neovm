import { ValueType } from "../../api/nodeproperties/ValueType"; // Adjust path
import { LongNodePropertyValues } from "../../api/properties/nodes/LongNodePropertyValues"; // Adjust path
import { NodePropertyValues } from "../../api/properties/nodes/NodePropertyValues"; // Adjust path
import { Optional } from "../../utils/Optional"; // Adjust path
import { OptionalDouble, OptionalLong } from "../../utils/OptionalPrimitive"; // Adjust path

/**
 * Base class for NodePropertyValues implementations that always return a given default property value.
 */
export abstract class NullPropertyMap implements NodePropertyValues {
  public dimension(): Optional<number> {
    return Optional.of(1); // Corresponds to Java's Optional.of(1) for Integer
  }

  // Abstract methods that concrete classes must implement
  public abstract valueType(): ValueType;
  public abstract nodeCount(): number;

  // Optional methods from NodePropertyValues that can be overridden if needed,
  // but for a "null" map, they might return empty/default or throw if not applicable.
  public doubleValue?(nodeId: number): number {
    throw new Error("doubleValue not supported by this NullPropertyMap type.");
  }
  public longValue?(nodeId: number): number {
    throw new Error("longValue not supported by this NullPropertyMap type.");
  }
  public getObject?(nodeId: number): any {
    throw new Error("getObject not supported by this NullPropertyMap type.");
  }
  public getMaxDoublePropertyValue?(): OptionalDouble {
    return OptionalDouble.empty();
  }
  public getMaxLongPropertyValue?(): OptionalLong {
    return OptionalLong.empty();
  }
}

export namespace NullPropertyMap {
  /**
   * A NullPropertyMap that always returns a default double value.
   */
  export class DoubleNullPropertyMap extends NullPropertyMap {
    private readonly defaultValue: number;

    constructor(defaultValue: number) {
      super();
      this.defaultValue = defaultValue;
    }

    public override doubleValue(nodeId: number): number {
      return this.defaultValue;
    }

    public override getObject(nodeId: number): number {
      return this.doubleValue(nodeId);
    }

    public override valueType(): ValueType {
      return ValueType.DOUBLE;
    }

    public override getMaxDoublePropertyValue(): OptionalDouble {
      // For a constant value map, min/max could be the value itself if nodeCount > 0,
      // but the Java version returns empty.
      return OptionalDouble.empty();
    }

    public override nodeCount(): number {
      return 0n; // Java version returns 0
    }
  }

  /**
   * A NullPropertyMap that always returns a default long value.
   * Implements LongNodePropertyValues for type specificity.
   */
  export class LongNullPropertyMap
    extends NullPropertyMap
    implements LongNodePropertyValues
  {
    private readonly defaultValue: number;

    constructor(defaultValue: number) {
      super();
      this.defaultValue = defaultValue;
    }

    public override longValue(nodeId: number): number {
      return this.defaultValue;
    }

    public override getObject(nodeId: number): number {
      return this.longValue(nodeId);
    }

    public override valueType(): ValueType.LONG {
      // Specific to Long
      return ValueType.LONG;
    }

    public override getMaxLongPropertyValue(): OptionalLong {
      // Java version returns empty.
      return OptionalLong.empty();
    }

    public override nodeCount(): number {
      return 0n; // Java version returns 0
    }
  }
}
