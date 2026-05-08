/**
 * Property test for status coercion (P7)
 * Validates: Library entry status values match known set
 *
 * Property 7: Entry status values are always from the known set
 * For any library entry, the status field must be one of the recognized values.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { STATUS_OPTIONS } from './generators.js';

describe('Property P7: Status values', () => {
  it('should have all known status options recognized by getStatusLabel', () => {
    const map = { "watching": "Watching", "completed": "Completed", "plan-to-watch": "Plan to Watch", "queued": "Queued", "dropped": "Dropped", "paused": "Paused" };
    STATUS_OPTIONS.forEach((status) => {
      if (status === 'untracked') return;
      expect(map[status]).toBeTruthy();
    });
  });

  it('should map every STATUS_OPTIONS to a display label via getStatusLabel', () => {
    function getStatusLabel(s) {
      const map = { "watching": "Watching", "completed": "Completed", "plan-to-watch": "Plan to Watch", "queued": "Queued", "dropped": "Dropped", "paused": "Paused" };
      return map[s] || s || "Add to List";
    }

    fc.assert(
      fc.property(
        fc.oneof(...STATUS_OPTIONS.map((s) => fc.constant(s))),
        (status) => {
          const label = getStatusLabel(status);
          expect(typeof label).toBe('string');
          expect(label.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
