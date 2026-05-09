/**
 * Property tests for import merge behaviour (P12, P13, P14)
 *
 * Feature: anivault-interoperability, Property 12, Property 13, Property 14
 *
 * Validates: Requirements 9.1, 9.3, 9.5
 *
 * NOTE: app.js is a plain <script> (no ES module exports). The relevant
 * logic is inlined here, matching the implementation in app.js exactly.
 * mergeEntries() is adapted to accept userData as a parameter instead of
 * closing over the module-level variable, making it testable without global state.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

// ---------------------------------------------------------------------------
// Inlined constants and functions — must stay in sync with app.js
// ---------------------------------------------------------------------------

const STATUS_ORDER = ["watching", "completed", "plan-to-watch", "queued", "dropped", "paused", "untracked"];

function mapAniVaultEntry(idStr, av2Entry) {
  const STATUS_MAP = {
    "Watching": "watching", "Completed": "completed", "Queued": "queued",
    "Plan to Watch": "plan-to-watch", "Dropped": "dropped", "Paused": "paused", "Untracked": "untracked",
  };
  const numericId = parseInt(idStr, 10);
  const rawStatus = av2Entry.status || "";
  const status = STATUS_MAP[rawStatus] || (STATUS_ORDER.includes(rawStatus) ? rawStatus : "untracked");
  return {
    id: numericId, anilistId: numericId,
    title: (av2Entry.title && (av2Entry.title.romaji || av2Entry.title.english)) || "",
    titleEnglish: (av2Entry.title && av2Entry.title.english) || "",
    cover: (av2Entry.coverImage && av2Entry.coverImage.large) || "",
    episodes: av2Entry.totalEpisodes || 0,
    episodesWatched: av2Entry.episodesWatched || 0,
    status, rating: av2Entry.rating || 0, notes: av2Entry.notes || "",
    genres: av2Entry.genres || [], averageScore: av2Entry.averageScore || 0,
    year: av2Entry.year || av2Entry.seasonYear || 0,
  };
}

/**
 * mergeEntries operates on a mutable userData object passed as parameter.
 * This differs from app.js where it closes over the module-level userData.
 */
function mergeEntries(userData, importedEntries) {
  let added = 0, updated = 0, skipped = 0;
  for (const [idStr, imported] of Object.entries(importedEntries)) {
    if (!/^\d+$/.test(idStr)) continue;
    const mapped = mapAniVaultEntry(idStr, imported);
    const existing = userData[idStr];
    if (!existing) {
      userData[idStr] = mapped;
      added++;
    } else {
      const merged = { ...existing, ...mapped };
      if (JSON.stringify(merged) !== JSON.stringify(existing)) {
        userData[idStr] = merged;
        updated++;
      } else {
        skipped++;
      }
    }
  }
  return { added, updated, skipped };
}

// ---------------------------------------------------------------------------
// Arbitrary for anivault_v2 entries
// ---------------------------------------------------------------------------

const arbAv2Entry = fc.record({
  status: fc.constantFrom("Watching", "Completed", "Queued", "Plan to Watch", "Dropped", "Paused", "Untracked"),
  rating: fc.integer({ min: 0, max: 10 }),
  episodesWatched: fc.integer({ min: 0, max: 2000 }),
  totalEpisodes: fc.integer({ min: 0, max: 2000 }),
  notes: fc.string(),
});

const arbId = fc.integer({ min: 1, max: 999999 }).map(n => String(n));

// ---------------------------------------------------------------------------
// Property 12: Merge adds new entries
// Feature: anivault-interoperability, Property 12
// ---------------------------------------------------------------------------

describe('Property P12: Merge adds new entries', () => {
  it(
    'should add all imported entries whose IDs are absent from userData',
    () => {
      /**
       * **Validates: Requirements 9.1**
       *
       * For any valid anivault_v2 entries whose IDs are absent from userData,
       * after mergeEntries(), all those entries exist in userData.
       */
      fc.assert(
        fc.property(
          // Generate a userData dictionary (existing entries)
          fc.dictionary(arbId, arbAnimeEntry),
          // Generate import entries with IDs that do NOT overlap with userData
          fc.array(fc.tuple(arbId, arbAv2Entry), { minLength: 1, maxLength: 20 }),
          (existingData, importPairs) => {
            // Build userData with string keys matching the existing entries
            const userData = {};
            for (const [id, entry] of Object.entries(existingData)) {
              userData[id] = entry;
            }

            // Build importedEntries using IDs that are NOT in userData
            const importedEntries = {};
            for (const [id, entry] of importPairs) {
              // Only include IDs that are absent from userData
              if (!(id in userData)) {
                importedEntries[id] = entry;
              }
            }

            // If all IDs happened to collide, skip this run
            if (Object.keys(importedEntries).length === 0) return;

            mergeEntries(userData, importedEntries);

            // All imported IDs must now exist in userData
            for (const idStr of Object.keys(importedEntries)) {
              expect(idStr in userData).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 13: Merge preserves untouched entries
// Feature: anivault-interoperability, Property 13
// ---------------------------------------------------------------------------

describe('Property P13: Merge preserves untouched entries', () => {
  it(
    'should leave entries whose IDs are NOT in the import byte-for-byte identical',
    () => {
      /**
       * **Validates: Requirements 9.3**
       *
       * Entries in userData whose IDs are NOT in the import remain
       * byte-for-byte identical after mergeEntries().
       */
      fc.assert(
        fc.property(
          // Generate existing userData entries
          fc.dictionary(arbId, arbAnimeEntry, { minKeys: 1, maxKeys: 20 }),
          // Generate import entries (may partially overlap with userData)
          fc.dictionary(arbId, arbAv2Entry, { minKeys: 1, maxKeys: 20 }),
          (existingData, importedEntries) => {
            const userData = {};
            for (const [id, entry] of Object.entries(existingData)) {
              userData[id] = entry;
            }

            // Snapshot the entries that are NOT in the import
            const untouchedIds = Object.keys(userData).filter(id => !(id in importedEntries));
            const snapshot = {};
            for (const id of untouchedIds) {
              snapshot[id] = JSON.stringify(userData[id]);
            }

            mergeEntries(userData, importedEntries);

            // All untouched entries must remain byte-for-byte identical
            for (const id of untouchedIds) {
              expect(JSON.stringify(userData[id])).toBe(snapshot[id]);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 14: Import idempotence
// Feature: anivault-interoperability, Property 14
// ---------------------------------------------------------------------------

describe('Property P14: Import idempotence', () => {
  it(
    'should produce the same userData on second import and return added === 0',
    () => {
      /**
       * **Validates: Requirements 9.5**
       *
       * Importing the same entries twice produces the same userData as
       * importing once; the second call returns added === 0.
       */
      fc.assert(
        fc.property(
          // Start with an empty or partially populated userData
          fc.dictionary(arbId, arbAnimeEntry),
          // Generate import entries
          fc.dictionary(arbId, arbAv2Entry, { minKeys: 1, maxKeys: 20 }),
          (existingData, importedEntries) => {
            const userData = {};
            for (const [id, entry] of Object.entries(existingData)) {
              userData[id] = entry;
            }

            // First import
            mergeEntries(userData, importedEntries);
            const snapshotAfterFirst = JSON.stringify(userData);

            // Second import — same entries
            const secondResult = mergeEntries(userData, importedEntries);

            // userData must be identical after second import
            expect(JSON.stringify(userData)).toBe(snapshotAfterFirst);

            // Second import must add zero new entries
            expect(secondResult.added).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
