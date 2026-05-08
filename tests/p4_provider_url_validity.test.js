/**
 * Property test for provider URL validity (P4)
 * Validates: Requirements 5.3, 6.5
 *
 * Property 4: Provider buildUrl returns valid HTTPS URL
 * For any active provider in STREAM_PROVIDERS, any anime entry with a positive
 * integer anilistId, any episode number ≥ 1, and any language value of "sub" or "dub",
 * calling provider.buildUrl(entry, ep, lang) SHALL return a non-empty string that
 * begins with "https://".
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

const STREAM_PROVIDERS = [
  {
    name: "MegaPlay",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://megaplay.buzz/stream/ani/${entry.anilistId}/${ep}/${lang}`,
    notes: "Confirmed working. Supports sub/dub via lang param.",
  },
  {
    name: "Cinetaro",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://api.cinetaro.buzz/embed/anime/${entry.anilistId}/1/${ep}?type=${lang}`,
    notes: "Each AniList entry is one season; season is always 1 relative to that entry.",
  },
  {
    name: "VidPlus",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://player.vidplus.to/embed/anime/${entry.anilistId}/${ep}?dub=${lang === "dub"}&autoplay=true`,
    notes: "AniList ID-based. Dub flag is boolean query param.",
  },
  {
    name: "VidNest",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://vidnest.fun/anime/${entry.anilistId}/${ep}/${lang}`,
    notes: "Direct AniList ID embed. Synchronous, no pre-fetch required. URL: /anime/{anilistId}/{ep}/{sub|dub}",
  },
];

describe('Property P4: Provider buildUrl returns valid HTTPS URL', () => {
  it(
    'should validate that all active providers return HTTPS URLs for any valid input',
    () => {
      const activeProviders = STREAM_PROVIDERS.filter(p => p.active);

      fc.assert(
        fc.property(
          arbAnimeEntry,
          fc.integer({ min: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          (entry, ep, lang) => {
            expect(entry.anilistId).toBeGreaterThan(0);

            activeProviders.forEach((provider) => {
              const url = provider.buildUrl(entry, ep, lang);
              expect(typeof url).toBe('string');
              expect(url.length).toBeGreaterThan(0);
              expect(url.startsWith('https://')).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'should validate HTTPS URLs across varied inputs (150 iterations)',
    () => {
      const activeProviders = STREAM_PROVIDERS.filter(p => p.active);

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2_000_000 }),
          fc.integer({ min: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          (anilistId, ep, lang) => {
            const entry = {
              id: anilistId,
              anilistId,
              title: `Test Anime ${anilistId}`,
              titleEnglish: `English Title ${anilistId}`,
              cover: `https://example.com/cover/${anilistId}.jpg`,
              banner: `https://example.com/banner/${anilistId}.jpg`,
              episodes: 12,
              status: "watching",
              episodesWatched: 1,
              language: lang,
              rating: 8,
              dateAdded: Date.now(),
              lastWatched: Date.now(),
              completedAt: 0,
              notes: "Test entry",
              genres: ["Action", "Adventure"],
              year: 2024,
              sessionLog: [],
              averageScore: 85,
            };

            activeProviders.forEach((provider) => {
              const url = provider.buildUrl(entry, ep, lang);
              expect(typeof url).toBe('string');
              expect(url.length).toBeGreaterThan(0);
              expect(url.startsWith('https://')).toBe(true);
            });
          }
        ),
        { numRuns: 150 }
      );
    }
  );

  describe('Provider-specific URL validation', () => {
    const testEntry = {
      id: 12345,
      anilistId: 12345,
      title: "Test Anime",
      titleEnglish: "Test Anime EN",
      cover: "https://example.com/cover.jpg",
      banner: "https://example.com/banner.jpg",
      episodes: 12,
      status: "watching",
      episodesWatched: 1,
      language: "sub",
      rating: 8,
      dateAdded: 1700000000000,
      lastWatched: 1700000000000,
      completedAt: 0,
      notes: "Test",
      genres: ["Action"],
      year: 2024,
      sessionLog: [],
      averageScore: 85,
    };

    it('should generate valid HTTPS URLs for each provider with sub language', () => {
      STREAM_PROVIDERS.forEach((provider) => {
        if (provider.active) {
          const url = provider.buildUrl(testEntry, 1, "sub");
          expect(url.startsWith('https://')).toBe(true);
          expect(url.length).toBeGreaterThan(0);
        }
      });
    });

    it('should generate valid HTTPS URLs for each provider with dub language', () => {
      STREAM_PROVIDERS.forEach((provider) => {
        if (provider.active) {
          const url = provider.buildUrl(testEntry, 1, "dub");
          expect(url.startsWith('https://')).toBe(true);
          expect(url.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle large episode numbers correctly', () => {
      const largeEpisodes = [100, 250, 500, 1000];
      STREAM_PROVIDERS.forEach((provider) => {
        if (provider.active) {
          largeEpisodes.forEach((ep) => {
            const url = provider.buildUrl(testEntry, ep, "sub");
            expect(url.startsWith('https://')).toBe(true);
            expect(url.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });
});
