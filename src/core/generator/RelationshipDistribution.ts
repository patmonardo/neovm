import { DistributionHelper } from '../utils/statistics/DistributionHelper';

/**
 * Defines various distribution strategies for generating relationships in random graphs.
 */
export enum RelationshipDistribution {
  /**
   * Uniform distribution - every node has the same number of relationships.
   */
  UNIFORM,

  /**
   * Random distribution - the number of relationships follows a Gaussian distribution.
   */
  RANDOM,

  /**
   * Power law distribution - few nodes have many relationships, many nodes have few.
   * Follows patterns often observed in real-world networks.
   */
  POWER_LAW
}

/**
 * Utility methods and extensions for the RelationshipDistribution enum.
 */
export namespace RelationshipDistribution {
  /**
   * List of valid distribution names.
   */
  const VALUES: string[] = Object.keys(RelationshipDistribution)
    .filter(key => isNaN(Number(key)))
    .map(key => key.toUpperCase());

  /**
   * Creates a function that determines how many relationships a node should have.
   *
   * @param distribution The relationship distribution strategy
   * @param nodeCount Expected number of nodes in the generated graph
   * @param averageDegree Expected average degree in the generated graph
   * @param random Random number generator
   * @returns A function that maps node ID to number of relationships
   */
  export function degreeProducer(
    distribution: RelationshipDistribution,
    nodeCount: number,
    averageDegree: number,
    random: Random
  ): (nodeId: number) => number {
    switch (distribution) {
      case RelationshipDistribution.UNIFORM:
        return (_ignore) => averageDegree;

      case RelationshipDistribution.RANDOM:
      case RelationshipDistribution.POWER_LAW:
        const stdDev = averageDegree / 2;
        return (_ignore) => DistributionHelper.gaussianSample(nodeCount, averageDegree, stdDev, random);

      default:
        throw new Error(`Unsupported distribution: ${distribution}`);
    }
  }

  /**
   * Creates a function that determines which nodes to connect.
   *
   * @param distribution The relationship distribution strategy
   * @param nodeCount Expected number of nodes in the generated graph
   * @param averageDegree Expected average degree in the generated graph
   * @param random Random number generator
   * @returns A function that maps source node ID to target node ID
   */
  export function relationshipProducer(
    distribution: RelationshipDistribution,
    nodeCount: number,
    averageDegree: number,
    random: Random
  ): (nodeId: number) => number {
    switch (distribution) {
      case RelationshipDistribution.UNIFORM:
      case RelationshipDistribution.RANDOM:
        return (_ignore) => DistributionHelper.uniformSample(nodeCount, random);

      case RelationshipDistribution.POWER_LAW:
        const min = 1;
        const gamma = 1 + 1.0 / averageDegree;
        return (_ignore) => DistributionHelper.powerLawSample(min, nodeCount - 1, gamma, random);

      default:
        throw new Error(`Unsupported distribution: ${distribution}`);
    }
  }

  /**
   * Parses a string or object into a RelationshipDistribution.
   *
   * @param object String or RelationshipDistribution to parse
   * @returns The parsed RelationshipDistribution
   * @throws Error if the input cannot be parsed
   */
  export function parse(object: any): RelationshipDistribution {
    if (typeof object === 'string') {
      const inputString = object.toUpperCase();
      if (!VALUES.includes(inputString)) {
        throw new Error(
          `RelationshipDistribution \`${object}\` is not supported. Must be one of: ${VALUES.join(', ')}.`
        );
      }
      return RelationshipDistribution[inputString as keyof typeof RelationshipDistribution];
    } else if (typeof object === 'number' && Object.values(RelationshipDistribution).includes(object)) {
      return object;
    } else if (object instanceof RelationshipDistribution) {
      return object;
    }

    throw new Error(
      `Expected RelationshipDistribution or String. Got ${object?.constructor?.name || typeof object}.`
    );
  }

  /**
   * Converts a RelationshipDistribution to its string representation.
   *
   * @param distribution The distribution to convert
   * @returns The string representation
   */
  export function toString(distribution: RelationshipDistribution): string {
    return RelationshipDistribution[distribution];
  }
}

/**
 * Simple interface for random number generation.
 */
export interface Random {
  nextInt(bound: number): number;
  nextDouble(): number;
}
