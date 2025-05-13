/**
 * Represents a summary of memory usage for a specific user,
 * detailing memory consumed by graphs and tasks.
 * This is analogous to a Java record.
 */
export class UserMemorySummary {
  public readonly user: string;
  public readonly totalGraphsMemory: number;
  public readonly totalTasksMemory: number;

  /**
   * Creates an instance of UserMemorySummary.
   * @param user The user for whom this summary applies.
   * @param totalGraphsMemory The total memory consumed by graphs for this user, in bytes.
   * @param totalTasksMemory The total memory consumed by tasks for this user, in bytes.
   */
  constructor(
    user: string,
    totalGraphsMemory: number,
    totalTasksMemory: number
  ) {
    this.user = user;
    this.totalGraphsMemory = totalGraphsMemory;
    this.totalTasksMemory = totalTasksMemory;
  }

  // Records in Java automatically get equals(), hashCode(), and toString().
  // For a TypeScript class, you'd implement these manually if needed.

  public equals(other: any): boolean {
    if (this === other) return true;
    if (other == null || !(other instanceof UserMemorySummary)) return false;
    return (
      this.user === other.user &&
      this.totalGraphsMemory === other.totalGraphsMemory &&
      this.totalTasksMemory === other.totalTasksMemory
    );
  }

  public hashCode(): number {
    let result = 17;
    result =
      31 * result +
      (this.user
        ? this.user.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
        : 0);
    result =
      31 * result + Number(BigInt(this.totalGraphsMemory) % BigInt(2 ** 32));
    result =
      31 * result + Number(BigInt(this.totalTasksMemory) % BigInt(2 ** 32));
    return result;
  }

  public toString(): string {
    return `UserMemorySummary(user=${this.user}, totalGraphsMemory=${this.totalGraphsMemory}, totalTasksMemory=${this.totalTasksMemory})`;
  }
}

// Example Usage:
// const summary = new UserMemorySummary("Alice", 2048n * 1024n, 1024n * 512n);
// console.log(summary.toString());
// console.log(`Alice's graph memory: ${summary.totalGraphsMemory}`);
