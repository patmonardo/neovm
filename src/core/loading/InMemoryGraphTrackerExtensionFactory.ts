import {
  ExtensionFactory,
  ExtensionType,
  ExtensionContext,
  Lifecycle,
  DatabaseManagementService,
  InMemoryGraphTrackerLifecycleAdapter, // Assuming it's imported or defined in the same scope
} from './neo4jExtensionTypes'; // Adjust path as needed

// The @ServiceProvider annotation is Java-specific and typically handled by build tools
// or module systems in TypeScript, rather than a direct code annotation.

export namespace InMemoryGraphTrackerExtensionFactory {
  /**
   * Defines the dependencies required by the InMemoryGraphTrackerExtensionFactory.
   */
  export interface Dependencies {
    dbms(): DatabaseManagementService;
  }
}

export class InMemoryGraphTrackerExtensionFactory extends ExtensionFactory<InMemoryGraphTrackerExtensionFactory.Dependencies> {
  constructor() {
    super(ExtensionType.GLOBAL, "InMemoryGraphTracker");
  }

  public override newInstance(
    context: ExtensionContext,
    dependencies: InMemoryGraphTrackerExtensionFactory.Dependencies
  ): Lifecycle {
    return new InMemoryGraphTrackerLifecycleAdapter(dependencies.dbms());
  }
}
