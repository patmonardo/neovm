/**
 * Executes a function and catches any thrown errors, adding them to the provided errors array.
 * This is a conceptual equivalent to ErrorPropagator.catchAndPropagateIllegalArgumentError.
 *
 * @param action The function to execute.
 * @param errorsArray The array where caught errors will be pushed.
 * @param errorType (Optional) The specific error constructor to catch (e.g., Error, TypeError). Defaults to Error.
 */
export function tryCatch<T extends Error>(
  action: () => void,
  errorsArray: T[],
  errorType: new (...args: any[]) => T = Error as new (...args: any[]) => T
): void {
  try {
    action();
  } catch (e) {
    if (e instanceof errorType) {
      errorsArray.push(e as T);
    } else {
      // If it's not the expected error type, rethrow it or handle differently
      // For simplicity here, we'll rethrow if it's not a generic Error.
      // In a real scenario, you might have more sophisticated handling.
      if (e instanceof Error) {
          // If you want to collect all errors, even if not of the specific type:
          // errorsArray.push(e as T); // This might require T to be just Error
          console.warn(`Caught an unexpected error type: ${e.constructor.name}. It was not added to the specific errors array but could be handled globally.`);
          throw e; // Or handle as a generic error
      } else {
        // If it's not even an Error instance (e.g., a string was thrown)
        errorsArray.push(new Error(`Non-Error thrown: ${String(e)}`) as T);
      }
    }
  }
}

export class AggregateError extends Error {
  public readonly errors: Error[];

  constructor(errors: Error[], message?: string) {
    const combinedMessage = message ||
      `Multiple errors occurred: \n${errors.map((err, i) => `  ${i+1}. ${err.message}`).join('\n')}`;
    super(combinedMessage);
    this.name = "AggregateError";
    this.errors = errors;

    // For environments that support it, you can set the cause.
    // If there's one primary error and others are "suppressed", you might set the first as cause.
    // Or, if this AggregateError is the primary cause, you might not set it here.
    // if (errors.length > 0) {
    //   this.cause = errors[0]; // Example
    // }

    // Ensure the prototype chain is correctly set up
    Object.setPrototypeOf(this, AggregateError.prototype);
  }
}


/**
 * Checks an array of errors. If not empty, throws either the single error
 * or an AggregateError combining multiple errors.
 * This is a conceptual equivalent to ErrorPropagator.combineCollectedErrors.
 *
 * @param errorsArray The array of collected errors.
 * @param aggregateErrorMessagePrefix Optional prefix for the combined error message.
 */
export function processAndThrowCollectedErrors(
  errorsArray: Error[],
  aggregateErrorMessagePrefix: string = "Multiple configuration errors found:"
): void {
  if (errorsArray.length === 0) {
    return; // No errors to process
  }

  if (errorsArray.length === 1) {
    throw errorsArray[0];
  } else {
    // Create a message that lists all individual error messages
    const messages = errorsArray.map(err => err.message).join(`\n  - `);
    const combinedMessage = `${aggregateErrorMessagePrefix}\n  - ${messages}`;

    // Throw a new AggregateError that holds all the individual errors
    throw new AggregateError(errorsArray, combinedMessage);
  }
}
