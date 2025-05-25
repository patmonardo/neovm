/**
 * Context interface providing access to execution environment and configuration for exporters.
 *
 * This is the **fundamental context object** passed to all export builders, providing
 * access to the execution environment, security context, and any active transactions
 * or sessions needed for the export operation.
 *
 * **Design Philosophy:**
 * - **Database-agnostic** - Not tied to any specific database implementation
 * - **Minimal interface** - Only essential context needed for export operations
 * - **Security-aware** - Includes security context for access control
 * - **Transaction-aware** - Supports transactional export operations when needed
 *
 * **Usage Patterns:**
 * ```typescript
 * // File-based context
 * const fileContext: ExporterContext = new FileExporterContext({
 *   outputDirectory: '/data/exports',
 *   securityContext: currentUser
 * });
 *
 * // In-memory context
 * const memoryContext: ExporterContext = new MemoryExporterContext({
 *   resultStore: new InMemoryResultStore(),
 *   securityContext: currentUser
 * });
 *
 * // Use context with exporters
 * const exporter = provider.nodePropertyExporterBuilder(context);
 * ```
 */
export interface ExporterContext {
  /**
   * Returns the database or storage service interface.
   *
   * This provides access to the underlying storage system, whether it's
   * a file system, in-memory store, or external database. The exact
   * type depends on the implementation.
   *
   * @returns The database/storage service interface
   */
  databaseService(): any;

  /**
   * Returns the current transaction or session, if any.
   *
   * For transactional export operations, this provides access to the
   * current transaction context. May be null for non-transactional
   * export scenarios (like file exports).
   *
   * @returns The current transaction/session, or null if not applicable
   */
  transaction(): any | null;

  /**
   * Returns the security context for access control.
   *
   * Provides information about the current user, permissions, and
   * security constraints that should be applied during export operations.
   *
   * @returns The security context
   */
  securityContext(): SecurityContext;
}

/**
 * Security context interface for access control during export operations.
 *
 * This abstraction allows different security implementations while providing
 * a consistent interface for export operations to check permissions.
 */
export interface SecurityContext {
  /**
   * Returns the current user identifier.
   */
  userId(): string;

  /**
   * Checks if the current user has permission for the specified operation.
   *
   * @param operation The operation to check (e.g., 'READ', 'WRITE', 'EXPORT')
   * @param resource The resource being accessed (e.g., node type, property key)
   * @returns true if the operation is permitted, false otherwise
   */
  hasPermission(operation: string, resource?: string): boolean;

  /**
   * Returns additional security metadata as key-value pairs.
   */
  metadata(): Record<string, any>;
}

/**
 * Configuration-based implementation of ExporterContext.
 *
 * This provides a flexible, configuration-driven implementation that can
 * adapt to different export scenarios without being tied to a specific
 * database or execution environment.
 */
export class ConfigurableExporterContext implements ExporterContext {
  private readonly _databaseService: any;
  private readonly _transaction: any | null;
  private readonly _securityContext: SecurityContext;

  constructor(config: {
    databaseService: any;
    transaction?: any | null;
    securityContext: SecurityContext;
  }) {
    this._databaseService = config.databaseService;
    this._transaction = config.transaction ?? null;
    this._securityContext = config.securityContext;
  }

  databaseService(): any {
    return this._databaseService;
  }

  transaction(): any | null {
    return this._transaction;
  }

  securityContext(): SecurityContext {
    return this._securityContext;
  }
}

/**
 * Simple security context implementation for basic scenarios.
 */
export class BasicSecurityContext implements SecurityContext {
  private readonly _userId: string;
  private readonly _permissions: Set<string>;
  private readonly _metadata: Record<string, any>;

  constructor(userId: string, permissions: string[] = [], metadata: Record<string, any> = {}) {
    this._userId = userId;
    this._permissions = new Set(permissions);
    this._metadata = { ...metadata };
  }

  userId(): string {
    return this._userId;
  }

  hasPermission(operation: string, resource?: string): boolean {
    // Check for specific resource permission first
    if (resource) {
      const resourcePermission = `${operation}:${resource}`;
      if (this._permissions.has(resourcePermission)) {
        return true;
      }
    }

    // Check for general operation permission
    return this._permissions.has(operation) || this._permissions.has('*');
  }

  metadata(): Record<string, any> {
    return { ...this._metadata };
  }
}

/**
 * Factory methods for creating common context types.
 */
export class ExporterContexts {
  /**
   * Creates a file-based exporter context.
   */
  static forFile(config: {
    outputDirectory: string;
    userId: string;
    permissions?: string[];
  }): ExporterContext {
    return new ConfigurableExporterContext({
      databaseService: { type: 'file', outputDirectory: config.outputDirectory },
      securityContext: new BasicSecurityContext(config.userId, config.permissions ?? ['READ', 'WRITE', 'EXPORT'])
    });
  }

  /**
   * Creates an in-memory exporter context.
   */
  static forMemory(config: {
    resultStore: any;
    userId: string;
    permissions?: string[];
  }): ExporterContext {
    return new ConfigurableExporterContext({
      databaseService: config.resultStore,
      securityContext: new BasicSecurityContext(config.userId, config.permissions ?? ['READ', 'WRITE', 'EXPORT'])
    });
  }

  /**
   * Creates a basic exporter context with minimal configuration.
   */
  static basic(userId: string = 'system'): ExporterContext {
    return new ConfigurableExporterContext({
      databaseService: { type: 'basic' },
      securityContext: new BasicSecurityContext(userId, ['*'])
    });
  }
}
