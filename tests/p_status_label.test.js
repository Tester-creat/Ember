/**
 * Property tests for getStatusLabel completeness and determinism (P1, P2)
 *
 * Feature: anivault-interoperability
 *
 * Validates: Requirements 1.3, 1.4
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The relevant
 * logic is inlined here, matching the implementation in app.js exactly.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Inline definitions — must stay in sync with app.js
// ---------------------------------------------------------------------------

function getStatusLabel(s) {
  const map = {
    watching: 'Watching',
    completed: 'Completed',
    'plan-to-watch': 'Plan to Watch',
    queued: 'Queued',
    dropped: 'Dropped',
    paused: 'Paused',
    untracked: 'Untracked',
  };
  return map[s] || s || 'Add to List';
}

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
// Property 1: getStatusLabel completeness
// Feature: anivault-interoperability, Property 1
// ---------------------------------------------------------------------------

describe('Property P1: getStatusLabel completeness', () => {
  it(
    'should return a non-empty string for every status in STATUS_ORDER',
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...STATUS_ORDER),
          (status) => {
            const label = getStatusLabel(status);
            expect(typeof label).toBe('string');
            expect(label.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 2: getStatusLabel determinism
// Feature: anivault-interoperability, Property 2
// ---------------------------------------------------------------------------

describe('Property P2: getStatusLabel determinism', () => {
  it(
    'should return the same string on repeated calls with the same valid status',
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...STATUS_ORDER),
          (status) => {
            const first = getStatusLabel(status);
            const second = getStatusLabel(status);
            expect(first).toBe(second);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
