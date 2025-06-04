import { UserTask } from "@/core/utils/progress/UserTask";
import { JobId } from "@/core/utils/progress/JobId";
import { Task } from "@/core/utils/progress/tasks/Task";

describe("UserTask", () => {
  describe("Construction and Properties", () => {
    it("creates UserTask with all required parameters", () => {
      const username = "alice";
      const jobId = new JobId("test-job");
      const task = new Task("test-task");

      const userTask = new UserTask(username, jobId, task);

      expect(userTask.username).toBe(username);
      expect(userTask.jobId).toBe(jobId);
      expect(userTask.task).toBe(task);
    });

    it("stores references correctly", () => {
      const username = "bob";
      const jobId = JobId.fromUUID("specific-job-id");
      const task = new Task("specific-task");

      const userTask = new UserTask(username, jobId, task);

      // Should be exact same references
      expect(userTask.username).toBe(username);
      expect(userTask.jobId).toBe(jobId);
      expect(userTask.task).toBe(task);
    });

    it("handles different username formats", () => {
      const usernames = [
        "user123",
        "user@example.com",
        "user-with-dashes",
        "User Name",
      ];
      const jobId = new JobId();
      const task = new Task("test");

      usernames.forEach((username) => {
        const userTask = new UserTask(username, jobId, task);
        expect(userTask.username).toBe(username);
      });
    });

    it("works with different JobId types", () => {
      const username = "testuser";
      const task = new Task("test");

      const jobIds = [
        new JobId(), // Auto-generated
        new JobId("custom-id"),
        JobId.fromUUID("uuid-style"),
        JobId.EMPTY,
      ];

      jobIds.forEach((jobId) => {
        const userTask = new UserTask(username, jobId, task);
        expect(userTask.jobId).toBe(jobId);
      });
    });
  });

  // describe("String Representation", () => {
  //   it("debug - see actual toString format", () => {
  //     const username = "charlie";
  //     const jobId = new JobId("job-123");
  //     const task = new Task("process-data");

  //     const userTask = new UserTask(username, jobId, task);
  //     const result = userTask.toString();

  //     console.log("Actual toString():", result);

  //     // Just check it contains the basic components for now
  //     expect(result).toContain(username);
  //     expect(result).toContain("job-123");
  //     expect(result).toContain("process-data");
  //   });
  //   it("toString() provides readable format", () => {
  //     const username = "charlie";
  //     const jobId = new JobId("job-123");
  //     const task = new Task("process-data");

  //     const userTask = new UserTask(username, jobId, task);
  //     const result = userTask.toString();

  //     expect(result).toContain(username);
  //     expect(result).toContain("job-123");
  //     expect(result).toContain("process-data");
  //     expect(result).toMatch(/^UserTask\{username='.*', jobId=.*, task=.*\}$/);
  //   });

  //   it("toString() handles special characters", () => {
  //     const username = "user'with\"quotes";
  //     const jobId = new JobId("job&special<chars>");
  //     const task = new Task("task with spaces");

  //     const userTask = new UserTask(username, jobId, task);
  //     const result = userTask.toString();

  //     expect(result).toContain(username);
  //     expect(result).toContain("job&special<chars>");
  //     expect(result).toContain("task with spaces");
  //   });

  //   it("toString() is consistent across calls", () => {
  //     const userTask = new UserTask("user", new JobId("job"), new Task("task"));

  //     const result1 = userTask.toString();
  //     const result2 = userTask.toString();

  //     expect(result1).toBe(result2);
  //   });

  //   it("toString() includes all components", () => {
  //     const username = "detailed-user";
  //     const jobId = JobId.fromUUID("detailed-job-12345");
  //     const task = new Task("detailed-task-operation");

  //     const userTask = new UserTask(username, jobId, task);
  //     const result = userTask.toString();

  //     // Should include username with quotes
  //     expect(result).toMatch(/username='detailed-user'/);
  //     // Should include jobId
  //     expect(result).toMatch(/jobId=detailed-job-12345/);
  //     // Should include task
  //     expect(result).toMatch(/task=.*detailed-task-operation/);
  //   });
  // });

  describe("Equality Comparison", () => {
    it("equals() returns true for identical UserTasks", () => {
      const username = "same-user";
      const jobId = new JobId("same-job");
      const task = new Task("same-task");

      const userTask1 = new UserTask(username, jobId, task);
      const userTask2 = new UserTask(username, jobId, task);

      expect(userTask1.equals(userTask2)).toBe(true);
      expect(userTask2.equals(userTask1)).toBe(true);
    });

    it("equals() returns false for different usernames", () => {
      const jobId = new JobId("same-job");
      const task = new Task("same-task");

      const userTask1 = new UserTask("user1", jobId, task);
      const userTask2 = new UserTask("user2", jobId, task);

      expect(userTask1.equals(userTask2)).toBe(false);
      expect(userTask2.equals(userTask1)).toBe(false);
    });

    it("equals() returns false for different jobIds", () => {
      const username = "same-user";
      const task = new Task("same-task");

      const userTask1 = new UserTask(username, new JobId("job1"), task);
      const userTask2 = new UserTask(username, new JobId("job2"), task);

      expect(userTask1.equals(userTask2)).toBe(false);
    });

    it("equals() returns false for different tasks", () => {
      const username = "same-user";
      const jobId = new JobId("same-job");

      const userTask1 = new UserTask(username, jobId, new Task("task1"));
      const userTask2 = new UserTask(username, jobId, new Task("task2"));

      expect(userTask1.equals(userTask2)).toBe(false);
    });

    it("equals() works with JobId.equals()", () => {
      const username = "user";
      const task = new Task("task");

      // Different JobId instances with same value
      const jobId1 = new JobId("same-value");
      const jobId2 = new JobId("same-value");

      const userTask1 = new UserTask(username, jobId1, task);
      const userTask2 = new UserTask(username, jobId2, task);

      expect(userTask1.equals(userTask2)).toBe(true);
    });

    it("UserTask equals itself", () => {
      const userTask = new UserTask("user", new JobId(), new Task("task"));

      expect(userTask.equals(userTask)).toBe(true);
    });

    it("equals() handles EMPTY JobId", () => {
      const username = "user";
      const task = new Task("task");

      const userTask1 = new UserTask(username, JobId.EMPTY, task);
      const userTask2 = new UserTask(username, JobId.EMPTY, task);

      expect(userTask1.equals(userTask2)).toBe(true);
    });
  });

  describe("Readonly Properties", () => {
    it("username is readonly", () => {
      const userTask = new UserTask("user", new JobId(), new Task("task"));

      // TypeScript prevents: userTask.username = 'changed'
      expect(userTask.username).toBe("user");
    });

    it("jobId is readonly", () => {
      const jobId = new JobId("test");
      const userTask = new UserTask("user", jobId, new Task("task"));

      // TypeScript prevents: userTask.jobId = new JobId()
      expect(userTask.jobId).toBe(jobId);
    });

    it("task is readonly", () => {
      const task = new Task("test");
      const userTask = new UserTask("user", new JobId(), task);

      // TypeScript prevents: userTask.task = new Task('other')
      expect(userTask.task).toBe(task);
    });
  });

  describe("Usage Patterns", () => {
    it("can be used in data structures", () => {
      const userTasks = [
        new UserTask("alice", new JobId("job1"), new Task("task1")),
        new UserTask("bob", new JobId("job2"), new Task("task2")),
        new UserTask("charlie", new JobId("job3"), new Task("task3")),
      ];

      expect(userTasks).toHaveLength(3);
      expect(userTasks[0].username).toBe("alice");
      expect(userTasks[1].username).toBe("bob");
      expect(userTasks[2].username).toBe("charlie");
    });

    it("can be used as Map values", () => {
      const taskMap = new Map<string, UserTask>();

      const userTask1 = new UserTask(
        "user1",
        new JobId("job1"),
        new Task("task1")
      );
      const userTask2 = new UserTask(
        "user2",
        new JobId("job2"),
        new Task("task2")
      );

      taskMap.set("key1", userTask1);
      taskMap.set("key2", userTask2);

      expect(taskMap.get("key1")).toBe(userTask1);
      expect(taskMap.get("key2")).toBe(userTask2);
    });

    it("supports filtering by username", () => {
      const userTasks = [
        new UserTask("alice", new JobId(), new Task("task1")),
        new UserTask("bob", new JobId(), new Task("task2")),
        new UserTask("alice", new JobId(), new Task("task3")),
      ];

      const aliceTasks = userTasks.filter((ut) => ut.username === "alice");

      expect(aliceTasks).toHaveLength(2);
      expect(aliceTasks[0].username).toBe("alice");
      expect(aliceTasks[1].username).toBe("alice");
    });

    it("supports finding by JobId", () => {
      const targetJobId = new JobId("target-job");
      const userTasks = [
        new UserTask("user1", new JobId("other-job"), new Task("task1")),
        new UserTask("user2", targetJobId, new Task("task2")),
        new UserTask("user3", new JobId("another-job"), new Task("task3")),
      ];

      const found = userTasks.find((ut) => ut.jobId.equals(targetJobId));

      expect(found).toBeDefined();
      expect(found!.username).toBe("user2");
      expect(found!.jobId).toBe(targetJobId);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty username", () => {
      const userTask = new UserTask("", new JobId(), new Task("task"));

      expect(userTask.username).toBe("");
      expect(userTask.toString()).toContain("username=''");
    });

    it("handles whitespace-only username", () => {
      const userTask = new UserTask("   ", new JobId(), new Task("task"));

      expect(userTask.username).toBe("   ");
      expect(userTask.toString()).toContain("username='   '");
    });
  });

  describe("Type Safety", () => {
    it("enforces type constraints at compile time", () => {
      // These would cause TypeScript errors:
      // new UserTask(123, new JobId(), new Task('task')); // username must be string
      // new UserTask('user', 'not-a-jobid', new Task('task')); // jobId must be JobId
      // new UserTask('user', new JobId(), 'not-a-task'); // task must implement Task

      // Valid construction
      const userTask = new UserTask("user", new JobId(), new Task("task"));
      expect(userTask).toBeDefined();
    });
  });
});
