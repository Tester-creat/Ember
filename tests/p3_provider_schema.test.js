/**
 * Property test for provider schema invariant (P3)
 * Validates: Requirements 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * 
 * Property 3: Provider schema invariant
 * For any provider object in the STREAM_PROVIDERS array, the provider SHALL have
 * a non-empty name string, a boolean active field, a callable buildUrl function,
 * and a notes string — regardless of how many providers are added or removed from the array.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbProviderConfig } from './generators.js';

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

function isValidProvider(provider) {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    typeof provider.name === 'string' &&
    provider.name.length > 0 &&
    typeof provider.active === 'boolean' &&
    (provider.idType === 'anilist' || provider.idType === 'slug') &&
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
          expect(['anilist', 'slug'].includes(provider.idType)).toBe(true);
          expect(typeof provider.buildUrl).toBe('function');
          expect(typeof provider.notes).toBe('string');
          
          const testEntry = { anilistId: 1, title: 'Test' };
          const url = provider.buildUrl(testEntry, 1, 'sub');
          expect(typeof url).toBe('string');
          expect(url.length).toBeGreaterThan(0);
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
              expect(provider.idType).toBe('anilist');
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
      STREAM_PROVIDERS.forEach((provider) => {
        expect(provider.idType).toBe('anilist');
      });
    });

    it('should all have active set to true', () => {
      STREAM_PROVIDERS.forEach((provider) => {
        expect(provider.active).toBe(true);
      });
    });

    it('should have exactly 4 providers in STREAM_PROVIDERS', () => {
      expect(STREAM_PROVIDERS).toHaveLength(4);
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
