import { Concurrency } from './Concurrency';
import { TerminationFlag } from '../termination/TerminationFlag';
import { WorkerPool } from './WorkerPool';
import { ParallelUtil } from './ParallelUtil';

/**
 * Parameters for running tasks with concurrency.
 * Used with ParallelUtil.runWithConcurrency.
 */
export interface RunWithConcurrency {
  /**
   * The maximum concurrency for running the tasks.
   */
  concurrency: Concurrency;

  /**
   * The tasks that will be executed.
   */
  tasks: Iterator<() => void> | Array<() => void>;

  /**
   * Whether to force usage of the executor even for single-threaded execution.
   */
  forceUsageOfExecutor: boolean;

  /**
   * The time to wait between retries in milliseconds.
   */
  waitMillis: number;

  /**
   * The maximum number of retry attempts.
   */
  maxWaitRetries: number;

  /**
   * Whether running tasks can be interrupted when cancelling.
   */
  mayInterruptIfRunning: boolean;

  /**
   * Flag to check for early termination.
   */
  terminationFlag: TerminationFlag;

  /**
   * The worker pool to use.
   */
  executor: WorkerPool | null;

  /**
   * Runs all tasks using the specified parameters.
   */
  run(): Promise<void>;
}

/**
 * Default maximum number of retries.
 * Approximately 3 days if retrying every millisecond.
 */
const DEFAULT_MAX_NUMBER_OF_RETRIES = 2.5e8; // about 3 days in milliseconds

/**
 * Builder for RunWithConcurrency parameters.
 */
export class RunWithConcurrencyBuilder {
  private _concurrency: Concurrency | null = null;
  private _tasks: Iterator<() => void> | Array<() => void> | null = null;
  private _forceUsageOfExecutor: boolean = false;
  private _waitMillis: number = 1;
  private _maxWaitRetries: number = DEFAULT_MAX_NUMBER_OF_RETRIES;
  private _mayInterruptIfRunning: boolean = true;
  private _terminationFlag: TerminationFlag = TerminationFlag.RUNNING;
  private _executor: WorkerPool | null = WorkerPool.defaultPool();

  /**
   * Sets the concurrency level.
   */
  public concurrency(concurrency: Concurrency | number): RunWithConcurrencyBuilder {
    this._concurrency = concurrency instanceof Concurrency
      ? concurrency
      : new Concurrency(concurrency);
    return this;
  }

  /**
   * Sets the tasks to run from an iterator.
   */
  public tasks(tasks: Iterator<() => void>): RunWithConcurrencyBuilder;

  /**
   * Sets the tasks to run from an array.
   */
  public tasks(tasks: Array<() => void>): RunWithConcurrencyBuilder;

  /**
   * Sets the tasks to run from an iterable.
   */
  public tasks(tasks: Iterable<() => void>): RunWithConcurrencyBuilder;

  public tasks(
    tasks: Iterator<() => void> | Array<() => void> | Iterable<() => void>
  ): RunWithConcurrencyBuilder {
    if (Array.isArray(tasks)) {
      this._tasks = tasks;
    } else if (Symbol.iterator in tasks) {
      this._tasks = Array.from(tasks);
    } else {
      this._tasks = tasks;
    }
    return this;
  }

  /**
   * Sets whether to force usage of the executor even for single-threaded execution.
   */
  public forceUsageOfExecutor(force: boolean = true): RunWithConcurrencyBuilder {
    this._forceUsageOfExecutor = force;
    return this;
  }

  /**
   * Sets the time to wait between retries in milliseconds.
   */
  public waitMillis(waitMillis: number): RunWithConcurrencyBuilder {
    if (waitMillis < 0) {
      throw new Error(`[waitMillis] must be at least 0, but got ${waitMillis}`);
    }
    this._waitMillis = waitMillis;
    return this;
  }

  /**
   * Sets the maximum number of retry attempts.
   */
  public maxWaitRetries(maxWaitRetries: number): RunWithConcurrencyBuilder {
    if (maxWaitRetries < 0) {
      throw new Error(`[maxWaitRetries] must be at least 0, but got ${maxWaitRetries}`);
    }
    this._maxWaitRetries = maxWaitRetries;
    return this;
  }

  /**
   * Sets whether running tasks can be interrupted when cancelling.
   */
  public mayInterruptIfRunning(mayInterrupt: boolean = true): RunWithConcurrencyBuilder {
    this._mayInterruptIfRunning = mayInterrupt;
    return this;
  }

  /**
   * Sets the flag to check for early termination.
   */
  public terminationFlag(terminationFlag: TerminationFlag): RunWithConcurrencyBuilder {
    this._terminationFlag = terminationFlag;
    return this;
  }

  /**
   * Sets the worker pool to use.
   */
  public executor(executor: WorkerPool | null): RunWithConcurrencyBuilder {
    this._executor = executor;
    return this;
  }

  /**
   * Builds and returns a RunWithConcurrency object.
   */
  public build(): RunWithConcurrency {
    if (!this._concurrency) {
      throw new Error("[concurrency] must be provided");
    }

    if (!this._tasks) {
      throw new Error("[tasks] must be provided");
    }

    if (this._concurrency.value() < 0) {
      throw new Error(`[concurrency] must be at least 0, but got ${this._concurrency.value()}`);
    }

    if (this._forceUsageOfExecutor && !ParallelUtil.canRunInParallel(this._executor)) {
      throw new Error(
        "[executor] cannot be used to run tasks because it is terminated or shut down."
      );
    }

    const params = {
      concurrency: this._concurrency,
      tasks: this._tasks,
      forceUsageOfExecutor: this._forceUsageOfExecutor,
      waitMillis: this._waitMillis,
      maxWaitRetries: this._maxWaitRetries,
      mayInterruptIfRunning: this._mayInterruptIfRunning,
      terminationFlag: this._terminationFlag,
      executor: this._executor,

      async run(): Promise<void> {
        return ParallelUtil.runWithConcurrency(params);
      }
    };

    return params;
  }

  /**
   * Builds the RunWithConcurrency object and runs it.
   */
  public async run(): Promise<void> {
    return this.build().run();
  }
}

/**
 * Creates a new RunWithConcurrencyBuilder.
 */
export function runWithConcurrency(): RunWithConcurrencyBuilder {
  return new RunWithConcurrencyBuilder();
}
