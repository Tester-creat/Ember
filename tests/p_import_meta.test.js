/**
 * Property tests for `__meta` passthrough (P10, P11)
 *
 * Feature: anivault-interoperability, Property 10, Property 11
 *
 * Validates: Requirements 8.2, 8.3, 8.5
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The relevant
 * logic is inlined here, matching the implementation in app.js exactly.
 * A mock localStorage is used instead of the real browser API.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock localStorage — plain object with getItem / setItem / clear
// ---------------------------------------------------------------------------

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

// ---------------------------------------------------------------------------
// Inline definition — must stay in sync with app.js
// Uses mockLocalStorage instead of the global localStorage.
// ---------------------------------------------------------------------------

function extractMeta(data) {
  if ("__meta" in data) {
    mockLocalStorage.setItem("ember_anivault_meta", JSON.stringify(data.__meta));
  }
  const { __meta, ...entries } = data;
  return entries;
}

// ---------------------------------------------------------------------------
// Property 10: `__meta` passthrough round-trip
// Feature: anivault-interoperability, Property 10
// ---------------------------------------------------------------------------

describe('Property P10: __meta passthrough round-trip', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it(
    'should store __meta in localStorage such that JSON.parse(getItem(...)) deep-equals the original __meta value',
    () => {
      fc.assert(
        fc.property(
          fc.jsonValue(),
          (metaValue) => {
            mockLocalStorage.clear();

            const data = {
              "__meta": metaValue,
              "12345": { status: "watching" },
            };

            extractMeta(data);

            const stored = JSON.parse(mockLocalStorage.getItem("ember_anivault_meta"));
            // Compare against the JSON-round-tripped original, since JSON.stringify
            // normalises values like -0 → 0. The spec guarantees JSON round-trip fidelity.
            const jsonRoundTripped = JSON.parse(JSON.stringify(metaValue));
            expect(stored).toEqual(jsonRoundTripped);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 11: `__meta` is never treated as a library entry
// Feature: anivault-interoperability, Property 11
// ---------------------------------------------------------------------------

describe('Property P11: __meta is never treated as a library entry', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it(
    'should not include "__meta" as a key in the object returned by extractMeta()',
    () => {
      fc.assert(
        fc.property(
          fc.jsonValue(),
          fc.record({
            status: fc.constantFrom("watching", "completed", "plan-to-watch", "queued", "dropped", "paused", "untracked"),
            episodesWatched: fc.integer({ min: 0, max: 2000 }),
          }),
          (metaValue, entry) => {
            mockLocalStorage.clear();

            // Build a data object with __meta and at least one numeric key
            const data = {
              "__meta": metaValue,
              "67890": entry,
            };

            const result = extractMeta(data);

            expect(Object.prototype.hasOwnProperty.call(result, "__meta")).toBe(false);
            expect("__meta" in result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
