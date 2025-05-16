// ...existing code...
/**
 * Represents a user in the system.
 */
export interface User {
  /**
   * @returns The username.
   */
  getUsername(): string;

  /**
   * @returns True if the user has administrative privileges, false otherwise.
   */
  isAdmin(): boolean;
}

/**
 * Represents a database identifier.
 */
export interface DatabaseId {
  /**
   * @returns The name of the database.
   */
  databaseName(): string;
}

/**
 * A simple Optional utility, similar to java.util.Optional.
 */
export class Optional<T> {
  private constructor(private readonly _value: T | null | undefined) {}

  public static empty<T>(): Optional<T> {
    return new Optional<T>(null);
  }

  public static of<T>(value: T): Optional<T> {
    if (value === null || value === undefined) {
      throw new Error("Optional.of called with null or undefined value");
    }
    return new Optional<T>(value);
  }

  public static ofNullable<T>(value: T | null | undefined): Optional<T> {
    return new Optional<T>(value);
  }

  public isPresent(): boolean {
    return this._value !== null && this._value !== undefined;
  }

  public isEmpty(): boolean {
    return !this.isPresent();
  }

  public get(): T {
    if (!this.isPresent()) {
      throw new Error("No value present");
    }
    return this._value!;
  }

  public orElse(other: T): T {
    return this.isPresent() ? this._value! : other;
  }

  public orElseGet(supplier: () => T): T {
    return this.isPresent() ? this._value! : supplier();
  }

  public map<U>(mapper: (value: T) => U): Optional<U> {
    if (!this.isPresent()) {
      return Optional.empty<U>();
    }
    return Optional.ofNullable(mapper(this._value!));
  }
}

export class CatalogRequest {
  private readonly _databaseName: string;
  private readonly _requestingUsername: string;
  private readonly _usernameOverride: Optional<string>;
  private readonly _requesterIsAdmin: boolean;

  private constructor(
    databaseName: string,
    requestingUsername: string,
    usernameOverride: Optional<string>,
    requesterIsAdmin: boolean
  ) {
    this._databaseName = databaseName;
    this._requestingUsername = requestingUsername;
    this._usernameOverride = usernameOverride;
    this._requesterIsAdmin = requesterIsAdmin;

    // Validation logic from @Value.Check
    if (!this._requesterIsAdmin && this._usernameOverride.isPresent()) {
      throw new Error("Cannot override the username as a non-admin");
    }
  }

  public username(): string {
    return this._usernameOverride.orElseGet(() => this._requestingUsername);
  }

  public databaseName(): string {
    return this._databaseName;
  }

  public restrictSearchToUsernameCatalog(): boolean {
    // admin users are allowed to not have a graph, other users graphs are then searched
    if (this._requesterIsAdmin && this._usernameOverride.isEmpty()) {
      return false;
    }
    return true;
  }

  // Accessors for the underlying properties, equivalent to Java abstract methods
  public requestingUsername(): string {
    return this._requestingUsername;
  }

  public usernameOverride(): Optional<string> {
    return this._usernameOverride;
  }

  public requesterIsAdmin(): boolean {
    return this._requesterIsAdmin;
  }

  // Static factory methods
  public static fromUser(
    user: User,
    databaseId: DatabaseId,
    usernameOverride: Optional<string> = Optional.empty<string>()
  ): CatalogRequest {
    return new CatalogRequest(
      databaseId.databaseName(),
      user.getUsername(),
      usernameOverride,
      user.isAdmin()
    );
  }

  public static fromStrings(username: string, databaseName: string): CatalogRequest {
    return new CatalogRequest(databaseName, username, Optional.empty<string>(), false);
  }

  public static fromStringAndDbId(username: string, databaseId: DatabaseId): CatalogRequest {
    return CatalogRequest.fromStrings(username, databaseId.databaseName());
  }

  public static fromAdminStrings(
    username: string,
    usernameOverride: Optional<string>,
    databaseName: string
  ): CatalogRequest {
    return new CatalogRequest(databaseName, username, usernameOverride, true);
  }

  public static fromAdminStringAndDbId(username: string, databaseId: DatabaseId): CatalogRequest {
    return CatalogRequest.fromAdminStrings(username, Optional.empty<string>(), databaseId.databaseName());
  }

  public static fromAdminStringOverrideAndDbId(
    username: string,
    usernameOverride: Optional<string>,
    databaseId: DatabaseId
  ): CatalogRequest {
    return CatalogRequest.fromAdminStrings(username, usernameOverride, databaseId.databaseName());
  }
}
// ...existing code...
