import { Configuration } from '@/annotations/Configuration';

/**
 * Configuration for algorithms that produce embeddings
 */
@Configuration
export class EmbeddingDimensionConfig {
  /**
   * Returns the embedding dimension to use
   * Default: 128 dimensions
   */
  @Configuration.IntegerRange({ min: 1 })
  embeddingDimension(): number {
    return 128; // Common default value for embeddings
  }
}
