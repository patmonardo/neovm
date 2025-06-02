import { Task } from './Task';

/**
 * Immutable progress value representing task completion state.
 * This is both the interface AND the concrete implementation.
 */
export class Progress {
  public readonly currentProgress: number;
  public readonly volume: number;
  private _relativeProgress?: number;

  constructor(currentProgress: number, volume: number) {
    this.currentProgress = currentProgress;
    this.volume = volume;
  }

  public get relativeProgress(): number {
    if (this._relativeProgress === undefined) {
      this._relativeProgress = this.calculateRelativeProgress();
    }
    return this._relativeProgress;
  }

  private calculateRelativeProgress(): number {
    if (this.volume === Task.UNKNOWN_VOLUME) {
      return Task.UNKNOWN_VOLUME;
    }
    return this.currentProgress >= this.volume ? 1.0 : this.currentProgress / this.volume;
  }

  public getPercentage(): number {
    const relative = this.relativeProgress;
    if (relative === Task.UNKNOWN_VOLUME) {
      return this.currentProgress > 0 ? 100 : 0;
    }
    return Math.min(100, relative * 100);
  }

  public isComplete(): boolean {
    return this.volume !== Task.UNKNOWN_VOLUME && this.currentProgress >= this.volume;
  }

  public hasUnknownVolume(): boolean {
    return this.volume === Task.UNKNOWN_VOLUME;
  }

  // Java compatibility getters - THE ONE TRUE WAY
  public getCurrentProgress(): number {
    return this.currentProgress;
  }

  public getVolume(): number {
    return this.volume;
  }

  public toString(): string {
    const volumeStr = this.volume === Task.UNKNOWN_VOLUME ? 'unknown' : this.volume.toString();
    const percentage = this.getPercentage().toFixed(1);
    return `Progress{${this.currentProgress}/${volumeStr} (${percentage}%)}`;
  }

  public equals(other: Progress): boolean {
    return this.currentProgress === other.currentProgress && this.volume === other.volume;
  }

  /**
   * Static factory method - THE ONE TRUE WAY to create Progress.
   */
  public static of(currentProgress: number, volume: number): Progress {
    return new Progress(currentProgress, volume);
  }

  /**
   * Create zero progress with given volume.
   */
  public static zero(volume: number = 0): Progress {
    return new Progress(0, volume);
  }

  /**
   * Create completed progress.
   */
  public static completed(volume: number): Progress {
    return new Progress(volume, volume);
  }

  /**
   * Create progress with unknown volume.
   */
  public static unknown(currentProgress: number = 0): Progress {
    return new Progress(currentProgress, Task.UNKNOWN_VOLUME);
  }
}
