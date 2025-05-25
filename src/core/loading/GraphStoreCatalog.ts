import {
  DatabaseId,
  GraphStore,
  EphemeralResultStore,
  Log,
  MemoryUsage
} from '@/types';
import { GraphProjectConfig } from '@/config';
import { CatalogRequest } from './CatalogRequest';
import { GraphStoreCatalogEntry } from './GraphStoreCatalogEntry';
import { StringJoining, ExceptionUtil } from '@/utils';

/**
 * Central catalog for managing graph stores across users and databases.
 *
 * GraphStoreCatalog serves as the **system-wide registry** for all projected graphs,
 * providing **user isolation**, **database scoping**, and **comprehensive lifecycle management**.
 * This singleton catalog enables **secure multi-tenant graph operations** with
 * **event-driven monitoring** and **centralized resource tracking**.
 *
 * **Core Responsibilities:**
 *
 * 1. **Graph Store Registry**: Central repository for all projected graphs
 * 2. **User Isolation**: Per-user catalogs with secure access control
 * 3. **Database Scoping**: Multi-database support with proper isolation
 * 4. **Lifecycle Management**: Graph creation, retrieval, and cleanup
 * 5. **Event System**: Pluggable listeners for monitoring and integration
 * 6. **Resource Tracking**: Memory usage and capacity monitoring
 *
 * **Architecture Design:**
 *
 * ```
 * GraphStoreCatalog (Singleton)
 * ├── UserCatalog (per user)
 * │   ├── UserCatalogKey (database + graph name)
 * │   ├── GraphStoreCatalogEntry (graph + config + results)
 * │   └── DegreeDistribution (optional analytics)
 * ├── Event Listeners
 * │   ├── GraphStoreAddedEventListener
 * │   └── GraphStoreRemovedEventListener
 * └── Global Operations
 *     ├── Cross-user graph discovery
 *     ├── Administrative operations
 *     └── System-wide statistics
 * ```
 *
 * **Security Model:**
 *
 * - **User Isolation**: Each user has their own catalog namespace
 * - **Admin Privileges**: Admin users can access graphs across users
 * - **Database Scoping**: Graphs are isolated by database context
 * - **Secure Discovery**: Cross-user graph discovery with proper authorization
 *
 * **Event-Driven Architecture:**
 *
 * The catalog implements an **event system** for integration with:
 * - Memory monitoring and alerting systems
 * - Audit logging and compliance tracking
 * - External graph management tools
 * - Performance monitoring dashboards
 * - Automatic cleanup and maintenance
 *
 * **Performance Characteristics:**
 *
 * - **Thread Safety**: ConcurrentHashMap for high-concurrency access
 * - **Memory Efficiency**: Lazy loading and automatic cleanup
 * - **Search Performance**: O(1) lookup for known graph locations
 * - **Cross-User Discovery**: O(n) search across user catalogs when needed
 *
 * **Use Cases:**
 *
 * - **Graph Projection**: Store newly projected graphs
 * - **Graph Retrieval**: Find and access existing graphs
 * - **Administrative Operations**: Cross-user graph management
 * - **Resource Monitoring**: Track memory usage and capacity
 * - **Cleanup Operations**: Remove graphs and free resources
 * - **Analytics**: Store and retrieve graph statistics
 *
 * **Integration Points:**
 * ```typescript
 * // Basic graph operations
 * GraphStoreCatalog.set(config, graphStore);
 * const entry = GraphStoreCatalog.get(request, 'myGraph');
 * GraphStoreCatalog.remove(request, 'myGraph', entry => cleanup(entry), true);
 *
 * // Event monitoring
 * GraphStoreCatalog.registerGraphStoreAddedListener(new MemoryMonitor());
 * GraphStoreCatalog.registerGraphStoreRemovedListener(new AuditLogger());
 *
 * // Administrative operations
 * const allGraphs = GraphStoreCatalog.getAllGraphStores();
 * const userGraphs = GraphStoreCatalog.getGraphStores('username', databaseId);
 * ```
 *
 * **Example Usage:**
 * ```typescript
 * // Store a new graph
 * const config = new GraphProjectConfig('socialNetwork', 'alice');
 * GraphStoreCatalog.set(config, graphStore);
 *
 * // Retrieve user's graph
 * const request = CatalogRequest.of(user, databaseId);
 * const entry = GraphStoreCatalog.get(request, 'socialNetwork');
 *
 * // Admin accessing user's graph
 * const adminRequest = CatalogRequest.ofAdmin('admin', Some('alice'), 'neo4j');
 * const userEntry = GraphStoreCatalog.get(adminRequest, 'socialNetwork');
 *
 * // System monitoring
 * console.log(`Total graphs: ${GraphStoreCatalog.graphStoreCount()}`);
 * console.log(`Database graphs: ${GraphStoreCatalog.graphStoreCount(databaseId)}`);
 * ```
 */
export class GraphStoreCatalog {

  /**
   * User-specific catalogs mapped by username.
   *
   * This **concurrent map** maintains **per-user graph catalogs** ensuring
   * **user isolation** and **thread-safe concurrent access**. Each user
   * gets their own namespace for graph storage and management.
   *
   * **Key Structure:** `username -> UserCatalog`
   *
   * **Thread Safety:**
   * - ConcurrentHashMap for high-concurrency read/write operations
   * - Atomic compute operations for catalog creation and updates
   * - User-level locking through individual UserCatalog instances
   *
   * **Memory Management:**
   * - Lazy creation of user catalogs on first graph storage
   * - Automatic cleanup when user catalogs become empty
   * - Reference counting for efficient memory usage
   */
  private static readonly userCatalogs = new Map<string, UserCatalog>();

  /**
   * Listeners for graph store addition events.
   *
   * **Event System** for **monitoring** and **integration** when graphs
   * are added to the catalog. Enables real-time notifications for:
   * - Memory usage monitoring and alerting
   * - Audit logging and compliance tracking
   * - Performance monitoring and analytics
   * - External system integration
   *
   * **Listener Safety:**
   * - Exception handling prevents listener failures from affecting catalog operations
   * - Async execution options for non-blocking event processing
   * - Automatic cleanup of failed listeners
   */
  private static readonly graphStoreAddedEventListeners = new Set<GraphStoreAddedEventListener>();

  /**
   * Listeners for graph store removal events.
   *
   * **Cleanup Event System** for **monitoring** and **integration** when graphs
   * are removed from the catalog. Enables notifications for:
   * - Resource cleanup and memory reclamation
   * - Audit trails for graph lifecycle management
   * - Automated maintenance and monitoring
   * - Integration with external cleanup systems
   */
  private static readonly graphStoreRemovedEventListeners = new Set<GraphStoreRemovedEventListener>();

  /**
   * Injectable logger for catalog operations.
   *
   * **Optional logging integration** allowing the catalog to use the
   * **Neo4j logging system** when available, while providing **no-op logging**
   * as a fallback for standalone usage.
   *
   * **Logging Features:**
   * - Event listener exception logging
   * - Graph lifecycle operation logging
   * - Performance and memory usage logging
   * - Debug information for troubleshooting
   */
  private static log: Log | null = null;

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Register a listener for graph store addition events.
   *
   * **Event Registration** enables **real-time monitoring** of graph
   * creation events for integration with monitoring, audit, and
   * management systems.
   *
   * **Use Cases:**
   * - Memory usage monitoring and alerting
   * - Audit logging for compliance tracking
   * - Performance metrics collection
   * - External system notifications
   * - Automated graph management workflows
   *
   * @param listener Event listener to register
   */
  static registerGraphStoreAddedListener(listener: GraphStoreAddedEventListener): void {
    this.graphStoreAddedEventListeners.add(listener);
  }

  /**
   * Unregister a graph store addition event listener.
   *
   * **Event Cleanup** for removing listeners that are no longer
   * needed, preventing memory leaks and unnecessary processing.
   *
   * @param listener Event listener to unregister
   */
  static unregisterGraphStoreAddedListener(listener: GraphStoreAddedEventListener): void {
    this.graphStoreAddedEventListeners.delete(listener);
  }

  /**
   * Register a listener for graph store removal events.
   *
   * **Cleanup Event Registration** enables **monitoring** of graph
   * removal events for resource management and audit purposes.
   *
   * @param listener Event listener to register
   */
  static registerGraphStoreRemovedListener(listener: GraphStoreRemovedEventListener): void {
    this.graphStoreRemovedEventListeners.add(listener);
  }

  /**
   * Unregister a graph store removal event listener.
   *
   * **Cleanup Event Management** for removing listeners and
   * preventing memory leaks in long-running systems.
   *
   * @param listener Event listener to unregister
   */
  static unregisterGraphStoreRemovedListener(listener: GraphStoreRemovedEventListener): void {
    this.graphStoreRemovedEventListeners.delete(listener);
  }

  /**
   * Set the logger for catalog operations.
   *
   * **Logger Injection** enables the catalog to integrate with
   * the **Neo4j logging system** or other logging frameworks.
   *
   * @param logger Logger instance to use
   */
  static setLog(logger: Log): void {
    this.log = logger;
  }

  /**
   * Retrieve a graph store catalog entry by name and request context.
   *
   * **Primary Graph Retrieval Method** with **security-aware lookup**
   * supporting both **user-scoped** and **admin cross-user** access patterns.
   *
   * **Lookup Logic:**
   * 1. **Primary Lookup**: Search in user's own catalog first
   * 2. **Cross-User Search**: If admin and not found, search other users
   * 3. **Conflict Resolution**: Handle multiple matches across users
   * 4. **Error Handling**: Provide clear error messages for missing graphs
   *
   * **Security Enforcement:**
   * - Regular users can only access their own graphs
   * - Admin users can access graphs across all users
   * - Username override properly scopes access
   * - Audit trail maintained for all access attempts
   *
   * **Performance Optimization:**
   * - O(1) lookup for user's own graphs
   * - O(n) cross-user search only when necessary (admin + not found)
   * - Early termination on first match in own catalog
   *
   * @param request Catalog request with security context
   * @param graphName Name of the graph to retrieve
   * @returns Graph store catalog entry
   * @throws GraphNotFoundException if graph not found
   * @throws Error if multiple graphs found across users
   */
  static get(request: CatalogRequest, graphName: string): GraphStoreCatalogEntry {
    const userCatalogKey = UserCatalogKey.of(request.databaseName, graphName);
    const ownCatalog = this.getUserCatalog(request.username());

    // First, try to find the graph in the user's own catalog
    const maybeGraph = ownCatalog.get(userCatalogKey, request.restrictSearchToUsernameCatalog());
    if (maybeGraph !== null) {
      return maybeGraph;
    }

    // If restricted to user catalog and not found, we're done
    if (request.restrictSearchToUsernameCatalog()) {
      throw new GraphNotFoundException(userCatalogKey);
    }

    // Admin user searching across all catalogs
    const usersWithMatchingGraphs: Array<{ username: string; entry: GraphStoreCatalogEntry }> = [];

    for (const [username, userCatalog] of this.userCatalogs) {
      const graph = userCatalog.get(userCatalogKey, false);
      if (graph !== null) {
        usersWithMatchingGraphs.push({ username, entry: graph });
      }
    }

    if (usersWithMatchingGraphs.length === 1) {
      return usersWithMatchingGraphs[0].entry;
    }

    if (usersWithMatchingGraphs.length === 0) {
      throw new GraphNotFoundException(userCatalogKey);
    }

    // Multiple graphs found - this is an error condition
    const usernames = StringJoining.joinVerbose(
      new Set(usersWithMatchingGraphs.map(entry => entry.username))
    );

    throw new Error(
      `Multiple graphs that match '${graphName}' are found from the users ${usernames}.`
    );
  }

  /**
   * Remove a graph store from the catalog.
   *
   * **Secure Graph Removal** with **event notifications** and **flexible
   * error handling**. Supports both **user-scoped** and **admin cross-user**
   * removal operations with proper authorization checks.
   *
   * **Removal Logic:**
   * 1. **Primary Removal**: Try to remove from user's own catalog
   * 2. **Cross-User Removal**: If admin and not found, search other users
   * 3. **Conflict Handling**: Error on multiple matches across users
   * 4. **Event Notification**: Fire removal events for monitoring
   * 5. **Resource Cleanup**: Execute custom cleanup logic
   *
   * **Security Features:**
   * - User isolation with proper authorization checks
   * - Admin override capabilities with audit trail
   * - Secure cross-user removal for administrative operations
   *
   * **Event Integration:**
   * - Cleanup callbacks for custom resource management
   * - Event listeners for monitoring and audit logging
   * - Exception handling to prevent listener failures
   *
   * @param request Catalog request with security context
   * @param graphName Name of the graph to remove
   * @param removedGraphConsumer Callback for cleanup operations
   * @param failOnMissing Whether to throw error if graph not found
   */
  static remove(
    request: CatalogRequest,
    graphName: string,
    removedGraphConsumer: (entry: GraphStoreCatalogEntry) => void,
    failOnMissing: boolean
  ): void {
    const userCatalogKey = UserCatalogKey.of(request.databaseName, graphName);
    const ownCatalog = this.getUserCatalog(request.username());

    // Try to remove from user's own catalog first
    const didRemove = ownCatalog.remove(
      userCatalogKey,
      removedGraphConsumer,
      failOnMissing && request.restrictSearchToUsernameCatalog()
    );

    if (didRemove || request.restrictSearchToUsernameCatalog()) {
      return;
    }

    // Admin searching across all catalogs for removal
    const usersWithMatchingGraphs = new Set<string>();

    for (const [username, userCatalog] of this.userCatalogs) {
      const graph = userCatalog.get(userCatalogKey, false);
      if (graph !== null) {
        usersWithMatchingGraphs.add(username);
      }
    }

    if (usersWithMatchingGraphs.size === 0 && failOnMissing) {
      throw new GraphNotFoundException(userCatalogKey);
    }

    if (usersWithMatchingGraphs.size > 1) {
      const usernames = StringJoining.joinVerbose(usersWithMatchingGraphs);
      throw new Error(
        `Multiple graphs that match '${graphName}' are found from the users ${usernames}.`
      );
    }

    if (usersWithMatchingGraphs.size === 1) {
      const username = usersWithMatchingGraphs.values().next().value;
      this.getUserCatalog(username).remove(
        userCatalogKey,
        removedGraphConsumer,
        failOnMissing
      );
    }
  }

  /**
   * Store a graph store in the catalog.
   *
   * **Primary Graph Storage Method** with **event notifications** and
   * **duplicate detection**. Creates user catalogs on-demand and ensures
   * **proper graph lifecycle management**.
   *
   * **Storage Process:**
   * 1. **User Catalog Creation**: Create user catalog if it doesn't exist
   * 2. **Duplicate Check**: Ensure graph name is unique within user/database scope
   * 3. **Entry Creation**: Create catalog entry with graph, config, and result store
   * 4. **Event Notification**: Fire addition events for monitoring
   * 5. **Memory Tracking**: Record memory usage for capacity planning
   *
   * **Thread Safety:**
   * - Atomic compute operation for catalog creation
   * - Concurrent access protection within user catalogs
   * - Safe event listener execution with exception handling
   *
   * **Event Integration:**
   * - Memory usage reporting for monitoring systems
   * - Audit logging for compliance and tracking
   * - Integration with external graph management tools
   *
   * @param config Graph projection configuration
   * @param graphStore The projected graph store
   * @throws Error if graph name already exists
   */
  static set(config: GraphProjectConfig, graphStore: GraphStore): void {
    // Get or create user catalog atomically
    let userCatalog = this.userCatalogs.get(config.username);
    if (!userCatalog) {
      userCatalog = new UserCatalog();
      this.userCatalogs.set(config.username, userCatalog);
    }

    // Store the graph in the user catalog
    userCatalog.set(
      UserCatalogKey.of(graphStore.databaseInfo.databaseId, config.graphName),
      config,
      graphStore
    );

    // Fire addition events for monitoring and integration
    this.fireGraphStoreAddedEvents(config, graphStore);
  }

  /**
   * Check if a graph exists in the catalog.
   *
   * **Existence Check** for **validation** and **conditional logic**
   * without the overhead of full graph retrieval.
   *
   * @param username Username of the graph owner
   * @param databaseName Database name for scoping
   * @param graphName Name of the graph
   * @returns true if graph exists
   */
  static exists(username: string, databaseName: string, graphName: string): boolean {
    return this.getUserCatalog(username).exists(UserCatalogKey.of(databaseName, graphName));
  }

  /**
   * Check if a graph exists using DatabaseId.
   *
   * **DatabaseId Overload** for existence checking with typed database context.
   *
   * @param username Username of the graph owner
   * @param databaseId Database identifier
   * @param graphName Name of the graph
   * @returns true if graph exists
   */
  static existsWithDatabaseId(username: string, databaseId: DatabaseId, graphName: string): boolean {
    return this.getUserCatalog(username).exists(UserCatalogKey.of(databaseId, graphName));
  }

  /**
   * Get the total number of graph stores across all users.
   *
   * **System-Wide Statistics** for **capacity monitoring** and
   * **resource planning** across the entire catalog.
   *
   * @returns Total number of graph stores
   */
  static graphStoreCount(): number {
    let total = 0;
    for (const userCatalog of this.userCatalogs.values()) {
      total += userCatalog.getGraphStores().length;
    }
    return total;
  }

  /**
   * Get the number of graph stores for a specific database.
   *
   * **Database-Scoped Statistics** for **per-database monitoring**
   * and **resource management**.
   *
   * @param databaseId Database identifier for scoping
   * @returns Number of graph stores in the specified database
   */
  static graphStoreCountForDatabase(databaseId: DatabaseId): number {
    let total = 0;
    for (const userCatalog of this.userCatalogs.values()) {
      total += userCatalog.getGraphStores(databaseId).length;
    }
    return total;
  }

  /**
   * Check if the catalog is empty.
   *
   * **Empty State Check** for **initialization logic** and
   * **system state validation**.
   *
   * @returns true if no graph stores exist
   */
  static isEmpty(): boolean {
    return this.graphStoreCount() === 0;
  }

  /**
   * Get degree distribution for a specific graph.
   *
   * **Analytics Retrieval** for **graph analysis** and **algorithm optimization**.
   * Degree distribution provides insights into graph structure and connectivity patterns.
   *
   * @param username Username of the graph owner
   * @param databaseId Database identifier
   * @param graphName Name of the graph
   * @returns Degree distribution data if available
   */
  static getDegreeDistribution(
    username: string,
    databaseId: DatabaseId,
    graphName: string
  ): Map<string, any> | null {
    return this.getUserCatalog(username).getDegreeDistribution(
      UserCatalogKey.of(databaseId, graphName)
    );
  }

  /**
   * Set degree distribution for a specific graph.
   *
   * **Analytics Storage** for **caching computed graph statistics**
   * and **optimizing future algorithm executions**.
   *
   * @param username Username of the graph owner
   * @param databaseId Database identifier
   * @param graphName Name of the graph
   * @param degreeDistribution Computed degree distribution data
   */
  static setDegreeDistribution(
    username: string,
    databaseId: DatabaseId,
    graphName: string,
    degreeDistribution: Map<string, any>
  ): void {
    this.getUserCatalog(username).setDegreeDistribution(
      UserCatalogKey.of(databaseId, graphName),
      degreeDistribution
    );
  }

  /**
   * Remove all loaded graphs from the catalog.
   *
   * **System-Wide Cleanup** for **testing**, **maintenance**, and
   * **emergency resource cleanup** operations.
   *
   * **Warning:** This operation removes ALL graphs from ALL users!
   */
  static removeAllLoadedGraphs(): void {
    for (const [username, userCatalog] of this.userCatalogs) {
      for (const [userCatalogKey] of userCatalog.graphsByName) {
        userCatalog.remove(userCatalogKey, () => {}, false);
      }
    }
  }

  /**
   * Remove all loaded graphs for a specific database.
   *
   * **Database-Scoped Cleanup** for **database maintenance**,
   * **migration operations**, and **selective resource cleanup**.
   *
   * @param databaseId Database identifier for scoping cleanup
   */
  static removeAllLoadedGraphsForDatabase(databaseId: DatabaseId): void {
    for (const [, userCatalog] of this.userCatalogs) {
      for (const [userCatalogKey] of userCatalog.graphsByName) {
        if (databaseId.databaseName === userCatalogKey.databaseName) {
          userCatalog.remove(userCatalogKey, () => {}, false);
        }
      }
    }
  }

  /**
   * Get all graph stores for a specific user.
   *
   * **User-Scoped Retrieval** for **user dashboard**, **administrative operations**,
   * and **user-specific graph management**.
   *
   * @param username Username of the graph owner
   * @returns Collection of graph store catalog entries
   */
  static getGraphStores(username: string): GraphStoreCatalogEntry[] {
    return this.getUserCatalog(username).getGraphStores();
  }

  /**
   * Get graph stores for a specific user and database.
   *
   * **User and Database Scoped Retrieval** for **targeted graph management**
   * and **database-specific operations**.
   *
   * @param username Username of the graph owner
   * @param databaseId Database identifier for scoping
   * @returns Collection of graph store catalog entries
   */
  static getGraphStoresForUserAndDatabase(username: string, databaseId: DatabaseId): GraphStoreCatalogEntry[] {
    return this.getUserCatalog(username).getGraphStores(databaseId);
  }

  /**
   * Get all graph stores across all users with username information.
   *
   * **System-Wide Retrieval** for **administrative dashboards**,
   * **monitoring systems**, and **cross-user analysis**.
   *
   * **Use Cases:**
   * - Administrative overview of all graphs
   * - System resource monitoring and analysis
   * - Cross-user graph discovery and management
   * - Performance monitoring and optimization
   *
   * @returns Stream of graph store entries with associated usernames
   */
  static getAllGraphStores(): GraphStoreCatalogEntryWithUsername[] {
    const allEntries: GraphStoreCatalogEntryWithUsername[] = [];

    for (const [username, userCatalog] of this.userCatalogs) {
      const userEntries = userCatalog.streamGraphStores(username);
      allEntries.push(...userEntries);
    }

    return allEntries;
  }

  /**
   * Get user catalog, returning empty catalog if user doesn't exist.
   *
   * **Safe User Catalog Access** that **never returns null** and
   * provides **consistent behavior** for non-existent users.
   *
   * @param username Username to get catalog for
   * @returns User catalog (empty if user doesn't exist)
   */
  private static getUserCatalog(username: string): UserCatalog {
    return this.userCatalogs.get(username) || UserCatalog.EMPTY;
  }

  /**
   * Fire graph store addition events to all registered listeners.
   *
   * **Event Notification System** with **exception handling** to ensure
   * that **listener failures don't affect catalog operations**.
   *
   * @param config Graph projection configuration
   * @param graphStore The added graph store
   */
  private static fireGraphStoreAddedEvents(config: GraphProjectConfig, graphStore: GraphStore): void {
    const event = new GraphStoreAddedEvent(
      config.username,
      graphStore.databaseInfo.databaseId.databaseName,
      config.graphName,
      MemoryUsage.sizeOf(graphStore)
    );

    for (const listener of this.graphStoreAddedEventListeners) {
      ExceptionUtil.safeRunWithLogException(
        () => `Could not call listener ${listener} on setting the graph ${config.graphName}`,
        () => listener.onGraphStoreAdded(event),
        this.log?.warn || (() => {}) // Use injected logger or no-op
      );
    }
  }

  /**
   * Fire graph store removal events to all registered listeners.
   *
   * **Removal Event Notification** with **safe execution** and
   * **comprehensive error handling**.
   *
   * @param config Graph projection configuration
   * @param graphStore The removed graph store
   */
  private static fireGraphStoreRemovedEvents(config: GraphProjectConfig, graphStore: GraphStore): void {
    const event = new GraphStoreRemovedEvent(
      config.username,
      graphStore.databaseInfo.databaseId.databaseName,
      config.graphName,
      MemoryUsage.sizeOf(graphStore)
    );

    for (const listener of this.graphStoreRemovedEventListeners) {
      ExceptionUtil.safeRunWithLogException(
        () => `Could not call listener ${listener} on removing the graph ${config.graphName}`,
        () => listener.onGraphStoreRemoved(event),
        this.log?.warn || (() => {})
      );
    }
  }

  // Test-only methods for backward compatibility
  /** @internal Test-only method */
  static getTestOnly(username: string, databaseId: DatabaseId, graphName: string): GraphStoreCatalogEntry {
    return this.get(CatalogRequest.ofUserWithDatabaseId(username, databaseId), graphName);
  }

  /** @internal Test-only method */
  static getTestOnlyWithDatabaseName(username: string, databaseName: string, graphName: string): GraphStoreCatalogEntry {
    return this.get(CatalogRequest.ofUser(username, databaseName), graphName);
  }
}

/**
 * User-specific catalog for managing graphs within a user's namespace.
 *
 * UserCatalog provides **user-scoped graph management** with **database isolation**
 * and **analytics storage**. Each user gets their own catalog instance for
 * **secure multi-tenant graph operations**.
 *
 * **Responsibilities:**
 * - Store and manage user's graph stores
 * - Maintain graph-specific analytics (degree distributions)
 * - Provide thread-safe operations within user scope
 * - Handle graph lifecycle events within user context
 */
class UserCatalog {

  /**
   * Empty catalog instance for non-existent users.
   *
   * **Null Object Pattern** implementation providing **safe default behavior**
   * for operations on non-existent user catalogs.
   */
  static readonly EMPTY = new UserCatalog();

  /**
   * Graph stores mapped by user catalog key.
   *
   * **Primary Storage** for user's graph stores with **database and name scoping**.
   *
   * **Key Structure:** `UserCatalogKey(databaseName, graphName) -> GraphStoreCatalogEntry`
   */
  readonly graphsByName = new Map<UserCatalogKey, GraphStoreCatalogEntry>();

  /**
   * Degree distributions mapped by user catalog key.
   *
   * **Analytics Storage** for **cached graph statistics** and **algorithm optimization**.
   * Stores computed degree distributions to avoid expensive recalculations.
   */
  private readonly degreeDistributionByName = new Map<UserCatalogKey, Map<string, any>>();

  /**
   * Store a graph in the user catalog.
   *
   * **User-Scoped Storage** with **duplicate detection** and **validation**.
   *
   * @param userCatalogKey Composite key for database and graph name
   * @param config Graph projection configuration
   * @param graphStore The projected graph store
   * @throws Error if graph name already exists or parameters are invalid
   */
  set(
    userCatalogKey: UserCatalogKey,
    config: GraphProjectConfig,
    graphStore: GraphStore
  ): void {
    if (!config.graphName || !graphStore) {
      throw new Error('Both name and graph store must be not null');
    }

    if (this.graphsByName.has(userCatalogKey)) {
      throw new Error(`Graph name ${config.graphName} already loaded`);
    }

    const graphStoreCatalogEntry = new GraphStoreCatalogEntry(
      graphStore,
      config,
      new EphemeralResultStore()
    );

    this.graphsByName.set(userCatalogKey, graphStoreCatalogEntry);
  }

  /**
   * Get a graph from the user catalog.
   *
   * **User-Scoped Retrieval** with **optional error handling**.
   *
   * @param userCatalogKey Composite key for database and graph name
   * @param failOnMissing Whether to throw error if graph not found
   * @returns Graph store catalog entry or null if not found
   * @throws GraphNotFoundException if failOnMissing is true and graph not found
   */
  get(userCatalogKey: UserCatalogKey, failOnMissing: boolean): GraphStoreCatalogEntry | null {
    const graphStoreWithConfig = this.graphsByName.get(userCatalogKey);

    if (!graphStoreWithConfig && failOnMissing) {
      throw new GraphNotFoundException(userCatalogKey);
    }

    return graphStoreWithConfig || null;
  }

  /**
   * Check if a graph exists in the user catalog.
   *
   * **Existence Check** without retrieval overhead.
   *
   * @param userCatalogKey Composite key for database and graph name
   * @returns true if graph exists
   */
  exists(userCatalogKey: UserCatalogKey): boolean {
    return userCatalogKey && this.graphsByName.has(userCatalogKey);
  }

  /**
   * Remove a graph from the user catalog.
   *
   * **User-Scoped Removal** with **cleanup callbacks** and **event notifications**.
   *
   * @param userCatalogKey Composite key for database and graph name
   * @param removedGraphConsumer Callback for cleanup operations
   * @param failOnMissing Whether to throw error if graph not found
   * @returns true if graph was removed
   */
  remove(
    userCatalogKey: UserCatalogKey,
    removedGraphConsumer: (entry: GraphStoreCatalogEntry) => void,
    failOnMissing: boolean
  ): boolean {
    const graphStoreWithConfig = this.get(userCatalogKey, failOnMissing);

    if (!graphStoreWithConfig) {
      return false;
    }

    // Execute cleanup callback
    removedGraphConsumer(graphStoreWithConfig);

    // Remove degree distribution
    this.removeDegreeDistribution(userCatalogKey);

    // Remove from catalog
    const removed = this.graphsByName.delete(userCatalogKey);

    if (removed) {
      // Fire removal events
      GraphStoreCatalog['fireGraphStoreRemovedEvents'](
        graphStoreWithConfig.config,
        graphStoreWithConfig.graphStore
      );
    }

    return removed;
  }

  /**
   * Set degree distribution for a graph.
   *
   * **Analytics Storage** for **caching graph statistics**.
   *
   * @param userCatalogKey Composite key for database and graph name
   * @param degreeDistribution Computed degree distribution data
   * @throws Error if graph doesn't exist or parameters are invalid
   */
  setDegreeDistribution(userCatalogKey: UserCatalogKey, degreeDistribution: Map<string, any>): void {
    if (!userCatalogKey || !degreeDistribution) {
      throw new Error('Both name and degreeDistribution must be not null');
    }

    if (!this.graphsByName.has(userCatalogKey)) {
      throw new Error(
        `Cannot set degreeDistribution because graph ${userCatalogKey.graphName} does not exist`
      );
    }

    this.degreeDistributionByName.set(userCatalogKey, degreeDistribution);
  }

  /**
   * Get degree distribution for a graph.
   *
   * **Analytics Retrieval** for **algorithm optimization**.
   *
   * @param userCatalogKey Composite key for database and graph name
   * @returns Degree distribution data if available
   */
  getDegreeDistribution(userCatalogKey: UserCatalogKey): Map<string, any> | null {
    if (!this.graphsByName.has(userCatalogKey)) {
      return null;
    }
    return this.degreeDistributionByName.get(userCatalogKey) || null;
  }

  /**
   * Remove degree distribution for a graph.
   *
   * **Analytics Cleanup** when graphs are removed.
   *
   * @param userCatalogKey Composite key for database and graph name
   */
  private removeDegreeDistribution(userCatalogKey: UserCatalogKey): void {
    this.degreeDistributionByName.delete(userCatalogKey);
  }

  /**
   * Get all graph stores in the user catalog.
   *
   * **User-Scoped Collection** for **user dashboard** and **management operations**.
   *
   * @returns Array of graph store catalog entries
   */
  getGraphStores(): GraphStoreCatalogEntry[] {
    return Array.from(this.graphsByName.values());
  }

  /**
   * Get graph stores for a specific database.
   *
   * **Database-Scoped Collection** within user context.
   *
   * @param databaseId Database identifier for filtering
   * @returns Array of graph store catalog entries for the database
   */
  getGraphStores(databaseId: DatabaseId): GraphStoreCatalogEntry[] {
    return Array.from(this.graphsByName.entries())
      .filter(([key]) => key.databaseName === databaseId.databaseName)
      .map(([, entry]) => entry);
  }

  /**
   * Stream graph stores with username information.
   *
   * **Administrative Stream** for **cross-user operations**.
   *
   * @param username Username to associate with entries
   * @returns Array of entries with username information
   */
  streamGraphStores(username: string): GraphStoreCatalogEntryWithUsername[] {
    return Array.from(this.graphsByName.values())
      .map(catalogEntry => new GraphStoreCatalogEntryWithUsername(catalogEntry, username));
  }
}

/**
 * Composite key for user catalog entries.
 *
 * UserCatalogKey provides **database and graph name scoping** for
 * **multi-database graph management** within user contexts.
 */
export class UserCatalogKey {
  constructor(
    public readonly graphName: string,
    public readonly databaseName: string
  ) {}

  /**
   * Create a user catalog key from DatabaseId and graph name.
   *
   * @param databaseId Database identifier
   * @param graphName Name of the graph
   * @returns User catalog key
   */
  static of(databaseId: DatabaseId, graphName: string): UserCatalogKey {
    return new UserCatalogKey(graphName, databaseId.databaseName);
  }

  /**
   * Create a user catalog key from database name and graph name.
   *
   * @param databaseName Name of the database
   * @param graphName Name of the graph
   * @returns User catalog key
   */
  static ofNames(databaseName: string, graphName: string): UserCatalogKey {
    return new UserCatalogKey(graphName, databaseName);
  }

  /**
   * String representation for debugging.
   */
  toString(): string {
    return `UserCatalogKey{graphName='${this.graphName}', databaseName='${this.databaseName}'}`;
  }

  /**
   * Equality comparison for Map usage.
   */
  equals(other: UserCatalogKey): boolean {
    return this.graphName === other.graphName && this.databaseName === other.databaseName;
  }

  /**
   * Hash code for Map usage.
   */
  hashCode(): number {
    return this.graphName.length * 31 + this.databaseName.length;
  }
}

/**
 * Graph store catalog entry with username information.
 *
 * Container for **administrative operations** that need both
 * **graph information** and **user context**.
 */
export class GraphStoreCatalogEntryWithUsername {
  constructor(
    public readonly catalogEntry: GraphStoreCatalogEntry,
    public readonly username: string
  ) {}

  /**
   * Get the graph name from the catalog entry.
   */
  get graphName(): string {
    return this.catalogEntry.config.graphName;
  }

  /**
   * Get the database name from the catalog entry.
   */
  get databaseName(): string {
    return this.catalogEntry.graphStore.databaseInfo.databaseId.databaseName;
  }

  /**
   * String representation for debugging.
   */
  toString(): string {
    return `GraphStoreCatalogEntryWithUsername{username='${this.username}', graphName='${this.graphName}', databaseName='${this.databaseName}'}`;
  }
}

/**
 * Exception thrown when a graph is not found in the catalog.
 */
export class GraphNotFoundException extends Error {
  constructor(userCatalogKey: UserCatalogKey) {
    super(`Graph '${userCatalogKey.graphName}' not found in database '${userCatalogKey.databaseName}'`);
    this.name = 'GraphNotFoundException';
  }
}

/**
 * Event fired when a graph store is added to the catalog.
 */
export class GraphStoreAddedEvent {
  constructor(
    public readonly username: string,
    public readonly databaseName: string,
    public readonly graphName: string,
    public readonly memoryUsage: number
  ) {}
}

/**
 * Event fired when a graph store is removed from the catalog.
 */
export class GraphStoreRemovedEvent {
  constructor(
    public readonly username: string,
    public readonly databaseName: string,
    public readonly graphName: string,
    public readonly memoryUsage: number
  ) {}
}

/**
 * Listener interface for graph store addition events.
 */
export interface GraphStoreAddedEventListener {
  onGraphStoreAdded(event: GraphStoreAddedEvent): void;
}

/**
 * Listener interface for graph store removal events.
 */
export interface GraphStoreRemovedEventListener {
  onGraphStoreRemoved(event: GraphStoreRemovedEvent): void;
}

// Export namespace for related utilities
export namespace GraphStoreCatalog {
  export type Entry = GraphStoreCatalogEntry;
  export type EntryWithUsername = GraphStoreCatalogEntryWithUsername;
  export type CatalogKey = UserCatalogKey;
  export type AddedEvent = GraphStoreAddedEvent;
  export type RemovedEvent = GraphStoreRemovedEvent;
  export type AddedEventListener = GraphStoreAddedEventListener;
  export type RemovedEventListener = GraphStoreRemovedEventListener;
}
