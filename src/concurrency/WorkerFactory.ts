// import { Worker } from "@/concurrency";
import { Worker } from "worker_threads";

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Factory for creating worker threads.
 */
export interface WorkerFactory {
  newWorker(): Worker;
}

export namespace WorkerFactory {
  export function daemon(prefix: string): WorkerFactory {
    return new DaemonWorkerFactory(prefix);
  }

  export function named(prefix: string): WorkerFactory {
    return new NamedWorkerFactory(prefix);
  }
}

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

  private createWorkerScript(): string {
    if (this.isBrowser()) {
      return this.createBrowserWorkerScript();
    } else {
      return this.createNodeWorkerScript();
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof Blob !== 'undefined';
  }

  /**
   * Create worker script for browser (Blob URL)
   */
  private createBrowserWorkerScript(): string {
    const script = `
      self.onmessage = function(event) {
        const { id, type, functionCode } = event.data;
        if (type !== 'task') {
          self.postMessage({ id, type: 'error', error: 'Unknown message type: ' + type });
          return;
        }
        try {
          const result = eval('(' + functionCode + ')');
          self.postMessage({ id, type: 'result', result: result });
        } catch (error) {
          self.postMessage({ id, type: 'error', error: error.message, stack: error.stack });
        }
      };
    `;

    const blob = new Blob([script], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }

  /**
   * Create worker script for Node.js (temporary file)
   */
  private createNodeWorkerScript(): string {
    const script = `
      const { parentPort } = require('worker_threads');

      parentPort.on('message', (data) => {
        const { id, type, functionCode } = data;

        if (type !== 'task') {
          parentPort.postMessage({ id, type: 'error', error: 'Unknown message type: ' + type });
          return;
        }

        try {
          const result = eval('(' + functionCode + ')');
          parentPort.postMessage({ id, type: 'result', result: result });
        } catch (error) {
          parentPort.postMessage({ id, type: 'error', error: error.message, stack: error.stack });
        }
      });
    `;

    // Create temporary file for Node.js worker
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.js`);

    fs.writeFileSync(tempFile, script);
    return tempFile;
  }
}

class NamedWorkerFactory extends DaemonWorkerFactory {
  // Same implementation for now
}
