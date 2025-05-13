import {
  NodeLabel,
  ObjectIntMap,
  ObjectIntScatterMap,
  IntObjectHashMap,
  MutableInt,
  ANY_LABEL,
  NO_SUCH_LABEL,
  StringFormatting,
} from './tokenToNodeLabelsTypes';

export abstract class TokenToNodeLabels {
  protected readonly nodeLabelToLabelTokenMap: ObjectIntMap<NodeLabel>;
  protected readonly labelTokenToNodeLabelMap: IntObjectHashMap<NodeLabel[]>; // Java's List<NodeLabel>

  public static fixed(nodeLabels: NodeLabel[]): TokenToNodeLabels {
    const elementIdentifierLabelTokenMapping: ObjectIntScatterMap<NodeLabel> = new Map<NodeLabel, number>();
    const labelTokenNodeLabelMapping: IntObjectHashMap<NodeLabel[]> = new Map<number, NodeLabel[]>();
    const labelTokenCounter = new MutableInt(0);

    nodeLabels.forEach(nodeLabel => {
      // Direct instance comparison for ALL_NODES
      const labelToken = (nodeLabel === NodeLabel.ALL_NODES)
        ? ANY_LABEL
        : labelTokenCounter.getAndIncrement();

      elementIdentifierLabelTokenMapping.set(nodeLabel, labelToken);
      labelTokenNodeLabelMapping.set(labelToken, [nodeLabel]); // List.of(nodeLabel) -> [nodeLabel]
    });

    return new Fixed(elementIdentifierLabelTokenMapping, labelTokenNodeLabelMapping);
  }

  public static lazy(): TokenToNodeLabels {
    return new Lazy();
  }

  // Constructor for Lazy subclass
  protected constructor();
  // Constructor for Fixed subclass (and base for direct instantiation if needed)
  protected constructor(
    nodeLabelToLabelTokenMap?: ObjectIntMap<NodeLabel>,
    labelTokenToNodeLabelMap?: IntObjectHashMap<NodeLabel[]>
  );
  // Implementation
  protected constructor(
    nodeLabelToLabelTokenMap?: ObjectIntMap<NodeLabel>,
    labelTokenToNodeLabelMap?: IntObjectHashMap<NodeLabel[]>
  ) {
    if (nodeLabelToLabelTokenMap && labelTokenToNodeLabelMap) {
      this.nodeLabelToLabelTokenMap = nodeLabelToLabelTokenMap;
      this.labelTokenToNodeLabelMap = labelTokenToNodeLabelMap;
    } else {
      // This path is for the Lazy constructor
      this.nodeLabelToLabelTokenMap = new Map<NodeLabel, number>(); // ObjectIntScatterMap
      this.labelTokenToNodeLabelMap = new Map<number, NodeLabel[]>(); // IntObjectHashMap
    }
  }

  public labelTokenNodeLabelMapping(): IntObjectHashMap<NodeLabel[]> {
    return this.labelTokenToNodeLabelMap;
  }

  public abstract getOrCreateToken(nodeLabel: NodeLabel): number;
}

class Fixed extends TokenToNodeLabels {
  constructor(
    elementIdentifierLabelTokenMapping: ObjectIntMap<NodeLabel>,
    labelTokenNodeLabelMapping: IntObjectHashMap<NodeLabel[]>
  ) {
    super(elementIdentifierLabelTokenMapping, labelTokenNodeLabelMapping);
  }

  public override getOrCreateToken(nodeLabel: NodeLabel): number {
    if (!this.nodeLabelToLabelTokenMap.has(nodeLabel)) {
      throw new Error( // Changed from IllegalArgumentException
        StringFormatting.formatWithLocale("No token was specified for node label %s", nodeLabel.toString())
      );
    }
    // Map.get() returns V | undefined, so use ! if sure it exists (after .has check)
    return this.nodeLabelToLabelTokenMap.get(nodeLabel)!;
  }
}

class Lazy extends TokenToNodeLabels {
  private nextLabelId: number;

  constructor() {
    super(); // Calls the constructor variant that initializes the maps
    this.nextLabelId = 0;
  }

  public override getOrCreateToken(nodeLabel: NodeLabel): number {
    let token = this.nodeLabelToLabelTokenMap.get(nodeLabel);
    if (token === undefined) { // HPPC getOrDefault behavior
        token = NO_SUCH_LABEL;
    }

    if (token === NO_SUCH_LABEL) {
      token = this.nextLabelId++;
      this.labelTokenToNodeLabelMap.set(token, [nodeLabel]); // Collections.singletonList -> [nodeLabel]
      this.nodeLabelToLabelTokenMap.set(nodeLabel, token);
    }
    return token;
  }
}
