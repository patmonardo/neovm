import { NodeLabel } from '@/gds';
import { GraphStore } from '@/api';

/**
 * Calculates the average number of node property characters by sampling nodes and their properties.
 * A number of nodes is randomly selected and then classified according to their node labels.
 */
export class NodePropertySampler {

  /**
   * Sample node properties to estimate average bytes per node.
   * @param graphStore The graph store to sample from
   * @param samplingFactor Fraction of nodes to sample (0.0 to 1.0)
   * @returns The average number of property characters per node entry
   */
  static sample(graphStore: GraphStore, samplingFactor: number): number {
    return new NodePropertySampler(graphStore, samplingFactor).sample();
  }

  private readonly nodesToSample: number;
  private readonly graphStore: GraphStore;
  private readonly schemaSamples: Map<string, NodeLabelSample>;

  private constructor(graphStore: GraphStore, samplingFactor: number) {
    this.graphStore = graphStore;
    this.nodesToSample = Math.round(graphStore.nodeCount() * samplingFactor);
    this.schemaSamples = new Map();
  }

  private sample(): number {
    // Sample random nodes
    for (let i = 0; i < this.nodesToSample; i++) {
      const nodeId = Math.floor(Math.random() * this.graphStore.nodeCount());
      const labels = this.graphStore.nodes().nodeLabels(nodeId);

      // Create a unique key for this label combination
      const labelKey = this.createLabelKey(labels);

      // Get or create schema sample for this label combination
      let schemaSample = this.schemaSamples.get(labelKey);
      if (!schemaSample) {
        schemaSample = new NodeLabelSample(this.graphStore, labels);
        this.schemaSamples.set(labelKey, schemaSample);
      }

      schemaSample.sample(nodeId);
    }

    // Calculate weighted average across all label combinations
    let totalWeightedSize = 0;

    for (const nodeLabelSample of this.schemaSamples.values()) {
      const relativeSampleSize = nodeLabelSample.encounters() / this.nodesToSample;
      const averageEntrySize = nodeLabelSample.averageEntrySize();
      totalWeightedSize += Math.round(relativeSampleSize * averageEntrySize);
    }

    return totalWeightedSize;
  }

  /**
   * Create a unique string key for a collection of node labels.
   */
  private createLabelKey(labels: NodeLabel[]): string {
    return labels
      .map(label => label.name)
      .sort() // Ensure consistent ordering
      .join('|');
  }
}

/**
 * Stores the sample data for a specific NodeLabel combination.
 */
class NodeLabelSample {
  private readonly graphStore: GraphStore;
  private readonly propertyCharactersSamples: Map<string, number[]>;
  private encounterCount: number = 0;

  constructor(graphStore: GraphStore, labels: NodeLabel[]) {
    this.graphStore = graphStore;
    this.propertyCharactersSamples = new Map();

    // Initialize sampling arrays for all property keys of these labels
    const propertyKeys = graphStore.nodePropertyKeys(labels);
    for (const propertyKey of propertyKeys) {
      this.propertyCharactersSamples.set(propertyKey, []);
    }
  }

  encounters(): number {
    return this.encounterCount;
  }

  /**
   * Calculate the average entry size across all properties.
   * Adds 1 byte per property for CSV separators.
   */
  averageEntrySize(): number {
    let totalSize = 0;

    for (const propertySamples of this.propertyCharactersSamples.values()) {
      if (propertySamples.length > 0) {
        const sum = propertySamples.reduce((acc, size) => acc + size, 0);
        const average = Math.floor(sum / propertySamples.length);
        totalSize += average + 1; // +1 for CSV separator
      }
    }

    return totalSize;
  }

  /**
   * Sample a specific node and record its property sizes.
   */
  sample(nodeId: number): void {
    this.encounterCount++;

    for (const [propertyKey, sampleList] of this.propertyCharactersSamples) {
      const propertyValue = this.graphStore
        .nodeProperty(propertyKey)
        .values()
        .getObject(nodeId);

      let characterCount = 0;

      if (propertyValue === null || propertyValue === undefined) {
        // Nothing to do - null values don't add characters
      } else if (Array.isArray(propertyValue)) {
        // Handle array properties
        for (const element of propertyValue) {
          characterCount += this.getCharacterCount(element) + 1; // +1 for array separator
        }
      } else {
        // Handle scalar properties
        characterCount = this.getCharacterCount(propertyValue);
      }

      sampleList.push(characterCount);
    }
  }

  /**
   * Get the UTF-8 byte count for a property value.
   */
  private getCharacterCount(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const stringValue = String(value);
    // Use Buffer.byteLength to get UTF-8 byte count
    return Buffer.byteLength(stringValue, 'utf8');
  }
}
