import { JobId } from "@/core/utils/progress/JobId";

describe("JobId", () => {
  describe("Construction and Basic Properties", () => {
    it("creates JobId with auto-generated UUID", () => {
      const jobId = new JobId();

      expect(jobId.value).toBeDefined();
      expect(jobId.value).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}$/
      );
    });

    it("creates JobId with provided value", () => {
      const customValue = "custom-job-id";
      const jobId = new JobId(customValue);

      expect(jobId.value).toBe(customValue);
    });

    it("generates unique IDs for multiple instances", () => {
      const jobId1 = new JobId();
      const jobId2 = new JobId();
      const jobId3 = new JobId();

      expect(jobId1.value).not.toBe(jobId2.value);
      expect(jobId2.value).not.toBe(jobId3.value);
      expect(jobId1.value).not.toBe(jobId3.value);
    });
  });

  describe("Static Constants", () => {
    it("provides EMPTY constant", () => {
      expect(JobId.EMPTY).toBeDefined();
      expect(JobId.EMPTY.value).toBe("");
      expect(JobId.EMPTY.asString()).toBe("");
    });

    it("EMPTY is singleton instance", () => {
      const empty1 = JobId.EMPTY;
      const empty2 = JobId.EMPTY;

      expect(empty1).toBe(empty2); // Same reference
    });
  });

  describe("Factory Methods", () => {
    it("creates JobId from UUID string", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      const jobId = JobId.fromUUID(uuid);

      expect(jobId.value).toBe(uuid);
      expect(jobId.asString()).toBe(uuid);
    });

    it("creates JobId from any string via fromUUID", () => {
      const customId = "my-custom-job-identifier";
      const jobId = JobId.fromUUID(customId);

      expect(jobId.value).toBe(customId);
    });
  });

  describe("String Representation", () => {
    it("asString() returns the value", () => {
      const value = "test-job-id";
      const jobId = new JobId(value);

      expect(jobId.asString()).toBe(value);
    });

    it("toString() returns the value", () => {
      const value = "another-test-id";
      const jobId = new JobId(value);

      expect(jobId.toString()).toBe(value);
    });

    it("asString() and toString() return same value", () => {
      const jobId = new JobId();

      expect(jobId.asString()).toBe(jobId.toString());
    });

    it("works with string interpolation", () => {
      const jobId = new JobId("interpolation-test");
      const message = `Job ID: ${jobId}`;

      expect(message).toBe("Job ID: interpolation-test");
    });
  });

  describe("Equality and Comparison", () => {
    it("equals() returns true for same values", () => {
      const value = "same-value";
      const jobId1 = new JobId(value);
      const jobId2 = new JobId(value);

      expect(jobId1.equals(jobId2)).toBe(true);
      expect(jobId2.equals(jobId1)).toBe(true);
    });

    it("equals() returns false for different values", () => {
      const jobId1 = new JobId("value1");
      const jobId2 = new JobId("value2");

      expect(jobId1.equals(jobId2)).toBe(false);
      expect(jobId2.equals(jobId1)).toBe(false);
    });

    it("equals() works with EMPTY constant", () => {
      const emptyJobId = new JobId("");

      expect(JobId.EMPTY.equals(emptyJobId)).toBe(true);
      expect(emptyJobId.equals(JobId.EMPTY)).toBe(true);
    });

    it("auto-generated IDs are not equal", () => {
      const jobId1 = new JobId();
      const jobId2 = new JobId();

      expect(jobId1.equals(jobId2)).toBe(false);
    });

    it("JobId equals itself", () => {
      const jobId = new JobId();

      expect(jobId.equals(jobId)).toBe(true);
    });
  });

  describe("UUID Generation Format", () => {
    it("generates valid UUID v4 format", () => {
      const jobId = new JobId();
      const uuid = jobId.value;

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
      );
    });

    it("fourth section starts with 8, 9, a, or b (UUID v4 variant)", () => {
      // Generate multiple UUIDs to test the variant bits
      const jobIds = Array.from({ length: 10 }, () => new JobId());

      jobIds.forEach((jobId) => {
        const uuid = jobId.value;
        const fourthSection = uuid.split("-")[3];
        const firstChar = fourthSection[0];

        expect(["8", "9", "a", "b"]).toContain(firstChar);
      });
    });

    it("third section starts with 4 (UUID v4 version)", () => {
      const jobIds = Array.from({ length: 10 }, () => new JobId());

      jobIds.forEach((jobId) => {
        const uuid = jobId.value;
        const thirdSection = uuid.split("-")[2];

        expect(thirdSection).toMatch(/^4[a-f0-9]{3}$/);
      });
    });

    it("has correct UUID structure", () => {
      const jobId = new JobId();
      const parts = jobId.value.split("-");

      expect(parts).toHaveLength(5);
      expect(parts[0]).toHaveLength(8); // xxxxxxxx
      expect(parts[1]).toHaveLength(4); // xxxx
      expect(parts[2]).toHaveLength(4); // 4xxx
      expect(parts[3]).toHaveLength(4); // yxxx
      expect(parts[4]).toHaveLength(12); // xxxxxxxxxxxx
    });
  });

  describe("Usage Patterns", () => {
    it("can be used as Map key", () => {
      const jobMap = new Map<JobId, string>();
      const jobId1 = new JobId("job1");
      const jobId2 = new JobId("job2");

      jobMap.set(jobId1, "Job One");
      jobMap.set(jobId2, "Job Two");

      expect(jobMap.get(jobId1)).toBe("Job One");
      expect(jobMap.get(jobId2)).toBe("Job Two");
      expect(jobMap.size).toBe(2);
    });

    it("can be used in Set for uniqueness", () => {
      const jobSet = new Set<JobId>();
      const jobId1 = new JobId("same");
      const jobId2 = new JobId("same"); // Same value, different instance

      jobSet.add(jobId1);
      jobSet.add(jobId2);

      // Different instances, so Set sees them as different
      expect(jobSet.size).toBe(2);
    });

    it("supports common job ID patterns", () => {
      const patterns = [
        "user-123-job",
        "batch-processing-2024",
        "import-csv-data",
        "graph-algorithm-pagerank",
        "neo4j-cypher-query",
      ];

      patterns.forEach((pattern) => {
        const jobId = JobId.fromUUID(pattern);
        expect(jobId.value).toBe(pattern);
        expect(jobId.asString()).toBe(pattern);
      });
    });

    it("handles edge cases", () => {
      const edgeCases = ["", " ", "0", "a", "!@#$%^&*()"];

      edgeCases.forEach((value) => {
        const jobId = new JobId(value);
        expect(jobId.value).toBe(value);
        expect(jobId.asString()).toBe(value);
        expect(jobId.toString()).toBe(value);
      });
    });
  });

  describe("Immutability", () => {
    it("JobId instances are immutable in practice", () => {
      const original = "original-value";
      const jobId = new JobId(original);

      const stringValue = jobId.asString();
      const stringRepresentation = jobId.toString();

      expect(stringValue).toBe(original);
      expect(stringRepresentation).toBe(original);
      expect(jobId.value).toBe(original);
    });
  });
});
