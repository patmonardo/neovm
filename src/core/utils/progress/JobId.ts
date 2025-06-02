/**
 * Job identifier
 */
export class JobId {
  public static readonly EMPTY = new JobId("");

  constructor(public readonly value: string = JobId.generateUUID()) {}

  public static fromUUID(uuid: string): JobId {
    return new JobId(uuid);
  }

  public asString(): string {
    return this.value;
  }

  public toString(): string {
    return this.value;
  }

  // equals() for comparison if needed
  public equals(other: JobId): boolean {
    return this.value === other.value;
  }

  private static generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
}
