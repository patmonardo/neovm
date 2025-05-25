import { NodeSchema } from '@/api/schema/NodeSchema';
import { NodesBuilder } from '@/core/loading/construction/NodesBuilder';
import { NodeLabelTokens } from '@/core/loading/construction/NodeLabelTokens';
import { GdsValue } from '@/values/GdsValue';
import { PrimitiveValues } from '@/values/primitive/PrimitiveValues';
import { NodeVisitor } from './NodeVisitor';

/**
 * Concrete implementation of NodeVisitor that builds nodes into a GraphStore.
 * This visitor takes node data and adds it to a NodesBuilder for constructing
 * the in-memory graph representation.
 */
export class GraphStoreNodeVisitor extends NodeVisitor {
  private readonly nodesBuilder: NodesBuilder;

  constructor(nodeSchema: NodeSchema, nodesBuilder: NodesBuilder) {
    super(nodeSchema);
    this.nodesBuilder = nodesBuilder;
  }

  /**
   * Exports the current node element to the NodesBuilder.
   * Collects all properties and creates the node with its labels.
   */
  protected exportElement(): void {
    const props = new Map<string, GdsValue>();

    this.forEachProperty((key: string, value: any) => {
      props.set(key, PrimitiveValues.create(value));
    });

    const nodeLabels = NodeLabelTokens.of(this.labels());
    this.nodesBuilder.addNode(this.id(), props, nodeLabels);
  }

  /**
   * Builder class for creating GraphStoreNodeVisitor instances.
   */
  static Builder = class extends NodeVisitor.NodeVisitorBuilder<
    GraphStoreNodeVisitor.Builder,
    GraphStoreNodeVisitor
  > {
    private nodesBuilder?: NodesBuilder;

    /**
     * Sets the NodesBuilder for this visitor.
     *
     * @param nodesBuilder The NodesBuilder to use
     * @returns This builder instance
     */
    withNodesBuilder(nodesBuilder: NodesBuilder): this {
      this.nodesBuilder = nodesBuilder;
      return this;
    }

    /**
     * Returns this builder instance with proper typing.
     */
    protected me(): this {
      return this;
    }

    /**
     * Builds the GraphStoreNodeVisitor instance.
     *
     * @returns A new GraphStoreNodeVisitor
     * @throws Error if required fields are missing
     */
    build(): GraphStoreNodeVisitor {
      if (!this.nodeSchema) {
        throw new Error('nodeSchema is required');
      }
      if (!this.nodesBuilder) {
        throw new Error('nodesBuilder is required');
      }

      return new GraphStoreNodeVisitor(this.nodeSchema, this.nodesBuilder);
    }
  };
}
