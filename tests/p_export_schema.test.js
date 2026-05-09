/**
 * Property tests for export schema compliance, __meta round-trip, and
 * localStorage immutability (P15, P16, P17)
 *
 * Feature: anivault-interoperability, Property 15, Property 16, Property 17
 *
 * Validates: Requirements 10.1, 10.2, 10.4, 10.6, 12.3
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The relevant
 * logic is inlined here, matching the implementation in app.js exactly.
 * A mock localStorage is used instead of the real browser API.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

function makeMockStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    snapshot: () => ({ ...store }),
  };
}

// ---------------------------------------------------------------------------
// Inline definitions — must stay in sync with app.js
// ---------------------------------------------------------------------------

const STATUS_REVERSE = {
  "watching":      "Watching",
  "completed":     "Completed",
  "queued":        "Queued",
  "plan-to-watch": "Plan to Watch",
  "dropped":       "Dropped",
  "paused":        "Paused",
  "untracked":     "Untracked",
};

function mapEmberToAniVault(entry) {
  return {
    status:           STATUS_REVERSE[entry.status] || entry.status,
    rating:           entry.rating || 0,
    episodesWatched:  entry.episodesWatched || 0,
    totalEpisodes:    entry.episodes || 0,
    notes:            entry.notes || "",
    title: {
      romaji:  entry.title || "",
      english: entry.titleEnglish || "",
      native:  entry.titleNative || "",
    },
    coverImage: {
      large: entry.cover || "",
    },
    genres:       entry.genres || [],
    averageScore: entry.averageScore || 0,
    year:         entry.year || 0,
  };
}

/**
 * Core export assembly logic (extracted from exportLibrary for testability).
 * Accepts userData and a mock storage; returns the output object without
 * triggering Blob/download side-effects.
 */
function assembleExportOutput(userData, mockStorage) {
  const output = {};

  for (const [idStr, entry] of Object.entries(userData)) {
    if (!entry || !entry.id) continue;
    output[idStr] = mapEmberToAniVault(entry);
  }

  const storedMeta = mockStorage.getItem("ember_anivault_meta");
  output.__meta = storedMeta
    ? JSON.parse(storedMeta)
    : { source: "ember", exportedAt: new Date().toISOString() };

  return output;
}

// ---------------------------------------------------------------------------
// Arbitrary: userData dictionary keyed by numeric string IDs
// ---------------------------------------------------------------------------

const arbUserData = fc.dictionary(
  fc.integer({ min: 1, max: 999999 }).map(n => String(n)),
  arbAnimeEntry,
  { minKeys: 0, maxKeys: 20 }
);

// ---------------------------------------------------------------------------
// Property 15: Export schema compliance
// Feature: anivault-interoperability, Property 15
// ---------------------------------------------------------------------------

describe('Property P15: Export schema compliance', () => {
  it(
    'should produce a flat object where every non-__meta key is numeric and every entry has required fields',
    () => {
      fc.assert(
        fc.property(
          arbUserData,
          (userData) => {
            const mockStorage = makeMockStorage();
            const output = assembleExportOutput(userData, mockStorage);

            for (const [key, value] of Object.entries(output)) {
              if (key === "__meta") continue;

              // Every non-__meta key must be a numeric string
              expect(/^\d+$/.test(key)).toBe(true);

              // Every entry must have the required anivault_v2 fields
              expect(typeof value.status).toBe("string");
              expect(value.status.length).toBeGreaterThan(0);

              expect(typeof value.rating).toBe("number");
              expect(typeof value.episodesWatched).toBe("number");
              expect(typeof value.totalEpisodes).toBe("number");
              expect(typeof value.notes).toBe("string");

              // title object with romaji and english sub-fields
              expect(value.title).toBeDefined();
              expect(typeof value.title.romaji).toBe("string");
              expect(typeof value.title.english).toBe("string");
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 16: Export __meta round-trip
// Feature: anivault-interoperability, Property 16
// ---------------------------------------------------------------------------

describe('Property P16: Export __meta round-trip', () => {
  it(
    'should include the stored ember_anivault_meta value as __meta in the export',
    () => {
      fc.assert(
        fc.property(
          arbUserData,
          // Generate any JSON-serialisable value as the stored __meta
          fc.jsonValue(),
          (userData, metaValue) => {
            // JSON round-trip the meta value (as localStorage would store it)
            const jsonRoundTripped = JSON.parse(JSON.stringify(metaValue));
            const mockStorage = makeMockStorage({
              ember_anivault_meta: JSON.stringify(jsonRoundTripped),
            });

            const output = assembleExportOutput(userData, mockStorage);

            expect(output.__meta).toEqual(jsonRoundTripped);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 17: Export does not mutate localStorage
// Feature: anivault-interoperability, Property 17
// ---------------------------------------------------------------------------

describe('Property P17: Export does not mutate localStorage', () => {
  it(
    'should leave ember_data in localStorage byte-for-byte identical after export',
    () => {
      fc.assert(
        fc.property(
          arbUserData,
          (userData) => {
            // Simulate ember_data in localStorage
            const emberDataSnapshot = JSON.stringify(userData);
            const mockStorage = makeMockStorage({
              ember_data: emberDataSnapshot,
            });

            // Run the export assembly (read-only with respect to ember_data)
            assembleExportOutput(userData, mockStorage);

            // ember_data must be byte-for-byte identical after export
            expect(mockStorage.getItem("ember_data")).toBe(emberDataSnapshot);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
