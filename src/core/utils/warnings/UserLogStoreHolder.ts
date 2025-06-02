import { UserLogStore } from "./UserLogStore"; // Assuming this is the interface with addUserLogMessage, query
import { PerDatabaseUserLogStore } from "./PerDatabaseUserLogStore";

// Placeholder for StringFormatting.toLowerCaseWithLocale
// In a real scenario, if locale-specific lowercasing is crucial,
// you might use a library or more specific string manipulation.
// For now, standard toLowerCase() is used.
namespace StringFormatting {
  export function toLowerCaseWithLocale(
    str: string /*, locale?: string */
  ): string {
    // return str.toLocaleLowerCase(locale); // If a specific locale is needed
    return str.toLowerCase(); // Standard JavaScript toLowerCase
  }
}

/**
 * @ deprecated this is a temporary workaround.
 * We need to satisfy each procedure facade having its own user log stores, so that we can new them up in a known,
 * good, isolated state.
 * Plus for the time being we have to ensure each test using a user log store sees unique user log stores.
 * We assume database ids are unique to a JVM.
 * Therefore, we can have this JVM-wide singleton holding a map of database id to user log store.
 * <p>
 * This is of course abominable and should be gotten rid of.
 * And we can get rid of it once all tests are not using context-injected user log stores anymore.
 * We want to do that migration in vertical slices, so we can have this solution in place temporarily.
 * Procedure facade will use this service class and be oblivious to the underlying abomination.
 * And UserLogRegistryExtension will be made to hand out references using database id.
 * We rely on database ids being unique for the lifetime of a JVM.
 * <p>
 * Note that UserLogRegistryExtension will thus serve both tests and prod,
 * until we can eliminate usages of its products, and in turn eliminate it completely.
 * <p>
 * Oh, and string type because this module doesn't know the GDS DatabaseId type.
 */
export class UserLogStoreHolder {
  /**
   * @ deprecated we eliminate this as soon as possible
   */
  // Using a standard Map. In Node.js, if this needs to be shared across
  // worker threads or different processes, a more complex solution (e.g., Redis, IPC)
  // would be needed. For a single Node.js process, this Map acts as a singleton store.
  private static readonly USER_LOG_STORES: Map<string, UserLogStore> =
    new Map();

  /**
   * Private constructor to prevent instantiation, making it a static utility class.
   */
  private constructor() {}

  /**
   * Normalize so that we match things from the GDS DatabaseId, and fingers crossed it doesn't change.
   * Not using DatabaseId directly, because that would mead to some awful dependencies.
   * And we will eliminate this in due course.
   * @param databaseName The name of the database.
   * @returns The UserLogStore for the given database name.
   */
  public static getUserLogStore(databaseName: string): UserLogStore {
    const normalizedDatabaseName =
      StringFormatting.toLowerCaseWithLocale(databaseName);

    // Simulate computeIfAbsent
    if (!UserLogStoreHolder.USER_LOG_STORES.has(normalizedDatabaseName)) {
      UserLogStoreHolder.USER_LOG_STORES.set(
        normalizedDatabaseName,
        new PerDatabaseUserLogStore()
      );
    }
    return UserLogStoreHolder.USER_LOG_STORES.get(normalizedDatabaseName)!;
  }
}
