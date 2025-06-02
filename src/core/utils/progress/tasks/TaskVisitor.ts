import { Task } from './Task';
import { LeafTask } from './LeafTask';
import { IterativeTask } from './IterativeTask';

/**
 * Visitor pattern interface for traversing task hierarchies.
 * Provides specialized visit methods for different task types.
 */
export interface TaskVisitor {
  /**
   * Visit a leaf task (terminal node in task tree).
   */
  visitLeafTask?(leafTask: LeafTask): void;

  /**
   * Visit an intermediate task (has children).
   */
  visitIntermediateTask?(task: Task): void;

  /**
   * Visit an iterative task (repeating operation).
   */
  visitIterativeTask?(iterativeTask: IterativeTask): void;

  /**
   * Generic visit method - fallback for all task types.
   */
  visit?(task: Task): void;
}

/**
 * Abstract base class providing default visitor implementations.
 * Implements the default behavior where specific visit methods fall back to generic visit.
 */
export abstract class AbstractTaskVisitor implements TaskVisitor {
  public visitLeafTask(leafTask: LeafTask): void {
    this.visit(leafTask);
  }

  public visitIntermediateTask(task: Task): void {
    this.visit(task);
  }

  public visitIterativeTask(iterativeTask: IterativeTask): void {
    this.visit(iterativeTask);
  }

  public visit(task: Task): void {
    // Default implementation - can be overridden
  }
}
