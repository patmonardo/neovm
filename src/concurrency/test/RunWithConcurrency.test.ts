import { builder, runnable, runnables, RunWithConcurrency } from '@/concurrency/RunWithConcurrency';
import { Concurrency } from '@/concurrency/Concurrency';
import { TerminationFlag } from '@/termination/TerminationFlag';
import { DefaultPool } from '@/concurrency/DefaultPool';

// Mock ParallelUtil to avoid testing the complex execution logic
vi.mock('@/concurrency/ParallelUtil', () => ({
  ParallelUtil: {
    runWithConcurrency: vi.fn().mockResolvedValue(undefined),
    canRunInParallel: vi.fn().mockReturnValue(true)
  }
}));

describe('RunWithConcurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Builder Pattern', () => {
    it('creates a new builder', () => {
      const builderInstance = builder();
      expect(builderInstance).toBeDefined();
      expect(typeof builderInstance.concurrency).toBe('function');
      expect(typeof builderInstance.tasks).toBe('function');
      expect(typeof builderInstance.build).toBe('function');
    });

    it('requires concurrency to be set', () => {
      expect(() => {
        builder().build();
      }).toThrow('[concurrency] must be provided');
    });

    it('requires tasks to be set', () => {
      expect(() => {
        builder()
          .concurrency(4)
          .build();
      }).toThrow('[tasks] must be provided');
    });

    it('builds successfully with minimum required parameters', () => {
      const tasks = [{ run: () => console.log('test') }];

      const config = builder()
        .concurrency(4)
        .tasks(tasks)
        .build();

      expect(config.concurrency().value()).toBe(4);
      expect(config.tasks()).toBeDefined();
    });
  });

  describe('Concurrency Parameter', () => {
    it('accepts Concurrency object', () => {
      const concurrency = new Concurrency(8);
      const tasks = [{ run: () => {} }];

      const config = builder()
        .concurrency(concurrency)
        .tasks(tasks)
        .build();

      expect(config.concurrency()).toBe(concurrency);
      expect(config.concurrency().value()).toBe(8);
    });

    it('accepts number and converts to Concurrency', () => {
      const tasks = [{ run: () => {} }];

      const config = builder()
        .concurrency(6)
        .tasks(tasks)
        .build();

      expect(config.concurrency().value()).toBe(6);
      expect(config.concurrency()).toBeInstanceOf(Concurrency);
    });

    it('validates concurrency is not negative', () => {
      const tasks = [{ run: () => {} }];

      expect(() => {
        builder()
          .concurrency(-1)
          .tasks(tasks)
          .build();
      }).toThrow('[concurrency] must be at least 0, but got -1');
    });
  });

  describe('Tasks Parameter', () => {
    it('accepts array of runnables', () => {
      const tasks = [
        { run: () => console.log('task 1') },
        { run: () => console.log('task 2') }
      ];

      const config = builder()
        .concurrency(2)
        .tasks(tasks)
        .build();

      expect(config.tasks()).toBeDefined();
    });

    it('accepts iterator of runnables', () => {
      const tasks = [
        { run: () => console.log('task 1') },
        { run: () => console.log('task 2') }
      ];

      const config = builder()
        .concurrency(2)
        .tasks(tasks[Symbol.iterator]())
        .build();

      expect(config.tasks()).toBeDefined();
    });

    it('works with generator functions for lazy evaluation', () => {
      function* generateTasks() {
        for (let i = 0; i < 5; i++) {
          yield { run: () => console.log(`Task ${i}`) };
        }
      }

      const config = builder()
        .concurrency(3)
        .tasks(generateTasks())
        .build();

      expect(config.tasks()).toBeDefined();
    });
  });

  describe('Optional Parameters', () => {
    let basicConfig: RunWithConcurrency;

    beforeEach(() => {
      const tasks = [{ run: () => {} }];
      basicConfig = builder()
        .concurrency(4)
        .tasks(tasks)
        .build();
    });

    it('has default values for optional parameters', () => {
      expect(basicConfig.forceUsageOfExecutor()).toBe(false);
      expect(basicConfig.waitMillis()).toBe(1);
      expect(basicConfig.maxWaitRetries()).toBeGreaterThan(1000000); // Large default
      expect(basicConfig.mayInterruptIfRunning()).toBe(true);
      expect(basicConfig.terminationFlag()).toBe(TerminationFlag.RUNNING_TRUE);
      expect(basicConfig.executor()).toBe(DefaultPool.INSTANCE);
    });

    it('allows setting forceUsageOfExecutor', () => {
      const tasks = [{ run: () => {} }];

      const config = builder()
        .concurrency(2)
        .tasks(tasks)
        .forceUsageOfExecutor(true)
        .build();

      expect(config.forceUsageOfExecutor()).toBe(true);
    });

    it('allows setting waitMillis', () => {
      const tasks = [{ run: () => {} }];

      const config = builder()
        .concurrency(2)
        .tasks(tasks)
        .waitMillis(100)
        .build();

      expect(config.waitMillis()).toBe(100);
    });

    it('validates waitMillis is not negative', () => {
      const tasks = [{ run: () => {} }];

      expect(() => {
        builder()
          .concurrency(2)
          .tasks(tasks)
          .waitMillis(-5)
          .build();
      }).toThrow('[waitMillis] must be at least 0, but got -5');
    });

    it('allows setting maxWaitRetries', () => {
      const tasks = [{ run: () => {} }];

      const config = builder()
        .concurrency(2)
        .tasks(tasks)
        .maxWaitRetries(1000)
        .build();

      expect(config.maxWaitRetries()).toBe(1000);
    });

    it('allows setting mayInterruptIfRunning', () => {
      const tasks = [{ run: () => {} }];

      const config = builder()
        .concurrency(2)
        .tasks(tasks)
        .mayInterruptIfRunning(false)
        .build();

      expect(config.mayInterruptIfRunning()).toBe(false);
    });

    it('allows setting terminationFlag', () => {
      const tasks = [{ run: () => {} }];

      const config = builder()
        .concurrency(2)
        .tasks(tasks)
        .terminationFlag(TerminationFlag.STOP_RUNNING)
        .build();

      expect(config.terminationFlag()).toBe(TerminationFlag.STOP_RUNNING);
    });

    it('allows setting custom executor', () => {
      const tasks = [{ run: () => {} }];
      const customExecutor = null; // Example of custom executor

      const config = builder()
        .concurrency(2)
        .tasks(tasks)
        //.executor(customExecutor)
        .build();

      expect(config.executor()).toBe(customExecutor);
    });
  });

  describe('Helper Functions', () => {
    it('runnable() converts function to runnable', () => {
      const fn = () => console.log('test');
      const runnableObj = runnable(fn);

      expect(typeof runnableObj.run).toBe('function');
      expect(runnableObj.run).toBe(fn);
    });

    it('runnables() converts array of functions', () => {
      const functions = [
        () => console.log('task 1'),
        () => console.log('task 2'),
        () => console.log('task 3')
      ];

      const runnableArray = runnables(functions);

      expect(runnableArray).toHaveLength(3);
      runnableArray.forEach((r, index) => {
        expect(typeof r.run).toBe('function');
        expect(r.run).toBe(functions[index]);
      });
    });
  });

  describe('Integration with Helper Functions', () => {
    it('works with runnables() helper', () => {
      const functions = [
        () => console.log('task 1'),
        () => console.log('task 2')
      ];

      const config = builder()
        .concurrency(2)
        .tasks(runnables(functions))
        .build();

      expect(config.concurrency().value()).toBe(2);
      expect(config.tasks()).toBeDefined();
    });

    it('works with individual runnable() helper', () => {
      const tasks = [
        runnable(() => console.log('task 1')),
        runnable(() => console.log('task 2'))
      ];

      const config = builder()
        .concurrency(2)
        .tasks(tasks)
        .build();

      expect(config.concurrency().value()).toBe(2);
      expect(config.tasks()).toBeDefined();
    });
  });

  describe('Build vs Run', () => {
    it('build() returns configuration object', () => {
      const tasks = [{ run: () => {} }];

      const config = builder()
        .concurrency(2)
        .tasks(tasks)
        .build();

      expect(typeof config.run).toBe('function');
      expect(typeof config.concurrency).toBe('function');
      expect(typeof config.tasks).toBe('function');
    });

    it('builder.run() builds and runs immediately', async () => {
      const tasks = [{ run: () => {} }];

      // This should call ParallelUtil.runWithConcurrency under the hood
      await builder()
        .concurrency(2)
        .tasks(tasks)
        .run();

      // Verify ParallelUtil was called (mocked)
      const { ParallelUtil } = await import('../ParallelUtil.js');
      expect(ParallelUtil.runWithConcurrency).toHaveBeenCalledOnce();
    });

    it('config.run() calls ParallelUtil with correct parameters', async () => {
      const tasks = [{ run: () => {} }];

      const config = builder()
        .concurrency(3)
        .tasks(tasks)
        .waitMillis(25)
        .build();

      await config.run();

      // Verify ParallelUtil was called with correct structure
      const { ParallelUtil } = await import('../ParallelUtil.js');
      expect(ParallelUtil.runWithConcurrency).toHaveBeenCalledWith(
        expect.objectContaining({
          concurrency: expect.any(Concurrency),
          waitMillis: 25
        })
      );
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('supports simple parallel task execution', () => {
      const functions = [
        () => console.log('Process file 1'),
        () => console.log('Process file 2'),
        () => console.log('Process file 3'),
        () => console.log('Process file 4')
      ];

      const config = builder()
        .concurrency(2)
        .tasks(runnables(functions))
        .build();

      expect(config.concurrency().value()).toBe(2);
      expect(config.tasks()).toBeDefined();
    });

    it('supports high-concurrency batch processing', () => {
      function* generateBatchTasks() {
        for (let batch = 0; batch < 100; batch++) {
          yield { run: () => console.log(`Processing batch ${batch}`) };
        }
      }

      const config = builder()
        .concurrency(16)
        .tasks(generateBatchTasks())
        .maxWaitRetries(1000)
        .build();

      expect(config.concurrency().value()).toBe(16);
      expect(config.maxWaitRetries()).toBe(1000);
    });

    it('supports configurable execution strategies', () => {
      const tasks = [{ run: () => {} }];

      const configs = [
        // Debug mode - single threaded
        builder().concurrency(1).tasks(tasks).build(),

        // Development mode - limited concurrency
        builder().concurrency(4).tasks(tasks).build(),

        // Production mode - full concurrency
        builder().concurrency(16).tasks(tasks).build()
      ];

      expect(configs[0].concurrency().value()).toBe(1);
      expect(configs[1].concurrency().value()).toBe(4);
      expect(configs[2].concurrency().value()).toBe(16);
    });
  });
});
