import { MutableNodeSchema } from "@/api/schema";
import { PropertySchema } from "@/api/schema";
import { NodeSchemaVisitor } from "./NodeSchemaVisitor";

/**
 * NODE SCHEMA BUILDER VISITOR - BUILDS MUTABLE NODE SCHEMA
 *
 * Visitor that constructs MutableNodeSchema from streaming schema data.
 * Used by NodeSchemaLoader to build schema from CSV files.
 */
export class NodeSchemaBuilderVisitor extends NodeSchemaVisitor {
  private readonly nodeSchema: MutableNodeSchema;

  constructor() {
    super();
    this.nodeSchema = MutableNodeSchema.empty();
  }

  /**
   * Returns a string representation of this visitor.
   */
  protected export(): void {
    const nodeLabel = this.nodeLabel();

    // Guard against null node label
    if (nodeLabel === null) {
      // Either skip processing or throw an error
      return; // Skip this entry if no label
      // OR: throw new Error("Node label cannot be null during schema building");
    }

    const entry = this.nodeSchema.getOrCreateLabel(nodeLabel);

    if (this.key() !== null) {
      entry.addProperty(
        this.key()!,
        PropertySchema.of(
          this.key()!,
          this.valueType(),
          this.defaultValue(),
          this.state()
        )
      );
    }
  }

  schema(): MutableNodeSchema {
    return this.nodeSchema;
  }
}
