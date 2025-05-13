import { RenamesCurrentThread, Revert } from '../concurrency/RenamesCurrentThread';
import { TransactionContext } from '../../transaction/TransactionContext';
import { StatementApi, TxConsumer } from '../../utils/StatementApi';
import { throwIfUnchecked } from '../../utils/ExceptionUtil';

/**
 * Abstract base class for actions that execute within a transaction and need 
 * to rename the current thread during execution.
 */
export abstract class StatementAction extends StatementApi implements RenamesCurrentThread, TxConsumer {
  /**
   * Creates a new statement action with the given transaction context.
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
   * Executes this action within a transaction.
   * The current thread is renamed for the duration of the execution.
   */
  public run(): void {
    try {
      const revert = RenamesCurrentThread.renameThread(this.threadName());
      try {
        this.acceptInTransaction(this);
      } finally {
        revert.close();
      }
    } catch (e) {
      throwIfUnchecked(e);
      throw new Error(e instanceof Error ? e.message : String(e));
    }
  }
}