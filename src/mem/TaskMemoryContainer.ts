import { JobId } from "@/core/utils/progress/JobId";
import { UserTask } from "@/core/utils/progress/UserTask";
import { UserEntityMemory } from "./UserEntityMemory";

interface TaskInfo {
  taskName: string;
  memoryAmount: number;
}

// In JavaScript, standard Maps use reference equality for object keys.
// If JobId instances are meant to be keyed by value, using their string representation is safer.
type JobIdString = string;

export class TaskMemoryContainer {
  // Simulating ConcurrentHashMap with standard Map.
  // Concurrency in JS is typically handled via event loop for I/O, or Web Workers for CPU-bound tasks.
  // Direct multi-threading access to shared memory like in Java is not the default model.
  // This translation assumes operations are effectively serialized or concurrency is managed externally.
  private readonly memoryInUse = new Map<string, Map<JobIdString, TaskInfo>>();
  private allocatedMemory: number = 0;

  private static readonly EMPTY_INNER_MAP = new Map<JobIdString, TaskInfo>();

  public reserve(
    username: string,
    taskName: string,
    jobId: JobId,
    memoryAmount: number
  ): void {
    if (!this.memoryInUse.has(username)) {
      this.memoryInUse.set(username, new Map<JobIdString, TaskInfo>());
    }
    const userTasks = this.memoryInUse.get(username)!;
    userTasks.set(jobId.asString(), { taskName, memoryAmount });

    this.allocatedMemory += memoryAmount;
  }

  /**
   * Removes a task and updates the allocated memory.
   * @param task The UserTask to remove.
   * @returns The memory amount of the removed task if found.
   *          **Note:** The original Java code returns the *total* allocated memory
   *          if the task is not found, which is unconventional. This translation
   *          mimics that behavior but it might be worth revisiting this logic.
   *          A more typical return would be 0n or undefined if not found.
   */
  public removeTask(task: UserTask): number {
    const userTasks = this.memoryInUse.get(task.username());
    if (userTasks) {
      const jobKey = task.jobId().asString();
      const memPair = userTasks.get(jobKey);
      if (memPair) {
        userTasks.delete(jobKey);
        const mem = memPair.memoryAmount;
        this.allocatedMemory -= mem;
        if (userTasks.size === 0) {
          this.memoryInUse.delete(task.username());
        }
        return mem;
      }
    }
    // Original Java logic: returns total allocated memory if task not found.
    return this.allocatedMemory;
  }

  public taskReservedMemory(): number {
    return this.allocatedMemory;
  }

  public listTasks(user: string): UserEntityMemory[] {
    const userTasksMap =
      this.memoryInUse.get(user) || TaskMemoryContainer.EMPTY_INNER_MAP;
    const result: UserEntityMemory[] = [];
    for (const [jobIdStr, taskInfo] of userTasksMap.entries()) {
      // Assuming JobId can be reconstructed or is not strictly needed beyond its string form for UserEntityMemory.
      // If the original JobId object is needed, it would have to be stored or passed differently.
      // For UserEntityMemory.createTask, it expects a JobId object.
      // This part needs clarification on how to get a JobId object from jobIdStr if required by UserEntityMemory.
      // For now, let's assume UserEntityMemory.createTask can handle a string or we mock a JobId.
      const mockJobId: JobId = {
        asString: () => jobIdStr /* other JobId methods/props */,
      } as JobId; // Placeholder
      result.push(
        UserEntityMemory.createTask(
          user,
          taskInfo.taskName,
          mockJobId,
          taskInfo.memoryAmount
        )
      );
    }
    return result;
  }

  public listAllTasks(): UserEntityMemory[] {
    const allTasks: UserEntityMemory[] = [];
    for (const user of this.memoryInUse.keys()) {
      allTasks.push(...this.listTasks(user));
    }
    return allTasks;
  }

  public memoryOfTasks(user: string): number {
    const userTasksMap =
      this.memoryInUse.get(user) || TaskMemoryContainer.EMPTY_INNER_MAP;
    let sum = 0n;
    for (const taskInfo of userTasksMap.values()) {
      sum += BigInt(taskInfo.memoryAmount);
    }
    return Number(sum);
  }

  public getTaskUsers(inputUsers?: Set<string>): Set<string> {
    const users = inputUsers ?? new Set<string>();
    for (const userKey of this.memoryInUse.keys()) {
      users.add(userKey);
    }
    return users;
  }
}
