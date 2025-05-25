// Generate → Export → Import pipeline
const randomGraph = RandomGraphGenerator.erdosRenyi()
  .nodeCount(1000000)
  .averageDegree(10)
  .generate();

// Export to files
GraphStoreToFileExporter.csv()
  .exportPath("/graphs/test_data/")
  .export(randomGraph);

// Or export to database
GraphStoreToDatabaseExporter.of(...)
  .export(randomGraph);
