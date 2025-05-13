import { NodeLabel } from '@/NodeLabel';
import { RelationshipType } from '@/RelationshipType';
import { GraphStore } from '@/api/GraphStore';
import { Configuration } from '@/annotations/Configuration';
import { formatWithLocale } from '@/utils/StringFormatting';
import { join } from '@/utils/StringJoining';

/**
 * Configuration for features with multiple properties
 */
@Configuration
export abstract class FeaturePropertiesConfig {
  /**
   * Returns the feature properties to use
   */
  featureProperties(): string[] {
    return [];
  }

  /**
   * Returns true if all properties must exist for each node label
   */
  @Configuration.Ignore
  propertiesMustExistForEachNodeLabel(): boolean {
    return true;
  }

  /**
   * Validates that feature properties exist in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateFeatureProperties(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    let missingProperties: string[];

    if (this.propertiesMustExistForEachNodeLabel()) {
      // Check that all properties exist for all labels
      missingProperties = this.featureProperties()
        .filter(featureProperty => !graphStore.hasNodeProperty(selectedLabels, featureProperty));

      if (missingProperties.length > 0) {
        throw new Error(formatWithLocale(
          "The feature properties %s are not present for all requested labels. " +
          "Requested labels: %s. Properties available on all requested labels: %s",
          join(missingProperties),
          join(Array.from(selectedLabels).map(label => label.name())),
          join(Array.from(graphStore.nodePropertyKeys(selectedLabels)))
        ));
      }
    } else {
      // Check that all properties exist for at least one label
      const availableProperties = new Set<string>();
      Array.from(selectedLabels).forEach(label => {
        graphStore.nodePropertyKeys(label).forEach(prop => availableProperties.add(prop));
      });

      missingProperties = this.featureProperties()
        .filter(prop => !availableProperties.has(prop));

      if (missingProperties.length > 0) {
        throw new Error(formatWithLocale(
          "The feature properties %s are not present for any of the requested labels. " +
          "Requested labels: %s. Properties available on the requested labels: %s",
          join(missingProperties),
          join(Array.from(selectedLabels).map(label => label.name())),
          join(Array.from(availableProperties))
        ));
      }
    }
  }
}
