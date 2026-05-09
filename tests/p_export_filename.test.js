/**
 * Property test for export filename format (P18)
 *
 * Feature: anivault-interoperability, Property 18
 *
 * Validates: Requirements 11.1, 11.3
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The relevant
 * logic is inlined here, matching the implementation in app.js exactly.
 * Date is mocked via vi.setSystemTime() to test arbitrary dates.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Inline definition — must stay in sync with app.js
// ---------------------------------------------------------------------------

function generateExportFilename() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `anivault-backup-${yyyy}-${mm}-${dd}.json`;
}

// ---------------------------------------------------------------------------
// Property 18: Export filename format
// Feature: anivault-interoperability, Property 18
// ---------------------------------------------------------------------------

describe('Property P18: Export filename format', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it(
    'should return anivault-backup-YYYY-MM-DD.json for any date',
    () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          (date) => {
            vi.useFakeTimers();
            vi.setSystemTime(date);

            const filename = generateExportFilename();

            vi.useRealTimers();

            // Must match the full pattern
            expect(filename).toMatch(/^anivault-backup-\d{4}-\d{2}-\d{2}\.json$/);

            // Must start with anivault-backup-
            expect(filename.startsWith('anivault-backup-')).toBe(true);

            // Must end with .json
            expect(filename.endsWith('.json')).toBe(true);

            // The date segment must be a valid ISO 8601 date
            const dateSegment = filename.slice('anivault-backup-'.length, -'.json'.length);
            const parsed = new Date(dateSegment);
            expect(isNaN(parsed.getTime())).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
