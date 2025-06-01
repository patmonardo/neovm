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
