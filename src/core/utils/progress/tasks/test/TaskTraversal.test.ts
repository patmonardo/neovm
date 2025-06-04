import { TaskTraversal } from '@/core/utils/progress/tasks/TaskTraversal';
import { DepthAwareTaskVisitor } from '@/core/utils/progress/tasks/DepthAwareTaskVisitor';
import { AbstractTaskVisitor } from '@/core/utils/progress/tasks/TaskVisitor';
import { Task } from '@/core/utils/progress/tasks/Task';
import { LeafTask } from '@/core/utils/progress/tasks/LeafTask';
import { IterativeTask, IterativeTaskMode } from '@/core/utils/progress/tasks/IterativeTask';

describe('TaskTraversal and Visitor Patterns', () => {
  let rootTask: Task;
  let childTask1: Task;
  let childTask2: Task;
  let grandchildTask: Task;
  let leafTask: LeafTask;
  let iterativeTask: IterativeTask;

  beforeEach(() => {
    // Build complex hierarchy for testing
    grandchildTask = new Task('Grandchild Task');
    leafTask = new LeafTask('Leaf Task', 100);
    childTask1 = new Task('Child Task 1', [grandchildTask, leafTask]);

    const iterativeSubtasks = [
      new LeafTask('Iter Sub 1', 50),
      new LeafTask('Iter Sub 2', 50)
    ];
    iterativeTask = new IterativeTask(
      'Iterative Task',
      iterativeSubtasks,
      () => [new LeafTask('Dynamic Sub', 25)],
      IterativeTaskMode.FIXED
    );

    childTask2 = new Task('Child Task 2', [iterativeTask]);
    rootTask = new Task('Root Task', [childTask1, childTask2]);
  });

  describe('TaskTraversal Core Functionality', () => {
    it('traverses hierarchy in pre-order with correct depth', () => {
      const visitLog: Array<{ description: string; depth: number }> = [];

      class TestVisitor extends DepthAwareTaskVisitor {
        visit(task: Task): void {
          visitLog.push({
            description: task.getDescription(),
            depth: this.depth()
          });
        }
      }

      const visitor = new TestVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      // Verify pre-order traversal (parent before children)
      expect(visitLog).toEqual([
        { description: 'Root Task', depth: 0 },
        { description: 'Child Task 1', depth: 1 },
        { description: 'Grandchild Task', depth: 2 },
        { description: 'Leaf Task', depth: 2 },
        { description: 'Child Task 2', depth: 1 },
        { description: 'Iterative Task', depth: 2 },
        { description: 'Iter Sub 1', depth: 3 },
        { description: 'Iter Sub 2', depth: 3 }
      ]);
    });

    it('sets depth correctly on visitor before each visit', () => {
      let depthAtVisit: number | null = null;
      let callCount = 0;

      class DepthCheckingVisitor extends DepthAwareTaskVisitor {
        visit(task: Task): void {
          callCount++;
          if (task.getDescription() === 'Grandchild Task') {
            depthAtVisit = this.depth();
          }
        }
      }

      const visitor = new DepthCheckingVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      expect(depthAtVisit).toBe(2); // Grandchild is at depth 2
      expect(callCount).toBe(8); // Total nodes visited
    });

    it('handles single task correctly', () => {
      const visitLog: string[] = [];

      class SingleTaskVisitor extends DepthAwareTaskVisitor {
        visit(task: Task): void {
          visitLog.push(`${task.getDescription()}@${this.depth()}`);
        }
      }

      const singleTask = new Task('Lonely Task');
      const visitor = new SingleTaskVisitor();

      TaskTraversal.visitPreOrderWithDepth(singleTask, visitor);

      expect(visitLog).toEqual(['Lonely Task@0']);
    });

    it('handles empty task hierarchy', () => {
      const visitLog: string[] = [];

      class EmptyHierarchyVisitor extends DepthAwareTaskVisitor {
        visit(task: Task): void {
          visitLog.push(`${task.getDescription()}@${this.depth()}`);
        }
      }

      const emptyTask = new Task('Empty Task', []);
      const visitor = new EmptyHierarchyVisitor();

      TaskTraversal.visitPreOrderWithDepth(emptyTask, visitor);

      expect(visitLog).toEqual(['Empty Task@0']);
    });
  });

  describe('DepthAwareTaskVisitor Functionality', () => {
    it('tracks depth correctly throughout traversal', () => {
      const depthHistory: number[] = [];

      class DepthTrackingVisitor extends DepthAwareTaskVisitor {
        visit(task: Task): void {
          depthHistory.push(this.depth());
        }
      }

      const visitor = new DepthTrackingVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      expect(depthHistory).toEqual([0, 1, 2, 2, 1, 2, 3, 3]);
    });

    it('provides depth access throughout visitor execution', () => {
      let maxDepthSeen = -1;
      let currentDepth = -1;

      class DepthAccessVisitor extends DepthAwareTaskVisitor {
        visit(task: Task): void {
          currentDepth = this.depth();
          maxDepthSeen = Math.max(maxDepthSeen, currentDepth);

          // Verify depth() method works consistently
          expect(this.depth()).toBe(currentDepth);
        }
      }

      const visitor = new DepthAccessVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      expect(maxDepthSeen).toBe(3);
      expect(currentDepth).toBe(3); // Last visited node depth
    });

    it('allows depth-based conditional logic', () => {
      const deepTasks: string[] = [];
      const shallowTasks: string[] = [];

      class ConditionalVisitor extends DepthAwareTaskVisitor {
        visit(task: Task): void {
          if (this.depth() >= 2) {
            deepTasks.push(task.getDescription());
          } else {
            shallowTasks.push(task.getDescription());
          }
        }
      }

      const visitor = new ConditionalVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      expect(shallowTasks).toEqual(['Root Task', 'Child Task 1', 'Child Task 2']);
      expect(deepTasks).toEqual(['Grandchild Task', 'Leaf Task', 'Iterative Task', 'Iter Sub 1', 'Iter Sub 2']);
    });
  });

  describe('Type-Specific Visitor Methods', () => {
    it('calls appropriate visit methods for different task types', () => {
      const visitCalls: Array<{ type: string; description: string; depth: number }> = [];

      class TypeTrackingVisitor extends DepthAwareTaskVisitor {
        visitLeafTask(leafTask: LeafTask): void {
          visitCalls.push({
            type: 'leaf',
            description: leafTask.getDescription(),
            depth: this.depth()
          });
        }

        visitIntermediateTask(task: Task): void {
          visitCalls.push({
            type: 'intermediate',
            description: task.getDescription(),
            depth: this.depth()
          });
        }

        visitIterativeTask(iterativeTask: IterativeTask): void {
          visitCalls.push({
            type: 'iterative',
            description: iterativeTask.getDescription(),
            depth: this.depth()
          });
        }
      }

      const visitor = new TypeTrackingVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      // Verify correct visitor methods called
      const leafCalls = visitCalls.filter(call => call.type === 'leaf');
      const intermediateCalls = visitCalls.filter(call => call.type === 'intermediate');
      const iterativeCalls = visitCalls.filter(call => call.type === 'iterative');

      expect(leafCalls).toHaveLength(3); // Leaf Task, Iter Sub 1, Iter Sub 2
      expect(intermediateCalls).toHaveLength(4); // Root, Child 1, Grandchild, Child 2
      expect(iterativeCalls).toHaveLength(1); // Iterative Task
    });

    it('falls back to generic visit method when specific methods not implemented', () => {
      const genericVisitCalls: string[] = [];

      class GenericFallbackVisitor extends DepthAwareTaskVisitor {
        visit(task: Task): void {
          genericVisitCalls.push(task.getDescription());
        }
      }

      const visitor = new GenericFallbackVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      expect(genericVisitCalls).toHaveLength(8); // All tasks visited via generic method
      expect(genericVisitCalls).toContain('Root Task');
      expect(genericVisitCalls).toContain('Leaf Task');
      expect(genericVisitCalls).toContain('Iterative Task');
    });
  });

  describe('Real-World Visitor Scenarios', () => {
    it('implements tree rendering visitor', () => {
      class TreeRenderingVisitor extends DepthAwareTaskVisitor {
        private output: string[] = [];

        visit(task: Task): void {
          const indent = '  '.repeat(this.depth());
          const prefix = this.depth() === 0 ? '' : '|-- ';
          this.output.push(`${indent}${prefix}${task.getDescription()}`);
        }

        getOutput(): string {
          return this.output.join('\n');
        }
      }

      const visitor = new TreeRenderingVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      const rendered = visitor.getOutput();
      expect(rendered).toContain('Root Task');
      expect(rendered).toContain('  |-- Child Task 1');
      expect(rendered).toContain('    |-- Grandchild Task');
      expect(rendered).toContain('    |-- Leaf Task');
      expect(rendered).toContain('  |-- Child Task 2');
      expect(rendered).toContain('    |-- Iterative Task');
    });

    it('implements task counting visitor', () => {
      class TaskCountingVisitor extends DepthAwareTaskVisitor {
        private counts = {
          total: 0,
          byDepth: new Map<number, number>(),
          byType: { leaf: 0, intermediate: 0, iterative: 0 }
        };

        visitLeafTask(leafTask: LeafTask): void {
          this.counts.total++;
          this.counts.byType.leaf++;
          this.incrementDepthCount();
        }

        visitIntermediateTask(task: Task): void {
          this.counts.total++;
          this.counts.byType.intermediate++;
          this.incrementDepthCount();
        }

        visitIterativeTask(iterativeTask: IterativeTask): void {
          this.counts.total++;
          this.counts.byType.iterative++;
          this.incrementDepthCount();
        }

        private incrementDepthCount(): void {
          const currentCount = this.counts.byDepth.get(this.depth()) || 0;
          this.counts.byDepth.set(this.depth(), currentCount + 1);
        }

        getCounts() {
          return this.counts;
        }
      }

      const visitor = new TaskCountingVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      const counts = visitor.getCounts();
      expect(counts.total).toBe(8);
      expect(counts.byType.leaf).toBe(3);
      expect(counts.byType.intermediate).toBe(4);
      expect(counts.byType.iterative).toBe(1);
      expect(counts.byDepth.get(0)).toBe(1); // Root
      expect(counts.byDepth.get(1)).toBe(2); // Child 1, Child 2
      expect(counts.byDepth.get(2)).toBe(3); // Grandchild, Leaf, Iterative
      expect(counts.byDepth.get(3)).toBe(2); // Iter Sub 1, Iter Sub 2
    });

    it('implements depth-limited visitor', () => {
      const visitedTasks: string[] = [];

      class DepthLimitedVisitor extends DepthAwareTaskVisitor {
        constructor(private maxDepth: number) {
          super();
        }

        visit(task: Task): void {
          if (this.depth() <= this.maxDepth) {
            visitedTasks.push(task.getDescription());
          }
        }
      }

      const visitor = new DepthLimitedVisitor(1);
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      expect(visitedTasks).toEqual(['Root Task', 'Child Task 1', 'Child Task 2']);
      expect(visitedTasks).not.toContain('Grandchild Task');
      expect(visitedTasks).not.toContain('Leaf Task');
    });

    it('implements progress aggregation visitor', () => {
      class ProgressAggregationVisitor extends DepthAwareTaskVisitor {
        private progressByDepth = new Map<number, number>();

        visitLeafTask(leafTask: LeafTask): void {
          const progress = leafTask.getProgress();
          const currentDepthProgress = this.progressByDepth.get(this.depth()) || 0;
          this.progressByDepth.set(this.depth(), currentDepthProgress + progress.getCurrentProgress());
        }

        getProgressByDepth(): Map<number, number> {
          return this.progressByDepth;
        }

        getTotalProgress(): number {
          return Array.from(this.progressByDepth.values()).reduce((sum, progress) => sum + progress, 0);
        }
      }

      // Set some progress on leaf tasks
      leafTask.start();
      leafTask.logProgress(50);

      const iterSubtasks = iterativeTask.getSubTasks() as LeafTask[];
      iterSubtasks[0].start();
      iterSubtasks[0].logProgress(25);

      const visitor = new ProgressAggregationVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      const progressByDepth = visitor.getProgressByDepth();
      expect(progressByDepth.get(2)).toBe(50); // Leaf Task at depth 2
      expect(progressByDepth.get(3)).toBe(25); // Iter Sub 1 at depth 3
      expect(visitor.getTotalProgress()).toBe(75);
    });
  });

  describe('AbstractTaskVisitor Base Class', () => {
    it('provides default fallback implementation', () => {
      const visitCalls: string[] = [];

      class TestAbstractVisitor extends AbstractTaskVisitor {
        visit(task: Task): void {
          visitCalls.push(`visited: ${task.getDescription()}`);
        }
      }

      const visitor = new TestAbstractVisitor();

      // Test that specific methods fall back to generic visit
      const testTask = new Task('Test Task');
      const testLeafTask = new LeafTask('Test Leaf', 100);

      visitor.visitIntermediateTask(testTask);
      visitor.visitLeafTask(testLeafTask);

      expect(visitCalls).toEqual([
        'visited: Test Task',
        'visited: Test Leaf'
      ]);
    });

    it('allows selective override of visit methods', () => {
      const calls: Array<{ method: string; task: string }> = [];

      class SelectiveVisitor extends AbstractTaskVisitor {
        visitLeafTask(leafTask: LeafTask): void {
          calls.push({ method: 'leaf', task: leafTask.getDescription() });
        }

        visit(task: Task): void {
          calls.push({ method: 'generic', task: task.getDescription() });
        }
      }

      const visitor = new SelectiveVisitor();
      const intermediateTask = new Task('Intermediate');
      const leafTask = new LeafTask('Leaf', 100);

      visitor.visitIntermediateTask(intermediateTask); // Falls back to generic
      visitor.visitLeafTask(leafTask); // Uses specific implementation

      expect(calls).toEqual([
        { method: 'generic', task: 'Intermediate' },
        { method: 'leaf', task: 'Leaf' }
      ]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles deeply nested hierarchies', () => {
      // Create deep nesting
      let deepTask = new Task('Deep Level 10');
      for (let i = 9; i >= 0; i--) {
        deepTask = new Task(`Deep Level ${i}`, [deepTask]);
      }

      const maxDepthSeen = { value: -1 };

      class DeepNestingVisitor extends DepthAwareTaskVisitor {
        visit(task: Task): void {
          maxDepthSeen.value = Math.max(maxDepthSeen.value, this.depth());
        }
      }

      const visitor = new DeepNestingVisitor();
      TaskTraversal.visitPreOrderWithDepth(deepTask, visitor);

      expect(maxDepthSeen.value).toBe(10);
    });

    it('handles visitor state preservation across calls', () => {
      class StatefulVisitor extends DepthAwareTaskVisitor {
        private visitOrder: Array<{ task: string; depth: number }> = [];

        visit(task: Task): void {
          this.visitOrder.push({
            task: task.getDescription(),
            depth: this.depth()
          });
        }

        getVisitOrder() {
          return this.visitOrder;
        }
      }

      const visitor = new StatefulVisitor();
      TaskTraversal.visitPreOrderWithDepth(rootTask, visitor);

      const visitOrder = visitor.getVisitOrder();
      expect(visitOrder).toHaveLength(8);
      expect(visitOrder[0]).toEqual({ task: 'Root Task', depth: 0 });
      expect(visitOrder[visitOrder.length - 1]).toEqual({ task: 'Iter Sub 2', depth: 3 });
    });
  });
});
