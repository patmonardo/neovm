/**
 * Token interface for node label collections.
 */
export interface NodeLabelToken {
  /**
   * Check if this token contains no labels.
   */
  isEmpty(): boolean;

  /**
   * Check if this token represents an invalid state.
   */
  isInvalid(): boolean;

  /**
   * Get the number of labels in this token.
   */
  size(): number;

  /**
   * Get the label at the specified index.
   */
  get(index: number): NodeLabel;

  /**
   * Get all labels as string array.
   */
  getStrings(): string[];
}

/**
 * Valid node label token (not invalid).
 */
export interface ValidNodeLabelToken extends NodeLabelToken {
  isInvalid(): boolean; // Always false for valid tokens
}
