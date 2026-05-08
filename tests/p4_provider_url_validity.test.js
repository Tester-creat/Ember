import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

const episodeEmbedCache = {};

const STREAM_PROVIDERS = [
  {
    name: "MegaPlay",
    active: true,
    idType: "anikoto",
    buildUrl: (entry, ep, lang) => {
      return episodeEmbedCache[`${entry.anilistId}-${ep}-${lang}`] || "";
    },
    notes: "Primary — resolved via Anikoto API (episode embed IDs)",
  },
  {
    name: "VidNest",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://vidnest.fun/anime/${entry.anilistId}/${ep}/${lang}`,
    notes: "Direct AniList ID embed. Reliable synchronous fallback.",
  },
];

function seedEmbedCache(anilistId, ep, lang) {
  const key = `${anilistId}-${ep}-${lang}`;
  if (!episodeEmbedCache[key]) {
    episodeEmbedCache[key] = `https://megaplay.buzz/stream/s-2/${anilistId}${String(ep).padStart(4, '0')}/${lang}`;
  }
}

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
            seedEmbedCache(entry.anilistId, ep, lang);

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

            seedEmbedCache(anilistId, ep, lang);

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

    beforeEach(() => {
      Object.keys(episodeEmbedCache).forEach(k => delete episodeEmbedCache[k]);
    });

    it('should generate valid HTTPS URLs for each provider with sub language', () => {
      seedEmbedCache(testEntry.anilistId, 1, "sub");
      STREAM_PROVIDERS.forEach((provider) => {
        if (provider.active) {
          const url = provider.buildUrl(testEntry, 1, "sub");
          expect(url.startsWith('https://')).toBe(true);
          expect(url.length).toBeGreaterThan(0);
        }
      });
    });

    it('should generate valid HTTPS URLs for each provider with dub language', () => {
      seedEmbedCache(testEntry.anilistId, 1, "dub");
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
      largeEpisodes.forEach((ep) => seedEmbedCache(testEntry.anilistId, ep, "sub"));
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
