import { RelationshipType } from '@/gds';
import { GraphStore } from '@/api';

/**
 * Calculates the average number of relationship property characters by sampling.
 * This is done per relationship type.
 * For each type a number of nodes with at least one relationship of the given type are randomly chosen.
 * The first relationship for each sampled node is used to estimate the property values.
 */
export class RelationshipPropertySampler {
  private readonly samplingFactor: number;
  private readonly graphStore: GraphStore;

  /**
   * Sample relationship properties to estimate average bytes per relationship.
   */
  static sample(graphStore: GraphStore, samplingFactor: number): number {
    return new RelationshipPropertySampler(graphStore, samplingFactor).sample();
  }

  private constructor(graphStore: GraphStore, samplingFactor: number) {
    this.graphStore = graphStore;
    this.samplingFactor = samplingFactor;
  }

  /**
   * @returns The average number of relationship property characters per relationship entry.
   */
  private sample(): number {
    return this.graphStore
      .relationshipTypes()
      .map(relationshipType => {
        const relativeRelTypeSize = this.graphStore.relationshipCount(relationshipType) / this.graphStore.relationshipCount();
        const averageRelTypeCharacterCount = this.sampleRelationshipType(relationshipType);

        return Math.round(relativeRelTypeSize * averageRelTypeCharacterCount);
      })
      .reduce((sum, count) => sum + count, 0);
  }

  private sampleRelationshipType(relationshipType: RelationshipType): number {
    const propertyKeys = this.graphStore.relationshipPropertyKeys(relationshipType);

    if (propertyKeys.length === 0) {
      return 0;
    }

    // Get graphs for each property
    const graphs = propertyKeys.map(property =>
      this.graphStore.getGraph(relationshipType, property)
    );

    const relationshipsToSample = Math.round(graphs[0].relationshipCount() * this.samplingFactor);

    // Initialize sample collections for each property
    const propertyCharactersSamples: number[][] = graphs.map(() =>
      new Array<number>(relationshipsToSample)
    );

    let relationshipsSampled = 0;
    const maxAttempts = relationshipsToSample * 10; // Prevent infinite loops
    let attempts = 0;

    while (relationshipsSampled < relationshipsToSample && attempts < maxAttempts) {
      const nodeId = Math.floor(Math.random() * this.graphStore.nodeCount());
      attempts++;

      // Skip nodes with no relationships of this type
      if (graphs[0].degree(nodeId) === 0) {
        continue;
      }

      // Sample from each property graph
      for (let graphIndex = 0; graphIndex < graphs.length; graphIndex++) {
        const graph = graphs[graphIndex];
        const samples = propertyCharactersSamples[graphIndex];

        // Get the first relationship for this node
        let foundRelationship = false;
        graph.forEachRelationship(nodeId, Number.NaN, (sourceId, targetId, weight) => {
          if (!foundRelationship) {
            samples[relationshipsSampled] = this.getCharacterCount(weight);
            foundRelationship = true;
          }
          return false; // Stop after first relationship
        });
      }

      relationshipsSampled++;
    }

    // Calculate average character count across all properties
    return propertyCharactersSamples
      .map(samples => {
        const validSamples = samples.slice(0, relationshipsSampled);
        if (validSamples.length === 0) return 0;

        const sum = validSamples.reduce((acc, count) => acc + count, 0);
        const average = Math.floor(sum / validSamples.length);
        return average + 1; // +1 for CSV separator
      })
      .reduce((sum, avgCount) => sum + avgCount, 0);
  }

  private getCharacterCount(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const stringValue = String(value);
    return Buffer.byteLength(stringValue, 'utf8');
  }
}
