import { TaskVisitor } from './TaskVisitor';
import { Task } from './Task';
import { LeafTask } from './LeafTask';
import { IterativeTask } from './IterativeTask';

/**
 * Abstract visitor that tracks traversal depth in task hierarchy.
 * Useful for indented rendering, depth-limited operations, etc.
 */
export abstract class DepthAwareTaskVisitor implements TaskVisitor {
  private _depth: number = 0;

  /**
   * Set current depth (package-private equivalent).
   */
  public setDepth(depth: number): void {
    this._depth = depth;
  }

  /**
   * Get current traversal depth.
   */
  public depth(): number {
    return this._depth;
  }

  // TaskVisitor implementation - subclasses can override specific methods
  public visitLeafTask?(leafTask: LeafTask): void;
  public visitIntermediateTask?(task: Task): void;
  public visitIterativeTask?(iterativeTask: IterativeTask): void;
  public visit?(task: Task): void;
}
