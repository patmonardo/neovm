import { WorkerFactory } from './WorkerFactory';
import { Worker } from 'worker_threads';

/**
 * Factory for creating named worker threads.
 *
 * Copied from Neo4j NamedThreadFactory - simplified for TypeScript/Web Workers.
 * Creates workers with consistent naming and priority handling.
 */
export class NamedThreadFactory implements WorkerFactory {
  private static readonly DEFAULT_THREAD_PRIORITY = 5;

  private readonly threadCounter = { value: 1 }; // Mutable counter object
  private readonly threadNamePrefix: string;
  private readonly priority: number;
  private readonly daemon: boolean;

  constructor(threadNamePrefix: string);
  constructor(threadNamePrefix: string, priority: number);
  constructor(threadNamePrefix: string, priority: number, daemon: boolean);
  constructor(
    threadNamePrefix: string,
    priority: number = NamedThreadFactory.DEFAULT_THREAD_PRIORITY,
    daemon: boolean = false
  ) {
    this.threadNamePrefix = threadNamePrefix;
    this.priority = priority;
    this.daemon = daemon;
  }

  /**
   * Creates a new worker thread with proper naming.
   */
  public newWorker(): Worker {
    const id = this.threadCounter.value++;
    const threadName = `${this.threadNamePrefix}-${id}`;

    // Create worker script with proper naming
    const workerScript = `
      // Set worker identity
      self.name = "${threadName}";
      self.isDaemon = ${this.daemon};
      self.priority = ${this.priority};

      // Basic task execution
      self.onmessage = function(event) {
        const { id, type, functionCode } = event.data;

        if (type !== 'task') {
          self.postMessage({
            id,
            type: 'error',
            error: 'Unknown message type: ' + type
          });
          return;
        }

        try {
          const result = eval('(' + functionCode + ')');
          self.postMessage({
            id,
            type: 'result',
            result: result
          });
        } catch (error) {
          self.postMessage({
            id,
            type: 'error',
            error: error.message,
            stack: error.stack
          });
        }
      };

      self.onerror = function(error) {
        console.error('Worker [${threadName}] error:', error);
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    // Set debugging properties on the worker
    Object.defineProperties(worker, {
      name: { value: threadName, writable: false },
      threadNamePrefix: { value: this.threadNamePrefix, writable: false },
      priority: { value: this.priority, writable: false },
      isDaemon: { value: this.daemon, writable: false }
    });

    // Clean up the blob URL
    URL.revokeObjectURL(url);

    return worker;
  }

  // Static factory methods with proper TypeScript overloads
  public static named(threadNamePrefix: string): NamedThreadFactory;
  public static named(threadNamePrefix: string, priority: number): NamedThreadFactory;
  public static named(threadNamePrefix: string, priority?: number): NamedThreadFactory {
    return new NamedThreadFactory(threadNamePrefix, priority!);
  }

  public static daemon(threadNamePrefix: string): NamedThreadFactory {
    return new NamedThreadFactory(threadNamePrefix, NamedThreadFactory.DEFAULT_THREAD_PRIORITY, true);
  }
}
