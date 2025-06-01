import { NodeLabel } from '@/projection';

/**
 * Base interface for all NodeLabelToken implementations.
 *
 * Provides uniform access to node label collections regardless of
 * the original input type. All implementations must provide:
 * - Size information
 * - Index-based access
 * - State checking (empty, invalid)
 * - String array conversion
 */
export interface NodeLabelToken {
  /** Check if this token represents an empty label set */
  isEmpty(): boolean;

  /** Check if this token represents invalid/unparseable input */
  isInvalid(): boolean;

  /** Get the number of labels in this token */
  size(): number;

  /** Get the NodeLabel at the specified index */
  get(index: number): NodeLabel;

  /** Convert all labels to their string representations */
  getStrings(): string[];

  /** Iterate over all NodeLabels in this token */
  [Symbol.iterator](): Iterator<NodeLabel>;
}

/**
 * Marker interface for valid (non-invalid) node label tokens.
 * Invalid tokens should not implement this interface.
 */
export interface ValidNodeLabelToken extends NodeLabelToken {
  isInvalid(): false;
}
