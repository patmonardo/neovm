/**
 * STATIC CAPABILITIES - DEFAULT WRITE MODE LOCAL
 */

import { Capabilities, WriteMode } from './Capabilities';

export class StaticCapabilities implements Capabilities {
  constructor(private readonly _writeMode: WriteMode = WriteMode.LOCAL) {}

  writeMode(): WriteMode {
    return this._writeMode;
  }

  canWriteToLocalDatabase(): boolean {
    return this._writeMode === WriteMode.LOCAL;
  }

  canWriteToRemoteDatabase(): boolean {
    return this._writeMode === WriteMode.REMOTE;
  }

  static of(writeMode: WriteMode = WriteMode.LOCAL): StaticCapabilities {
    return new StaticCapabilities(writeMode);
  }
}
