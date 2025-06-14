import { Partitioning } from '@/pregel';
import { AlgoBaseConfig } from './BaseTypes';
import { RelationshipWeightConfig } from './BaseTypes';
import { IterationsConfig } from '././BaseTypes';
import { ConcurrencyConfig } from './BaseTypes';

/**
 *
 * Configuration interface for Pregel algorithms.
 *
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
