/**
 * An abstract class for holding a mutable integer value.
 * Subclasses are expected to be used.
 * The `value` field is public and can be directly manipulated.
 */
export abstract class MutableIntValue {
  /**
   * The mutable integer value.
   * In Java, an int field defaults to 0. We initialize it to 0 here
   * to reflect that default state for subclasses.
   */
  public value: number = 0;

  // Since the class is abstract and has no abstract methods,
  // subclasses would typically provide a constructor to set an initial value
  // or manipulate 'value' directly.
  // e.g.:
  // protected constructor(initialValue: number) {
  //   this.value = initialValue;
  // }
}

// Example of a concrete subclass (not part of the direct translation, but for illustration):
//
// export class ConcreteMutableIntValue extends MutableIntValue {
//   constructor(initialValue: number) {
//     super(); // Calls MutableIntValue constructor (which is implicit here)
//     this.value = initialValue;
//   }
//
//   public increment(): void {
//     this.value++;
//   }
// }
//
// const mutableInt = new ConcreteMutableIntValue(10);
// console.log(mutableInt.value); // 10
// mutableInt.increment();
// console.log(mutableInt.value); // 11
// mutableInt.value = 20;
// console.log(mutableInt.value); // 20
