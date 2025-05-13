import { RenamesCurrentThread, Revert } from '../concurrency/RenamesCurrentThread';
import { TransactionContext } from '../../transaction/TransactionContext';
import { StatementApi, TxFunction } from '../../utils/StatementApi';

/**
 * Abstract base class for functions that execute within a transaction,
 * return a value, and rename the current thread during execution.
 * 
 * @template T The type of value returned by this function
 */
export abstract class StatementFunction<T> extends StatementApi implements RenamesCurrentThread, TxFunction<T> {
  /**
   * Creates a new statement function with the given transaction context.
   * 
   * @param tx The transaction context
   */
  protected constructor(tx: TransactionContext) {
    super(tx);
  }

  /**
   * Returns the name to use for the current thread during execution.
   * 
   * @returns Thread name
   */
  public abstract threadName(): string;

  /**
   * Executes this function within a transaction and returns the result.
   * The current thread is renamed for the duration of the execution.
   * 
   * @returns The result of the function
   */
  public call(): T {
    const revert = RenamesCurrentThread.renameThread(this.threadName());
    try {
      return this.applyInTransaction(this);
    } finally {
      revert.close();
    }
  }
}