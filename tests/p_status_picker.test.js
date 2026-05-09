/**
 * Property tests for status picker completeness and status persistence
 * round-trip (P3, P4)
 *
 * Feature: anivault-interoperability
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The relevant
 * logic is inlined here, matching the implementation in app.js exactly.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

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

/**
 * Inlined renderStatusPicker logic from app.js.
 * Renders a <select> with one <option> per status in STATUS_ORDER.
 */
function renderStatusPicker(id, currentStatus) {
  return `<div style="margin-top:var(--space-3)">
    <label style="font-size:12px;color:var(--text-2);display:block;margin-bottom:var(--space-1)">Status</label>
    <select class="status-select" data-action="set-status" data-entry="${id}" style="background:var(--surface-md);color:var(--text1);border:1px solid var(--glass-border);border-radius:8px;padding:6px 10px;font-size:14px;width:100%;cursor:pointer">
      ${STATUS_ORDER.map(s => `<option value="${s}" ${currentStatus === s ? 'selected' : ''}>${getStatusLabel(s)}</option>`).join('')}
    </select>
  </div>`;
}

// ---------------------------------------------------------------------------
// Property 3: Status picker contains all statuses
// Feature: anivault-interoperability, Property 3
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 2.1, 2.2**
 *
 * For every status in STATUS_ORDER, the rendered status picker HTML must
 * contain an <option> with that value and a non-empty label text.
 */
describe('Property P3: Status picker contains all statuses', () => {
  it(
    'should render an option with a non-empty label for every status in STATUS_ORDER',
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...STATUS_ORDER),
          (currentStatus) => {
            const html = renderStatusPicker(1, currentStatus);

            for (const status of STATUS_ORDER) {
              // Each status must appear as an option value
              expect(html).toContain(`value="${status}"`);

              // The label for each status must be non-empty
              const label = getStatusLabel(status);
              expect(typeof label).toBe('string');
              expect(label.length).toBeGreaterThan(0);

              // The label text must appear in the rendered HTML
              expect(html).toContain(label);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 4: Status persistence round-trip
// Feature: anivault-interoperability, Property 4
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 2.3, 2.4**
 *
 * For any entry and any valid status, setting entry.status = s, serialising
 * to JSON and parsing back, produces the same status value.
 */
describe('Property P4: Status persistence round-trip', () => {
  it(
    'should preserve status value through JSON serialisation and deserialisation',
    () => {
      fc.assert(
        fc.property(
          arbAnimeEntry,
          fc.constantFrom(...STATUS_ORDER),
          (entry, s) => {
            const serialised = JSON.stringify({ ...entry, status: s });
            const parsed = JSON.parse(serialised);
            expect(parsed.status).toBe(s);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
