import { Limit } from "./Limit";

/**
 * Limit implementation for boolean values.
 */
export class BooleanLimit extends Limit {
  private readonly value: boolean;

  /**
   * Creates a new boolean limit.
   * 
   * @param value The limit value
   */
  constructor(value: boolean) {
    super();
    this.value = value;
  }

  /**
   * Gets the limit value.
   * 
   * @returns The boolean limit value
   */
  override getValue(): boolean {
    return this.value;
  }

  /**
   * Ok how do you set a boolean limit and violate it?
   *
   * Say it is 'sudo'. You want to express that nobody is allowed to sudo.
   *
   * So you `setLimit(sudo, false)`. I think that is readable enough without further ado.
   *
   * We list that as follows:
   *
   * key  | value
   * sudo | false
   *
   * People can make sense of that.
   *
   * Lastly, we check the limit by going, "if you did supply sudo, it must have be set to false, or it is an error".
   *
   * This achieves that.
   *
   * BUT! What about the opposite case, what does `setLimit("foo", true)` mean?
   *
   * Here I have chosen that it means, "if you did supply foo, it must have be set to true, or it is an error"
   *
   * The alternative was, true is always ranked higher than false. Difficult to think of a useful example of that
   * though. But this is one of those "strong opinion, weakly held" things I guess.
   */
  protected override isViolatedInternal(inputValue: unknown): boolean {
    const b = inputValue as boolean;
    return b !== this.value;
  }

  /**
   * Creates an error message for when this limit is violated.
   * 
   * @param key Configuration parameter key
   * @param value The value that violated the limit
   * @returns Formatted error message
   */
  override asErrorMessage(key: string, value: unknown): string {
    return `Configuration parameter '${key}' with value '${value}' is in violation of its set limit`;
  }
}