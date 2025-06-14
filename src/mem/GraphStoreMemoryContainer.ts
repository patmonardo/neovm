import { UserEntityMemory } from "./UserEntityMemory";

export interface GraphStoreAddedEvent {
  user(): string;
  graphName(): string;
  memoryInBytes(): number;
}

export interface GraphStoreRemovedEvent {
  user(): string;
  graphName(): string;
}

export class GraphStoreMemoryContainer {
  // Simulating ConcurrentHashMap with standard Map.
  // Concurrency caveats from TaskMemoryContainer apply here as well.
  private readonly graphStoresMemory = new Map<string, Map<string, number>>();
  private graphStoreReservedMemoryTotal: number = 0; // Renamed for clarity vs. getter method

  private static readonly EMPTY_INNER_MAP = new Map<string, number>();

  public addGraph(graphStoreAddedEvent: GraphStoreAddedEvent): number {
    const addedGraphMemory = graphStoreAddedEvent.memoryInBytes();
    this.graphStoreReservedMemoryTotal += addedGraphMemory;

    if (!this.graphStoresMemory.has(graphStoreAddedEvent.user())) {
      this.graphStoresMemory.set(
        graphStoreAddedEvent.user(),
        new Map<string, number>()
      );
    }
    const userGraphs = this.graphStoresMemory.get(graphStoreAddedEvent.user())!;
    userGraphs.set(
      graphStoreAddedEvent.graphName(),
      graphStoreAddedEvent.memoryInBytes()
    );

    return this.graphStoreReservedMemoryTotal;
  }

  public removeGraph(graphStoreRemovedEvent: GraphStoreRemovedEvent): number {
    const userGraphs = this.graphStoresMemory.get(
      graphStoreRemovedEvent.user()
    );
    if (userGraphs) {
      const graphMemoryToRemove = userGraphs.get(
        graphStoreRemovedEvent.graphName()
      );

      if (graphMemoryToRemove === undefined) {
        // Graph not found under this user, return current total
        return this.graphStoreReservedMemoryTotal;
      }

      userGraphs.delete(graphStoreRemovedEvent.graphName());
      if (userGraphs.size === 0) {
        this.graphStoresMemory.delete(graphStoreRemovedEvent.user());
      }
      this.graphStoreReservedMemoryTotal -= graphMemoryToRemove;
      return this.graphStoreReservedMemoryTotal;
    } else {
      // User not found, return current total
      return this.graphStoreReservedMemoryTotal;
    }
  }

  public graphStoreReservedMemory(): number {
    return this.graphStoreReservedMemoryTotal;
  }

  public listGraphs(user: string): UserEntityMemory[] {
    const userGraphsMap =
      this.graphStoresMemory.get(user) ||
      GraphStoreMemoryContainer.EMPTY_INNER_MAP;
    const result: UserEntityMemory[] = [];
    for (const [graphName, memoryAmount] of userGraphsMap.entries()) {
      result.push(UserEntityMemory.createGraph(user, graphName, memoryAmount));
    }
    return result;
  }

  public listAllGraphs(): UserEntityMemory[] {
    // Renamed from listGraphs() to avoid overload confusion
    const allGraphs: UserEntityMemory[] = [];
    for (const user of this.graphStoresMemory.keys()) {
      allGraphs.push(...this.listGraphs(user));
    }
    return allGraphs;
  }

  public memoryOfGraphs(user: string): number {
    const userGraphsMap =
      this.graphStoresMemory.get(user) ||
      GraphStoreMemoryContainer.EMPTY_INNER_MAP;
    let sum = 0;
    for (const memoryAmount of userGraphsMap.values()) {
      sum += memoryAmount;
    }
    return sum;
  }

  public getGraphUsers(inputUsers?: Set<string>): Set<string> {
    // Renamed from graphUsers
    const users = inputUsers ?? new Set<string>();
    for (const userKey of this.graphStoresMemory.keys()) {
      users.add(userKey);
    }
    return users;
  }
}
