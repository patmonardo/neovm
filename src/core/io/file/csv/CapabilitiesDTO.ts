/**
 * CAPABILITIES DTO - CSV SERIALIZATION
 */

import { Capabilities, WriteMode } from '@/core/loading/Capabilities';
import { StaticCapabilities } from '@/core/loading/StaticCapabilities';

export class CapabilitiesDTO extends StaticCapabilities {
  constructor(writeMode: WriteMode = WriteMode.LOCAL) {
    super(writeMode);
  }

  static from(capabilities: Capabilities): CapabilitiesDTO {
    return new CapabilitiesDTO(capabilities.writeMode());
  }

  static of(writeMode: WriteMode = WriteMode.LOCAL): CapabilitiesDTO {
    return new CapabilitiesDTO(writeMode);
  }
}
