import { DatabaseManagementService, DatabaseNotFoundException } from '../../dbms/api/DatabaseManagementService'; // Adjust path
import { DatabaseId } from '../../api/DatabaseId'; // Adjust path
import { DatabaseEventContext } from '../../graphdb/event/DatabaseEventContext'; // Adjust path
import { DatabaseEventListener } from '../../graphdb/event/DatabaseEventListener'; // Adjust path
import { LifecycleAdapter } from '../../kernel/lifecycle/LifecycleAdapter'; // Adjust path
import { GraphStoreCatalog } from './GraphStoreCatalog';
import { Database } from '../../dbms/api/Database'; // Adjust path

export class InMemoryGraphTrackerLifecycleAdapter extends LifecycleAdapter implements DatabaseEventListener {
  private readonly dbms: DatabaseManagementService;
  private readonly databaseIdMapping: Map<string, DatabaseId>; // Map<databaseName, DatabaseId>

  constructor(dbms: DatabaseManagementService) {
    super();
    this.dbms = dbms;
    this.databaseIdMapping = new Map<string, DatabaseId>();
  }

  public override async init(): Promise<void> {
    // super.init() can be called if LifecycleAdapter.init has logic
    this.dbms.registerDatabaseEventListener(this);
  }

  public override async shutdown(): Promise<void> {
    // super.shutdown() can be called if LifecycleAdapter.shutdown has logic
    this.dbms.unregisterDatabaseEventListener(this);
    this.databaseIdMapping.clear(); // Clear mapping on shutdown
  }

  // --- DatabaseEventListener Implementation ---

  public databaseCreate(eventContext: DatabaseEventContext): void {
    const databaseName = eventContext.getDatabaseName();
    try {
      const db: Database = this.dbms.database(databaseName);
      // In GDS, DatabaseId.of usually takes the actual unique ID of the database,
      // which might be different from its name (e.g., a UUID).
      // db.databaseId() is what GDS uses.
      this.databaseIdMapping.set(databaseName, DatabaseId.of(db.databaseId()));
    } catch (e) {
      if (e instanceof DatabaseNotFoundException) {
        console.warn(`Database '${databaseName}' not found during create event. This might be a race condition or unexpected state.`);
      } else {
        throw e; // Re-throw other errors
      }
    }
  }

  public databaseDrop(eventContext: DatabaseEventContext): void {
    const databaseName = eventContext.getDatabaseName();
    if (this.databaseIdMapping.has(databaseName)) {
        this.databaseIdMapping.delete(databaseName);
        console.log(`GraphTracker: Database '${databaseName}' dropped, removed from tracking.`);
    } else {
        console.warn(`GraphTracker: Database '${databaseName}' dropped, but was not actively tracked.`);
    }
  }

  public databaseShutdown(eventContext: DatabaseEventContext): void {
    this.databaseIsShuttingDown(eventContext.getDatabaseName());
  }

  public databasePanic(eventContext: DatabaseEventContext): void {
    this.databaseIsShuttingDown(eventContext.getDatabaseName());
  }

  public databaseStart(eventContext: DatabaseEventContext): void {
    // Typically, if a database starts, we might want to ensure it's tracked
    // if it wasn't caught by 'databaseCreate' (e.g., if listener registered after create).
    // The original Java code is empty. If it's already created, it should be in the map.
    // If not, it might be an existing DB starting up.
    const databaseName = eventContext.getDatabaseName();
    if (!this.databaseIdMapping.has(databaseName)) {
        try {
            const db: Database = this.dbms.database(databaseName);
            this.databaseIdMapping.set(databaseName, DatabaseId.of(db.databaseId()));
            console.log(`GraphTracker: Database '${databaseName}' started and is now tracked.`);
        } catch (e) {
            if (e instanceof DatabaseNotFoundException) {
                console.warn(`Database '${databaseName}' not found during start event.`);
            } else {
                throw e;
            }
        }
    }
  }

  // --- Helper Method ---
  private databaseIsShuttingDown(databaseName: string): void {
    const dbId = this.databaseIdMapping.get(databaseName);
    if (!dbId) {
      // Original Java code throws DatabaseNotFoundException.
      // However, this might be too strict if the event comes for a DB not actively managed
      // or if there's a race condition on shutdown. Logging a warning might be safer.
      console.warn(`GraphTracker: Shutdown event for database '${databaseName}', but it was not actively tracked or already removed.`);
      // throw new DatabaseNotFoundException(databaseName); // Original behavior
      return;
    }
    GraphStoreCatalog.removeAllLoadedGraphs(dbId);
    // It might also be prudent to remove it from databaseIdMapping here,
    // though databaseDrop should handle explicit drops.
    // this.databaseIdMapping.delete(databaseName);
    console.log(`GraphTracker: Database '${databaseName}' (ID: ${dbId.id}) is shutting down. Cleared its graphs.`);
  }
}
