/**
 * Data Transfer Object for capabilities CSV serialization.
 */
export interface CapabilitiesDTO {
  canWriteToDatabase: boolean;
  canWriteToLocalFile: boolean;
  writeMode: string;
}

export class CapabilitiesDTO {
  /**
   * Convert Capabilities to DTO for CSV export.
   */
  static from(capabilities: Capabilities): CapabilitiesDTO {
    return {
      canWriteToDatabase: capabilities.canWriteToDatabase(),
      canWriteToLocalFile: capabilities.canWriteToLocalFile(),
      writeMode: capabilities.writeMode().toString()
    };
  }

  /**
   * Convert DTO back to Capabilities (for CSV import).
   */
  static to(dto: CapabilitiesDTO): Capabilities {
    const writeMode = WriteMode[dto.writeMode as keyof typeof WriteMode] || WriteMode.LOCAL;

    return new StaticCapabilities(
      dto.canWriteToDatabase,
      dto.canWriteToLocalFile,
      writeMode
    );
  }
}
