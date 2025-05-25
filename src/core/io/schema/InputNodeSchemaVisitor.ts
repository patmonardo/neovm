import { NodeLabel } from '@/projection';
import { ElementSchemaVisitor } from './ElementSchemaVisitor';
import { InputSchemaVisitor } from './InputSchemaVisitor';

/**
 * Visitor interface for processing node schema input.
 * Extends the base schema visitor with node-specific functionality
 * for handling node labels in schema definitions.
 */
export interface InputNodeSchemaVisitor extends InputSchemaVisitor {
  /**
   * Visits a node label in the schema.
   *
   * @param nodeLabel The node label being processed
   * @returns true to continue processing, false to stop
   */
  nodeLabel(nodeLabel: NodeLabel): boolean;
}

/**
 * Abstract adapter class that provides default implementations for InputNodeSchemaVisitor.
 * Extends ElementSchemaVisitor to inherit property schema building capabilities
 * while adding node-specific label handling.
 */
export abstract class InputNodeSchemaVisitorAdapter extends ElementSchemaVisitor implements InputNodeSchemaVisitor {
  /**
   * Default implementation that accepts all node labels.
   * Subclasses can override to provide custom label handling logic.
   *
   * @param nodeLabel The node label being processed
   * @returns true to continue processing
   */
  nodeLabel(nodeLabel: NodeLabel): boolean {
    return true;
  }
}

/**
 * Namespace for organizing InputNodeSchemaVisitor-related functionality.
 */
export namespace InputNodeSchemaVisitor {
  /**
   * Adapter class alias for convenience.
   */
  export const Adapter = InputNodeSchemaVisitorAdapter;
}
