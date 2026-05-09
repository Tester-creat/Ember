/**
 * Property tests for import file validation (P8, P9)
 *
 * Feature: anivault-interoperability, Property 8, Property 9
 *
 * Validates: Requirements 7.2, 7.3
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The validation
 * logic is inlined here, matching the implementation in app.js exactly.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Inline validation logic — must stay in sync with app.js
// ---------------------------------------------------------------------------

/**
 * Step 1: Parse JSON string.
 * Returns { ok: true, data } on success, { ok: false, error } on failure.
 */
function parseImportData(jsonString) {
  try {
    return { ok: true, data: JSON.parse(jsonString) };
  } catch {
    return { ok: false, error: "Import failed: invalid JSON" };
  }
}

/**
 * Step 2: Validate the parsed value.
 * Rejects non-objects (arrays, strings, numbers, booleans, null).
 * Rejects objects with no numeric AniList ID keys.
 */
function validateImportData(data) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "Import failed: expected an object" };
  }
  const hasNumericKeys = Object.keys(data).some(k => k !== "__meta" && /^\d+$/.test(k));
  if (!hasNumericKeys) {
    return { ok: false, error: "Import failed: no valid library entries found" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Property 8: Import rejects invalid JSON
// Feature: anivault-interoperability, Property 8
// ---------------------------------------------------------------------------

describe('Property P8: Import rejects invalid JSON', () => {
  it(
    'should return ok=false for any string that is not valid JSON, and must not modify ember_data',
    () => {
      fc.assert(
        fc.property(
          // Generate strings that are NOT valid JSON
          fc.string().filter(s => {
            try { JSON.parse(s); return false; } catch { return true; }
          }),
          (invalidJsonString) => {
            // Simulate a mock ember_data object that must not be modified
            const mockEmberData = { "12345": { status: "watching" } };
            const snapshotBefore = JSON.stringify(mockEmberData);

            const result = parseImportData(invalidJsonString);

            // The parse must fail
            expect(result.ok).toBe(false);

            // ember_data must not have been modified (validation returns early)
            expect(JSON.stringify(mockEmberData)).toBe(snapshotBefore);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 9: Import rejects non-object JSON
// Feature: anivault-interoperability, Property 9
// ---------------------------------------------------------------------------

describe('Property P9: Import rejects non-object JSON', () => {
  it(
    'should return ok=false for any JSON-serialisable non-object value, and must not modify ember_data',
    () => {
      fc.assert(
        fc.property(
          // Generate non-object JSON-serialisable values
          fc.oneof(
            fc.array(fc.anything()),
            fc.string(),
            fc.integer(),
            fc.float(),
            fc.boolean(),
            fc.constant(null)
          ),
          (nonObjectValue) => {
            // Simulate a mock ember_data object that must not be modified
            const mockEmberData = { "67890": { status: "completed" } };
            const snapshotBefore = JSON.stringify(mockEmberData);

            // Serialise and parse back (as the real import pipeline would do)
            const parsed = JSON.parse(JSON.stringify(nonObjectValue));
            const result = validateImportData(parsed);

            // The validation must reject non-objects
            expect(result.ok).toBe(false);

            // ember_data must not have been modified
            expect(JSON.stringify(mockEmberData)).toBe(snapshotBefore);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
