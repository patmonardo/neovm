import { ValueType } from '@/api';
import { PropertySchema } from '@/api/schema';

/**
 * Functional interface for consuming property key-value pairs.
 */
export interface PropertyConsumer {
  accept(key: string, value: any): void;
}

/**
 * Functional interface for consuming property key-value pairs with type information.
 */
export interface PropertyWithTypeConsumer {
  accept(key: string, value: any, valueType: ValueType): void;
}

/**
 * Abstract base class for visiting graph elements (nodes or relationships) during import/export.
 * Handles property processing and schema management for elements.
 *
 * @template PROPERTY_SCHEMA The type of property schema that extends PropertySchema
 */
export abstract class ElementVisitor<PROPERTY_SCHEMA extends PropertySchema> {
  private readonly currentProperties: any[];
  private readonly propertySchemas: Map<string, PROPERTY_SCHEMA[]>;
  private readonly propertyKeyPositions: Map<string, number>;

  protected constructor(propertyKeys: Iterable<string>) {
    this.propertySchemas = new Map();
    this.propertyKeyPositions = new Map();

    let i = 0;
    for (const propertyKey of propertyKeys) {
      this.propertyKeyPositions.set(propertyKey, i++);
    }

    this.currentProperties = new Array(this.propertyKeyPositions.size);
  }

  /**
   * Template method for exporting the current element.
   * Subclasses must implement this to define how elements are exported.
   */
  protected abstract exportElement(): void;

  /**
   * Returns the identifier for the current element being processed.
   * For nodes, this might be label combinations; for relationships, the type.
   */
  abstract elementIdentifier(): string;

  /**
   * Returns the property schema for the current element.
   * Subclasses implement this to provide element-specific schema lookup.
   */
  protected abstract getPropertySchema(): PROPERTY_SCHEMA[];

  /**
   * Resets the visitor state for processing a new element.
   */
  public abstract reset(): void;

  /**
   * Processes a property for the current element.
   *
   * @param key The property key
   * @param value The property value
   * @returns true to continue processing
   */
  public property(key: string, value: any): boolean {
    const propertyPosition = this.propertyKeyPositions.get(key);
    if (propertyPosition !== undefined) {
      this.currentProperties[propertyPosition] = value;
    }
    return true;
  }

  /**
   * Called when all properties for an element have been processed.
   * Triggers schema computation, element export, and state reset.
   */
  public endOfEntity(): void {
    // Check if we encounter a new label/type combination
    if (!this.propertySchemas.has(this.elementIdentifier())) {
      this.computeElementSchema();
    }

    // do the export
    this.exportElement();

    // reset
    this.reset();
    this.currentProperties.fill(null);
  }

  /**
   * Iterates over all properties of the current element.
   *
   * @param propertyConsumer Function to process each property
   */
  protected forEachProperty(propertyConsumer: PropertyConsumer): void {
    const schemas = this.propertySchemas.get(this.elementIdentifier());
    if (!schemas) return;

    for (const propertySchema of schemas) {
      const propertyPosition = this.propertyKeyPositions.get(propertySchema.key());
      if (propertyPosition !== undefined) {
        const propertyValue = this.currentProperties[propertyPosition];
        propertyConsumer.accept(propertySchema.key(), propertyValue);
      }
    }
  }

  /**
   * Iterates over all properties of the current element with type information.
   *
   * @param propertyWithTypeConsumer Function to process each property with its type
   */
  protected forEachPropertyWithType(propertyWithTypeConsumer: PropertyWithTypeConsumer): void {
    const schemas = this.propertySchemas.get(this.elementIdentifier());
    if (!schemas) return;

    for (const propertySchema of schemas) {
      const propertyPosition = this.propertyKeyPositions.get(propertySchema.key());
      if (propertyPosition !== undefined) {
        const propertyValue = this.currentProperties[propertyPosition];
        propertyWithTypeConsumer.accept(
          propertySchema.key(),
          propertyValue,
          propertySchema.valueType()
        );
      }
    }
  }

  /**
   * Computes and caches the property schema for the current element identifier.
   */
  private computeElementSchema(): void {
    const propertySchema = this.getPropertySchema();
    // Sort by property key for consistent ordering
    propertySchema.sort((a, b) => a.key().localeCompare(b.key()));
    this.propertySchemas.set(this.elementIdentifier(), propertySchema);
  }

  /**
   * Flushes any buffered data. Default implementation does nothing.
   */
  public flush(): void {
    // Default implementation - subclasses can override if needed
  }

  /**
   * Optional cleanup method for resources.
   */
  public close?(): void;
}
