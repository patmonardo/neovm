// Example 1: Basic LabelInformation usage with different strategies
console.log('=== LabelInformation Usage Examples ===');

// Create different types of label information
const examples = [
  {
    name: 'Single Label (Person)',
    builder: LabelInformationBuilders.singleLabel(NodeLabel.of('Person'))
  },
  {
    name: 'All Nodes',
    builder: LabelInformationBuilders.allNodes()
  },
  {
    name: 'Multi-Label (capacity 1000)',
    builder: LabelInformationBuilders.multiLabelWithCapacity(1000)
  },
  {
    name: 'Adaptive',
    builder: LabelInformationBuilders.adaptive(1000)
  },
  {
    name: 'Streaming',
    builder: LabelInformationBuilders.streaming()
  }
];

// Add some sample data to each builder
const sampleNodes = [
  { nodeId: 1, label: NodeLabel.of('Person') },
  { nodeId: 2, label: NodeLabel.of('Person') },
  { nodeId: 3, label: NodeLabel.of('Company') },
  { nodeId: 4, label: NodeLabel.of('Person') },
  { nodeId: 5, label: NodeLabel.of('Product') }
];

console.log('Building label information with sample data...');
const labelInfoInstances = examples.map(({ name, builder }) => {
  // Add sample data
  sampleNodes.forEach(({ nodeId, label }) => {
    builder.addNodeIdToLabel(label, nodeId);
  });

  // Build with identity mapping (no ID transformation)
  const labelInfo = builder.build(6, id => id);

  return { name, labelInfo };
});

// Test the built instances
labelInfoInstances.forEach(({ name, labelInfo }) => {
  console.log(`\n${name}:`);
  console.log(`  Is empty: ${labelInfo.isEmpty()}`);
  console.log(`  Is single label: ${labelInfo.isSingleLabel()}`);
  console.log(`  Available labels: [${Array.from(labelInfo.availableNodeLabels()).map(l => l.name).join(', ')}]`);

  // Test node label queries
  console.log(`  Node 1 labels: [${labelInfo.nodeLabelsForNodeId(1).map(l => l.name).join(', ')}]`);
  console.log(`  Node 3 labels: [${labelInfo.nodeLabelsForNodeId(3).map(l => l.name).join(', ')}]`);

  // Test label membership
  console.log(`  Node 1 has Person: ${labelInfo.hasLabel(1, NodeLabel.of('Person'))}`);
  console.log(`  Node 3 has Company: ${labelInfo.hasLabel(3, NodeLabel.of('Company'))}`);

  // Count nodes with specific labels
  if (labelInfo.availableNodeLabels().size > 0) {
    const personLabel = Array.from(labelInfo.availableNodeLabels()).find(l => l.name === 'Person');
    if (personLabel) {
      console.log(`  Person node count: ${labelInfo.nodeCountForLabel(personLabel)}`);
    }
  }
});

// Example 2: CSV import with label information processing
class CsvLabelInformationProcessor {
  private readonly builder: LabelInformation.Builder;
  private readonly nodeCount: number;

  constructor(csvData: CsvLabeledNode[], strategy: 'single' | 'multi' | 'adaptive' | 'streaming' = 'adaptive') {
    this.nodeCount = csvData.length;

    // Choose builder strategy based on data characteristics
    switch (strategy) {
      case 'single':
        const firstLabel = csvData[0]?.labels[0];
        this.builder = firstLabel
          ? LabelInformationBuilders.singleLabel(NodeLabel.of(firstLabel))
          : LabelInformationBuilders.allNodes();
        break;

      case 'multi':
        this.builder = LabelInformationBuilders.multiLabelWithCapacity(this.nodeCount);
        break;

      case 'streaming':
        this.builder = LabelInformationBuilders.streaming();
        break;

      default:
        this.builder = LabelInformationBuilders.adaptive(this.nodeCount);
    }
  }

  /**
   * Process CSV data and build label information.
   */
  processLabelInformation(csvData: CsvLabeledNode[]): LabelProcessingResult {
    console.log(`\n=== Processing ${csvData.length} nodes for label information ===`);

    const startTime = Date.now();
    const labelStats = new Map<string, number>();

    // Process each node
    csvData.forEach(({ nodeId, labels }) => {
      labels.forEach(labelName => {
        const label = NodeLabel.of(labelName);
        this.builder.addNodeIdToLabel(label, nodeId);

        // Track statistics
        labelStats.set(labelName, (labelStats.get(labelName) || 0) + 1);
      });
    });

    // Build the final label information
    const labelInfo = this.builder.build(this.nodeCount, id => id);
    const processingTime = Date.now() - startTime;

    return {
      labelInfo,
      processingTimeMs: processingTime,
      labelStats,
      totalNodes: csvData.length,
      uniqueLabels: labelStats.size,
      averageLabelsPerNode: csvData.reduce((sum, node) => sum + node.labels.length, 0) / csvData.length
    };
  }
}

// Test CSV processing with different strategies
const csvLabeledData: CsvLabeledNode[] = [
  { nodeId: 1, labels: ['Person', 'Employee'] },
  { nodeId: 2, labels: ['Person'] },
  { nodeId: 3, labels: ['Company'] },
  { nodeId: 4, labels: ['Person', 'Manager'] },
  { nodeId: 5, labels: ['Product', 'Software'] },
  { nodeId: 6, labels: ['Person', 'Employee', 'Senior'] },
  { nodeId: 7, labels: ['Company', 'Tech'] },
  { nodeId: 8, labels: ['Product'] }
];

const strategies: Array<'single' | 'multi' | 'adaptive' | 'streaming'> = ['single', 'multi', 'adaptive', 'streaming'];

console.log('\nTesting different label information strategies:');
strategies.forEach(strategy => {
  try {
    const processor = new CsvLabelInformationProcessor(csvLabeledData, strategy);
    const result = processor.processLabelInformation(csvLabeledData);

    console.log(`\n${strategy.toUpperCase()} Strategy:`);
    console.log(`  Processing time: ${result.processingTimeMs}ms`);
    console.log(`  Unique labels: ${result.uniqueLabels}`);
    console.log(`  Average labels per node: ${result.averageLabelsPerNode.toFixed(2)}`);
    console.log(`  Is single label: ${result.labelInfo.isSingleLabel()}`);
    console.log(`  Memory efficient: ${result.labelInfo.isSingleLabel() ? 'Yes (single)' : 'No (multi)'}`);

    // Test filtering
    const personCompanyFilter = result.labelInfo.filter([NodeLabel.of('Person'), NodeLabel.of('Company')]);
    console.log(`  Filtered labels available: [${Array.from(personCompanyFilter.availableNodeLabels()).map(l => l.name).join(', ')}]`);

  } catch (error) {
    console.log(`  ${strategy.toUpperCase()} Strategy failed: ${error.message}`);
  }
});

// Example 3: Performance comparison of label information strategies
class LabelInformationPerformanceComparison {
  static async compareStrategies(
    nodeCounts: number[],
    labelDistributions: LabelDistribution[]
  ): Promise<PerformanceComparisonResult> {
    console.log('\n=== Label Information Performance Comparison ===');

    const results: PerformanceTestResult[] = [];

    for (const nodeCount of nodeCounts) {
      for (const distribution of labelDistributions) {
        const testData = this.generateTestData(nodeCount, distribution);

        for (const strategy of ['single', 'multi', 'adaptive', 'streaming'] as const) {
          const result = await this.testStrategy(strategy, testData);
          results.push({
            strategy,
            nodeCount,
            distribution: distribution.name,
            ...result
          });
        }
      }
    }

    return {
      results,
      summary: this.generateSummary(results)
    };
  }

  private static generateTestData(nodeCount: number, distribution: LabelDistribution): CsvLabeledNode[] {
    const nodes: CsvLabeledNode[] = [];

    for (let i = 1; i <= nodeCount; i++) {
      const labels = distribution.generator(i, nodeCount);
      nodes.push({ nodeId: i, labels });
    }

    return nodes;
  }

  private static async testStrategy(
    strategy: 'single' | 'multi' | 'adaptive' | 'streaming',
    testData: CsvLabeledNode[]
  ): Promise<StrategyTestResult> {
    const startTime = Date.now();

    try {
      const processor = new CsvLabelInformationProcessor(testData, strategy);
      const result = processor.processLabelInformation(testData);
      const totalTime = Date.now() - startTime;

      // Test query performance
      const queryStartTime = Date.now();
      const personLabel = NodeLabel.of('Person');
      const companyLabel = NodeLabel.of('Company');

      // Perform various queries
      for (let i = 0; i < 100; i++) {
        result.labelInfo.hasLabel(i % testData.length + 1, personLabel);
        result.labelInfo.nodeCountForLabel(personLabel);
        result.labelInfo.nodeLabelsForNodeId(i % testData.length + 1);
      }

      const queryTime = Date.now() - queryStartTime;

      return {
        buildTimeMs: totalTime,
        queryTimeMs: queryTime,
        memoryEfficient: result.labelInfo.isSingleLabel(),
        success: true,
        nodesPerSecond: testData.length / (totalTime / 1000)
      };

    } catch (error) {
      return {
        buildTimeMs: Date.now() - startTime,
        queryTimeMs: 0,
        memoryEfficient: false,
        success: false,
        error: error.message,
        nodesPerSecond: 0
      };
    }
  }

  private static generateSummary(results: PerformanceTestResult[]): PerformanceSummary {
    const successfulResults = results.filter(r => r.success);

    if (successfulResults.length === 0) {
      return {
        totalTests: results.length,
        successfulTests: 0,
        averageBuildTime: 0,
        averageQueryTime: 0,
        fastestStrategy: 'none',
        mostMemoryEfficientStrategy: 'none'
      };
    }

    const avgBuildTime = successfulResults.reduce((sum, r) => sum + r.buildTimeMs, 0) / successfulResults.length;
    const avgQueryTime = successfulResults.reduce((sum, r) => sum + r.queryTimeMs, 0) / successfulResults.length;

    const fastestBuild = successfulResults.reduce((fastest, curr) =>
      curr.buildTimeMs < fastest.buildTimeMs ? curr : fastest
    );

    const mostMemoryEfficient = successfulResults.filter(r => r.memoryEfficient)[0] || successfulResults[0];

    return {
      totalTests: results.length,
      successfulTests: successfulResults.length,
      averageBuildTime: avgBuildTime,
      averageQueryTime: avgQueryTime,
      fastestStrategy: fastestBuild.strategy,
      mostMemoryEfficientStrategy: mostMemoryEfficient.strategy
    };
  }
}

// Define test distributions
const labelDistributions: LabelDistribution[] = [
  {
    name: 'Single Label (Person only)',
    generator: () => ['Person']
  },
  {
    name: 'Two Labels (Person/Company)',
    generator: (nodeId) => nodeId % 2 === 0 ? ['Person'] : ['Company']
  },
  {
    name: 'Multi-Label (Complex)',
    generator: (nodeId) => {
      const labels = ['Person'];
      if (nodeId % 3 === 0) labels.push('Employee');
      if (nodeId % 5 === 0) labels.push('Manager');
      if (nodeId % 7 === 0) labels.push('Senior');
      return labels;
    }
  },
  {
    name: 'High Cardinality',
    generator: (nodeId, total) => [`Type_${nodeId % Math.min(100, total / 10)}`]
  }
];

// Run performance comparison
const perfComparison = await LabelInformationPerformanceComparison.compareStrategies(
  [1000, 10000], // Node counts
  labelDistributions
);

console.log('\nPerformance Comparison Results:');
console.log(`Total tests: ${perfComparison.summary.totalTests}`);
console.log(`Successful tests: ${perfComparison.summary.successfulTests}`);
console.log(`Average build time: ${perfComparison.summary.averageBuildTime.toFixed(2)}ms`);
console.log(`Average query time: ${perfComparison.summary.averageQueryTime.toFixed(2)}ms`);
console.log(`Fastest strategy: ${perfComparison.summary.fastestStrategy}`);
console.log(`Most memory efficient: ${perfComparison.summary.mostMemoryEfficientStrategy}`);

// Show detailed results
console.log('\nDetailed Results:');
perfComparison.results.forEach(result => {
  if (result.success) {
    console.log(`${result.strategy} (${result.nodeCount} nodes, ${result.distribution}): ` +
      `${result.buildTimeMs}ms build, ${result.queryTimeMs}ms queries, ` +
      `${result.nodesPerSecond.toFixed(0)} nodes/sec, ` +
      `memory efficient: ${result.memoryEfficient}`);
  } else {
    console.log(`${result.strategy} (${result.nodeCount} nodes, ${result.distribution}): FAILED - ${result.error}`);
  }
});

// Example 4: BitSet operations demonstration
console.log('\n=== BitSet Operations Demo ===');

const bitSet1 = new BitSet(100);
const bitSet2 = new BitSet(100);

// Set some bits
[1, 5, 10, 15, 50].forEach(bit => bitSet1.set(bit));
[5, 15, 25, 35, 50].forEach(bit => bitSet2.set(bit));

console.log(`BitSet1: ${bitSet1.toString()}`);
console.log(`BitSet2: ${bitSet2.toString()}`);
console.log(`BitSet1 cardinality: ${bitSet1.cardinality()}`);
console.log(`BitSet2 cardinality: ${bitSet2.cardinality()}`);

// Test operations
const unionBitSet = bitSet1.clone();
unionBitSet.or(bitSet2);
console.log(`Union: ${unionBitSet.toString()}`);
console.log(`Union cardinality: ${unionBitSet.cardinality()}`);

const intersectionBitSet = bitSet1.clone();
intersectionBitSet.and(bitSet2);
console.log(`Intersection: ${intersectionBitSet.toString()}`);
console.log(`Intersection cardinality: ${intersectionBitSet.cardinality()}`);

// Helper interfaces and types
interface CsvLabeledNode {
  nodeId: number;
  labels: string[];
}

interface LabelProcessingResult {
  labelInfo: LabelInformation;
  processingTimeMs: number;
  labelStats: Map<string, number>;
  totalNodes: number;
  uniqueLabels: number;
  averageLabelsPerNode: number;
}

interface LabelDistribution {
  name: string;
  generator: (nodeId: number, totalNodes: number) => string[];
}

interface StrategyTestResult {
  buildTimeMs: number;
  queryTimeMs: number;
  memoryEfficient: boolean;
  success: boolean;
  error?: string;
  nodesPerSecond: number;
}

interface PerformanceTestResult extends StrategyTestResult {
  strategy: string;
  nodeCount: number;
  distribution: string;
}

interface PerformanceSummary {
  totalTests: number;
  successfulTests: number;
  averageBuildTime: number;
  averageQueryTime: number;
  fastestStrategy: string;
  mostMemoryEfficientStrategy: string;
}

interface PerformanceComparisonResult {
  results: PerformanceTestResult[];
  summary: PerformanceSummary;
}
