import { PropertySchema } from '@/api/schema';
import { ElementSchemaVisitor } from './ElementSchemaVisitor';

/**
 * Concrete visitor implementation for building graph property schemas.
 * Collects property schema definitions for graph-level properties and
 * provides access to the completed schema map.
 *
 * Graph properties are properties that belong to the graph itself
 * rather than to individual nodes or relationships.
 */
export class GraphPropertySchemaBuilderVisitor extends ElementSchemaVisitor {
  private readonly graphPropertySchema: Map<string, PropertySchema>;

  constructor() {
    super();
    this.graphPropertySchema = new Map<string, PropertySchema>();
  }

  /**
   * Exports a completed property schema to the graph property schema map.
   * Called by the base class when a complete property definition has been assembled.
   */
  protected export(): void {
    this.graphPropertySchema.set(
      this.key(),
      PropertySchema.of(
        this.key(),
        this.valueType(),
        this.defaultValue(),
        this.state()
      )
    );
  }

  /**
   * Returns the completed graph property schema map.
   *
   * @returns Map from property keys to their schema definitions
   */
  schema(): Map<string, PropertySchema> {
    return this.graphPropertySchema;
  }

  /**
   * Returns a string representation of this visitor.
   */
  toString(): string {
    return `GraphPropertySchemaBuilderVisitor{propertyCount=${this.graphPropertySchema.size}}`;
  }

  /**
   * Checks if the schema is empty.
   */
  isEmpty(): boolean {
    return this.graphPropertySchema.size === 0;
  }

  /**
   * Gets the number of graph properties in the schema.
   */
  size(): number {
    return this.graphPropertySchema.size;
  }

  /**
   * Checks if a property exists in the schema.
   */
  hasProperty(key: string): boolean {
    return this.graphPropertySchema.has(key);
  }

  /**
   * Gets a specific property schema by key.
   */
  getProperty(key: string): PropertySchema | undefined {
    return this.graphPropertySchema.get(key);
  }
}
