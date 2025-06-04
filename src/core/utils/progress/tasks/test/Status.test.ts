import { Status } from '@/core/utils/progress/tasks/Status';

describe('Status Enum and Namespace', () => {
  describe('Basic Enum Values', () => {
    it('has all expected status values', () => {
      expect(Status.PENDING).toBe('PENDING');
      expect(Status.RUNNING).toBe('RUNNING');
      expect(Status.FINISHED).toBe('FINISHED');
      expect(Status.CANCELED).toBe('CANCELED');
      expect(Status.FAILED).toBe('FAILED');
    });

    it('enum values are strings', () => {
      expect(typeof Status.PENDING).toBe('string');
      expect(typeof Status.RUNNING).toBe('string');
      expect(typeof Status.FINISHED).toBe('string');
      expect(typeof Status.CANCELED).toBe('string');
      expect(typeof Status.FAILED).toBe('string');
    });
  });

  describe('String Parsing', () => {
    it('fromString() parses exact case matches', () => {
      expect(Status.fromString('PENDING')).toBe(Status.PENDING);
      expect(Status.fromString('RUNNING')).toBe(Status.RUNNING);
      expect(Status.fromString('FINISHED')).toBe(Status.FINISHED);
      expect(Status.fromString('CANCELED')).toBe(Status.CANCELED);
      expect(Status.fromString('FAILED')).toBe(Status.FAILED);
    });

    it('fromString() is case-insensitive', () => {
      expect(Status.fromString('pending')).toBe(Status.PENDING);
      expect(Status.fromString('Running')).toBe(Status.RUNNING);
      expect(Status.fromString('FINISHED')).toBe(Status.FINISHED);
      expect(Status.fromString('canceled')).toBe(Status.CANCELED);
      expect(Status.fromString('Failed')).toBe(Status.FAILED);
    });

    it('fromString() handles British spelling of canceled', () => {
      expect(Status.fromString('CANCELLED')).toBe(Status.CANCELED);
      expect(Status.fromString('cancelled')).toBe(Status.CANCELED);
      expect(Status.fromString('Cancelled')).toBe(Status.CANCELED);
    });

    it('fromString() throws for unknown status', () => {
      expect(() => Status.fromString('UNKNOWN')).toThrow('Unknown status: UNKNOWN');
      expect(() => Status.fromString('IN_PROGRESS')).toThrow('Unknown status: IN_PROGRESS');
      expect(() => Status.fromString('')).toThrow('Unknown status: ');
      expect(() => Status.fromString('null')).toThrow('Unknown status: null');
    });

    it('fromString() handles mixed case', () => {
      expect(Status.fromString('PeNdInG')).toBe(Status.PENDING);
      expect(Status.fromString('rUnNiNg')).toBe(Status.RUNNING);
      expect(Status.fromString('fInIsHeD')).toBe(Status.FINISHED);
    });
  });

  describe('Status Classification', () => {
    it('isTerminal() identifies terminal states', () => {
      expect(Status.isTerminal(Status.FINISHED)).toBe(true);
      expect(Status.isTerminal(Status.CANCELED)).toBe(true);
      expect(Status.isTerminal(Status.FAILED)).toBe(true);

      expect(Status.isTerminal(Status.PENDING)).toBe(false);
      expect(Status.isTerminal(Status.RUNNING)).toBe(false);
    });

    it('isActive() identifies running state', () => {
      expect(Status.isActive(Status.RUNNING)).toBe(true);

      expect(Status.isActive(Status.PENDING)).toBe(false);
      expect(Status.isActive(Status.FINISHED)).toBe(false);
      expect(Status.isActive(Status.CANCELED)).toBe(false);
      expect(Status.isActive(Status.FAILED)).toBe(false);
    });

    it('isPending() identifies waiting state', () => {
      expect(Status.isPending(Status.PENDING)).toBe(true);

      expect(Status.isPending(Status.RUNNING)).toBe(false);
      expect(Status.isPending(Status.FINISHED)).toBe(false);
      expect(Status.isPending(Status.CANCELED)).toBe(false);
      expect(Status.isPending(Status.FAILED)).toBe(false);
    });

    it('isSuccessful() identifies successful completion', () => {
      expect(Status.isSuccessful(Status.FINISHED)).toBe(true);

      expect(Status.isSuccessful(Status.PENDING)).toBe(false);
      expect(Status.isSuccessful(Status.RUNNING)).toBe(false);
      expect(Status.isSuccessful(Status.CANCELED)).toBe(false);
      expect(Status.isSuccessful(Status.FAILED)).toBe(false);
    });

    it('isFailed() identifies failure states', () => {
      expect(Status.isFailed(Status.FAILED)).toBe(true);
      expect(Status.isFailed(Status.CANCELED)).toBe(true);

      expect(Status.isFailed(Status.PENDING)).toBe(false);
      expect(Status.isFailed(Status.RUNNING)).toBe(false);
      expect(Status.isFailed(Status.FINISHED)).toBe(false);
    });
  });

  describe('Status Transitions', () => {
    it('getValidTransitions() returns correct transitions for PENDING', () => {
      const transitions = Status.getValidTransitions(Status.PENDING);

      expect(transitions).toHaveLength(2);
      expect(transitions).toContain(Status.RUNNING);
      expect(transitions).toContain(Status.CANCELED);
    });

    it('getValidTransitions() returns correct transitions for RUNNING', () => {
      const transitions = Status.getValidTransitions(Status.RUNNING);

      expect(transitions).toHaveLength(3);
      expect(transitions).toContain(Status.FINISHED);
      expect(transitions).toContain(Status.CANCELED);
      expect(transitions).toContain(Status.FAILED);
    });

    it('getValidTransitions() returns empty for terminal states', () => {
      expect(Status.getValidTransitions(Status.FINISHED)).toEqual([]);
      expect(Status.getValidTransitions(Status.CANCELED)).toEqual([]);
      expect(Status.getValidTransitions(Status.FAILED)).toEqual([]);
    });

    it('canTransition() validates valid transitions', () => {
      // From PENDING
      expect(Status.canTransition(Status.PENDING, Status.RUNNING)).toBe(true);
      expect(Status.canTransition(Status.PENDING, Status.CANCELED)).toBe(true);
      expect(Status.canTransition(Status.PENDING, Status.FINISHED)).toBe(false);
      expect(Status.canTransition(Status.PENDING, Status.FAILED)).toBe(false);

      // From RUNNING
      expect(Status.canTransition(Status.RUNNING, Status.FINISHED)).toBe(true);
      expect(Status.canTransition(Status.RUNNING, Status.CANCELED)).toBe(true);
      expect(Status.canTransition(Status.RUNNING, Status.FAILED)).toBe(true);
      expect(Status.canTransition(Status.RUNNING, Status.PENDING)).toBe(false);

      // From terminal states
      expect(Status.canTransition(Status.FINISHED, Status.RUNNING)).toBe(false);
      expect(Status.canTransition(Status.CANCELED, Status.RUNNING)).toBe(false);
      expect(Status.canTransition(Status.FAILED, Status.RUNNING)).toBe(false);
    });

    it('canTransition() handles all combinations', () => {
      const allStatuses = [Status.PENDING, Status.RUNNING, Status.FINISHED, Status.CANCELED, Status.FAILED];

      allStatuses.forEach(from => {
        allStatuses.forEach(to => {
          const canTransition = Status.canTransition(from, to);
          const validTransitions = Status.getValidTransitions(from);

          expect(canTransition).toBe(validTransitions.includes(to));
        });
      });
    });
  });

  describe('Utility Functions', () => {
    it('getAllStatuses() returns all statuses in order', () => {
      const allStatuses = Status.getAllStatuses();

      expect(allStatuses).toHaveLength(5);
      expect(allStatuses).toEqual([
        Status.PENDING,
        Status.RUNNING,
        Status.FINISHED,
        Status.CANCELED,
        Status.FAILED
      ]);
    });

    it('getProgressPercentage() returns appropriate values', () => {
      expect(Status.getProgressPercentage(Status.PENDING)).toBe(0);
      expect(Status.getProgressPercentage(Status.RUNNING)).toBe(50);
      expect(Status.getProgressPercentage(Status.FINISHED)).toBe(100);
      expect(Status.getProgressPercentage(Status.CANCELED)).toBe(-1);
      expect(Status.getProgressPercentage(Status.FAILED)).toBe(-1);
    });

    it('progress percentages are consistent with status types', () => {
      // Non-started tasks should be 0%
      expect(Status.getProgressPercentage(Status.PENDING)).toBe(0);

      // Active tasks should be partial
      expect(Status.getProgressPercentage(Status.RUNNING)).toBeGreaterThan(0);
      expect(Status.getProgressPercentage(Status.RUNNING)).toBeLessThan(100);

      // Successful completion should be 100%
      expect(Status.getProgressPercentage(Status.FINISHED)).toBe(100);

      // Failed states should be negative (error indicator)
      expect(Status.getProgressPercentage(Status.CANCELED)).toBeLessThan(0);
      expect(Status.getProgressPercentage(Status.FAILED)).toBeLessThan(0);
    });
  });

  describe('Real Usage Patterns', () => {
    it('supports status lifecycle simulation', () => {
      let currentStatus = Status.PENDING;

      // Start task
      expect(Status.canTransition(currentStatus, Status.RUNNING)).toBe(true);
      currentStatus = Status.RUNNING;

      // Complete task
      expect(Status.canTransition(currentStatus, Status.FINISHED)).toBe(true);
      currentStatus = Status.FINISHED;

      // Cannot restart completed task
      expect(Status.canTransition(currentStatus, Status.RUNNING)).toBe(false);
      expect(Status.isTerminal(currentStatus)).toBe(true);
    });

    it('supports status validation in task management', () => {
      function updateTaskStatus(current: Status, requested: Status): Status {
        if (Status.canTransition(current, requested)) {
          return requested;
        } else {
          throw new Error(`Invalid transition from ${current} to ${requested}`);
        }
      }

      // Valid transitions
      expect(updateTaskStatus(Status.PENDING, Status.RUNNING)).toBe(Status.RUNNING);
      expect(updateTaskStatus(Status.RUNNING, Status.FINISHED)).toBe(Status.FINISHED);

      // Invalid transitions
      expect(() => updateTaskStatus(Status.FINISHED, Status.RUNNING)).toThrow();
      expect(() => updateTaskStatus(Status.PENDING, Status.FINISHED)).toThrow();
    });

    it('supports filtering tasks by status type', () => {
      const taskStatuses = [
        Status.PENDING,
        Status.RUNNING,
        Status.FINISHED,
        Status.CANCELED,
        Status.FAILED,
        Status.RUNNING,
        Status.FINISHED
      ];

      const activeCount = taskStatuses.filter(Status.isActive).length;
      const terminalCount = taskStatuses.filter(Status.isTerminal).length;
      const successfulCount = taskStatuses.filter(Status.isSuccessful).length;
      const failedCount = taskStatuses.filter(Status.isFailed).length;

      expect(activeCount).toBe(2); // 2 RUNNING
      expect(terminalCount).toBe(4); // 2 FINISHED + 1 CANCELED + 1 FAILED
      expect(successfulCount).toBe(2); // 2 FINISHED
      expect(failedCount).toBe(2); // 1 CANCELED + 1 FAILED
    });
  });

  describe('Edge Cases', () => {
    it('handles status consistency checks', () => {
      const allStatuses = Status.getAllStatuses();

      allStatuses.forEach(status => {
        // Each status should be parseable from its string representation
        expect(Status.fromString(status)).toBe(status);

        // Progress percentage should be defined
        expect(typeof Status.getProgressPercentage(status)).toBe('number');

        // Classification functions should work
        const isTerminal = Status.isTerminal(status);
        const isActive = Status.isActive(status);
        const isPending = Status.isPending(status);

        // Each status should have exactly one primary classification
        const classifications = [isTerminal, isActive, isPending];
        const trueCount = classifications.filter(Boolean).length;
        expect(trueCount).toBe(1);
      });
    });

    it('transition validation is symmetric with getValidTransitions', () => {
      const allStatuses = Status.getAllStatuses();

      allStatuses.forEach(from => {
        const validTransitions = Status.getValidTransitions(from);

        allStatuses.forEach(to => {
          const canTransition = Status.canTransition(from, to);
          const isInValidList = validTransitions.includes(to);

          expect(canTransition).toBe(isInValidList);
        });
      });
    });
  });
});
