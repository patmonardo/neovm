// /**
//  * @NEOVM/WEB-PROJECTION - Complete Neo4j replacement
//  */

// // Core Web Projection
// export { WebProjection } from './WebProjection';
// export { WebGraphStore } from './WebGraphStore';
// export { WebNativeProjection } from './WebNativeProjection';

// // Content Type Processors
// export { HTMLProcessor } from './processors/HTMLProcessor';
// export { JSONProcessor } from './processors/JSONProcessor';
// export { RDFProcessor } from './processors/RDFProcessor';
// export { CSVProcessor } from './processors/CSVProcessor';
// export { ImageProcessor } from './processors/ImageProcessor';

// // Web Scanning
// export { WebScanner } from './scanners/WebScanner';
// export { FileSystemScanner } from './scanners/FileSystemScanner';
// export { APIScanner } from './scanners/APIScanner';

// // Graph Store Implementation
// export { CSRWebGraphStore } from './store/CSRWebGraphStore';
// export { WebGraphStoreBuilder } from './store/WebGraphStoreBuilder';

// // Catalog Integration
// export { WebGraphStoreCatalogService } from './catalog/WebGraphStoreCatalogService';
// export { WebProjectionConfig } from './config/WebProjectionConfig';

// // Algorithms (same as GDS but web-optimized)
// export { PageRank, CommunityDetection, ShortestPath } from './algorithms';

// // Utilities
// export { WebContentAnalyzer } from './analysis/WebContentAnalyzer';
// export { SemanticExtractor } from './analysis/SemanticExtractor';
// export { MultimediaProcessor } from './analysis/MultimediaProcessor';
/**
 * LAUNCH DAY - Direct Neo4j API replacement
 */

// Instead of Neo4j Driver
import { WebProjection } from '@neovm/web-projection';

// Instead of Neo4j GDS projections
const graphStore = await WebProjection
  .from(['https://example.com', 'file:///local/data/'])
  .withSemanticAnalysis(true)
  .withMultimediaProcessing(true)  
  .project();

// Same catalog service API as your GraphStoreCatalogService
const catalogService = new WebGraphStoreCatalogService();
const user = new User('researcher');
const dbId = new DatabaseId('web_analysis');
const graphName = new GraphName('my_web_graph');

// Store in catalog (same API as current code)
catalogService.set(
  new WebProjectionConfig(['https://news.site']), 
  graphStore
);

// Get resources for algorithms (same API)
const resources = catalogService.getGraphResources(
  graphName,
  new AlgoBaseConfig()
);

// Run algorithms (same as GDS)
const pageRankResults = PageRank.run(resources.graph);
const communities = CommunityDetection.run(resources.graph);

// Store results back (same pattern)
pageRankResults.forEach((score, nodeId) => {
  resources.graphStore.updateNodeProperty(nodeId, 'pagerank_score', score);
});