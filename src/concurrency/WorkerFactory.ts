/**
 * Factory for creating worker threads.
 */
export interface WorkerFactory {
  /**
   * Creates a new worker
   * 
   * @returns A new worker
   */
  newWorker(): Worker;
}

/**
 * Standard implementations of WorkerFactory
 */
export namespace WorkerFactory {
  /**
   * Creates a worker factory that names workers with the given prefix
   * 
   * @param prefix The prefix for worker names
   * @returns A new WorkerFactory
   */
  export function daemon(prefix: string): WorkerFactory {
    return new DaemonWorkerFactory(prefix);
  }
  
  /**
   * Creates a worker factory for named non-daemon workers
   * 
   * @param prefix The prefix for worker names
   * @returns A new WorkerFactory
   */
  export function named(prefix: string): WorkerFactory {
    return new NamedWorkerFactory(prefix);
  }
}

/**
 * A worker factory that creates daemon workers (background workers that won't
 * prevent the application from exiting)
 */
class DaemonWorkerFactory implements WorkerFactory {
  private workerIndex = 0;
  
  /**
   * Creates a new daemon worker factory
   * 
   * @param prefix The prefix for worker names
   */
  constructor(private readonly prefix: string) {}
  
  /**
   * Creates a new daemon worker
   */
  public newWorker(): Worker {
    const worker = new Worker(this.getWorkerScript());
    worker.name = `${this.prefix}-${this.workerIndex++}`;
    return worker;
  }
  
  /**
   * Gets the source for the worker script
   */
  private getWorkerScript(): string {
    // In a real implementation, this would return a URL to a worker script
    // For this example, we'll return a blob URL with a minimal worker script
    const script = `
      self.onmessage = function(e) {
        try {
          const result = e.data.task();
          self.postMessage({ result });
        } catch (error) {
          self.postMessage({ error: error.message });
        }
      };
    `;
    
    const blob = new Blob([script], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }
}

/**
 * A worker factory that creates named workers
 */
class NamedWorkerFactory implements WorkerFactory {
  private workerIndex = 0;
  
  /**
   * Creates a new named worker factory
   * 
   * @param prefix The prefix for worker names
   */
  constructor(private readonly prefix: string) {}
  
  /**
   * Creates a new named worker
   */
  public newWorker(): Worker {
    const worker = new Worker(this.getWorkerScript());
    worker.name = `${this.prefix}-${this.workerIndex++}`;
    return worker;
  }
  
  /**
   * Gets the source for the worker script
   */
  private getWorkerScript(): string {
    // Same as DaemonWorkerFactory for this example
    const script = `
      self.onmessage = function(e) {
        try {
          const result = e.data.task();
          self.postMessage({ result });
        } catch (error) {
          self.postMessage({ error: error.message });
        }
      };
    `;
    
    const blob = new Blob([script], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }
}