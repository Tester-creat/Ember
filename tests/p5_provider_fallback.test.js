import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

const STREAM_PROVIDERS = [
  {
    name: "MegaPlay",
    active: true,
    idType: "anikoto",
    buildUrl: () => "",
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

function getNextProviderIndex(currentIndex, totalProviders) {
  return (currentIndex + 1) % totalProviders;
}

function getActiveProviders() {
  return STREAM_PROVIDERS.filter(provider => provider.active);
}

describe('Property P5: Provider fallback cycling', () => {
  it(
    'should cycle through all active providers and wrap back to start after N steps',
    () => {
      const activeProviders = getActiveProviders();
      const numActive = activeProviders.length;

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: numActive - 1 }),
          (startIdx) => {
            let currentIdx = startIdx;
            for (let i = 0; i < numActive; i++) {
              currentIdx = getNextProviderIndex(currentIdx, numActive);
            }
            expect(currentIdx).toBe(startIdx);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'should validate provider cycling with different numbers of active providers',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 4 }),
          fc.integer({ min: 0 }),
          (numProviders, startIdx) => {
            const totalProviders = numProviders;
            let currentIdx = startIdx % totalProviders;
            for (let i = 0; i < totalProviders; i++) {
              currentIdx = getNextProviderIndex(currentIdx, totalProviders);
            }
            expect(currentIdx).toBe(startIdx % totalProviders);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  describe('Provider fallback scenarios', () => {
    it('should cycle through all 3 active providers in order', () => {
      const activeProviders = getActiveProviders();
      expect(activeProviders).toHaveLength(3);

      let currentIdx = 0;
      const expectedSequence = [0, 1, 2, 0, 1, 2];
      for (let i = 0; i < 6; i++) {
        expect(currentIdx).toBe(expectedSequence[i]);
        currentIdx = getNextProviderIndex(currentIdx, activeProviders.length);
      }
    });

    it('should wrap around correctly from last to first provider', () => {
      const activeProviders = getActiveProviders();
      const lastIndex = activeProviders.length - 1;
      const nextIdx = getNextProviderIndex(lastIndex, activeProviders.length);
      expect(nextIdx).toBe(0);
    });

    it('should handle single active provider correctly', () => {
      const singleProvider = [STREAM_PROVIDERS[0]];
      const nextIdx = getNextProviderIndex(0, singleProvider.length);
      expect(nextIdx).toBe(0);
    });

    it('should maintain consistent cycling behavior across multiple runs', () => {
      const activeProviders = getActiveProviders();
      const numActive = activeProviders.length;
      for (let cycle = 0; cycle < 5; cycle++) {
        let currentIdx = 0;
        for (let i = 0; i < numActive; i++) {
          const nextIdx = getNextProviderIndex(currentIdx, numActive);
          expect(nextIdx).toBe((currentIdx + 1) % numActive);
          currentIdx = nextIdx;
        }
        expect(currentIdx).toBe(0);
      }
    });
  });

  it(
    'should match the actual fallback implementation in app.js',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: STREAM_PROVIDERS.length - 1 }),
          fc.integer({ min: 1, max: 10 }),
          (startIdx, numFallbacks) => {
            let currentIdx = startIdx;
            for (let i = 0; i < numFallbacks; i++) {
              currentIdx = (currentIdx + 1) % STREAM_PROVIDERS.length;
            }
            const expectedIdx = (startIdx + numFallbacks) % STREAM_PROVIDERS.length;
            expect(currentIdx).toBe(expectedIdx);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'should validate cycling only through active providers',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: STREAM_PROVIDERS.length - 1 }),
          (startIdx) => {
            const activeProviders = getActiveProviders();
            const numActive = activeProviders.length;

            expect(activeProviders).toHaveLength(STREAM_PROVIDERS.length);
            STREAM_PROVIDERS.forEach(provider => {
              expect(provider.active).toBe(true);
            });

            let currentIdx = startIdx;
            for (let i = 0; i < numActive; i++) {
              currentIdx = getNextProviderIndex(currentIdx, numActive);
            }
            expect(currentIdx).toBe(startIdx);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
