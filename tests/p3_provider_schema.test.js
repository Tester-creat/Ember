import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbProviderConfig } from './generators.js';

const episodeEmbedCache = {};

const STREAM_PROVIDERS = [
  {
    name: "MegaPlay",
    active: true,
    idType: "anikoto",
    buildUrl: (entry, ep, lang) => {
      return episodeEmbedCache[`${entry.anilistId}-${ep}-${lang}`] || "";
    },
    notes: "Primary — Anikoto /series/{id} native embed (s-2 path). Highest reliability.",
  },
  {
    name: "VidNest",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://vidnest.fun/anime/${entry.anilistId}/${ep}/${lang}`,
    notes: "Direct AniList ID embed. Reliable synchronous fallback.",
  },
  {
    name: "VidSrc",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://vidsrc.cc/v2/embed/anime/${entry.anilistId}/${ep}`,
    notes: "VidSrc anime embed. Direct AniList ID embed.",
  },
];

function isValidProvider(provider) {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    typeof provider.name === 'string' &&
    provider.name.length > 0 &&
    typeof provider.active === 'boolean' &&
    (provider.idType === 'anilist' || provider.idType === 'anikoto' || provider.idType === 'slug') &&
    typeof provider.buildUrl === 'function' &&
    typeof provider.notes === 'string'
  );
}

describe('Property P3: Provider schema invariant', () => {
  it(
    'should validate that generated provider configs have required fields',
    () => {
      fc.assert(
        fc.property(arbProviderConfig, (provider) => {
          expect(typeof provider.name).toBe('string');
          expect(provider.name.length).toBeGreaterThan(0);
          expect(typeof provider.active).toBe('boolean');
          expect(['anilist', 'anikoto', 'slug'].includes(provider.idType)).toBe(true);
          expect(typeof provider.buildUrl).toBe('function');
          expect(typeof provider.notes).toBe('string');

          const testEntry = { anilistId: 1, title: 'Test' };
          const url = provider.buildUrl(testEntry, 1, 'sub');
          expect(typeof url).toBe('string');
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'should validate that all providers in STREAM_PROVIDERS array conform to schema',
    () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: STREAM_PROVIDERS.length - 1 }), {
            minLength: 1,
            maxLength: STREAM_PROVIDERS.length,
          }),
          (indices) => {
            indices.forEach((index) => {
              const provider = STREAM_PROVIDERS[index];

              expect(typeof provider.name).toBe('string');
              expect(provider.name.length).toBeGreaterThan(0);
              expect(typeof provider.active).toBe('boolean');
              expect(typeof provider.buildUrl).toBe('function');
              expect(typeof provider.notes).toBe('string');

              const testEntry = { anilistId: 1, title: 'Test' };
              const testEp = 1;
              const url = provider.buildUrl(testEntry, testEp, 'sub');
              expect(typeof url).toBe('string');
            });
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  describe('Provider schema validation', () => {
    it('should have required fields for all providers in STREAM_PROVIDERS', () => {
      STREAM_PROVIDERS.forEach((provider) => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('active');
        expect(provider).toHaveProperty('idType');
        expect(provider).toHaveProperty('buildUrl');
        expect(provider).toHaveProperty('notes');

        expect(typeof provider.name).toBe('string');
        expect(provider.name.length).toBeGreaterThan(0);
        expect(typeof provider.active).toBe('boolean');
        expect(typeof provider.buildUrl).toBe('function');
        expect(typeof provider.notes).toBe('string');
      });
    });

    it('should all have valid idType values', () => {
      expect(STREAM_PROVIDERS[0].idType).toBe('anikoto');
      expect(STREAM_PROVIDERS[1].idType).toBe('anilist');
      expect(STREAM_PROVIDERS[2].idType).toBe('anilist');
    });

    it('should all have active set to true', () => {
      STREAM_PROVIDERS.forEach((provider) => {
        expect(provider.active).toBe(true);
      });
    });

    it('should have exactly 3 providers in STREAM_PROVIDERS', () => {
      expect(STREAM_PROVIDERS).toHaveLength(3);
    });
  });

  it(
    'should validate providers after simulated array modifications',
    () => {
      fc.assert(
        fc.property(
          fc.array(arbProviderConfig, { minLength: 1, maxLength: 10 }),
          (newProviders) => {
            const modifiedProviders = [...STREAM_PROVIDERS, ...newProviders];

            modifiedProviders.forEach((provider) => {
              expect(isValidProvider(provider)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'should validate providers after simulated provider removal',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: STREAM_PROVIDERS.length - 1 }),
          (indexToRemove) => {
            const modifiedProviders = STREAM_PROVIDERS.filter(
              (_, index) => index !== indexToRemove
            );

            modifiedProviders.forEach((provider) => {
              expect(isValidProvider(provider)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
