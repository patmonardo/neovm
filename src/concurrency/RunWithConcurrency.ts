import { TerminationFlag } from "@/termination";
import { Concurrency } from "./Concurrency";
import { WorkerPool } from "./WorkerPool";
import { DefaultPool } from "./DefaultPool";
import { ParallelUtil } from "./ParallelUtil";

/**
 * Default value for how often a task is retried before giving up.
 * The default is so that retrying every millisecond will stop after about 3 days.
 */
const DEFAULT_MAX_NUMBER_OF_RETRIES = 2.5e8; // about 3 days in millis

/**
 * Parameters for ParallelUtil.runWithConcurrency().
 *
 * Create an instance by using the builder().
 */
export interface RunWithConcurrency {
  /**
   * The maximum concurrency for running the tasks.
   */
  concurrency(): Concurrency;

  /**
   * The tasks that will be executed.
   * Simple iterator of Runnable tasks - no fancy generics.
   */
  tasks(): Iterator<{ run(): void }>;

  /**
   * Force usage of executor even for single-threaded execution.
   */
  forceUsageOfExecutor(): boolean;

  /**
   * Wait time in milliseconds between retries.
   */
  waitMillis(): number;

  /**
   * Maximum number of retry attempts.
   */
  maxWaitRetries(): number;

  /**
   * Whether running tasks can be interrupted when cancelling.
   */
  mayInterruptIfRunning(): boolean;

  /**
   * Flag to check for early termination.
   */
  terminationFlag(): TerminationFlag;

  /**
   * The executor that will run the tasks.
   */
  executor(): WorkerPool | null;

  /**
   * Try to run all tasks for their side effects using at most concurrency() threads at once.
   */
  run(): Promise<void>;
}

export namespace RunWithConcurrency {
  /**
   * Builder for RunWithConcurrency parameters.
   */
  export class Builder {
    private _concurrency: Concurrency | null = null;
    private _tasks: Iterator<{ run(): void }> | null = null;
    private _forceUsageOfExecutor: boolean = false;
    private _waitMillis: number = 1;
    private _maxWaitRetries: number = DEFAULT_MAX_NUMBER_OF_RETRIES;
    private _mayInterruptIfRunning: boolean = true;
    private _terminationFlag: TerminationFlag = TerminationFlag.RUNNING_TRUE;
    private _executor: WorkerPool | null = DefaultPool.INSTANCE;

    /**
     * Sets the concurrency level.
     */
    public concurrency(concurrency: Concurrency | number): RunWithConcurrency.Builder {
      this._concurrency =
        typeof concurrency === "number"
          ? new Concurrency(concurrency)
          : concurrency;
      return this;
    }

    /**
     * Sets the tasks from an iterator.
     */
    public tasks(tasks: Iterator<{ run(): void }>): Builder;

    /**
     * Sets the tasks from an iterable.
     */
    public tasks(tasks: Iterable<{ run(): void }>): Builder;

    public tasks(
      tasks: Iterator<{ run(): void }> | Iterable<{ run(): void }>
    ): Builder {
      if (Symbol.iterator in tasks) {
        this._tasks = (tasks as Iterable<{ run(): void }>)[Symbol.iterator]();
      } else {
        this._tasks = tasks as Iterator<{ run(): void }>;
      }
      return this;
    }

    /**
     * Sets whether to force usage of executor.
     */
    public forceUsageOfExecutor(force: boolean = true): Builder {
      this._forceUsageOfExecutor = force;
      return this;
    }

    /**
     * Sets the wait time in milliseconds.
     */
    public waitMillis(waitMillis: number): Builder {
      this._waitMillis = waitMillis;
      return this;
    }

    /**
     * Sets the maximum number of retries.
     */
    public maxWaitRetries(maxWaitRetries: number): Builder {
      this._maxWaitRetries = maxWaitRetries;
      return this;
    }

    /**
     * Sets whether running tasks can be interrupted.
     */
    public mayInterruptIfRunning(mayInterrupt: boolean = true): Builder {
      this._mayInterruptIfRunning = mayInterrupt;
      return this;
    }

    /**
     * Sets the termination flag.
     */
    public terminationFlag(terminationFlag: TerminationFlag): Builder {
      this._terminationFlag = terminationFlag;
      return this;
    }

    // Add getter for the executor
    public get executor(): WorkerPool | null {
      return this._executor;
    }
    /**
     * Sets the executor.
     */
    public build(): RunWithConcurrency {
      if (!this._concurrency) {
        throw new Error("[concurrency] must be provided");
      }
      if (!this._tasks) {
        throw new Error("[tasks] must be provided");
      }

      // Validation
      if (this._concurrency.value() < 0) {
        throw new Error(
          `[concurrency] must be at least 0, but got ${this._concurrency.value()}`
        );
      }
      if (this._waitMillis < 0) {
        throw new Error(
          `[waitMillis] must be at least 0, but got ${this._waitMillis}`
        );
      }
      if (
        this._forceUsageOfExecutor &&
        !ParallelUtil.canRunInParallel(this._executor)
      ) {
        throw new Error(
          "[executor] cannot be used to run tasks because it is terminated or shut down"
        );
      }

      // Create the implementation
      const concurrency = this._concurrency;
      const tasks = this._tasks;
      const forceUsageOfExecutor = this._forceUsageOfExecutor;
      const waitMillis = this._waitMillis;
      const maxWaitRetries = this._maxWaitRetries;
      const mayInterruptIfRunning = this._mayInterruptIfRunning;
      const terminationFlag = this._terminationFlag;
      const executor = this._executor;

      return {
        concurrency: () => concurrency,
        tasks: () => tasks,
        forceUsageOfExecutor: () => forceUsageOfExecutor,
        waitMillis: () => waitMillis,
        maxWaitRetries: () => maxWaitRetries,
        mayInterruptIfRunning: () => mayInterruptIfRunning,
        terminationFlag: () => terminationFlag,
        executor: () => executor,

        async run(): Promise<void> {
          // Create RunWithConcurrencyParams object instead of passing `this`
          return ParallelUtil.runWithConcurrency({
            concurrency: concurrency, // Use captured values directly
            tasks: tasks,
            forceUsageOfExecutor: forceUsageOfExecutor,
            waitMillis: waitMillis,
            maxWaitRetries: maxWaitRetries,
            mayInterruptIfRunning: mayInterruptIfRunning,
            terminationFlag: terminationFlag,
            executor: executor,
          });
        },
      };
    }

    /**
     * Builds and immediately runs the tasks.
     */
    public async run(): Promise<void> {
      return this.build().run();
    }
  }

  /**
   * Returns a new Builder.
   */
  export function builder(): RunWithConcurrency.Builder {
    return new Builder();
  }

  /**
   * Helper function to create a runnable from a plain function.
   */
  export function runnable(fn: () => void): { run(): void } {
    return { run: fn };
  }

  /**
   * Helper function to convert array of functions to runnables.
   */
  export function runnables(functions: (() => void)[]): { run(): void }[] {
    return functions.map((fn) => ({ run: fn }));
  }
}
