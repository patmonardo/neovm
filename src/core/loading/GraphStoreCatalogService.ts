import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { GraphStore } from "@/api";
import { Graph } from "@/api";
import { User } from "@/api";
import { DatabaseId } from "@/api";
import { GraphName } from "@/api";
import { GraphProjectConfig } from "@/config";
import { AlgoBaseConfig } from "@/config";
import { BaseConfig } from "@/config";
import { CatalogRequest } from "./CatalogRequest";
import { PostLoadValidationHook } from "./PostLoadValidationHook";
import { PostLoadETLHook } from "./PostLoadETLHook";
import { GraphResources } from "./GraphResources";
import { GraphStoreCatalog } from "./GraphStoreCatalog";
import { GraphStoreCatalogEntry } from "./GraphStoreCatalogEntry";

/**
 * GRAPH STORE CATALOG SERVICE - COMPLETE IMPLEMENTATION
 *
 * Service wrapper around GraphStoreCatalog with basic validation.
 */

export class GraphStoreCatalogService {
  graphExists(
    user: User,
    databaseId: DatabaseId,
    graphName: GraphName
  ): boolean {
    return GraphStoreCatalog.exists(
      user.getUsername(),
      databaseId,
      graphName.getValue()
    );
  }

  removeGraph(
    request: CatalogRequest,
    graphName: GraphName,
    shouldFailIfMissing: boolean
  ): GraphStoreCatalogEntry {
    // Use AtomicReference pattern like Java
    let result: GraphStoreCatalogEntry;

    GraphStoreCatalog.remove(
      request,
      graphName.getValue(),
      (entry) => {
        result = entry;
      },
      shouldFailIfMissing
    );

    return result!;
  }

  get(
    catalogRequest: CatalogRequest,
    graphName: GraphName
  ): GraphStoreCatalogEntry {
    return GraphStoreCatalog.get(catalogRequest, graphName.getValue());
  }

  /**
   * Load graphstore and graph, with copious validation.
   */
  getGraphResources(
    graphName: GraphName,
    configuration: AlgoBaseConfig,
    postGraphStoreLoadValidationHooks?: Iterable<PostLoadValidationHook>,
    postGraphStoreLoadETLHooks?: Iterable<PostLoadETLHook>,
    relationshipProperty?: string,
    user?: User,
    databaseId?: DatabaseId
  ): GraphResources {
    const graphStoreCatalogEntry = this.getGraphStoreCatalogEntry(
      graphName,
      configuration,
      user!,
      databaseId!
    );

    const graphStore = graphStoreCatalogEntry.graphStore;

    // Run validation hooks if provided
    if (postGraphStoreLoadValidationHooks) {
      this.validateGraphStore(graphStore, postGraphStoreLoadValidationHooks);
    }

    const nodeLabels = GraphStoreCatalogService.getNodeLabels(
      configuration,
      graphStore
    );
    const relationshipTypes = GraphStoreCatalogService.getRelationshipTypes(
      configuration,
      graphStore
    );

    // Validate the graph store before going any further
    configuration.graphStoreValidation(
      graphStore,
      nodeLabels,
      relationshipTypes
    );

    // Run ETL hooks if provided
    if (postGraphStoreLoadETLHooks) {
      this.extractAndTransform(graphStore, postGraphStoreLoadETLHooks);
    }

    const graph = graphStore.getGraph(
      nodeLabels,
      relationshipTypes,
      relationshipProperty
    );

    // Run graph validation hooks if provided
    if (postGraphStoreLoadValidationHooks) {
      this.validateGraph(graph, postGraphStoreLoadValidationHooks);
    }

    return new GraphResources(
      graphStore,
      graph,
      graphStoreCatalogEntry.resultStore()
    );
  }

  // MISSING METHODS - ADDED FROM JAVA

  /**
   * Some use cases need special validation. We do this right after loading.
   *
   * @throws Error if the graph store did not conform to desired invariants
   */
  private validateGraphStore(
    graphStore: GraphStore,
    validationHooks: Iterable<PostLoadValidationHook>
  ): void {
    for (const hook of validationHooks) {
      hook.onGraphStoreLoaded(graphStore);
    }
  }

  private extractAndTransform(
    graphStore: GraphStore,
    etlHooks: Iterable<PostLoadETLHook>
  ): void {
    for (const hook of etlHooks) {
      hook.onGraphStoreLoaded(graphStore);
    }
  }

  /**
   * Some use cases need special validation. We do this right after loading.
   *
   * @throws Error if the graph did not conform to desired invariants
   */
  private validateGraph(
    graph: Graph,
    validationHooks: Iterable<PostLoadValidationHook>
  ): void {
    for (const hook of validationHooks) {
      hook.onGraphLoaded(graph);
    }
  }

  private static getRelationshipTypes(
    config: AlgoBaseConfig,
    graphStore: GraphStore
  ): RelationshipType[] {
    if (config.projectAllRelationshipTypes()) {
      return graphStore.relationshipTypes();
    }
    return config.relationshipTypesFilter();
  }

  private static getNodeLabels(
    config: AlgoBaseConfig,
    graphStore: GraphStore
  ): NodeLabel[] {
    const nodeLabels = config.nodeLabelsFilter();
    if (nodeLabels.length === 0) {
      return graphStore.nodeLabels();
    }
    return nodeLabels;
  }

  getGraphStoreCatalogEntry(
    graphName: GraphName,
    config: BaseConfig,
    user: User,
    databaseId: DatabaseId
  ): GraphStoreCatalogEntry {
    const catalogRequest = CatalogRequest.of(
      user,
      databaseId,
      config.usernameOverride()
    );
    return this.get(catalogRequest, graphName);
  }

  /**
   * Predicate around graphExists
   *
   * @throws Error if graph already exists in graph catalog
   */
  ensureGraphDoesNotExist(
    user: User,
    databaseId: DatabaseId,
    graphName: GraphName
  ): void {
    if (this.graphExists(user, databaseId, graphName)) {
      throw new Error(`A graph with name '${graphName}' already exists.`);
    }
  }

  /**
   * Predicate around graphExists
   *
   * @throws Error if graph does not exist in graph catalog
   */
  ensureGraphExists(
    user: User,
    databaseId: DatabaseId,
    graphName: GraphName
  ): void {
    if (!this.graphExists(user, databaseId, graphName)) {
      throw new Error(`The graph '${graphName}' does not exist.`);
    }
  }

  getDegreeDistribution(
    user: User,
    databaseId: DatabaseId,
    graphName: GraphName
  ): Map<string, any> | undefined {
    return GraphStoreCatalog.getDegreeDistribution(
      user.getUsername(),
      databaseId,
      graphName.getValue()
    );
  }

  setDegreeDistribution(
    user: User,
    databaseId: DatabaseId,
    graphName: GraphName,
    degreeDistribution: Map<string, any>
  ): void {
    GraphStoreCatalog.setDegreeDistribution(
      user.getUsername(),
      databaseId,
      graphName.getValue(),
      degreeDistribution
    );
  }

  getAllGraphStores(): GraphStoreCatalogEntry[] {
    return GraphStoreCatalog.getAllGraphStores().map((entry) =>
      entry.catalogEntry()
    );
  }

  graphStoreCount(): number {
    return GraphStoreCatalog.graphStoreCount();
  }

  getGraphStores(user: User): GraphStoreCatalogEntry[] {
    return GraphStoreCatalog.getGraphStores(user.getUsername());
  }

  set(configuration: GraphProjectConfig, graphStore: GraphStore): void {
    GraphStoreCatalog.set(configuration, graphStore);
  }
}
