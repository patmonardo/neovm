/**
 * Represents a username in the system
 */
export class Username {
  /**
   * The empty username singleton instance
   */
  public static readonly EMPTY_USERNAME: Username = new Username("");

  /**
   * The actual username value
   */
  private readonly usernameValue: string;

  /**
   * Creates a new Username instance with the given value
   * Used primarily for testing
   */
  public static of(username: string): Username {
    return new Username(username);
  }

  /**
   * Creates a new Username instance
   * @param username The username string value
   */
  constructor(username: string) {
    this.usernameValue = username;
  }

  /**
   * Returns the username as a string
   */
  public username(): string {
    return this.usernameValue;
  }

  /**
   * String representation of this object
   */
  public toString(): string {
    return this.usernameValue;
  }
}
