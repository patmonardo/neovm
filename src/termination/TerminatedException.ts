/**
 * Exception thrown when a process is terminated.
 */
export class TerminatedException extends Error {
  /**
   * Creates a new TerminatedException with the default message.
   */
  constructor() {
    super("The execution has been terminated.");
    this.name = "TerminatedException";
  }
}