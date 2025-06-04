import {
  Tasks,
  Task,
  LeafTask,
  IterativeTask,
  IterativeTaskMode,
} from "@/core/utils/progress/tasks";

describe("Tasks Factory", () => {
  describe("Basic Task Creation", () => {
    it("creates empty task", () => {
      const task = Tasks.empty();

      expect(task).toBeDefined();
      expect(task.getDescription()).toBe("");
      expect(task.getSubTasks()).toHaveLength(0);
    });

    it("creates simple task with description", () => {
      const task = Tasks.task("Test Task", []);

      expect(task.getDescription()).toBe("Test Task");
      expect(task.getSubTasks()).toHaveLength(0);
    });

    it("creates task with children", () => {
      const child1 = Tasks.leaf("Child 1");
      const child2 = Tasks.leaf("Child 2");
      const parent = Tasks.task("Parent", [child1, child2]);

      expect(parent.getDescription()).toBe("Parent");
      expect(parent.getSubTasks()).toHaveLength(2);
      expect(parent.getSubTasks()[0].getDescription()).toBe("Child 1");
      expect(parent.getSubTasks()[1].getDescription()).toBe("Child 2");
    });
  });

  describe("Leaf Task Creation", () => {
    it("creates leaf task with unknown volume", () => {
      const leaf = Tasks.leaf("Simple Leaf");

      expect(leaf).toBeInstanceOf(LeafTask);
      expect(leaf.getDescription()).toBe("Simple Leaf");
      expect(leaf.getProgress().getVolume()).toBe(Task.UNKNOWN_VOLUME);
    });

    it("creates leaf task with specified volume", () => {
      const leaf = Tasks.leafWithVolume("Sized Leaf", 100);

      expect(leaf).toBeInstanceOf(LeafTask);
      expect(leaf.getDescription()).toBe("Sized Leaf");
      expect(leaf.getProgress().getVolume()).toBe(100);
    });
  });

  describe("Iterative Task Creation", () => {
    const createSubTasks = (): Task[] => [
      Tasks.leaf("Iteration Step 1"),
      Tasks.leaf("Iteration Step 2"),
    ];

    it("creates fixed iterative task", () => {
      const iterative = Tasks.iterativeFixed(
        "Fixed Iterations",
        createSubTasks,
        3
      );

      expect(iterative).toBeInstanceOf(IterativeTask);
      expect(iterative.getDescription()).toBe("Fixed Iterations");
      expect(iterative.getMode()).toBe(IterativeTaskMode.FIXED);
      expect(iterative.getSubTasks()).toHaveLength(6); // 3 iterations × 2 steps
    });

    it("creates dynamic iterative task", () => {
      const iterative = Tasks.iterativeDynamic(
        "Dynamic Iterations",
        createSubTasks,
        5
      );

      expect(iterative).toBeInstanceOf(IterativeTask);
      expect(iterative.getDescription()).toBe("Dynamic Iterations");
      expect(iterative.getMode()).toBe(IterativeTaskMode.DYNAMIC);
      expect(iterative.getSubTasks()).toHaveLength(10); // 5 iterations × 2 steps
    });

    it("creates open iterative task", () => {
      const iterative = Tasks.iterativeOpen("Open Iterations", createSubTasks);

      expect(iterative).toBeInstanceOf(IterativeTask);
      expect(iterative.getDescription()).toBe("Open Iterations");
      expect(iterative.getMode()).toBe(IterativeTaskMode.OPEN);
      expect(iterative.getSubTasks()).toHaveLength(0); // No pre-generated tasks
    });
  });

  describe("Task Helper Methods", () => {
    it("creates task with variadic children", () => {
      const child1 = Tasks.leaf("Child 1");
      const child2 = Tasks.leaf("Child 2");
      const child3 = Tasks.leaf("Child 3");

      const parent = Tasks.taskWithChildren("Parent", child1, child2, child3);

      expect(parent.getSubTasks()).toHaveLength(3);
      expect(parent.getSubTasks().map((t) => t.getDescription())).toEqual([
        "Child 1",
        "Child 2",
        "Child 3",
      ]);
    });
  });

  describe("Empty Task Singleton", () => {
    it("returns same empty task instance", () => {
      const empty1 = Tasks.empty();
      const empty2 = Tasks.empty();

      expect(empty1).toBe(empty2); // Same reference
    });
  });
});
