import { JobId } from '../core/utils/progress/JobId'; // Adjust path as needed

/**
 * Represents memory usage associated with a user-defined entity (like a graph or task).
 * This is analogous to a Java record.
 */
export class UserEntityMemory {
  public readonly user: string;
  public readonly name: string;
  public readonly entity: string;
  public readonly memoryInBytes: number;

  /**
   * Creates an instance of UserEntityMemory.
   * @param user The user associated with the entity.
   * @param name The name of the entity.
   * @param entity The type or identifier of the entity (e.g., "graph", job ID string).
   * @param memoryInBytes The memory consumed by this entity in bytes.
   */
  constructor(user: string, name: string, entity: string, memoryInBytes: number) {
    this.user = user;
    this.name = name;
    this.entity = entity;
    this.memoryInBytes = memoryInBytes;
  }

  /**
   * Creates a UserEntityMemory record for a graph entity.
   * @param user The user who owns the graph.
   * @param name The name of the graph.
   * @param memoryInBytes The memory consumed by the graph.
   * @returns A new UserEntityMemory instance.
   */
  public static createGraph(user: string, name: string, memoryInBytes: number): UserEntityMemory {
    return new UserEntityMemory(user, name, "graph", memoryInBytes);
  }

  /**
   * Creates a UserEntityMemory record for a task entity.
   * @param user The user who initiated the task.
   * @param name The name or description of the task.
   * @param jobId The JobId of the task.
   * @param memoryInBytes The memory consumed by the task.
   * @returns A new UserEntityMemory instance.
   */
  public static createTask(user: string, name: string, jobId: JobId, memoryInBytes: number): UserEntityMemory {
    return new UserEntityMemory(user, name, jobId.asString(), memoryInBytes);
  }

  // Records in Java automatically get equals(), hashCode(), and toString().
  // For a TypeScript class, you'd implement these manually if needed.

  public equals(other: any): boolean {
    if (this === other) return true;
    if (other == null || !(other instanceof UserEntityMemory)) return false;
    return (
      this.user === other.user &&
      this.name === other.name &&
      this.entity === other.entity &&
      this.memoryInBytes === other.memoryInBytes
    );
  }

  public hashCode(): number {
    let result = 17;
    result = 31 * result + (this.user ? this.user.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0);
    result = 31 * result + (this.name ? this.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0);
    result = 31 * result + (this.entity ? this.entity.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0);
    result = 31 * result + Number(BigInt(this.memoryInBytes) % BigInt(2**32)); // Modulo for number part
    return result;
  }

  public toString(): string {
    return `UserEntityMemory(user=${this.user}, name=${this.name}, entity=${this.entity}, memoryInBytes=${this.memoryInBytes})`;
  }
}

// Example Usage:
// const graphMemory = UserEntityMemory.createGraph("Alice", "myGraph", 1024n * 1024n);
// const mockJobId: JobId = { asString: () => "job-123" }; // Assuming JobId has asString()
// const taskMemory = UserEntityMemory.createTask("Bob", "degree-centrality", mockJobId, 512n * 1024n);
//
// console.log(graphMemory.toString());
// console.log(taskMemory.toString());
