/**
 * Represents a time zone identifier, typically an IANA time zone name.
 * Examples: "UTC", "America/New_York", "Europe/Berlin".
 */
export type ZoneId = string;

/**
 * Time utility functions.
 * This is a TypeScript translation of GDS's org.neo4j.gds.core.utils.TimeUtil.
 */
export class TimeUtil {
  /**
   * Private constructor to prevent instantiation of this utility class.
   */
  private constructor() {}

  /**
   * Returns a JavaScript `Date` object representing the current moment in time.
   *
   * The original Java method `ZonedDateTime.now(ZoneId zoneId)` returns a `ZonedDateTime`
   * object, which encapsulates both an instant and a specific time zone.
   * JavaScript's `Date` object, by contrast, represents an instant in time (internally UTC)
   * and does not carry explicit time zone information in the same way.
   *
   * This method returns `new Date()`, which captures the current instant.
   * The `zoneId` parameter from the original Java method is included in the signature
   * for consistency but is not directly used to alter the returned `Date` object's
   * internal value. If operations specific to the `zoneId` (e.g., getting the
   * wall-clock hour in that zone) are required, a date-time library with
   * time zone support would be necessary.
   *
   * The Java implementation uses `Clock.system(zoneId)` which refers to the actual
   * system clock, not a potentially mocked clock from `ClockService`. Thus, `new Date()`
   * aligns with this intent of getting the true current time.
   *
   * @param zoneId An optional time zone ID (e.g., "UTC", "America/New_York").
   *               In the original Java, if null, it defaults to the system's time zone.
   *               Here, it's primarily for signature compatibility.
   * @returns A `Date` object representing the current instant.
   */
  public static now(_zoneId?: ZoneId | null): Date {
    // new Date() creates a Date object representing the current instant in time.
    // This is equivalent to the instant captured by ZonedDateTime.now(someZone).
    // The `_zoneId` parameter is kept for signature consistency with the Java method
    // but is not used in this vanilla JavaScript implementation to modify the Date object's value.
    return new Date();
  }
}
