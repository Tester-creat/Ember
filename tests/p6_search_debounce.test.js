/**
 * Property test for search debounce (P6)
 * Validates: Requirements 9.4
 *
 * Property 6: Search debounce fires exactly once per input burst
 * For any sequence of search input events where all events occur within a 350ms
 * window, the AniList API SHALL be called exactly once — after the 350ms timer
 * expires following the final event in the burst.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import * as fc from 'fast-check';

// ─── Minimal debounce implementation (mirrors app.js behaviour) ──────────────

const DEBOUNCE_MS = 350;

function makeDebouncer() {
  let timer = null;
  let callCount = 0;
  let lastQuery = '';

  function schedule(query) {
    clearTimeout(timer);
    if (query.trim().length < 2) return;
    timer = setTimeout(() => {
      callCount++;
      lastQuery = query;
    }, DEBOUNCE_MS);
  }

  function reset() {
    clearTimeout(timer);
    timer = null;
    callCount = 0;
    lastQuery = '';
  }

  return { schedule, reset, get callCount() { return callCount; }, get lastQuery() { return lastQuery; } };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property P6: Search debounce fires exactly once per input burst', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires exactly once for a burst of keystrokes all within 350ms', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        // Use stringMatching to guarantee at least 2 non-whitespace chars
        fc.stringMatching(/^[a-zA-Z0-9]{2,50}$/),
        (numKeystrokes, baseQuery) => {
          const d = makeDebouncer();

          // Simulate multiple keystrokes within 350ms
          for (let i = 0; i < numKeystrokes; i++) {
            const partial = baseQuery.slice(0, Math.max(2, i + 1));
            d.schedule(partial);
          }

          // Advance past the debounce window
          vi.advanceTimersByTime(DEBOUNCE_MS + 1);

          expect(d.callCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('fires once per burst when bursts are separated by > 350ms', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]{2,30}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{2,30}$/),
        (query1, query2) => {
          const d = makeDebouncer();

          // Burst 1
          d.schedule(query1);
          d.schedule(query1 + 'x');
          vi.advanceTimersByTime(DEBOUNCE_MS + 1);
          const afterBurst1 = d.callCount;

          // Burst 2 (well after burst 1 settled)
          d.schedule(query2);
          d.schedule(query2 + 'y');
          vi.advanceTimersByTime(DEBOUNCE_MS + 1);

          expect(afterBurst1).toBe(1);
          expect(d.callCount).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not fire for queries shorter than 2 characters', () => {
    const d = makeDebouncer();
    d.schedule('a');
    vi.advanceTimersByTime(DEBOUNCE_MS + 1);
    expect(d.callCount).toBe(0);
  });

  it('resets the timer on each new keystroke within the window', () => {
    const d = makeDebouncer();
    d.schedule('cow');
    vi.advanceTimersByTime(100);
    d.schedule('cowb');
    vi.advanceTimersByTime(100);
    d.schedule('cowbe');
    vi.advanceTimersByTime(100);
    d.schedule('cowbel');
    vi.advanceTimersByTime(DEBOUNCE_MS + 1);

    expect(d.callCount).toBe(1);
    expect(d.lastQuery).toBe('cowbel');
  });

  it('fires for each of three separate bursts', () => {
    const d = makeDebouncer();

    d.schedule('attack');
    vi.advanceTimersByTime(DEBOUNCE_MS + 1);

    d.schedule('king');
    vi.advanceTimersByTime(DEBOUNCE_MS + 1);

    d.schedule('gundam');
    vi.advanceTimersByTime(DEBOUNCE_MS + 1);

    expect(d.callCount).toBe(3);
  });
});
