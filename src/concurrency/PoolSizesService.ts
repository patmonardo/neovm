import { PoolSizes } from './PoolSizes';

/**
 * Service to provide pool sizes configuration.
 * This can be overridden to provide custom pool sizes.
 */
export class PoolSizesService {
  private static _instance: PoolSizesService | null = null;
  private _poolSizes: PoolSizes;

  /**
   * Creates a new PoolSizesService with the specified pool sizes
   * 
   * @param poolSizes The pool sizes configuration
   */
  constructor(poolSizes: PoolSizes = PoolSizes.defaults()) {
    this._poolSizes = poolSizes;
  }

  /**
   * Returns the configured pool sizes
   */
  public poolSizes(): PoolSizes {
    return this._poolSizes;
  }

  /**
   * Sets custom pool sizes
   * 
   * @param poolSizes The new pool sizes configuration
   */
  public setPoolSizes(poolSizes: PoolSizes): void {
    this._poolSizes = poolSizes;
  }

  /**
   * Gets the singleton instance of PoolSizesService
   */
  public static getInstance(): PoolSizesService {
    if (this._instance === null) {
      this._instance = new PoolSizesService();
    }
    return this._instance;
  }

  /**
   * Returns the current pool sizes configuration
   */
  public static poolSizes(): PoolSizes {
    return this.getInstance().poolSizes();
  }

  /**
   * Sets custom pool sizes for the service
   * 
   * @param poolSizes The new pool sizes configuration
   */
  public static setPoolSizes(poolSizes: PoolSizes): void {
    this.getInstance().setPoolSizes(poolSizes);
  }
}