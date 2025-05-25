import { User, DatabaseId } from '@/types';

/**
 * Immutable request context for graph catalog operations.
 *
 * CatalogRequest encapsulates **authentication**, **authorization**, and **database context**
 * for all graph catalog operations. This value class provides **security-first design**
 * with **admin privilege handling** and **username override capabilities** for
 * multi-tenant graph management.
 *
 * **Security Model:**
 *
 * 1. **User-Scoped Catalogs**: Regular users can only access their own graphs
 * 2. **Admin Privileges**: Admin users can access all graphs and override usernames
 * 3. **Database Isolation**: Operations are scoped to specific database contexts
 * 4. **Username Override**: Admins can perform operations on behalf of other users
 *
 * **Design Principles:**
 *
 * - **Immutability**: All fields are readonly for thread safety
 * - **Security Validation**: Built-in validation prevents privilege escalation
 * - **Factory Methods**: Static factories ensure consistent construction
 * - **Context Encapsulation**: All necessary context in a single object
 *
 * **Use Cases:**
 *
 * - **Graph Listing**: Determine which graphs a user can see
 * - **Graph Operations**: Authorize operations on specific graphs
 * - **Admin Actions**: Enable admin users to manage graphs for other users
 * - **Multi-Database**: Handle operations across different database contexts
 * - **Audit Logging**: Provide complete context for security audits
 *
 * **Security Features:**
 *
 * - **Privilege Validation**: Prevents non-admin users from impersonating others
 * - **Context Isolation**: Database and user scoping prevents cross-contamination
 * - **Audit Trail**: Complete request context for security logging
 * - **Safe Defaults**: Conservative security posture by default
 *
 * **Integration Points:**
 * ```typescript
 * // Regular user operations
 * const userRequest = CatalogRequest.of(user, databaseId);
 * const userGraphs = await graphCatalog.listGraphs(userRequest);
 *
 * // Admin operations with username override
 * const adminRequest = CatalogRequest.ofAdmin(adminUser, Some('targetUser'), databaseId);
 * const targetUserGraphs = await graphCatalog.listGraphs(adminRequest);
 *
 * // Security audit logging
 * auditLogger.logCatalogAccess(request, operation, result);
 * ```
 *
 * **Performance Characteristics:**
 * - **Memory**: Minimal overhead with immutable string storage
 * - **Construction**: Fast factory methods with validation
 * - **Security**: O(1) privilege checks with cached user context
 * - **Serialization**: Direct field access for JSON/logging
 *
 * **Example Usage:**
 * ```typescript
 * // Regular user requesting their graphs
 * const request = CatalogRequest.of(user, databaseId);
 * console.log(`User ${request.username()} accessing ${request.databaseName()}`);
 * console.log(`Search restriction: ${request.restrictSearchToUsernameCatalog()}`);
 *
 * // Admin user accessing all graphs
 * const adminRequest = CatalogRequest.of(adminUser, databaseId);
 * // Admin can see all graphs when no username override is specified
 *
 * // Admin user accessing specific user's graphs
 * const targetRequest = CatalogRequest.ofAdmin(adminUser, Some('targetUser'), databaseId);
 * // Operations will be performed in context of targetUser
 * ```
 */
export class CatalogRequest {

  /**
   * Name of the database for this catalog request.
   *
   * The database name provides **database context** for catalog operations,
   * ensuring that graph operations are properly isolated to the correct
   * database instance in multi-database environments.
   *
   * **Database Isolation:**
   * - Each database has its own independent graph catalog
   * - Operations cannot cross database boundaries without explicit context
   * - Multi-tenant deployments use database-level isolation
   * - Graph names are unique within database scope, not globally
   *
   * **Use Cases:**
   * - Multi-database Neo4j deployments
   * - Tenant isolation in SaaS environments
   * - Development/staging/production environment separation
   * - Compliance and data governance boundaries
   *
   * **Example Values:**
   * ```
   * 'neo4j'           // Default database
   * 'analytics'       // Dedicated analytics database
   * 'tenant_123'      // Tenant-specific database
   * 'staging'         // Environment-specific database
   * ```
   */
  public readonly databaseName: string;

  /**
   * Username of the user making the catalog request.
   *
   * The requesting username identifies **who is making the request** for
   * audit logging and initial authorization checks. This is the actual
   * authenticated user, not necessarily the user context for operations.
   *
   * **Security Context:**
   * - Used for audit trails and logging
   * - Initial authentication and authorization
   * - Admin privilege determination
   * - Security violation detection and reporting
   *
   * **Distinction from Operation Username:**
   * ```typescript
   * // The user making the request
   * request.requestingUsername  // 'admin_user'
   *
   * // The user context for operations (may be overridden by admin)
   * request.username()          // 'target_user' (if overridden)
   * ```
   */
  public readonly requestingUsername: string;

  /**
   * Optional username override for admin operations.
   *
   * When present, this allows **admin users** to perform operations
   * in the context of another user. This enables administrative
   * functions while maintaining proper audit trails.
   *
   * **Admin Override Capabilities:**
   * - Admin users can access any user's graphs
   * - Operations appear as if performed by the target user
   * - Complete audit trail maintained for security
   * - Non-admin users cannot use this functionality
   *
   * **Security Validation:**
   * ```typescript
   * // This will throw an error
   * const invalidRequest = new CatalogRequest(
   *   'database',
   *   'regular_user',
   *   Some('target_user'),  // ❌ Regular user cannot override
   *   false                 // ❌ Not admin
   * );
   * ```
   *
   * **Use Cases:**
   * - Customer support operations
   * - Administrative graph management
   * - Cross-user graph operations
   * - Troubleshooting and debugging
   * - Compliance and audit investigations
   */
  public readonly usernameOverride: Option<string>;

  /**
   * Whether the requesting user has administrative privileges.
   *
   * Admin status determines **authorization scope** and **available operations**.
   * Admin users have elevated privileges for graph catalog management
   * and can perform operations on behalf of other users.
   *
   * **Admin Privileges:**
   * - Access to all graphs in the catalog (when no username override)
   * - Ability to override username for operations
   * - Cross-user graph management capabilities
   * - Administrative catalog operations
   *
   * **Security Implications:**
   * - Admin status must be verified through proper authentication
   * - Admin operations are subject to audit logging
   * - Admin privileges should follow principle of least privilege
   * - Regular privilege review and rotation recommended
   */
  public readonly requesterIsAdmin: boolean;

  /**
   * Create a new CatalogRequest with validation.
   *
   * **Protected Constructor** ensures that all CatalogRequest instances
   * are created through validated factory methods with proper security
   * checks and consistent initialization.
   *
   * @param databaseName Name of the target database
   * @param requestingUsername Username of the requesting user
   * @param usernameOverride Optional username override for admin operations
   * @param requesterIsAdmin Whether the requesting user is an admin
   * @throws Error if validation fails
   */
  protected constructor(
    databaseName: string,
    requestingUsername: string,
    usernameOverride: Option<string>,
    requesterIsAdmin: boolean
  ) {
    this.databaseName = databaseName;
    this.requestingUsername = requestingUsername;
    this.usernameOverride = usernameOverride;
    this.requesterIsAdmin = requesterIsAdmin;

    // Validate security constraints
    this.validate();
  }

  /**
   * Get the effective username for catalog operations.
   *
   * **Username Resolution Logic:**
   * - If admin has specified a username override, use that
   * - Otherwise, use the requesting user's username
   * - This determines whose catalog/graphs are accessed
   *
   * **Security Context:**
   * This method determines the **security context** for all catalog operations.
   * The returned username is used for:
   * - Graph ownership checks
   * - Permission validation
   * - Catalog scoping
   * - Audit logging context
   *
   * @returns Effective username for operations
   */
  username(): string {
    return this.usernameOverride.getOrElse(() => this.requestingUsername);
  }

  /**
   * Determine if catalog search should be restricted to username-specific graphs.
   *
   * **Search Restriction Logic:**
   * ```typescript
   * if (adminUser && noUsernameOverride) {
   *   return false;  // Admin can see all graphs
   * } else {
   *   return true;   // Restrict to user-specific graphs
   * }
   * ```
   *
   * **Security Model:**
   * - **Admin users without override**: Can see ALL graphs in catalog
   * - **Admin users with override**: Can see target user's graphs only
   * - **Regular users**: Can see only their own graphs
   *
   * **Use Cases:**
   * - Graph listing operations
   * - Search and discovery functionality
   * - Administrative overview dashboards
   * - User-specific graph management
   *
   * @returns true if search should be restricted to user's graphs
   */
  restrictSearchToUsernameCatalog(): boolean {
    // Admin users are allowed to see all graphs when no username override is specified
    if (this.requesterIsAdmin && this.usernameOverride.isEmpty()) {
      return false;
    }
    return true;
  }

  /**
   * Validate security constraints and business rules.
   *
   * **Security Validation:**
   * - Non-admin users cannot specify username overrides
   * - Database name must be valid and non-empty
   * - Requesting username must be valid and non-empty
   * - Admin status must be consistent with override usage
   *
   * @throws Error if validation fails
   */
  private validate(): void {
    // Security constraint: Only admin users can override usernames
    if (!this.requesterIsAdmin && this.usernameOverride.isSome()) {
      throw new Error('Cannot override the username as a non-admin');
    }

    // Basic validation
    if (!this.databaseName || this.databaseName.trim().length === 0) {
      throw new Error('Database name cannot be empty');
    }

    if (!this.requestingUsername || this.requestingUsername.trim().length === 0) {
      throw new Error('Requesting username cannot be empty');
    }

    // Validate username override if present
    if (this.usernameOverride.isSome()) {
      const overrideUsername = this.usernameOverride.get();
      if (!overrideUsername || overrideUsername.trim().length === 0) {
        throw new Error('Username override cannot be empty when specified');
      }
    }
  }

  /**
   * Create a catalog request for a regular user.
   *
   * **Standard User Factory** for typical catalog operations where
   * a user is accessing their own graphs within a specific database.
   *
   * @param user User making the request
   * @param databaseId Target database identifier
   * @returns CatalogRequest for the user
   */
  static of(user: User, databaseId: DatabaseId): CatalogRequest {
    return CatalogRequest.ofWithOverride(user, databaseId, None);
  }

  /**
   * Create a catalog request with optional username override.
   *
   * **Flexible Factory** that supports both regular user operations
   * and admin operations with username override capability.
   *
   * @param user User making the request
   * @param databaseId Target database identifier
   * @param usernameOverride Optional username override for admin operations
   * @returns CatalogRequest with override support
   */
  static ofWithOverride(
    user: User,
    databaseId: DatabaseId,
    usernameOverride: Option<string>
  ): CatalogRequest {
    return new CatalogRequest(
      databaseId.databaseName(),
      user.getUsername(),
      usernameOverride,
      user.isAdmin()
    );
  }

  /**
   * Create a catalog request for a non-admin user by username.
   *
   * **Simple Factory** for creating requests when you have username
   * and database name directly, typically for non-admin users.
   *
   * @param username Username of the requesting user
   * @param databaseName Name of the target database
   * @returns CatalogRequest for the specified user
   */
  static ofUser(username: string, databaseName: string): CatalogRequest {
    return new CatalogRequest(databaseName, username, None, false);
  }

  /**
   * Create a catalog request for a non-admin user with DatabaseId.
   *
   * **DatabaseId Factory** for non-admin users when working with
   * DatabaseId objects instead of string names.
   *
   * @param username Username of the requesting user
   * @param databaseId Target database identifier
   * @returns CatalogRequest for the specified user
   */
  static ofUserWithDatabaseId(username: string, databaseId: DatabaseId): CatalogRequest {
    return CatalogRequest.ofUser(username, databaseId.databaseName());
  }

  /**
   * Create a catalog request for an admin user.
   *
   * **Admin Factory** for administrative operations with full
   * username override capabilities and elevated privileges.
   *
   * @param username Username of the admin user
   * @param usernameOverride Optional username to operate on behalf of
   * @param databaseName Name of the target database
   * @returns CatalogRequest with admin privileges
   */
  static ofAdmin(
    username: string,
    usernameOverride: Option<string>,
    databaseName: string
  ): CatalogRequest {
    return new CatalogRequest(databaseName, username, usernameOverride, true);
  }

  /**
   * Create a catalog request for an admin user without username override.
   *
   * **Simple Admin Factory** for admin operations that don't require
   * username override (e.g., viewing all graphs).
   *
   * @param username Username of the admin user
   * @param databaseId Target database identifier
   * @returns CatalogRequest with admin privileges, no override
   */
  static ofAdminWithDatabase(username: string, databaseId: DatabaseId): CatalogRequest {
    return CatalogRequest.ofAdmin(username, None, databaseId.databaseName());
  }

  /**
   * Create a catalog request for an admin user with full parameters.
   *
   * **Full Admin Factory** supporting all admin capabilities including
   * username override and DatabaseId parameter.
   *
   * @param username Username of the admin user
   * @param usernameOverride Optional username to operate on behalf of
   * @param databaseId Target database identifier
   * @returns CatalogRequest with full admin capabilities
   */
  static ofAdminWithOverride(
    username: string,
    usernameOverride: Option<string>,
    databaseId: DatabaseId
  ): CatalogRequest {
    return CatalogRequest.ofAdmin(username, usernameOverride, databaseId.databaseName());
  }

  /**
   * Check if this request represents an admin operation.
   *
   * **Admin Operation Detection** for determining if special
   * admin handling or logging is required.
   *
   * @returns true if this is an admin request
   */
  isAdminRequest(): boolean {
    return this.requesterIsAdmin;
  }

  /**
   * Check if this request uses username override.
   *
   * **Override Detection** for audit logging and special
   * handling of impersonation operations.
   *
   * @returns true if username override is active
   */
  hasUsernameOverride(): boolean {
    return this.usernameOverride.isSome();
  }

  /**
   * Get the target username being operated on.
   *
   * **Target Resolution** for audit logging and permission
   * checks to identify whose resources are being accessed.
   *
   * @returns Username whose resources are being accessed
   */
  getTargetUsername(): string {
    return this.username();
  }

  /**
   * Create an audit context for logging.
   *
   * **Audit Trail Support** providing all necessary context
   * for security audit logging and compliance reporting.
   *
   * @returns Audit context object
   */
  toAuditContext(): CatalogRequestAuditContext {
    return {
      requestingUser: this.requestingUsername,
      targetUser: this.username(),
      database: this.databaseName,
      isAdminRequest: this.isAdminRequest(),
      hasOverride: this.hasUsernameOverride(),
      restrictToUser: this.restrictSearchToUsernameCatalog()
    };
  }

  /**
   * Convert to JSON for serialization and logging.
   *
   * **Serialization Support** for API responses, logging,
   * and audit trail persistence.
   *
   * @returns JSON-serializable representation
   */
  toJSON(): CatalogRequestJSON {
    return {
      databaseName: this.databaseName,
      requestingUsername: this.requestingUsername,
      usernameOverride: this.usernameOverride.getOrNull(),
      requesterIsAdmin: this.requesterIsAdmin,
      effectiveUsername: this.username(),
      restrictToUser: this.restrictSearchToUsernameCatalog()
    };
  }

  /**
   * Create a string representation for logging.
   *
   * **Human-Readable Representation** for logs and debugging
   * that includes all relevant context information.
   *
   * @returns Formatted string representation
   */
  toString(): string {
    const override = this.usernameOverride.isSome()
      ? ` (override: ${this.usernameOverride.get()})`
      : '';
    const admin = this.requesterIsAdmin ? ' [ADMIN]' : '';

    return `CatalogRequest{user: ${this.requestingUsername}${override}, ` +
           `database: ${this.databaseName}, effective: ${this.username()}${admin}}`;
  }

  /**
   * Create a copy with a different database.
   *
   * **Database Context Switching** for operations that need
   * to work across multiple databases with the same user context.
   *
   * @param newDatabaseName Name of the new target database
   * @returns New CatalogRequest with updated database
   */
  withDatabase(newDatabaseName: string): CatalogRequest {
    return new CatalogRequest(
      newDatabaseName,
      this.requestingUsername,
      this.usernameOverride,
      this.requesterIsAdmin
    );
  }

  /**
   * Create a copy with a different username override.
   *
   * **Override Modification** for admin operations that need
   * to change the target user context.
   *
   * @param newUsernameOverride New username override
   * @returns New CatalogRequest with updated override
   * @throws Error if not admin user
   */
  withUsernameOverride(newUsernameOverride: Option<string>): CatalogRequest {
    if (!this.requesterIsAdmin) {
      throw new Error('Only admin users can modify username override');
    }

    return new CatalogRequest(
      this.databaseName,
      this.requestingUsername,
      newUsernameOverride,
      this.requesterIsAdmin
    );
  }

  /**
   * Check if this request can access graphs owned by the specified user.
   *
   * **Access Control Check** for determining if this request
   * has permission to access a specific user's graphs.
   *
   * @param graphOwner Username of the graph owner
   * @returns true if access is allowed
   */
  canAccessGraphsOwnedBy(graphOwner: string): boolean {
    // Admin without override can access all graphs
    if (this.requesterIsAdmin && this.usernameOverride.isEmpty()) {
      return true;
    }

    // Otherwise, can only access graphs owned by effective username
    return this.username() === graphOwner;
  }

  /**
   * Validate that this request can perform admin operations.
   *
   * **Admin Operation Validation** for operations that require
   * administrative privileges.
   *
   * @throws Error if not admin user
   */
  requireAdmin(): void {
    if (!this.requesterIsAdmin) {
      throw new Error(`Admin privileges required for operation. User '${this.requestingUsername}' is not an admin.`);
    }
  }

  /**
   * Validate that this request can access the specified graph.
   *
   * **Graph Access Validation** for operations on specific graphs
   * to ensure proper authorization.
   *
   * @param graphOwner Username of the graph owner
   * @throws Error if access is not allowed
   */
  requireAccessToGraphsOwnedBy(graphOwner: string): void {
    if (!this.canAccessGraphsOwnedBy(graphOwner)) {
      throw new Error(
        `User '${this.requestingUsername}' cannot access graphs owned by '${graphOwner}'. ` +
        `Effective user: '${this.username()}'`
      );
    }
  }
}

/**
 * Audit context for catalog request operations.
 */
export interface CatalogRequestAuditContext {
  readonly requestingUser: string;
  readonly targetUser: string;
  readonly database: string;
  readonly isAdminRequest: boolean;
  readonly hasOverride: boolean;
  readonly restrictToUser: boolean;
}

/**
 * JSON representation for serialization.
 */
export interface CatalogRequestJSON {
  readonly databaseName: string;
  readonly requestingUsername: string;
  readonly usernameOverride: string | null;
  readonly requesterIsAdmin: boolean;
  readonly effectiveUsername: string;
  readonly restrictToUser: boolean;
}

/**
 * Type guard for validating JSON structure.
 */
export function isCatalogRequestJSON(obj: any): obj is CatalogRequestJSON {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.databaseName === 'string' &&
    typeof obj.requestingUsername === 'string' &&
    (obj.usernameOverride === null || typeof obj.usernameOverride === 'string') &&
    typeof obj.requesterIsAdmin === 'boolean' &&
    typeof obj.effectiveUsername === 'string' &&
    typeof obj.restrictToUser === 'boolean'
  );
}

// Option type implementation for TypeScript
export abstract class Option<T> {
  abstract isSome(): boolean;
  abstract isEmpty(): boolean;
  abstract get(): T;
  abstract getOrElse(defaultValue: () => T): T;
  abstract getOrNull(): T | null;

  static some<T>(value: T): Option<T> {
    return new Some(value);
  }

  static none<T>(): Option<T> {
    return new None<T>();
  }
}

class Some<T> extends Option<T> {
  constructor(private value: T) {
    super();
  }

  isSome(): boolean { return true; }
  isEmpty(): boolean { return false; }
  get(): T { return this.value; }
  getOrElse(defaultValue: () => T): T { return this.value; }
  getOrNull(): T | null { return this.value; }
}

class None<T> extends Option<T> {
  isSome(): boolean { return false; }
  isEmpty(): boolean { return true; }
  get(): T { throw new Error('Cannot get value from None'); }
  getOrElse(defaultValue: () => T): T { return defaultValue(); }
  getOrNull(): T | null { return null; }
}

// Convenience functions
export const Some = <T>(value: T): Option<T> => Option.some(value);
export const None = <T>(): Option<T> => Option.none<T>();

// Export namespace for related utilities
export namespace CatalogRequest {
  export type AuditContext = CatalogRequestAuditContext;
  export type JSON = CatalogRequestJSON;
  export const isJSON = isCatalogRequestJSON;
}
