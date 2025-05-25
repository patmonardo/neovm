import { NodeLabel } from '@/projection';
import { InputNodeSchemaVisitor } from './InputNodeSchemaVisitor';

/**
 * Abstract base class for node schema visitors that need to track the current node label.
 * Extends the InputNodeSchemaVisitor adapter and adds state management for the current
 * node label being processed.
 *
 * This class serves as a convenient base for concrete node schema visitors that need
 * to know which label context they're operating in when processing properties.
 */
export abstract class NodeSchemaVisitor extends InputNodeSchemaVisitor.Adapter {
  private _nodeLabel: NodeLabel | null = null;

  // Method overloads handling getter, setter, and reset
  nodeLabel(): NodeLabel | null; // Getter signature
  nodeLabel(nodeLabel: NodeLabel | null): boolean; // Visitor/setter signature
  nodeLabel(nodeLabel?: NodeLabel | null): NodeLabel | null | boolean {
    if (nodeLabel === undefined) {
      // Getter behavior - no parameters
      return this._nodeLabel;
    } else {
      // Visitor/setter behavior - with parameter (including null)
      this._nodeLabel = nodeLabel; // null is a valid value for reset
      return true; // Continue processing
    }
  }
  /**
   * Resets all state including the current node label.
   * Called after processing each complete property to prepare for the next one.
   */
  protected reset(): void {
    super.reset();
    this.nodeLabel(null);
  }
}
