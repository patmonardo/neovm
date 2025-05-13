import { NodeLabel } from '../../NodeLabel'; // Adjust path
import { LabelInformation } from './LabelInformation';
import { SingleLabelInformation } from './SingleLabelInformation';
import { MultiLabelInformation } from './MultiLabelInformation';

/**
 * Utility class providing static factory methods for creating various
 * `LabelInformation.Builder` instances.
 * This class is not meant to be instantiated.
 */
export class LabelInformationBuilders {
  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  /**
   * Creates a builder for `LabelInformation` that assumes all nodes belong to a single,
   * special label {@link NodeLabel.ALL_NODES}.
   *
   * @returns A builder for single label information targeting all nodes.
   */
  public static allNodes(): LabelInformation.Builder {
    return new SingleLabelInformation.Builder(NodeLabel.ALL_NODES);
  }

  /**
   * Creates a builder for `LabelInformation` that handles a single, specific node label.
   *
   * @param singleLabel The specific node label to be managed.
   * @returns A builder for single label information.
   */
  public static singleLabel(singleLabel: NodeLabel): LabelInformation.Builder {
    return new SingleLabelInformation.Builder(singleLabel);
  }

  /**
   * Creates a builder for `LabelInformation` designed to handle multiple node labels,
   * initialized with an expected capacity.
   *
   * @param expectedCapacity A hint for the expected number of nodes or label mappings,
   *                         used for initial sizing of internal data structures.
   *                         (Java long maps to number or number)
   * @returns A builder for multi-label information.
   */
  public static multiLabelWithCapacity(expectedCapacity: number | number): LabelInformation.Builder {
    return MultiLabelInformation.Builder.of(expectedCapacity);
  }

  /**
   * Creates a builder for `LabelInformation` designed to handle multiple node labels,
   * initialized with an expected capacity and pre-existing label information.
   *
   * @param expectedCapacity A hint for the expected number of nodes or label mappings.
   *                         (Java long maps to number or number)
   * @param availableNodeLabels A collection of node labels that are known to exist or
   *                            are expected to be used.
   * @param starNodeLabelMappings A collection of node labels that act as wildcards or
   *                              represent "all labels" in certain contexts (e.g., for star projections).
   * @returns A builder for multi-label information, pre-configured with label details.
   */
  public static multiLabelWithCapacityAndLabelInformation(
    expectedCapacity: number | number, // Java long
    availableNodeLabels: ReadonlyArray<NodeLabel>, // Java Collection<NodeLabel>
    starNodeLabelMappings: ReadonlyArray<NodeLabel> // Java Collection<NodeLabel>
  ): LabelInformation.Builder {
    return MultiLabelInformation.Builder.of(expectedCapacity, availableNodeLabels, starNodeLabelMappings);
  }
}
