/**
 * CAPABILITIES - WRITE MODE INTERFACE
 */

export enum WriteMode {
  LOCAL = 'LOCAL',
  REMOTE = 'REMOTE',
  NONE = 'NONE'
}

export interface Capabilities {
  writeMode(): WriteMode;

  canWriteToLocalDatabase(): boolean;

  canWriteToRemoteDatabase(): boolean;
}

/**
 * Default capabilities implementation.
 */
export class DefaultCapabilities implements Capabilities {
  constructor(private _writeMode: WriteMode) {}

  writeMode(): WriteMode {
    return this._writeMode;
  }

  canWriteToLocalDatabase(): boolean {
    return this._writeMode === WriteMode.LOCAL;
  }

  canWriteToRemoteDatabase(): boolean {
    return this._writeMode === WriteMode.REMOTE;
  }

  static readonly LOCAL = new DefaultCapabilities(WriteMode.LOCAL);
  static readonly REMOTE = new DefaultCapabilities(WriteMode.REMOTE);
  static readonly READ_ONLY = new DefaultCapabilities(WriteMode.NONE);
}
