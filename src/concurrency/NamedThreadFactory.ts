/**
 * Factory for creating named worker threads.
 */
export class NamedThreadFactory implements WorkerFactory {
  /**
   * Monitor interface for tracking worker lifecycle events.
   */
  public interface Monitor {
    /**
     * Called when a new worker thread is created.
     * 
     * @param threadNamePrefix The prefix of the thread name
     */
    threadCreated(threadNamePrefix: string): void;

    /**
     * Called when a worker thread has finished execution.
     * 
     * @param threadNamePrefix The prefix of the thread name
     */
    threadFinished(threadNamePrefix: string): void;
  }

  /**
   * A no-op monitor implementation that does nothing.
   */
  public static readonly NO_OP_MONITOR: Monitor = {
    threadCreated: (_threadNamePrefix: string) => {},
    threadFinished: (_threadNamePrefix: string) => {}
  };

  /**
   * Default thread priority (normal)
   */
  private static readonly DEFAULT_THREAD_PRIORITY = 5; // Equivalent to Thread.NORM_PRIORITY

  private readonly threadCounter = { value: 1 };
  private readonly threadNamePrefix: string;
  private readonly priority: number;
  private readonly daemon: boolean;
  private readonly monitor: Monitor;

  /**
   * Creates a new named thread factory.
   * 
   * @param threadNamePrefix The prefix for thread names
   */
  constructor(threadNamePrefix: string);

  /**
   * Creates a new named thread factory with the specified priority.
   * 
   * @param threadNamePrefix The prefix for thread names
   * @param priority The priority for created threads (1-10)
   */
  constructor(threadNamePrefix: string, priority: number);

  /**
   * Creates a new named thread factory with the specified priority and monitor.
   * 
   * @param threadNamePrefix The prefix for thread names
   * @param priority The priority for created threads (1-10)
   * @param monitor The monitor to notify of thread lifecycle events
   */
  constructor(threadNamePrefix: string, priority: number, monitor: Monitor);

  /**
   * Creates a new named thread factory with the specified parameters.
   * 
   * @param threadNamePrefix The prefix for thread names
   * @param priority The priority for created threads (1-10)
   * @param monitor The monitor to notify of thread lifecycle events
   * @param daemon Whether the created threads should be daemon threads
   */
  constructor(
    threadNamePrefix: string, 
    priority: number = NamedThreadFactory.DEFAULT_THREAD_PRIORITY,
    monitor: Monitor = NamedThreadFactory.NO_OP_MONITOR,
    daemon: boolean = false
  ) {
    this.threadNamePrefix = threadNamePrefix;
    this.priority = priority;
    this.daemon = daemon;
    this.monitor = monitor;
  }

  /**
   * Creates a new worker thread for the given task.
   * 
   * @returns A new worker instance
   */
  public newWorker(): Worker {
    const id = this.threadCounter.value++;
    const threadName = `${this.threadNamePrefix}-${id}`;
    
    // Create the worker script with appropriate wrapper for monitoring
    const workerScript = `
      // Worker name: ${threadName}
      self.name = "${threadName}";
      self.isDaemon = ${this.daemon};
      self.priority = ${this.priority};
      
      // Message handler
      self.onmessage = function(e) {
        try {
          const result = e.data.task();
          self.postMessage({ result });
        } catch (error) {
          self.postMessage({ error: error.message });
        }
      };
    `;
    
    // Create a blob URL from the script
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    
    // Create the worker
    const worker = new Worker(url);
    
    // Set a name property for debugging
    worker.name = threadName;
    
    // Release the blob URL after worker is created
    URL.revokeObjectURL(url);
    
    // Notify the monitor
    this.monitor.threadCreated(this.threadNamePrefix);
    
    // Set up termination handler to notify monitor
    const originalTerminate = worker.terminate;
    worker.terminate = () => {
      this.monitor.threadFinished(this.threadNamePrefix);
      return originalTerminate.call(worker);
    };
    
    return worker;
  }

  /**
   * Creates a named thread factory.
   * 
   * @param threadNamePrefix The prefix for thread names
   * @returns A new thread factory
   */
  public static named(threadNamePrefix: string): NamedThreadFactory;
  
  /**
   * Creates a named thread factory with the specified priority.
   * 
   * @param threadNamePrefix The prefix for thread names
   * @param priority The priority for created threads (1-10)
   * @returns A new thread factory
   */
  public static named(threadNamePrefix: string, priority: number): NamedThreadFactory;
  
  public static named(threadNamePrefix: string, priority?: number): NamedThreadFactory {
    if (priority === undefined) {
      return new NamedThreadFactory(threadNamePrefix);
    }
    return new NamedThreadFactory(threadNamePrefix, priority);
  }

  /**
   * Creates a daemon thread factory.
   * 
   * @param threadNamePrefix The prefix for thread names
   * @returns A new daemon thread factory
   */
  public static daemon(threadNamePrefix: string): NamedThreadFactory;
  
  /**
   * Creates a daemon thread factory with the specified monitor.
   * 
   * @param threadNamePrefix The prefix for thread names
   * @param monitor The monitor to notify of thread lifecycle events
   * @returns A new daemon thread factory
   */
  public static daemon(threadNamePrefix: string, monitor: Monitor): NamedThreadFactory;
  
  public static daemon(threadNamePrefix: string, monitor?: Monitor): NamedThreadFactory {
    if (monitor === undefined) {
      return new NamedThreadFactory(
        threadNamePrefix, 
        NamedThreadFactory.DEFAULT_THREAD_PRIORITY, 
        NamedThreadFactory.NO_OP_MONITOR,
        true
      );
    }
    return new NamedThreadFactory(
      threadNamePrefix,
      NamedThreadFactory.DEFAULT_THREAD_PRIORITY,
      monitor,
      true
    );
  }
}

/**
 * Interface for factories that create worker threads.
 */
export interface WorkerFactory {
  /**
   * Creates a new worker thread.
   * 
   * @returns A new worker instance
   */
  newWorker(): Worker;
}

/**
 * Extends the Worker interface with additional properties
 */
declare global {
  interface Worker {
    /**
     * Name for the worker (for debugging purposes)
     */
    name?: string;
  }
}