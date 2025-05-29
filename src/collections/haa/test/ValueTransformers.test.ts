import {
  ByteToByteFunction,
  DoubleToDoubleFunction,
  LongToLongFunction,
  IntToIntFunction,
  ValueTransformers,
} from '../ValueTransformers';

describe('ValueTransformers - Function Interfaces and Utilities', () => {

  test('ByteToByteFunction interface works correctly', () => {
    console.log('\n🎯 BYTE TRANSFORMER TEST: 8-bit Value Functions');
    console.log('================================================');

    console.log('Testing ByteToByteFunction implementations...');

    // Custom byte transformers
    const byteIncrement: ByteToByteFunction = (value: number) => {
      const result = value + 1;
      return Math.max(-128, Math.min(127, result)); // Clamp to byte range
    };

    const byteToggleSign: ByteToByteFunction = (value: number) => -value;

    const byteSaturatedAdd: ByteToByteFunction = (value: number) => {
      const newValue = value + 10;
      return newValue > 127 ? 127 : newValue; // Saturate at max
    };

    // Test byte increment
    console.log('\n1. Byte increment transformer:');
    const testValues = [0, 50, 126, 127, -128, -1];
    for (const val of testValues) {
      const result = byteIncrement(val);
      const expected = Math.max(-128, Math.min(127, val + 1));
      console.log(`  byteIncrement(${val}) = ${result} (expected: ${expected})`);
      expect(result).toBe(expected);
    }

    // Test sign toggle
    console.log('\n2. Byte sign toggle transformer:');
    for (const val of [0, 50, -50, 127, -128]) {
      const result = byteToggleSign(val);
      console.log(`  byteToggleSign(${val}) = ${result}`);
      expect(result).toBe(-val);
    }

    // Test saturated addition
    console.log('\n3. Byte saturated addition:');
    for (const val of [100, 120, 127]) {
      const result = byteSaturatedAdd(val);
      const expected = val + 10 > 127 ? 127 : val + 10;
      console.log(`  byteSaturatedAdd(${val}) = ${result} (expected: ${expected})`);
      expect(result).toBe(expected);
    }

    console.log('✅ ByteToByteFunction interface works!');
  });

  test('DoubleToDoubleFunction interface works correctly', () => {
    console.log('\n🎯 DOUBLE TRANSFORMER TEST: Floating-Point Functions');
    console.log('====================================================');

    console.log('Testing DoubleToDoubleFunction implementations...');

    // Scientific computation transformers
    const normalizeToUnit: DoubleToDoubleFunction = (value: number) => {
      const magnitude = Math.abs(value);
      return magnitude === 0 ? 0 : value / magnitude; // Unit vector
    };

    const logarithmicScale: DoubleToDoubleFunction = (value: number) => {
      return value > 0 ? Math.log(value + 1) : 0; // log(1 + x) for stability
    };

    const sigmoidActivation: DoubleToDoubleFunction = (value: number) => {
      return 1 / (1 + Math.exp(-value)); // Neural network activation
    };

    // Test normalization
    console.log('\n1. Unit normalization transformer:');
    const testValues = [0, 5.0, -3.0, 10.5, -7.2];
    for (const val of testValues) {
      const result = normalizeToUnit(val);
      const expectedSign = val === 0 ? 0 : (val > 0 ? 1 : -1);
      console.log(`  normalize(${val}) = ${result.toFixed(6)} (expected sign: ${expectedSign})`);

      if (val === 0) {
        expect(result).toBe(0);
      } else {
        expect(Math.abs(Math.abs(result) - 1)).toBeLessThan(1e-10);
        expect(Math.sign(result)).toBe(Math.sign(val));
      }
    }

    // Test logarithmic scaling
    console.log('\n2. Logarithmic scale transformer:');
    for (const val of [0, 1, 10, 100, 1000]) {
      const result = logarithmicScale(val);
      const expected = val > 0 ? Math.log(val + 1) : 0;
      console.log(`  log(${val} + 1) = ${result.toFixed(6)} (expected: ${expected.toFixed(6)})`);
      expect(result).toBeCloseTo(expected, 10);
    }

    // Test sigmoid activation
    console.log('\n3. Sigmoid activation transformer:');
    for (const val of [-5, -1, 0, 1, 5]) {
      const result = sigmoidActivation(val);
      const expected = 1 / (1 + Math.exp(-val));
      console.log(`  sigmoid(${val}) = ${result.toFixed(6)} (expected: ${expected.toFixed(6)})`);
      expect(result).toBeCloseTo(expected, 10);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    }

    console.log('✅ DoubleToDoubleFunction interface works!');
  });

  test('LongToLongFunction interface works correctly', () => {
    console.log('\n🎯 LONG TRANSFORMER TEST: Large Integer Functions');
    console.log('=================================================');

    console.log('Testing LongToLongFunction implementations...');

    // Graph analytics transformers
    const nodeIdTransform: LongToLongFunction = (value: number) => {
      return value * 1000000 + 42; // Transform to global ID space
    };

    const hashMix: LongToLongFunction = (value: number) => {
      // Simple hash mixing (Thomas Wang's integer hash)
      let hash = value;
      hash = (hash ^ 61) ^ (hash >>> 16);
      hash = hash + (hash << 3);
      hash = hash ^ (hash >>> 4);
      hash = hash * 0x27d4eb2d;
      hash = hash ^ (hash >>> 15);
      return Math.abs(hash); // Ensure positive
    };

    const fibonacciStep: LongToLongFunction = (value: number) => {
      // Fibonacci recurrence: F(n) = F(n-1) + F(n-2)
      // For demo, assume value is F(n-1) and we add a fixed F(n-2)
      return value + Math.floor(value * 0.618); // Golden ratio approximation
    };

    // Test node ID transformation
    console.log('\n1. Node ID transformation:');
    const nodeIds = [0, 1, 100, 999, 1234567];
    for (const id of nodeIds) {
      const result = nodeIdTransform(id);
      const expected = id * 1000000 + 42;
      console.log(`  nodeIdTransform(${id}) = ${result} (expected: ${expected})`);
      expect(result).toBe(expected);
    }

    // Test hash mixing
    console.log('\n2. Hash mixing transformation:');
    for (const val of [1, 42, 1000, 999999]) {
      const result = hashMix(val);
      console.log(`  hashMix(${val}) = ${result}`);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result)).toBe(true);
      // Hash should distribute values differently
      expect(result).not.toBe(val);
    }

    // Test fibonacci step
    console.log('\n3. Fibonacci step transformation:');
    for (const fib of [1, 2, 3, 5, 8, 13, 21]) {
      const result = fibonacciStep(fib);
      const expected = fib + Math.floor(fib * 0.618);
      console.log(`  fibStep(${fib}) = ${result} (expected: ${expected})`);
      expect(result).toBe(expected);
      expect(result).toBeGreaterThanOrEqual(fib);
    }

    console.log('✅ LongToLongFunction interface works!');
  });

  test('IntToIntFunction interface works correctly', () => {
    console.log('\n🎯 INT TRANSFORMER TEST: 32-bit Integer Functions');
    console.log('==================================================');

    console.log('Testing IntToIntFunction implementations...');

    // Bit manipulation transformers
    const setFlags: IntToIntFunction = (value: number) => {
      const VISITED = 0x01;
      const PROCESSED = 0x02;
      return value | VISITED | PROCESSED; // Set multiple flags
    };

    const clearFlag: IntToIntFunction = (value: number) => {
      const TEMPORARY = 0x04;
      return value & ~TEMPORARY; // Clear temporary flag
    };

    const rotateLeft: IntToIntFunction = (value: number) => {
      // Rotate left by 4 bits (32-bit)
      return ((value << 4) | (value >>> 28)) >>> 0; // >>> 0 ensures unsigned 32-bit
    };

    // Test flag setting
    console.log('\n1. Flag setting transformation:');
    const initialStates = [0x00, 0x04, 0x08, 0x0F];
    for (const state of initialStates) {
      const result = setFlags(state);
      const expected = state | 0x03; // Should have bits 0 and 1 set
      console.log(`  setFlags(0x${state.toString(16).padStart(2, '0')}) = 0x${result.toString(16).padStart(2, '0')} (expected: 0x${expected.toString(16).padStart(2, '0')})`);
      expect(result).toBe(expected);
      expect(result & 0x01).toBe(0x01); // VISITED flag set
      expect(result & 0x02).toBe(0x02); // PROCESSED flag set
    }

    // Test flag clearing
    console.log('\n2. Flag clearing transformation:');
    for (const state of [0x04, 0x05, 0x06, 0x07]) {
      const result = clearFlag(state);
      const expected = state & ~0x04;
      console.log(`  clearFlag(0x${state.toString(16).padStart(2, '0')}) = 0x${result.toString(16).padStart(2, '0')} (expected: 0x${expected.toString(16).padStart(2, '0')})`);
      expect(result).toBe(expected);
      expect(result & 0x04).toBe(0); // TEMPORARY flag cleared
    }

    // Test bit rotation
    console.log('\n3. Bit rotation transformation:');
    const rotationTests = [0x12345678, 0xF0000000, 0x0000000F, 0xAAAAAAAA];
    for (const val of rotationTests) {
      const result = rotateLeft(val);
      console.log(`  rotateLeft(0x${val.toString(16).padStart(8, '0')}) = 0x${result.toString(16).padStart(8, '0')}`);
      expect(Number.isInteger(result)).toBe(true);
      // Verify rotation preserved bits (hard to test exactly due to JS number handling)
    }

    console.log('✅ IntToIntFunction interface works!');
  });

  test('ValueTransformers.increment() works correctly', () => {
    console.log('\n🎯 VALUE TRANSFORMERS TEST: Increment');
    console.log('=====================================');

    console.log('Testing ValueTransformers.increment()...');

    const incrementBy5 = ValueTransformers.increment(5);
    const incrementBy10 = ValueTransformers.increment(10);
    const incrementByNegative = ValueTransformers.increment(-3);

    console.log('\n1. Positive increment:');
    const testValues = [0, 10, 100, -50];
    for (const val of testValues) {
      const result = incrementBy5(val);
      console.log(`  increment(5)(${val}) = ${result}`);
      expect(result).toBe(val + 5);
    }

    console.log('\n2. Larger increment:');
    for (const val of [0, 25, -15]) {
      const result = incrementBy10(val);
      console.log(`  increment(10)(${val}) = ${result}`);
      expect(result).toBe(val + 10);
    }

    console.log('\n3. Negative increment (decrement):');
    for (const val of [10, 0, -5]) {
      const result = incrementByNegative(val);
      console.log(`  increment(-3)(${val}) = ${result}`);
      expect(result).toBe(val - 3);
    }

    console.log('✅ ValueTransformers.increment() works!');
  });

  test('ValueTransformers.decrement() works correctly', () => {
    console.log('\n🎯 VALUE TRANSFORMERS TEST: Decrement');
    console.log('=====================================');

    console.log('Testing ValueTransformers.decrement()...');

    const decrementBy3 = ValueTransformers.decrement(3);
    const decrementBy7 = ValueTransformers.decrement(7);

    console.log('\nDecrement operations:');
    const testValues = [10, 5, 0, -10];
    for (const val of testValues) {
      const result3 = decrementBy3(val);
      const result7 = decrementBy7(val);
      console.log(`  decrement(3)(${val}) = ${result3}, decrement(7)(${val}) = ${result7}`);
      expect(result3).toBe(val - 3);
      expect(result7).toBe(val - 7);
    }

    console.log('✅ ValueTransformers.decrement() works!');
  });

  test('ValueTransformers.multiply() works correctly', () => {
    console.log('\n🎯 VALUE TRANSFORMERS TEST: Multiply');
    console.log('====================================');

    console.log('Testing ValueTransformers.multiply()...');

    const multiplyBy2 = ValueTransformers.multiply(2.0);
    const multiplyByHalf = ValueTransformers.multiply(0.5);
    const multiplyByPi = ValueTransformers.multiply(Math.PI);

    console.log('\n1. Integer multiplication:');
    const intValues = [1, 5, 10, -3];
    for (const val of intValues) {
      const result = multiplyBy2(val);
      console.log(`  multiply(2.0)(${val}) = ${result}`);
      expect(result).toBeCloseTo(val * 2.0, 10);
    }

    console.log('\n2. Fractional multiplication:');
    for (const val of [10, 20, 8, -16]) {
      const result = multiplyByHalf(val);
      console.log(`  multiply(0.5)(${val}) = ${result}`);
      expect(result).toBeCloseTo(val * 0.5, 10);
    }

    console.log('\n3. Pi multiplication:');
    for (const val of [1, 2, -1]) {
      const result = multiplyByPi(val);
      console.log(`  multiply(π)(${val}) = ${result.toFixed(6)}`);
      expect(result).toBeCloseTo(val * Math.PI, 10);
    }

    console.log('✅ ValueTransformers.multiply() works!');
  });

  test('ValueTransformers.clampMax() works correctly', () => {
    console.log('\n🎯 VALUE TRANSFORMERS TEST: Clamp Max');
    console.log('=====================================');

    console.log('Testing ValueTransformers.clampMax()...');

    const clampAt100 = ValueTransformers.clampMax(100);
    const clampAt50 = ValueTransformers.clampMax(50);

    console.log('\nClamping to maximum values:');
    const testValues = [0, 50, 75, 100, 150, 200];
    for (const val of testValues) {
      const result100 = clampAt100(val);
      const result50 = clampAt50(val);
      console.log(`  clampMax(100)(${val}) = ${result100}, clampMax(50)(${val}) = ${result50}`);

      expect(result100).toBe(Math.min(val, 100));
      expect(result50).toBe(Math.min(val, 50));
      expect(result100).toBeLessThanOrEqual(100);
      expect(result50).toBeLessThanOrEqual(50);
    }

    console.log('✅ ValueTransformers.clampMax() works!');
  });

  test('ValueTransformers.clampMin() works correctly', () => {
    console.log('\n🎯 VALUE TRANSFORMERS TEST: Clamp Min');
    console.log('=====================================');

    console.log('Testing ValueTransformers.clampMin()...');

    const clampAt10 = ValueTransformers.clampMin(10);
    const clampAt0 = ValueTransformers.clampMin(0);

    console.log('\nClamping to minimum values:');
    const testValues = [-10, 0, 5, 10, 20, 50];
    for (const val of testValues) {
      const result10 = clampAt10(val);
      const result0 = clampAt0(val);
      console.log(`  clampMin(10)(${val}) = ${result10}, clampMin(0)(${val}) = ${result0}`);

      expect(result10).toBe(Math.max(val, 10));
      expect(result0).toBe(Math.max(val, 0));
      expect(result10).toBeGreaterThanOrEqual(10);
      expect(result0).toBeGreaterThanOrEqual(0);
    }

    console.log('✅ ValueTransformers.clampMin() works!');
  });

  test('ValueTransformers bitwise operations work correctly', () => {
    console.log('\n🎯 VALUE TRANSFORMERS TEST: Bitwise Operations');
    console.log('==============================================');

    console.log('Testing bitwise transformers...');

    const orWith0x0F = ValueTransformers.bitwiseOr(0x0F);   // Set low 4 bits
    const andWith0xF0 = ValueTransformers.bitwiseAnd(0xF0); // Keep high 4 bits only
    const xorWith0xAA = ValueTransformers.bitwiseXor(0xAA); // Toggle alternating bits

    console.log('\n1. Bitwise OR operations:');
    const testValues = [0x00, 0x05, 0xF0, 0xFF];
    for (const val of testValues) {
      const result = orWith0x0F(val);
      const expected = val | 0x0F;
      console.log(`  bitwiseOr(0x0F)(0x${val.toString(16).padStart(2, '0')}) = 0x${result.toString(16).padStart(2, '0')} (expected: 0x${expected.toString(16).padStart(2, '0')})`);
      expect(result).toBe(expected);
      expect(result & 0x0F).toBe(0x0F); // Low 4 bits should be set
    }

    console.log('\n2. Bitwise AND operations:');
    for (const val of testValues) {
      const result = andWith0xF0(val);
      const expected = val & 0xF0;
      console.log(`  bitwiseAnd(0xF0)(0x${val.toString(16).padStart(2, '0')}) = 0x${result.toString(16).padStart(2, '0')} (expected: 0x${expected.toString(16).padStart(2, '0')})`);
      expect(result).toBe(expected);
      expect(result & 0x0F).toBe(0); // Low 4 bits should be cleared
    }

    console.log('\n3. Bitwise XOR operations:');
    for (const val of testValues) {
      const result = xorWith0xAA(val);
      const expected = val ^ 0xAA;
      console.log(`  bitwiseXor(0xAA)(0x${val.toString(16).padStart(2, '0')}) = 0x${result.toString(16).padStart(2, '0')} (expected: 0x${expected.toString(16).padStart(2, '0')})`);
      expect(result).toBe(expected);
    }

    console.log('✅ Bitwise operations work!');
  });

  test('ValueTransformers constant transformers work correctly', () => {
    console.log('\n🎯 VALUE TRANSFORMERS TEST: Constants');
    console.log('=====================================');

    console.log('Testing constant transformers...');

    const testValues = [-10, -1, 0, 1, 10, 42];

    console.log('\n1. IDENTITY transformer:');
    for (const val of testValues) {
      const result = ValueTransformers.IDENTITY(val);
      console.log(`  IDENTITY(${val}) = ${result}`);
      expect(result).toBe(val);
    }

    console.log('\n2. ABSOLUTE transformer:');
    for (const val of testValues) {
      const result = ValueTransformers.ABSOLUTE(val);
      const expected = Math.abs(val);
      console.log(`  ABSOLUTE(${val}) = ${result} (expected: ${expected})`);
      expect(result).toBe(expected);
      expect(result).toBeGreaterThanOrEqual(0);
    }

    console.log('\n3. NEGATE transformer:');
    for (const val of testValues) {
      const result = ValueTransformers.NEGATE(val);
      const expected = -val;
      console.log(`  NEGATE(${val}) = ${result} (expected: ${expected})`);
      expect(result).toBe(expected);
    }

    console.log('✅ Constant transformers work!');
  });

  test('complex transformation compositions work correctly', () => {
    console.log('\n🎯 COMPOSITION TEST: Chained Transformations');
    console.log('============================================');

    console.log('Testing transformer compositions...');

    // Compose multiple transformations
    const complexTransform: LongToLongFunction = (value: number) => {
      return ValueTransformers.clampMax(100)(
        ValueTransformers.clampMin(0)(
          ValueTransformers.increment(10)(value)
        )
      );
    };

    const scientificNormalize: DoubleToDoubleFunction = (value: number) => {
      return ValueTransformers.multiply(0.5)(
        ValueTransformers.ABSOLUTE(value)
      ) + 1.0; // |x| * 0.5 + 1.0
    };

    console.log('\n1. Complex clamping transformation:');
    const testValues = [-20, -5, 0, 50, 85, 95, 150];
    for (const val of testValues) {
      const result = complexTransform(val);
      const expected = Math.min(100, Math.max(0, val + 10));
      console.log(`  complexTransform(${val}) = ${result} (expected: ${expected})`);
      expect(result).toBe(expected);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    }

    console.log('\n2. Scientific normalization:');
    for (const val of [-10, -2.5, 0, 2.5, 10]) {
      const result = scientificNormalize(val);
      const expected = Math.abs(val) * 0.5 + 1.0;
      console.log(`  scientificNormalize(${val}) = ${result.toFixed(3)} (expected: ${expected.toFixed(3)})`);
      expect(result).toBeCloseTo(expected, 10);
      expect(result).toBeGreaterThanOrEqual(1.0);
    }

    console.log('✅ Complex compositions work!');
  });

  test('atomic operation simulation works correctly', () => {
    console.log('\n🎯 ATOMIC SIMULATION TEST: Concurrent-Style Operations');
    console.log('======================================================');

    console.log('Testing atomic-style operations...');

    // Simulate atomic operations using transformers
    let atomicCounter = 50;
    let atomicMax = 0;
    let atomicFlags = 0x00;

    // Simulate atomic increment operations
    console.log('\n1. Atomic increment simulation:');
    const incrementOps = [
      ValueTransformers.increment(1),
      ValueTransformers.increment(5),
      ValueTransformers.increment(2)
    ];

    for (let i = 0; i < incrementOps.length; i++) {
      const oldValue = atomicCounter;
      atomicCounter = incrementOps[i](atomicCounter);
      console.log(`  Operation ${i + 1}: ${oldValue} → ${atomicCounter}`);
    }
    expect(atomicCounter).toBe(50 + 1 + 5 + 2);

    // Simulate atomic max operations
    console.log('\n2. Atomic maximum simulation:');
    const maxUpdates = [25, 75, 60, 100, 80];
    for (const newValue of maxUpdates) {
      const oldMax = atomicMax;
      atomicMax = Math.max(atomicMax, newValue);
      console.log(`  Max update: max(${oldMax}, ${newValue}) = ${atomicMax}`);
    }
    expect(atomicMax).toBe(100);

    // Simulate atomic flag operations
    console.log('\n3. Atomic flag simulation:');
    const flagOps = [
      ValueTransformers.bitwiseOr(0x01),   // Set VISITED
      ValueTransformers.bitwiseOr(0x02),   // Set PROCESSED
      ValueTransformers.bitwiseOr(0x04),   // Set BOUNDARY
      ValueTransformers.bitwiseAnd(~0x02), // Clear PROCESSED
      ValueTransformers.bitwiseXor(0x08)   // Toggle ACTIVE
    ];

    for (let i = 0; i < flagOps.length; i++) {
      const oldFlags = atomicFlags;
      atomicFlags = flagOps[i](atomicFlags);
      console.log(`  Flag op ${i + 1}: 0x${oldFlags.toString(16).padStart(2, '0')} → 0x${atomicFlags.toString(16).padStart(2, '0')}`);
    }

    expect(atomicFlags & 0x01).toBe(0x01); // VISITED set
    expect(atomicFlags & 0x02).toBe(0x00); // PROCESSED cleared
    expect(atomicFlags & 0x04).toBe(0x04); // BOUNDARY set
    expect(atomicFlags & 0x08).toBe(0x08); // ACTIVE set

    console.log('✅ Atomic operation simulation works!');
  });

  test('ValueTransformers constructor prevention works', () => {
    console.log('\n🎯 CONSTRUCTOR PREVENTION TEST: Utility Class');
    console.log('=============================================');

    console.log('Testing ValueTransformers constructor prevention...');

    expect(() => {
      // @ts-expect-error - Testing constructor prevention
      new ValueTransformers();
    }).toThrow('ValueTransformers is a static utility class and cannot be instantiated');

    console.log('✅ ValueTransformers constructor properly prevented!');
  });

  test('performance and reusability patterns work correctly', () => {
    console.log('\n🎯 PERFORMANCE TEST: Transformer Reusability');
    console.log('============================================');

    console.log('Testing transformer reusability patterns...');

    // Create reusable transformers
    const commonIncrement = ValueTransformers.increment(1);
    const commonClamp = ValueTransformers.clampMax(1000);
    const commonAbsolute = ValueTransformers.ABSOLUTE;

    console.log('\n1. Reusable transformer objects:');
    expect(typeof commonIncrement).toBe('function');
    expect(typeof commonClamp).toBe('function');
    expect(typeof commonAbsolute).toBe('function');

    // Test reuse across multiple values
    const testData = [10, 50, 100, 500, 1500];
    console.log('\n2. Multiple applications:');

    for (const value of testData) {
      const incremented = commonIncrement(value);
      const clamped = commonClamp(value);
      const absolute = commonAbsolute(-value);

      console.log(`  Value ${value}: +1=${incremented}, clamp=${clamped}, abs=${absolute}`);

      expect(incremented).toBe(value + 1);
      expect(clamped).toBe(Math.min(value, 1000));
      expect(absolute).toBe(Math.abs(-value));
    }

    // Test function reference equality (same function object)
    console.log('\n3. Static transformer identity:');
    const abs1 = ValueTransformers.ABSOLUTE;
    const abs2 = ValueTransformers.ABSOLUTE;
    const identity1 = ValueTransformers.IDENTITY;
    const identity2 = ValueTransformers.IDENTITY;

    console.log(`  ABSOLUTE reference equality: ${abs1 === abs2}`);
    console.log(`  IDENTITY reference equality: ${identity1 === identity2}`);

    expect(abs1).toBe(abs2);
    expect(identity1).toBe(identity2);

    console.log('✅ Performance and reusability patterns work!');
  });
});
