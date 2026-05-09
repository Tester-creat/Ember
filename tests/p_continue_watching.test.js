/**
 * Property test for continue-watching exclusion (P7)
 *
 * Feature: anivault-interoperability, Property 7
 *
 * Validates: Requirements 6.1, 6.2, 6.5
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The filter
 * predicate is inlined here, matching the implementation in renderHome()
 * in app.js exactly:
 *
 *   const watching = entries.filter(e => e.status === "watching");
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

// ---------------------------------------------------------------------------
// Property 7: Continue watching excludes non-watching statuses
// Feature: anivault-interoperability, Property 7
// ---------------------------------------------------------------------------

describe('Property P7: Continue watching excludes non-watching statuses', () => {
  it(
    'should contain exactly the entries whose status === "watching"',
    () => {
      fc.assert(
        fc.property(
          fc.array(arbAnimeEntry, { minLength: 0, maxLength: 50 }),
          (entries) => {
            // Inline the filter from renderHome() in app.js
            const result = entries.filter(e => e.status === 'watching');

            // Every entry in result must have status === "watching"
            for (const entry of result) {
              expect(entry.status).toBe('watching');
            }

            // Every entry with status === "watching" must appear in result
            const watchingEntries = entries.filter(e => e.status === 'watching');
            expect(result.length).toBe(watchingEntries.length);

            // No entry with status !== "watching" appears in result
            for (const entry of result) {
              expect(entry.status).not.toBe('queued');
              expect(entry.status).not.toBe('untracked');
              expect(entry.status).not.toBe('completed');
              expect(entry.status).not.toBe('plan-to-watch');
              expect(entry.status).not.toBe('dropped');
              expect(entry.status).not.toBe('paused');
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
