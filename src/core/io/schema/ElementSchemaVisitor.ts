import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { PropertyState } from "@/api";
import { PropertySchema } from "@/api/schema";
import { InputSchemaVisitor } from "./InputSchemaVisitor";

/**
 * Abstract base visitor for building element schemas (nodes, relationships, graph properties).
 * Implements both the visitor pattern for processing schema input and the PropertySchema interface
 * for representing the final schema state.
 *
 * This dual nature allows it to:
 * 1. Accept schema data through visitor methods
 * 2. Provide schema data through PropertySchema interface
 * 3. Export complete schemas when processing is finished
 */
export abstract class ElementSchemaVisitor
  extends InputSchemaVisitor.Adapter
  implements PropertySchema
{
  private _key: string | null = null;
  private _valueType: ValueType | null = null;
  private _defaultValue: DefaultValue | null = null;
  private _state: PropertyState | null = null;

  /**
   * Abstract method that subclasses implement to export the completed schema.
   * Called when a complete property schema has been assembled.
   */
  protected abstract export(): void;

  // Method overloads for key()
  key(): string;                    // Getter signature (PropertySchema)
  key(key: string): boolean;        // Visitor signature (InputSchemaVisitor)
  key(key?: string): string | boolean | null{
    if (key === undefined) {
      // Getter behavior
      return this._key;
    } else {
      // Visitor behavior
      this._key = key;
      return true; // Continue processing
    }
  }

  // Method overloads for valueType()
  valueType(): ValueType;
  valueType(valueType: ValueType): boolean;
  valueType(valueType?: ValueType): ValueType | boolean  | null {
    if (valueType === undefined) {
      return this._valueType;
    } else {
      this._valueType = valueType;
      return true;
    }
  }

  // Method overloads for defaultValue()
  defaultValue(): DefaultValue;
  defaultValue(defaultValue: DefaultValue): boolean;
  defaultValue(defaultValue?: DefaultValue): DefaultValue | boolean | null {
    if (defaultValue === undefined) {
      return this._defaultValue;
    } else {
      this._defaultValue = defaultValue;
      return true;
    }
  }

  // Method overloads for state()
  state(): PropertyState;
  state(state: PropertyState): boolean;
  state(state?: PropertyState): PropertyState | boolean | null {
    if (state === undefined) {
      return this._state;
    } else {
      this._state = state;
      return true;
    }
  }

  /**
   * Called when the end of a property schema entity is reached.
   * Exports the completed schema and resets for the next property.
   */
  endOfEntity(): void {
    this.export();
    this.reset();
  }

  /**
   * Resets all property fields to null for processing the next property.
   */
  protected reset(): void {
    this.key();
    this.valueType();
    this.defaultValue();
    this.state();
  }
}
