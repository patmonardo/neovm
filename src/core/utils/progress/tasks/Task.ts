import { Concurrency } from '@/concurrency/Concurrency';
import { MemoryRange } from "@/mem/MemoryRange";
// --- Dependency Interfaces and Enums (define these or import if they exist elsewhere) ---

export enum Status {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  FINISHED = "FINISHED",
  CANCELED = "CANCELED",
  FAILED = "FAILED",
}

export interface Progress {
  volume(): number; // Using number for now, consider bigint if volumes can be very large
  progress(): number;
}

// A simple implementation for Progress, mirroring ImmutableProgress
class ImmutableProgressImpl implements Progress {
  private readonly _volume: number;
  private readonly _progress: number;

  constructor(volume: number, currentProgress: number) {
    this._volume = volume;
    this._progress = currentProgress;
  }

  volume(): number { return this._volume; }
  progress(): number { return this._progress; }

  static builder(): ImmutableProgressBuilder {
    return new ImmutableProgressBuilder();
  }
}

class ImmutableProgressBuilder {
  private _volume: number = 0;
  private _progress: number = 0;

  public volume(vol: number): ImmutableProgressBuilder {
    this._volume = vol;
    return this;
  }
  public progress(prog: number): ImmutableProgressBuilder {
    this._progress = prog;
    return this;
  }
  public build(): Progress { // Return the interface type
    return new ImmutableProgressImpl(this._volume, this._progress);
  }
}

export interface TaskVisitor {
  visitIntermediateTask(task: Task): void;
  // visitLeafTask(task: Task): void; // If differentiation is needed later
}

// Assuming Concurrency and MemoryRange are imported or defined elsewhere
// import { Concurrency } from '../../concurrency/Concurrency';
// import { MemoryRange } from '../../../../mem/MemoryRange';

// Mock ClockService for now, replace with actual implementation
const ClockService = {
  clock: () => ({
    millis: () => Date.now(),
  }),
};

// Mock StringFormatting for now
function formatWithLocale(formatString: string, ...args: any[]): string {
  let i = 0;
  return formatString.replace(/%s/g, () => args[i++] || '');
}

// --- Task Class ---

export class Task {
  public static readonly UNKNOWN_VOLUME = -1;
  public static readonly UNKNOWN_CONCURRENCY = -1;
  public static readonly NOT_STARTED = -1;
  public static readonly NOT_FINISHED = -1;

  private readonly _description: string;
  private readonly _subTasks: Task[]; // In Java, List<Task> is final, meaning the reference.
                                     // If subTasks can be modified, remove readonly.
                                     // Assuming it's set at construction and not changed.
  private _status: Status;
  private _startTime: number;
  private _finishTime: number;

  private _estimatedMemoryRangeInBytes: MemoryRange; // Assuming MemoryRange is defined
  private _maxConcurrency: number = Task.UNKNOWN_CONCURRENCY;

  constructor(description: string, subTasks: Task[] = []) { // Default to empty array for subTasks
    this._description = description;
    this._subTasks = subTasks;
    this._status = Status.PENDING;
    this._startTime = Task.NOT_STARTED;
    this._finishTime = Task.NOT_FINISHED;
    this._estimatedMemoryRangeInBytes = MemoryRange.empty(); // Assuming MemoryRange.empty() exists
  }

  public description(): string {
    return this._description;
  }

  public subTasks(): Task[] {
    return this._subTasks;
  }

  public status(): Status {
    return this._status;
  }

  public nextSubtask(): Task {
    this.validateTaskIsRunning();
    return this.nextSubTaskAfterValidation();
  }

  public start(): void {
    if (this._status !== Status.PENDING) {
      throw new Error( // Changed to standard Error
        formatWithLocale(
          "Task `%s` with state %s cannot be started",
          this._description,
          this._status
        )
      );
    }
    this._status = Status.RUNNING;
    this._startTime = ClockService.clock().millis();
  }

  public finish(): void {
    if (this._status !== Status.RUNNING) {
      throw new Error(
        formatWithLocale(
          "Task `%s` with state %s cannot be finished",
          this._description,
          this._status
        )
      );
    }
    this._status = Status.FINISHED;
    this._finishTime = ClockService.clock().millis();
  }

  public cancel(): void {
    if (this._status === Status.FINISHED) {
      throw new Error(
        formatWithLocale(
          "Task `%s` with state %s cannot be canceled",
          this._description,
          this._status
        )
      );
    }
    this._status = Status.CANCELED;
  }

  public getProgress(): Progress {
    let totalVolume: number = 0;
    let totalProgress: number = 0;
    let volumeIsUnknown = false;

    if (this._subTasks.length === 0) {
        // For leaf tasks, progress might be handled differently or this method shouldn't be called.
        // The Java version implies setVolume/logProgress are for leaves.
        // This getProgress seems to aggregate from children.
        // If it's a leaf and getProgress is called, what should it return?
        // For now, let's assume it returns its own progress if it were a "countable" leaf.
        // However, the Java code's getProgress always iterates subTasks.
        // If a leaf task (no subTasks) calls this, it will return 0 volume, 0 progress.
        // This matches the Java logic if subTasks is empty.
    }


    for (const subTask of this.subTasks()) {
      const childProgress = subTask.getProgress();
      const childVolume = childProgress.volume();

      if (childVolume === Task.UNKNOWN_VOLUME || volumeIsUnknown) {
        totalVolume = Task.UNKNOWN_VOLUME;
        volumeIsUnknown = true;
      } else if (totalVolume !== Task.UNKNOWN_VOLUME) {
        totalVolume += childVolume;
      }

      totalProgress += childProgress.progress();
    }

    return ImmutableProgressImpl.builder()
      .volume(totalVolume)
      .progress(totalProgress)
      .build();
  }

  public setVolume(_volume: number): void { // Parameter name changed to avoid conflict
    throw new Error(
      formatWithLocale(
        "Should only be called on a leaf task, but task `%s` is not a leaf",
        this._description
      )
    );
  }

  public logProgress(): void;
  public logProgress(value: number): void;
  public logProgress(_value?: number): void { // Parameter name changed
    throw new Error(
      formatWithLocale(
        "Should only be called on a leaf task, but task `%s` is not a leaf",
        this._description
      )
    );
  }

  public visit(taskVisitor: TaskVisitor): void {
    // In Java, this calls visitIntermediateTask. If there's a distinction
    // for leaf tasks, the visitor pattern would be more complex.
    taskVisitor.visitIntermediateTask(this);
  }

  public startTime(): number {
    return this._startTime;
  }

  public finishTime(): number {
    return this._finishTime;
  }

  public hasNotStarted(): boolean {
    return this.status() === Status.PENDING || this.startTime() === Task.NOT_STARTED;
  }

  public estimatedMemoryRangeInBytes(): MemoryRange {
    return this._estimatedMemoryRangeInBytes;
  }

  public maxConcurrency(): number {
    return this._maxConcurrency;
  }

  public setMaxConcurrency(maxConcurrency: Concurrency): void { // Assuming Concurrency has a .value()
    this._maxConcurrency = maxConcurrency.value();
    this._subTasks.forEach(task => {
      if (task.maxConcurrency() === Task.UNKNOWN_CONCURRENCY) {
        task.setMaxConcurrency(maxConcurrency);
      }
    });
  }

  public setEstimatedMemoryRangeInBytes(memoryRangeInBytes: MemoryRange): void {
    this._estimatedMemoryRangeInBytes = memoryRangeInBytes;
  }

  public fail(): void {
    this._status = Status.FAILED;
  }

  protected nextSubTaskAfterValidation(): Task {
    if (this._subTasks.some(t => t.status() === Status.RUNNING)) {
      throw new Error("Cannot move to next subtask, because some subtasks are still running");
    }

    const pendingTask = this._subTasks.find(t => t.status() === Status.PENDING);
    if (!pendingTask) {
      throw new Error("No more pending subtasks");
    }
    return pendingTask;
  }

  private validateTaskIsRunning(): void {
    if (this._status !== Status.RUNNING) {
      throw new Error(formatWithLocale("Cannot retrieve next subtask, task `%s` is not running.", this.description()));
    }
  }

  public render(): string {
    const sb: string[] = [];
    Task.renderRecursive(sb, this, 0);
    return sb.join('');
  }

  // Made static and renamed to avoid conflict with instance method if ever needed.
  private static renderRecursive(sb: string[], task: Task, depth: number): void {
    sb.push("\t".repeat(Math.max(0, depth - 1)));

    if (depth > 0) {
      sb.push("|-- ");
    }

    sb.push(task.description());
    sb.push('(');
    sb.push(task.status());
    sb.push(')');
    sb.push("\n"); // Using \n, System.lineSeparator() is Java specific

    task.subTasks().forEach(subtask => Task.renderRecursive(sb, subtask, depth + 1));
  }
}
