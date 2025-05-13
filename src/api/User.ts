import { randomUUID } from "crypto";

/**
 * Represents a user in the system with authentication information.
 */
export class User {
  /**
   * Default anonymous user instance.
   * Uses a random UUID to ensure uniqueness while remaining unidentifiable.
   */
  public static readonly DEFAULT: User = new User(
    `anonymous/${randomUUID()}`,
    false
  );

  private readonly username: string;
  private readonly _isAdmin: boolean;

  /**
   * Creates a new User instance.
   *
   * @param username The user's username
   * @param isAdmin Whether the user has admin privileges
   */
  constructor(username: string, isAdmin: boolean) {
    this.username = username;
    this._isAdmin = isAdmin;
  }

  /**
   * Gets the username.
   *
   * @returns The username
   */
  public getUsername(): string {
    return this.username;
  }

  /**
   * Checks if the user has admin privileges.
   *
   * @returns True if the user is an admin
   */
  public isAdmin(): boolean {
    return this._isAdmin;
  }

  /**
   * Take user input and determine whether it is a valid username override.
   *
   * @param username which might be null or blank
   * @returns a proper validated, trimmed username, or undefined
   */
  public static parseUsernameOverride(
    username: string | null | undefined
  ): string | undefined {
    if (username === null || username === undefined) return undefined;
    if (username.trim() === "") return undefined;

    return username.trim();
  }

  /**
   * Compares this user with another object for equality.
   *
   * @param obj Object to compare with
   * @returns True if objects are equal
   */
  public equals(obj: unknown): boolean {
    if (this === obj) return true;
    if (!(obj instanceof User)) return false;

    return this.username === obj.username && this.isAdmin === obj.isAdmin;
  }

  /**
   * Returns a hash code for this user.
   *
   * @returns Hash code
   */
  public hashCode(): number {
    let result = 17;
    result = 31 * result + this.username.hashCode();
    result = 31 * result + (this._isAdmin ? 1 : 0);
    return result;
  }

  /**
   * Returns a string representation of this user.
   *
   * @returns String representation (username)
   */
  public toString(): string {
    return this.username;
  }
}

// Add hashCode to String prototype if not exists
declare global {
  interface String {
    hashCode(): number;
  }
}

if (!String.prototype.hashCode) {
  String.prototype.hashCode = function (): number {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      hash = (hash << 5) - hash + this.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };
}
