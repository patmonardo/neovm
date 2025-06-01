/**
 * LABEL INFORMATION BUILDERS - SIMPLE FACTORY METHODS
 *
 * Static factory methods for creating different types of label information builders.
 * Just delegates to existing builder implementations.
 */

import { NodeLabel } from '@/projection';
import { LabelInformation } from './LabelInformation';
import { SingleLabelInformation } from './SingleLabelInformation';
import { MultiLabelInformation } from './MultiLabelInformation';

export class LabelInformationBuilders {
  private constructor() {
    // Static factory class - no instances
  }

  /**
   * Create builder for all nodes (single label = ALL_NODES).
   */
  static allNodes(): LabelInformation.Builder {
    return new SingleLabelInformation.Builder(NodeLabel.ALL_NODES);
  }

  /**
   * Create builder for single label scenarios.
   */
  static singleLabel(singleLabel: NodeLabel): LabelInformation.Builder {
    return new SingleLabelInformation.Builder(singleLabel);
  }

  /**
   * Create builder for multi-label scenarios with capacity hint.
   */
  static multiLabelWithCapacity(expectedCapacity: number): LabelInformation.Builder {
    return MultiLabelInformation.Builder.of(expectedCapacity);
  }

  /**
   * Create builder for multi-label with capacity and pre-known labels.
   */
  static multiLabelWithCapacityAndLabelInformation(
    expectedCapacity: number,
    availableNodeLabels: NodeLabel[],
    starNodeLabelMappings: NodeLabel[]
  ): LabelInformation.Builder {
    return MultiLabelInformation.Builder.of(
      expectedCapacity,
      availableNodeLabels,
      starNodeLabelMappings
    );
  }
}
