/**
 * DatabaseId represents a unique identifier for a database.
 * This is a "microtype" that adds semantic meaning and behavior to a simple string.
 */
export class DatabaseId {
  /**
   * Default database ID that doesn't exist in real systems.
   */
  public static readonly DEFAULT: DatabaseId = DatabaseId.of(`non-existent/${crypto.randomUUID()}`);
  
  /**
   * Empty database ID.
   */
  public static readonly EMPTY: DatabaseId = new DatabaseId("");

  /**
   * Creates a DatabaseId from a string name.
   * 
   * @param databaseName The database name
   * @returns A new DatabaseId
   */
  public static of(databaseName: string): DatabaseId {
    return new DatabaseId(DatabaseId.normalizeDatabaseName(databaseName));
  }

  /**
   * Creates a random DatabaseId.
   * 
   * @returns A new random DatabaseId
   */
  public static random(): DatabaseId {
    return this.of(DatabaseId.normalizeDatabaseName(crypto.randomUUID()));
  }

  /**
   * Normalizes a database name by ensuring it's not null and converting to lowercase.
   * 
   * @param databaseName Database name to normalize
   * @returns Normalized database name
   */
  private static normalizeDatabaseName(databaseName: string): string {
    if (databaseName === null || databaseName === undefined) {
      throw new Error("Database name should be not null.");
    }
    return databaseName.toLowerCase();
  }

  /**
   * The normalized database name.
   */
  private readonly _databaseName: string;

  /**
   * Creates a new DatabaseId.
   * Use static factory methods instead of constructor directly.
   * 
   * @param databaseName The normalized database name
   */
  private constructor(databaseName: string) {
    this._databaseName = databaseName;
  }

  /**
   * Returns the database name.
   * 
   * @returns The database name
   */
  public databaseName(): string {
    return this._databaseName;
  }

  /**
   * Compares this database ID with another object for equality.
   * 
   * @param another Object to compare with
   * @returns true if objects are equal
   */
  public equals(another: unknown): boolean {
    if (this === another) return true;
    return another instanceof DatabaseId && this.equalTo(another);
  }

  /**
   * Compares this database ID with another DatabaseId.
   * 
   * @param another DatabaseId to compare with
   * @returns true if database IDs are equal
   */
  private equalTo(another: DatabaseId): boolean {
    return this.databaseName === another.databaseName;
  }

  /**
   * Returns a hash code for this database ID.
   * 
   * @returns Hash code
   */
  public hashCode(): number {
    let h = 5381;
    h += (h << 5) + this.stringHashCode(this._databaseName);
    return h;
  }

  /**
   * Returns a simple hash code for a string.
   * 
   * @param str String to hash
   * @returns Hash code
   */
  private stringHashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Returns a string representation of this database ID.
   * 
   * @returns String representation
   */
  public toString(): string {
    return `DatabaseId{databaseName=${this.databaseName}}`;
  }

  /**
   * Microtypes ftw! They sit there and attract behaviour.
   * Like this behaviour: you have the current database as an incoming parameter (this object),
   * but optionally you override it with this new name - but only if it is null or blank.
   * 
   * @param optionalDatabaseName Optional database name override
   * @returns This database ID or the override if appropriate
   */
  public orOverride(optionalDatabaseName: string | null | undefined): DatabaseId {
    if (optionalDatabaseName === null || optionalDatabaseName === undefined) return this;

    const trimmedDatabaseName = optionalDatabaseName.trim();
    if (trimmedDatabaseName === '') return this;

    return DatabaseId.of(trimmedDatabaseName);
  }
}