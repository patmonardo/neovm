import { ComputeContext } from './ComputeContext';
import { InitContext } from './InitContext';
import { MasterComputeContext } from './MasterComputeContext';
import { PregelConfig } from '../../PregelConfig';

/**
 * Container class that holds the different contexts needed during Pregel computation.
 * Acts as a carrier for the different contexts through the computation phases.
 */
export class PregelContext<CONFIG extends PregelConfig> {
  private readonly initContext: InitContext<CONFIG>;
  private readonly computeContext: ComputeContext<CONFIG>;
  private readonly masterComputeContext: MasterComputeContext<CONFIG>;

  /**
   * Create a new Pregel context
   */
  constructor(
    initContext: InitContext<CONFIG>,
    computeContext: ComputeContext<CONFIG>,
    masterComputeContext: MasterComputeContext<CONFIG>
  ) {
    this.initContext = initContext;
    this.computeContext = computeContext;
    this.masterComputeContext = masterComputeContext;
  }

  /**
   * Get the initialization context
   */
  getInitContext(): InitContext<CONFIG> {
    return this.initContext;
  }

  /**
   * Get the compute context
   */
  getComputeContext(): ComputeContext<CONFIG> {
    return this.computeContext;
  }

  /**
   * Get the master compute context
   */
  getMasterComputeContext(): MasterComputeContext<CONFIG> {
    return this.masterComputeContext;
  }
}