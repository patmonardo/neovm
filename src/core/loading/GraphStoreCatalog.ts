/**
 * GRAPH STORE CATALOG - CENTRAL GRAPH REGISTRY
 *
 * Static catalog for managing graph stores across users and databases.
 */

import { DatabaseId, GraphStore } from "@/api";
import { EphemeralResultStore } from "@/api";
import { GraphProjectConfig } from "@/config";
import { GraphStoreCatalogEntry } from "./GraphStoreCatalogEntry";
import { MemoryUsage } from "@/mem";
import { join } from "@/utils";
import { ExceptionUtil } from "@/utils/ExceptionUtil";
import {
  GraphStoreAddedEvent,
  GraphStoreAddedEventListener,
} from "@/api/graph";
import {
  GraphStoreRemovedEvent,
  GraphStoreRemovedEventListener,
} from "@/api/graph";
import { GraphNotFoundException } from "./GraphNotFoundException";
import { CatalogRequest } from "./CatalogRequest";
import { Log } from "@/utils";

export class GraphStoreCatalog {
  private static readonly userCatalogs = new Map<string, UserCatalog>();
  private static readonly graphStoreAddedEventListeners =
    new Set<GraphStoreAddedEventListener>();
  private static readonly graphStoreRemovedEventListeners =
    new Set<GraphStoreRemovedEventListener>();
  private static log: Log | undefined;

  private constructor() {}

  static registerGraphStoreAddedListener(
    listener: GraphStoreAddedEventListener
  ): void {
    this.graphStoreAddedEventListeners.add(listener);
  }

  static unregisterGraphStoreAddedListener(
    listener: GraphStoreAddedEventListener
  ): void {
    this.graphStoreAddedEventListeners.delete(listener);
  }

  static registerGraphStoreRemovedListener(
    listener: GraphStoreRemovedEventListener
  ): void {
    this.graphStoreRemovedEventListeners.add(listener);
  }

  static unregisterGraphStoreRemovedListener(
    listener: GraphStoreRemovedEventListener
  ): void {
    this.graphStoreRemovedEventListeners.delete(listener);
  }

  static setLog(logger: Log): void {
    this.log = logger;
  }

  static get(
    request: CatalogRequest,
    graphName: string
  ): GraphStoreCatalogEntry {
    const userCatalogKey = UserCatalogKey.of(request.databaseName(), graphName);
    const ownCatalog = this.getUserCatalog(request.username());

    const maybeGraph = ownCatalog.get(
      userCatalogKey,
      request.restrictSearchToUsernameCatalog()
    );
    if (maybeGraph !== null) {
      return maybeGraph;
    }

    const usersWithMatchingGraphs: Array<{
      username: string;
      entry: GraphStoreCatalogEntry;
    }> = [];

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

    const usernames = join(
      new Set(usersWithMatchingGraphs.map((entry) => entry.username))
    );

    throw new Error(
      `Multiple graphs that match '${graphName}' are found from the users ${usernames}.`
    );
  }

  static remove(
    request: CatalogRequest,
    graphName: string,
    removedGraphConsumer: (entry: GraphStoreCatalogEntry) => void,
    failOnMissing: boolean
  ): void {
    const userCatalogKey = UserCatalogKey.of(request.databaseName(), graphName);
    const ownCatalog = this.getUserCatalog(request.username());

    const didRemove = ownCatalog.remove(
      userCatalogKey,
      removedGraphConsumer,
      failOnMissing && request.restrictSearchToUsernameCatalog()
    );

    if (didRemove || request.restrictSearchToUsernameCatalog()) {
      return;
    }

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

  static set(config: GraphProjectConfig, graphStore: GraphStore): void {
    let userCatalog = this.userCatalogs.get(config.username());
    if (!userCatalog) {
      userCatalog = new UserCatalog();
      this.userCatalogs.set(config.username(), userCatalog);
    }

    userCatalog.set(
      UserCatalogKey.of(
        graphStore.databaseInfo().databaseId(),
        config.graphName()
      ),
      config,
      graphStore
    );

    // Fire addition events
    for (const listener of this.graphStoreAddedEventListeners) {
      ExceptionUtil.safeRunWithLogException(
        () =>
          `Could not call listener ${listener} on setting the graph ${config.graphName()}`,
        () =>
          listener.onGraphStoreAdded(
            new GraphStoreAddedEvent(
              config.username(),
              graphStore.databaseInfo().databaseId().databaseName(),
              config.graphName(),
              MemoryUsage.sizeOf(graphStore)
            )
          ),
        this.log?.warn || (() => {})
      );
    }
  }

  static exists(
    username: string,
    databaseName: string,
    graphName: string
  ): boolean {
    return this.getUserCatalog(username).exists(
      UserCatalogKey.of(databaseName, graphName)
    );
  }

  static existsWithDatabaseId(
    username: string,
    databaseId: DatabaseId,
    graphName: string
  ): boolean {
    return this.getUserCatalog(username).exists(
      UserCatalogKey.of(databaseId, graphName)
    );
  }

  static graphStoreCount(): number {
    let total = 0;
    for (const userCatalog of this.userCatalogs.values()) {
      total += userCatalog.getGraphStores().length;
    }
    return total;
  }

  static graphStoreCountForDatabase(databaseId: DatabaseId): number {
    let total = 0;
    for (const userCatalog of this.userCatalogs.values()) {
      total += userCatalog.getGraphStores(databaseId).length;
    }
    return total;
  }

  static isEmpty(): boolean {
    return this.graphStoreCount() === 0;
  }

  static getDegreeDistribution(
    username: string,
    databaseId: DatabaseId,
    graphName: string
  ): Map<string, any> | undefined {
    return this.getUserCatalog(username).getDegreeDistribution(
      UserCatalogKey.of(databaseId, graphName)
    );
  }

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

  static removeAllLoadedGraphs(): void {
    for (const [, userCatalog] of this.userCatalogs) {
      for (const [userCatalogKey] of userCatalog.graphsByName) {
        userCatalog.remove(userCatalogKey, () => {}, false);
      }
    }
  }

  static removeAllLoadedGraphsForDatabase(databaseId: DatabaseId): void {
    for (const [, userCatalog] of this.userCatalogs) {
      for (const [userCatalogKey] of userCatalog.graphsByName) {
        if (databaseId.databaseName() === userCatalogKey.databaseName()) {
          userCatalog.remove(userCatalogKey, () => {}, false);
        }
      }
    }
  }

  static getGraphStores(username: string): GraphStoreCatalogEntry[] {
    return this.getUserCatalog(username).getGraphStores();
  }

  static getGraphStoresForUserAndDatabase(
    username: string,
    databaseId: DatabaseId
  ): GraphStoreCatalogEntry[] {
    return this.getUserCatalog(username).getGraphStores(databaseId);
  }

  static getAllGraphStores(): GraphStoreCatalogEntryWithUsername[] {
    const allEntries: GraphStoreCatalogEntryWithUsername[] = [];

    for (const [username, userCatalog] of this.userCatalogs) {
      const userEntries = userCatalog.streamGraphStores(username);
      allEntries.push(...userEntries);
    }

    return allEntries;
  }

  private static getUserCatalog(username: string): UserCatalog {
    return this.userCatalogs.get(username) || UserCatalog.EMPTY;
  }

  // Test-only methods
  static getTestOnly(
    username: string,
    databaseId: DatabaseId,
    graphName: string
  ): GraphStoreCatalogEntry {
    return this.get(CatalogRequest.of(username, databaseId), graphName);
  }

  static getTestOnlyWithDatabaseName(
    username: string,
    databaseName: string,
    graphName: string
  ): GraphStoreCatalogEntry {
    return this.get(CatalogRequest.of(username, databaseName), graphName);
  }
}

class UserCatalog {
  static readonly EMPTY = new UserCatalog();

  readonly graphsByName = new Map<UserCatalogKey, GraphStoreCatalogEntry>();
  private readonly degreeDistributionByName = new Map<
    UserCatalogKey,
    Map<string, any>
  >();

  set(
    userCatalogKey: UserCatalogKey,
    config: GraphProjectConfig,
    graphStore: GraphStore
  ): void {
    if (!config.graphName() || !graphStore) {
      throw new Error("Both name and graph store must be not null");
    }

    if (this.graphsByName.has(userCatalogKey)) {
      throw new Error(`Graph name ${config.graphName()} already loaded`);
    }

    const graphStoreCatalogEntry = new GraphStoreCatalogEntry(
      graphStore,
      config,
      new EphemeralResultStore()
    );

    this.graphsByName.set(userCatalogKey, graphStoreCatalogEntry);
  }

  get(
    userCatalogKey: UserCatalogKey,
    failOnMissing: boolean
  ): GraphStoreCatalogEntry | null {
    const graphStoreWithConfig = this.graphsByName.get(userCatalogKey);

    if (!graphStoreWithConfig && failOnMissing) {
      throw new GraphNotFoundException(userCatalogKey);
    }

    return graphStoreWithConfig || null;
  }

  exists(userCatalogKey: UserCatalogKey): boolean {
    return userCatalogKey && this.graphsByName.has(userCatalogKey);
  }

  remove(
    userCatalogKey: UserCatalogKey,
    removedGraphConsumer: (entry: GraphStoreCatalogEntry) => void,
    failOnMissing: boolean
  ): boolean {
    const graphStoreWithConfig = this.get(userCatalogKey, failOnMissing);

    if (!graphStoreWithConfig) {
      return false;
    }

    removedGraphConsumer(graphStoreWithConfig);
    this.removeDegreeDistribution(userCatalogKey);
    const removed = this.graphsByName.delete(userCatalogKey);

    if (removed) {
      // Fire removal events
      for (const listener of GraphStoreCatalog[
        "graphStoreRemovedEventListeners"
      ]) {
        ExceptionUtil.safeRunWithLogException(
          () =>
            `Could not call listener ${listener} on removing the graph ${graphStoreWithConfig
              .config()
              .graphName()}`,
          () =>
            listener.onGraphStoreRemoved(
              new GraphStoreRemovedEvent(
                graphStoreWithConfig.config().username(),
                graphStoreWithConfig
                  .graphStore()
                  .databaseInfo()
                  .databaseId()
                  .databaseName(),
                graphStoreWithConfig.config().graphName(),
                MemoryUsage.sizeOf(graphStoreWithConfig.graphStore())
              )
            ),
          GraphStoreCatalog["log"]?.warn || (() => {})
        );
      }
    }

    return removed;
  }

  setDegreeDistribution(
    userCatalogKey: UserCatalogKey,
    degreeDistribution: Map<string, any>
  ): void {
    if (!userCatalogKey || !degreeDistribution) {
      throw new Error("Both name and degreeDistribution must be not null");
    }

    if (!this.graphsByName.has(userCatalogKey)) {
      throw new Error(
        `Cannot set degreeDistribution because graph ${userCatalogKey.graphName()} does not exist`
      );
    }

    this.degreeDistributionByName.set(userCatalogKey, degreeDistribution);
  }

  getDegreeDistribution(
    userCatalogKey: UserCatalogKey
  ): Map<string, any> | undefined {
    if (!this.graphsByName.has(userCatalogKey)) {
      return undefined;
    }
    return this.degreeDistributionByName.get(userCatalogKey);
  }

  private removeDegreeDistribution(userCatalogKey: UserCatalogKey): void {
    this.degreeDistributionByName.delete(userCatalogKey);
  }

  getGraphStores(): GraphStoreCatalogEntry[] {
    return Array.from(this.graphsByName.values());
  }

  getGraphStores(databaseId: DatabaseId): GraphStoreCatalogEntry[] {
    return Array.from(this.graphsByName.entries())
      .filter(([key]) => key.databaseName() === databaseId.databaseName())
      .map(([, entry]) => entry);
  }

  streamGraphStores(username: string): GraphStoreCatalogEntryWithUsername[] {
    return Array.from(this.graphsByName.values()).map(
      (catalogEntry) =>
        new GraphStoreCatalogEntryWithUsername(catalogEntry, username)
    );
  }
}

export class UserCatalogKey {
  constructor(
    private readonly _graphName: string,
    private readonly _databaseName: string
  ) {}

  graphName(): string {
    return this._graphName;
  }

  databaseName(): string {
    return this._databaseName;
  }

  static of(databaseId: DatabaseId, graphName: string): UserCatalogKey {
    return new UserCatalogKey(graphName, databaseId.databaseName());
  }

  static ofNames(databaseName: string, graphName: string): UserCatalogKey {
    return new UserCatalogKey(graphName, databaseName);
  }
}

export class GraphStoreCatalogEntryWithUsername {
  constructor(
    public readonly catalogEntry: GraphStoreCatalogEntry,
    public readonly username: string
  ) {}
}
