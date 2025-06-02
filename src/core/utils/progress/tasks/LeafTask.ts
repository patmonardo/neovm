import { AtomicNumber } from "@/concurrency";
import { Task } from "./Task";
import { TaskVisitor } from "./TaskVisitor";
import { Progress } from "./Progress";

/**
 * Leaf task implementation - terminal node in task hierarchy.
 * Tracks progress with atomic operations and handles volume updates.
 */
export class LeafTask extends Task {
  private volume: number;
  private readonly currentProgress: AtomicNumber;

  constructor(description: string, volume: number) {
    super(description, []); // No subtasks for leaf nodes
    this.volume = volume;
    this.currentProgress = new AtomicNumber(0);
  }

  public finish(): void {
    super.finish();

    // This task should now be considered to have 100% progress.
    if (this.volume === Task.UNKNOWN_VOLUME) {
      this.volume = this.currentProgress.get();
    }

    // Set progress to 100% of volume
    const remaining = this.volume - this.currentProgress.get();
    this.currentProgress.addAndGet(remaining);
  }

  public setVolume(volume: number): void {
    this.volume = volume;
  }

  public logProgress(value: number): void {
    this.currentProgress.addAndGet(value);
  }

  public getProgress(): Progress {
    return Progress.of(this.currentProgress.get(), this.volume);
  }

  public visit(taskVisitor: TaskVisitor): void {
    if (taskVisitor.visitLeafTask) {
      taskVisitor.visitLeafTask(this);
    }
  }

  /**
   * Get current progress value.
   */
  public getCurrentProgressValue(): number {
    return this.currentProgress.get();
  }

  /**
   * Get task volume.
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * Reset progress to zero.
   */
  public resetProgress(): void {
    this.currentProgress.set(0);
  }

  /**
   * Check if task has unknown volume.
   */
  public hasUnknownVolume(): boolean {
    return this.volume === Task.UNKNOWN_VOLUME;
  }
}
