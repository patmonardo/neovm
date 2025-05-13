/**
 * Custom error class to indicate that a memory reservation attempt failed
 * because the requested amount exceeded the available memory.
 */
export class MemoryReservationExceededException extends Error {
  /**
   * The number of bytes that were requested.
   */
  public readonly bytesRequired: number;

  /**
   * The number of bytes that were available at the time of the request.
   */
  public readonly bytesAvailable: number;

  /**
   * Creates an instance of MemoryReservationExceededException.
   *
   * @param bytesRequired The number of bytes that were requested.
   * @param bytesAvailable The number of bytes that were available.
   * @param message An optional custom message for the error. If not provided, a default message is generated.
   */
  constructor(bytesRequired: number, bytesAvailable: number, message?: string) {
    const defaultMessage = `Memory reservation failed. Required: ${bytesRequired} bytes, Available: ${bytesAvailable} bytes.`;
    super(message || defaultMessage);
    this.name = "MemoryReservationExceededException"; // Standard practice for custom errors

    this.bytesRequired = bytesRequired;
    this.bytesAvailable = bytesAvailable;

    // This line is needed to restore the prototype chain in older JS environments,
    // but generally good practice for custom errors in TypeScript.
    Object.setPrototypeOf(this, MemoryReservationExceededException.prototype);
  }

  /**
   * Gets the number of bytes that were required for the failed reservation.
   * @returns The number of bytes required.
   */
  public getBytesRequired(): number {
    return this.bytesRequired;
  }

  /**
   * Gets the number of bytes that were available when the reservation was attempted.
   * @returns The number of bytes available.
   */
  public getBytesAvailable(): number {
    return this.bytesAvailable;
  }
}

// Example Usage:
// try {
//   // ... some operation that might throw this error ...
//   const required = 1024n * 1024n * 100n; // 100MB
//   const available = 1024n * 1024n * 50n;  // 50MB
//   if (required > available) {
//     throw new MemoryReservationExceededException(required, available);
//   }
// } catch (e) {
//   if (e instanceof MemoryReservationExceededException) {
//     console.error(`Error: ${e.message}`);
//     console.error(`Bytes Required: ${e.bytesRequired}`);
//     console.error(`Bytes Available: ${e.bytesAvailable}`);
//     // console.error(`Bytes Required (getter): ${e.getBytesRequired()}`);
//   } else {
//     console.error(`An unexpected error occurred: ${e}`);
//   }
// }
