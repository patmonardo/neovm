import { DefaultValue } from '@/api/DefaultValue';
import { PropertyState } from '@/api/PropertyState';
import { ValueType } from '@/api/ValueType';

/**
 * Base interface for visiting schema input elements.
 * Defines the fundamental contract for processing property schema components
 * in a streaming fashion. Extends Closeable for resource management.
 *
 * This is the foundation interface that all schema visitors implement,
 * providing the core property schema elements that are common across
 * nodes, relationships, and graph properties.
 */
export interface InputSchemaVisitor {
  /**
   * Visits a property key/name.
   *
   * @param key The property key name
   * @returns true to continue processing, false to stop
   */
  key(key: string): boolean;

  /**
   * Visits a property value type.
   *
   * @param valueType The type of values this property can hold
   * @returns true to continue processing, false to stop
   */
  valueType(valueType: ValueType): boolean;

  /**
   * Visits a property default value.
   *
   * @param defaultValue The default value when property is missing
   * @returns true to continue processing, false to stop
   */
  defaultValue(defaultValue: DefaultValue): boolean;

  /**
   * Visits a property state.
   *
   * @param state The persistence state of the property
   * @returns true to continue processing, false to stop
   */
  state(state: PropertyState): boolean;

  /**
   * Called when the end of a schema entity is reached.
   * Signals that all components of a property schema have been visited.
   */
  endOfEntity(): void;

  /**
   * Closes and cleans up any resources used by this visitor.
   * Called when schema processing is complete.
   */
  close(): void;
}

/**
 * Abstract adapter class that provides default implementations for InputSchemaVisitor.
 * All visitor methods return true by default (accept all input) and close() is a no-op.
 *
 * Concrete visitors can extend this adapter and override only the methods they care about,
 * providing a convenient base for implementing specific schema processing logic.
 */
export abstract class InputSchemaVisitorAdapter implements InputSchemaVisitor {
  /**
   * Default implementation accepts all property keys.
   *
   * @param key The property key name
   * @returns true to continue processing
   */
  key(key: string): boolean {
    return true;
  }

  /**
   * Default implementation accepts all value types.
   *
   * @param valueType The property value type
   * @returns true to continue processing
   */
  valueType(valueType: ValueType): boolean {
    return true;
  }

  /**
   * Default implementation accepts all default values.
   *
   * @param defaultValue The property default value
   * @returns true to continue processing
   */
  defaultValue(defaultValue: DefaultValue): boolean {
    return true;
  }

  /**
   * Default implementation accepts all property states.
   *
   * @param state The property state
   * @returns true to continue processing
   */
  state(state: PropertyState): boolean {
    return true;
  }

  /**
   * Default implementation does nothing at end of entity.
   */
  endOfEntity(): void {
    // Default: no action
  }

  /**
   * Default implementation does nothing on close.
   */
  close(): void {
    // Default: no cleanup needed
  }
}

/**
 * Namespace for organizing InputSchemaVisitor-related functionality.
 */
export namespace InputSchemaVisitor {
  /**
   * Adapter class alias for convenience.
   */
  export const Adapter = InputSchemaVisitorAdapter;
}
