
export enum LicenseState {
  /**
   * Indicates that the license is valid and the software is fully functional.
   */
  VALID = "VALID",
  /**
   * Indicates that the license is invalid, expired, or not present.
   * The software may be in a limited functionality mode or completely disabled.
   */
  INVALID = "INVALID",
  /**
   * Indicates that the license is in a trial period.
   * The software may have limited functionality or time constraints.
   */
  TRIAL = "TRIAL",
  /**
   * Indicates that the license is in a grace period.
   * The software may continue to function for a limited time while the user resolves licensing issues.
   */
  GRACE = "GRACE",
  /**
   * Indicates that the license is in a suspended state.
   * The software may be disabled or have limited functionality until the issue is resolved.
   */
  SUSPENDED = "SUSPENDED",
  /**
   * Indicates that the license is in a pending state.
   * The software may be functional, but the license is not yet fully activated or confirmed.
   */
  PENDING = "PENDING",
  /**
   * Indicates that the license is in a revoked state.
   * The software is disabled or has limited functionality due to a licensing issue.
   */
  REVOKED = "REVOKED",
  /**
   * Indicates that the license is in a not applicable state.
   * The software may not require a license or the licensing system is not applicable.
   */
  NOT_APPLICABLE = "NOT_APPLICABLE",
  /**
   * Indicates that the license is in an unknown state.
   * The software may be functional, but the licensing status is uncertain.
   */
  UNKNOWN = "UNKNOWN",
}
