import { MemoryRange } from '../MemoryRange';
import { MemoryEstimationResult } from './MemoryEstimationResultBuilder';

/**
 * Validates memory estimations against system memory constraints.
 */
export class MemoryBudgetValidator {
  /**
   * The memory budget in bytes.
   */
  private readonly memoryBudget: number;

  /**
   * Creates a new MemoryBudgetValidator.
   *
   * @param memoryBudget The memory budget in bytes
   */
  constructor(memoryBudget: number | number) {
    this.memoryBudget = typeof memoryBudget === 'number'
      ? BigInt(memoryBudget)
      : memoryBudget;
  }

  /**
   * Validates if a memory estimation fits within the budget.
   *
   * @param estimation The memory estimation result to validate
   * @returns True if the estimation fits within budget
   */
  public validate(estimation: MemoryEstimationResult): boolean {
    return this.validateRange(estimation.memoryRange());
  }

  /**
   * Validates if a memory range fits within the budget.
   *
   * @param memoryRange The memory range to validate
   * @returns True if the range fits within budget
   */
  public validateRange(memoryRange: MemoryRange): boolean {
    return memoryRange.max <= this.memoryBudget;
  }

  /**
   * Returns the memory budget.
   *
   * @returns The memory budget in bytes
   */
  public budget(): number {
    return this.memoryBudget;
  }

  /**
   * Returns the remaining memory after subtracting the estimation.
   *
   * @param estimation The memory estimation result
   * @returns The remaining memory in bytes, or 0 if over budget
   */
  public remaining(estimation: MemoryEstimationResult): number {
    const required = estimation.memoryUsage();
    return required > this.memoryBudget ? 0n : this.memoryBudget - required;
  }

  /**
   * Returns the percentage of the budget that would be used by the estimation.
   *
   * @param estimation The memory estimation result
   * @returns The percentage of memory budget that would be used (0-100)
   */
  public percentageUsed(estimation: MemoryEstimationResult): number {
    if (this.memoryBudget === 0n) return 0;

    const required = estimation.memoryUsage();
    const percentage = Number((required * 100n) / this.memoryBudget);

    return Math.min(100, Math.max(0, percentage));
  }
}
