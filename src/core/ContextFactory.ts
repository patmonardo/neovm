import { Context, User, ExecutionMode, LogLevel, ExecutionConfig } from './Context';
import { BasicContext } from './BasicContext';

/**
 * Factory for creating different types of execution contexts.
 */
export class ContextFactory {
  /**
   * Create an anonymous context (no user authentication).
   */
  public static anonymous(config?: ExecutionConfig): Context {
    return new BasicContext({
      user: null,
      sessionUser: null,
      config: config || {}
    });
  }

  /**
   * Create a context for a specific user.
   */
  public static forUser(username: string, roles: string[] = ['user'], config?: ExecutionConfig): Context {
    const user: User = {
      username,
      roles,
      isAuthenticated: true,
      permissions: [...roles] // Simple permission model
    };

    return new BasicContext({
      user,
      config: config || {}
    });
  }

  /**
   * Create a context with session-based authentication.
   */
  public static withSession(sessionUser: string, config?: ExecutionConfig): Context {
    return new BasicContext({
      user: null,
      sessionUser,
      config: config || {}
    });
  }

  /**
   * Create a debug context with enhanced logging.
   */
  public static debug(username?: string): Context {
    const debugConfig: ExecutionConfig = {
      logLevel: LogLevel.DEBUG,
      debugEnabled: true
    };

    if (username) {
      return this.forUser(username, ['user', 'debug'], debugConfig);
    } else {
      return this.anonymous(debugConfig);
    }
  }

  /**
   * Create a high-performance context with specific resource allocations.
   */
  public static highPerformance(
    username: string,
    concurrency: number,
    maxMemory: number
  ): Context {
    const config: ExecutionConfig = {
      concurrency,
      maxMemory,
      logLevel: LogLevel.WARN // Reduce logging overhead
    };

    return this.forUser(username, ['user', 'power-user'], config);
  }

  /**
   * Create a context for Neo4j interop (future use).
   */
  public static neo4jInterop(username: string, databaseName: string): Context {
    const config: ExecutionConfig = {
      executionMode: ExecutionMode.NEO4J_EMBEDDED
    };

    // Would extend BasicContext with Neo4j-specific features
    return this.forUser(username, ['neo4j-user'], config);
  }
}
