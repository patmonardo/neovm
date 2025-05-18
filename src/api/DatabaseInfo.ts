import { DatabaseId } from "./DatabaseId";

/**
 * Information about a database, including its ID and location.
 */
export interface DatabaseInfo {
  /**
   * Returns the database ID.
   */
  databaseId(): DatabaseId;

  /**
   * Returns the database location.
   */
  databaseLocation(): DatabaseInfo.DatabaseLocation;

  /**
   * Returns the remote database ID if present.
   */
  remoteDatabaseId(): DatabaseId | undefined;
}

/**
 * Namespace for DatabaseInfo-related types and factory methods.
 */
export namespace DatabaseInfo {
  /**
   * Possible locations for a database.
   */
  export enum DatabaseLocation {
    LOCAL = "LOCAL",
    REMOTE = "REMOTE",
    NONE = "NONE",
  }
  /**
   * Creates a DatabaseInfo for a local or non-remote database.
   *
   * @param databaseId The database ID
   * @param databaseLocation The database location (LOCAL or NONE)
   * @returns A new DatabaseInfo instance
   */
  export function of(
    databaseId: DatabaseId,
    databaseLocation: DatabaseLocation
  ): DatabaseInfo;

  /**
   * Creates a DatabaseInfo for a remote database.
   *
   * @param databaseId The database ID
   * @param databaseLocation The database location
   * @param remoteDatabaseId The remote database ID
   * @returns A new DatabaseInfo instance
   */
  export function of(
    databaseId: DatabaseId,
    databaseLocation: DatabaseLocation,
    remoteDatabaseId: DatabaseId
  ): DatabaseInfo;

  /**
   * Implementation that handles both overloads
   */
  export function of(
    databaseId: DatabaseId,
    databaseLocation: DatabaseLocation,
    remoteDatabaseId?: DatabaseId
  ): DatabaseInfo {
    return new DatabaseInfoImpl(databaseId, databaseLocation, remoteDatabaseId);
  }

  /**
   * Implementation of DatabaseInfo interface.
   */
  class DatabaseInfoImpl implements DatabaseInfo {
    private readonly _databaseId: DatabaseId;
    private readonly _databaseLocation: DatabaseLocation;
    private readonly _remoteDatabaseId: DatabaseId | undefined;

    /**
     * Creates a new DatabaseInfo implementation.
     */
    constructor(
      databaseId: DatabaseId,
      databaseLocation: DatabaseLocation,
      remoteDatabaseId: DatabaseId | undefined
    ) {
      this._databaseId = databaseId;
      this._databaseLocation = databaseLocation;
      this._remoteDatabaseId = remoteDatabaseId;
      this.validateRemoteDatabaseHasIdSet();
    }

    public databaseId(): DatabaseId {
      return this._databaseId;
    }

    public databaseLocation(): DatabaseLocation {
      return this._databaseLocation;
    }

    public remoteDatabaseId(): DatabaseId | undefined {
      return this._remoteDatabaseId;
    }

    /**
     * Validates that remote database ID is set correctly based on location.
     */
    private validateRemoteDatabaseHasIdSet(): void {
      if (this._databaseLocation === DatabaseLocation.REMOTE) {
        if (this._remoteDatabaseId === undefined) {
          throw new Error(
            "Remote database id must be set when database location is remote"
          );
        }
      } else {
        if (this._remoteDatabaseId !== undefined) {
          throw new Error(
            "Remote database id must not be set when database location is not remote"
          );
        }
      }
    }

    /**
     * Returns a string representation of this database info.
     */
    public toString(): string {
      return `DatabaseInfo{databaseId=${this._databaseId}, databaseLocation=${this._databaseLocation}, remoteDatabaseId=${this._remoteDatabaseId}}`;
    }

    /**
     * Compares this database info with another object for equality.
     */
    public equals(other: unknown): boolean {
      if (this === other) return true;
      if (!(other instanceof DatabaseInfoImpl)) return false;

      return (
        this._databaseId.equals(other._databaseId) &&
        this._databaseLocation === other._databaseLocation &&
        ((this._remoteDatabaseId === undefined &&
          other._remoteDatabaseId === undefined) ||
          (this._remoteDatabaseId !== undefined &&
            other._remoteDatabaseId !== undefined &&
            this._remoteDatabaseId.equals(other._remoteDatabaseId)))
      );
    }

    /**
     * Returns a hash code for this database info.
     */
    public hashCode(): number {
      let result = 17;
      result = 31 * result + this._databaseId.hashCode();
      result = 31 * result + this._databaseLocation.toString().hashCode();
      if (this._remoteDatabaseId !== undefined) {
        result = 31 * result + this._remoteDatabaseId.hashCode();
      }
      return result;
    }
  }
}
