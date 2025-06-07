import { GdsValue } from '@/values';
import { PrimitiveValues } from '@/values';
import { NodeSchema } from '@/api/schema';
import { NodesBuilder } from '@/core/loading';
import { NodeLabelTokens } from '@/core/loading';
import { NodeVisitor, NodeVisitorBuilder } from './NodeVisitor';

/**
 * Concrete implementation of NodeVisitor that builds nodes into a GraphStore.
 */
export class GraphStoreNodeVisitor extends NodeVisitor {
  private readonly nodesBuilder: NodesBuilder;

  constructor(nodeSchema: NodeSchema, nodesBuilder: NodesBuilder) {
    super(nodeSchema);
    this.nodesBuilder = nodesBuilder;
  }

  protected exportElement(): void {
    const props = new Map<string, GdsValue>();

    this.forEachProperty((key: string, value: any) => {
      props.set(key, PrimitiveValues.create(value));
    });

    const nodeLabels = NodeLabelTokens.of(this.labels());
    this.nodesBuilder.addNode(this.id(), props, nodeLabels);
  }
}

export namespace GraphStoreNodeVisitor {
  export class Builder extends NodeVisitorBuilder<Builder, GraphStoreNodeVisitor> {
    private nodesBuilder?: NodesBuilder;

    withNodesBuilder(nodesBuilder: NodesBuilder): Builder {
      this.nodesBuilder = nodesBuilder;
      return this;
    }

    protected me(): Builder {
      return this;
    }

    build(): GraphStoreNodeVisitor {
      if (!this.nodeSchema) {
        throw new Error('nodeSchema is required');
      }
      if (!this.nodesBuilder) {
        throw new Error('nodesBuilder is required');
      }

      return new GraphStoreNodeVisitor(this.nodeSchema, this.nodesBuilder);
    }
  }
}
