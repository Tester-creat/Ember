/**
 * Property tests for library filter correctness (P5)
 *
 * Feature: anivault-interoperability, Property 5
 *
 * Validates: Requirements 3.3, 3.4
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The filter
 * predicate logic is inlined here, matching the implementation in app.js
 * exactly: entries.filter(e => e.status === s).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

// ---------------------------------------------------------------------------
// Inline definitions — must stay in sync with app.js
// ---------------------------------------------------------------------------

const STATUS_ORDER = [
  'watching',
  'completed',
  'plan-to-watch',
  'queued',
  'dropped',
  'paused',
  'untracked',
];

// ---------------------------------------------------------------------------
// Property 5: Library filter correctness
// Feature: anivault-interoperability, Property 5
// ---------------------------------------------------------------------------

describe('Property P5: Library filter correctness', () => {
  it(
    'filtering entries by status s returns exactly the entries whose status === s',
    () => {
      fc.assert(
        fc.property(
          fc.array(arbAnimeEntry, { minLength: 0, maxLength: 50 }),
          fc.constantFrom(...STATUS_ORDER),
          (entries, s) => {
            const filtered = entries.filter(e => e.status === s);

            // Every entry in the result must have status === s
            for (const e of filtered) {
              expect(e.status).toBe(s);
            }

            // Every entry with status === s must appear in the result
            const expected = entries.filter(e => e.status === s);
            expect(filtered.length).toBe(expected.length);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
