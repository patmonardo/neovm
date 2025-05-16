/**
 * Values module - provides factory methods for creating primitive value objects.
 *
 * This module follows the Universal Factory Pattern where implementation details
 * are hidden behind a factory interface. Clients should only use the exported
 * factory class and interfaces, never the implementation classes directly.
 */

// Export the main factory - this is the primary entry point
export { PrimitiveValues } from './PrimitiveValues';

// Export interfaces for type annotations
export { GdsValue } from './abstract/GdsValue';
export { IntegralValue } from './abstract/IntegralValue';
export { FloatingPointValue } from './abstract/FloatingPointValue';
export { LongArray } from './abstract/LongArray';
export { FloatArray } from './abstract/FloatArray';
export { DoubleArray } from './abstract/DoubleArray';
export { IntegralArray } from './abstract/IntegralArray';
export { FloatingPointArray } from './abstract/FloatingPointArray';
export { GdsNoValue } from './abstract/GdsNoValue';

// ValueType enum for type identification
export { ValueType } from '@/api/ValueType';
