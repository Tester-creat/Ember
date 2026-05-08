/**
 * Property test for library data roundtrip (P1)
 * Validates: Data persistence preserves entry fields
 *
 * Property 1: JSON serialization/deserialization preserves all entry fields
 * For any valid library entry created by addToLibrary-style construction,
 * serializing to JSON and parsing back shall preserve all field values.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

function createEntry(anime) {
  return {
    id: anime.id,
    anilistId: anime.id,
    title: anime.title || 'Unknown',
    titleEnglish: anime.titleEnglish || '',
    cover: anime.cover || '',
    episodes: anime.episodes || 0,
    episodesWatched: 0,
    status: 'plan-to-watch',
    lastWatched: 0,
    rating: 0,
    genres: anime.genres || [],
    averageScore: anime.averageScore || 0,
    dateAdded: Date.now(),
  };
}

describe('Property P1: Library data roundtrip preservation', () => {
  it(
    'should preserve all fields after JSON serialization/deserialization',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2_000_000 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 200 }),
          fc.integer({ min: 0, max: 2000 }),
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
          fc.integer({ min: 0, max: 100 }),
          (id, title, titleEnglish, cover, episodes, genres, averageScore) => {
            const animeData = {
              id,
              title,
              titleEnglish,
              cover,
              episodes,
              genres,
              averageScore,
            };

            const entry = createEntry(animeData);

            const jsonString = JSON.stringify(entry);
            const parsed = JSON.parse(jsonString);

            expect(parsed.id).toBe(entry.id);
            expect(parsed.anilistId).toBe(entry.anilistId);
            expect(parsed.title).toBe(entry.title);
            expect(parsed.titleEnglish).toBe(entry.titleEnglish);
            expect(parsed.cover).toBe(entry.cover);
            expect(parsed.episodes).toBe(entry.episodes);
            expect(parsed.episodesWatched).toBe(entry.episodesWatched);
            expect(parsed.status).toBe(entry.status);
            expect(parsed.lastWatched).toBe(entry.lastWatched);
            expect(parsed.rating).toBe(entry.rating);
            expect(parsed.dateAdded).toBe(entry.dateAdded);

            expect(parsed.genres).toEqual(entry.genres);
            expect(parsed.averageScore).toBe(entry.averageScore);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'should handle multiple entries in a library object',
    () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(
            fc.record({
              id: fc.integer({ min: 1, max: 2_000_000 }),
              title: fc.string({ minLength: 1, maxLength: 50 }),
              episodes: fc.integer({ min: 0, max: 500 }),
            }),
            { selector: r => r.id, minLength: 0, maxLength: 20 }
          ),
          (entries) => {
            const library = {};
            entries.forEach((e) => {
              library[String(e.id)] = createEntry(e);
            });

            const jsonString = JSON.stringify(library);
            const parsed = JSON.parse(jsonString);

            expect(Object.keys(parsed)).toHaveLength(entries.length);

            entries.forEach((e) => {
              const id = String(e.id);
              expect(parsed[id]).not.toBeUndefined();
              expect(parsed[id].title).toBe(e.title || 'Unknown');
              expect(parsed[id].episodes).toBe(e.episodes || 0);
              expect(parsed[id].status).toBe('plan-to-watch');
            });
          }
        ),
        { numRuns: 50 }
      );
    }
  );
});
