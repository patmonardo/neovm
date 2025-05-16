import { Capabilities, CapabilitiesDefaults } from './Capabilities';
import { WriteMode } from './WriteMode';

/**
 * Extends base Capabilities with specific default behaviors,
 * typically for a static or unchanging capabilities context.
 */
export interface StaticCapabilities extends Capabilities {
  // writeMode() is inherited and will have a default in the concrete class.
  // canWriteToLocalDatabase() is inherited and will use CapabilitiesDefaults.
  // canWriteToRemoteDatabase() is inherited and will use CapabilitiesDefaults.
}

// --- Concrete Implementation (like ImmutableStaticCapabilities) ---

class ConcreteStaticCapabilities implements StaticCapabilities {
  private readonly _writeMode: WriteMode;

  // Lazy loaded properties
  private _canWriteToLocalDatabase: boolean | undefined = undefined;
  private _canWriteToRemoteDatabase: boolean | undefined = undefined;

  constructor(builder: ConcreteStaticCapabilitiesBuilder) {
    this._writeMode = builder.getWriteMode();
  }

  public writeMode(): WriteMode {
    return this._writeMode;
  }

  public canWriteToLocalDatabase(): boolean {
    if (this._canWriteToLocalDatabase === undefined) {
      // This mimics Capabilities.super.canWriteToLocalDatabase()
      // by calling the default logic defined for the Capabilities interface.
      this._canWriteToLocalDatabase = CapabilitiesDefaults.canWriteToLocalDatabase(this.writeMode());
    }
    return this._canWriteToLocalDatabase;
  }

  public canWriteToRemoteDatabase(): boolean {
    if (this._canWriteToRemoteDatabase === undefined) {
      // This mimics Capabilities.super.canWriteToRemoteDatabase()
      this._canWriteToRemoteDatabase = CapabilitiesDefaults.canWriteToRemoteDatabase(this.writeMode());
    }
    return this._canWriteToRemoteDatabase;
  }

  public static builder(): ConcreteStaticCapabilitiesBuilder {
    return new ConcreteStaticCapabilitiesBuilder();
  }
}

class ConcreteStaticCapabilitiesBuilder {
  private _writeMode: WriteMode = WriteMode.LOCAL; // Default from @Value.Default

  public writeMode(mode: WriteMode): ConcreteStaticCapabilitiesBuilder {
    this._writeMode = mode;
    return this;
  }

  public getWriteMode(): WriteMode { // Getter for the constructor
      return this._writeMode;
  }

  public build(): StaticCapabilities {
    return new ConcreteStaticCapabilities(this);
  }
}

// Factory to mimic static methods on the interface if desired, or direct builder usage
export const StaticCapabilitiesFactory = {
  builder: ConcreteStaticCapabilities.builder,
  // Example of creating a default instance
  createDefault: (): StaticCapabilities => ConcreteStaticCapabilities.builder().build(),
};
