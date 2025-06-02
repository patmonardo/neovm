import { Context } from "@/core";
import { UserLogRegistryFactory } from "./UserLogRegistryFactory";
import { LocalUserLogRegistryFactory } from "./LocalUserLogRegistryFactory";
import { UserLogStore } from "./UserLogStore";

/**
 * Provider that creates UserLogRegistryFactory instances based on execution context.
 * In NeoVM, this extracts user information from the execution context instead of Neo4j security context.
 */
export class UserLogRegistryFactoryProvider {
  private readonly userLogStore: UserLogStore;

  constructor(userLogStore: UserLogStore) {
    this.userLogStore = userLogStore;
  }

  /**
   * Create a UserLogRegistryFactory for the given execution context.
   *
   * @param context The execution context containing user information
   * @returns UserLogRegistryFactory configured for the context user
   * @throws Error if context is invalid or user cannot be determined
   */
  public apply(context: Context): UserLogRegistryFactory {
    try {
      // Extract username from execution context
      const username = this.extractUsername(context);

      return new LocalUserLogRegistryFactory(username, this.userLogStore);
    } catch (error) {
      throw new Error(`Failed to create UserLogRegistryFactory: ${error}`);
    }
  }

  /**
   * Extract username from execution context.
   * In NeoVM, we don't have Neo4j's AuthSubject, so we use our own context system.
   */
  private extractUsername(context: Context): string {
    // Try to get authenticated user from context
    const user = context.getUser();
    if (user && user.username) {
      return user.username;
    }

    // Fall back to session/request user
    const sessionUser = context.getSessionUser();
    if (sessionUser) {
      return sessionUser;
    }

    // Default to anonymous user
    return "anonymous";
  }
}

/**
 * Function type for context-based factory provider.
 * Equivalent to Java's ThrowingFunction<Context, UserLogRegistryFactory, ProcedureException>
 */
export type UserLogRegistryFactoryProviderFunction = (
  context: Context
) => UserLogRegistryFactory;

/**
 * Factory for creating provider instances.
 */
export class UserLogRegistryFactoryProviders {
  /**
   * Create a standard provider with the given user log store.
   */
  public static create(
    userLogStore: UserLogStore
  ): UserLogRegistryFactoryProvider {
    return new UserLogRegistryFactoryProvider(userLogStore);
  }

  /**
   * Create a provider function for functional-style usage.
   */
  public static createFunction(
    userLogStore: UserLogStore
  ): UserLogRegistryFactoryProviderFunction {
    const provider = new UserLogRegistryFactoryProvider(userLogStore);
    return (context: Context) => provider.apply(context);
  }

  /**
   * Create a provider that always uses a specific username (for testing).
   */
  public static createForUser(
    username: string,
    userLogStore: UserLogStore
  ): UserLogRegistryFactoryProvider {
    return new (class extends UserLogRegistryFactoryProvider {
      public apply(_context: Context): UserLogRegistryFactory {
        return new LocalUserLogRegistryFactory(username, userLogStore);
      }
    })(userLogStore);
  }

  /**
   * Create a provider that uses anonymous user (for simple setups).
   */
  public static createAnonymous(
    userLogStore: UserLogStore
  ): UserLogRegistryFactoryProvider {
    return this.createForUser("anonymous", userLogStore);
  }
}
