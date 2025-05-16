import { NodeProjection } from '@/NodeProjection';

/**
 * This is a minimal test that only uses NodeProjection
 * without any RelationshipProjection dependencies.
 */
console.log('==== Minimal NodeProjection Test ====');

try {
  // 1. Create a simple NodeProjection with just a label
  const label = 'Person';
 // const nodeLabel = new NodeLabel(label);
  console.log(`Creating NodeProjection for label: ${label}`);

  const projection = NodeProjection.fromString(label);
  console.log('✓ Successfully created NodeProjection');

  // 2. Check basic properties
  console.log(`Label: ${projection.label()}`);
  console.log(`Project all: ${projection.projectAll()}`);

  // 3. Get simple object representation
  try {
    const obj = projection.toObject();
    console.log('Object representation:', JSON.stringify(obj, null, 2));
    console.log('✓ Successfully converted to object');
  } catch (error) {
    console.error('❌ Error converting to object:', (error as Error).message);
  }

  console.log('\n==== Test Completed Successfully ====');
} catch (error) {
  console.error('\n❌ Test Failed:', (error as Error).message);
  console.error((error as Error).stack);
}
