/**
 * Factory for creating worker threads.
 */
export interface WorkerFactory {
  /**
   * Creates a new worker
   */
  newWorker(): Worker;
}

export namespace WorkerFactory {
  /**
   * Creates a worker factory that creates daemon workers
   */
  export function daemon(prefix: string): WorkerFactory {
    return new DaemonWorkerFactory(prefix);
  }

  /**
   * Creates a worker factory for named workers
   */
  export function named(prefix: string): WorkerFactory {
    return new NamedWorkerFactory(prefix);
  }
}

/**
 * Worker factory that creates proper Web Workers with task execution capability.
 */
class DaemonWorkerFactory implements WorkerFactory {
  private workerIndex = 0;

  constructor(private readonly prefix: string) {}

  public newWorker(): Worker {
    const workerScript = this.createWorkerScript();
    const worker = new Worker(workerScript);

    // Set worker name for debugging
    Object.defineProperty(worker, 'name', {
      value: `${this.prefix}-${this.workerIndex++}`,
      writable: false
    });

    return worker;
  }

  /**
   * Creates the worker script that handles task execution.
   */
  private createWorkerScript(): string {
    const script = `
      // Worker script for task execution
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
          // Execute the task function
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
        console.error('Worker error:', error);
      };
    `;

    const blob = new Blob([script], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }
}

class NamedWorkerFactory extends DaemonWorkerFactory {
  // Same implementation for now - could add different behavior later
}
