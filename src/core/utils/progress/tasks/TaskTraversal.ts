import { Task } from './Task';
import { DepthAwareTaskVisitor } from './DepthAwareTaskVisitor';

/**
 * Utility class for traversing task hierarchies with depth awareness.
 * Provides pre-order traversal with depth tracking for visitors.
 */
export class TaskTraversal {

  /**
   * Private constructor - this is a utility class with static methods only.
   */
  private constructor() {}

  /**
   * Traverses task hierarchy in pre-order (parent before children) with depth tracking.
   * Starts traversal at depth 0 for the root task.
   *
   * @param task The root task to start traversal from
   * @param visitor The depth-aware visitor to apply at each node
   */
  public static visitPreOrderWithDepth(task: Task, visitor: DepthAwareTaskVisitor): void {
    TaskTraversal.visitPreOrderWithDepthInternal(task, visitor, 0);
  }

  /**
   * Internal recursive implementation of pre-order traversal with depth.
   *
   * @param task Current task being visited
   * @param visitor The visitor to apply
   * @param depth Current depth in the hierarchy (0 = root)
   */
  private static visitPreOrderWithDepthInternal(
    task: Task,
    visitor: DepthAwareTaskVisitor,
    depth: number
  ): void {
    // Set depth on visitor before visiting
    visitor.setDepth(depth);

    // Visit current task (delegates to appropriate visit method based on task type)
    task.visit(visitor);

    // Recursively visit all subtasks at increased depth
    task.getSubTasks().forEach(subTask =>
      TaskTraversal.visitPreOrderWithDepthInternal(subTask, visitor, depth + 1)
    );
  }
}
