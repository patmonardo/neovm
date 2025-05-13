import { Partitioning } from './Partitioning';

/**
 * Configuration interface for Pregel algorithms.
 * In TypeScript, we don't have Java's @Configuration annotation processor,
 * so we implement this as a regular interface with getters.
 */
export interface PregelConfig extends 
    AlgoBaseConfig,
    RelationshipWeightConfig,
    IterationsConfig,
    ConcurrencyConfig {
    
    /**
     * Determines if the algorithm should run in asynchronous mode
     */
    isAsynchronous(): boolean;
    
    /**
     * Determines how the graph is partitioned for computation
     */
    partitioning(): Partitioning;
    
    /**
     * Determines if the computation should use the ForkJoin (worker-based) execution model
     */
    useForkJoin(): boolean;
    
    /**
     * Determines if the algorithm should track message senders
     */
    trackSender(): boolean;
}

/**
 * Base implementation with default values
 */
export abstract class BasePregelConfig implements PregelConfig {
    // Implement the required interfaces

    // AlgoBaseConfig
    abstract nodeLabels(): string[];
    abstract relationshipTypes(): string[];
    
    // RelationshipWeightConfig
    relationshipWeightProperty(): string | undefined {
        return undefined; // Default: unweighted
    }
    
    // IterationsConfig
    maxIterations(): number {
        return 10; // Default max iterations
    }
    
    // ConcurrencyConfig 
    concurrency(): number {
        return 4; // Default concurrency
    }
    
    // PregelConfig
    isAsynchronous(): boolean {
        return false;
    }
    
    partitioning(): Partitioning {
        return Partitioning.RANGE;
    }
    
    useForkJoin(): boolean {
        return this.partitioning() === Partitioning.AUTO;
    }
    
    trackSender(): boolean {
        return false;
    }
}

/**
 * The Partitioning enum
 */
// export enum Partitioning {
//     AUTO = 'AUTO',
//     DEGREE = 'DEGREE', 
//     RANGE = 'RANGE'
// }

// Required interfaces (simplified versions)
export interface AlgoBaseConfig {
    nodeLabels(): string[];
    relationshipTypes(): string[];
}

export interface RelationshipWeightConfig {
    relationshipWeightProperty(): string | undefined;
}

export interface IterationsConfig {
    maxIterations(): number;
}

export interface ConcurrencyConfig {
    concurrency(): number;
}