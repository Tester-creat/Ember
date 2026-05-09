/**
 * Property test for stats counts including all statuses (P6)
 *
 * Feature: anivault-interoperability, Property 6
 *
 * Validates: Requirements 4.4
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The statusCounts
 * pre-seeding logic from computeStats() is inlined here, matching the
 * implementation in app.js exactly.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

// ---------------------------------------------------------------------------
// Inline definitions — must stay in sync with app.js
// ---------------------------------------------------------------------------

const STATS_STATUS_OPTIONS = [
  "watching", "completed", "queued", "plan-to-watch",
  "dropped", "paused", "untracked"
];

/**
 * Inlined core logic from computeStats() in app.js.
 * Pre-seeds statusCounts for all known statuses, then tallies entries.
 */
function computeStatusCounts(entries) {
  const statusCounts = {};
  STATS_STATUS_OPTIONS.forEach(s => { statusCounts[s] = 0; });
  entries.forEach(e => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });
  return statusCounts;
}

// ---------------------------------------------------------------------------
// Property 6: Stats counts include all statuses
// Feature: anivault-interoperability, Property 6
// ---------------------------------------------------------------------------

describe('Property P6: Stats counts include all statuses', () => {
  it(
    'should define "queued" and "untracked" with a value >= 0 for any array of entries (including empty)',
    () => {
      fc.assert(
        fc.property(
          fc.array(arbAnimeEntry, { minLength: 0, maxLength: 50 }),
          (entries) => {
            const statusCounts = computeStatusCounts(entries);

            // "queued" must be defined and >= 0
            expect(statusCounts["queued"]).toBeDefined();
            expect(statusCounts["queued"]).toBeGreaterThanOrEqual(0);

            // "untracked" must be defined and >= 0
            expect(statusCounts["untracked"]).toBeDefined();
            expect(statusCounts["untracked"]).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
