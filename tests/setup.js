// Test setup file - verifies fast-check is available for property-based testing
import * as fc from 'fast-check';

// Verify fast-check is importable and functional
if (typeof fc.assert !== 'function') {
  throw new Error('fast-check failed to load: fc.assert is not a function');
}

export { fc };
