import { describe, it, expect, vi, afterEach } from 'vitest';

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

let currentProvider = 0;

function buildStreamUrl(entry, episode, language, providerIndex = 0) {
  if (!entry || !entry.anilistId) return "";
  const p = STREAM_PROVIDERS[providerIndex];
  if (!p || !p.active) return "";
  return p.buildUrl(entry, episode, language);
}

afterEach(() => {
  vi.unstubAllGlobals();
  Object.keys(episodeEmbedCache).forEach(k => delete episodeEmbedCache[k]);
  currentProvider = 0;
});

describe('Provider URL Generation', () => {
  const sampleEntry = {
    anilistId: 21,
    title: "Naruto",
    titleEnglish: "Naruto"
  };

  describe('MegaPlay provider', () => {
    it('should return empty string when no cached embed URL exists', () => {
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('');
    });

    it('should return cached embed URL when available', () => {
      episodeEmbedCache['21-1-sub'] = 'https://megaplay.buzz/stream/s-2/170320/sub';
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://megaplay.buzz/stream/s-2/170320/sub');
    });

    it('should return cached dub URL when available', () => {
      episodeEmbedCache['21-1-dub'] = 'https://megaplay.buzz/stream/s-2/170320/dub';
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 1, 'dub');
      expect(url).toBe('https://megaplay.buzz/stream/s-2/170320/dub');
    });

    it('should handle different episode cache keys', () => {
      episodeEmbedCache['21-5-sub'] = 'https://megaplay.buzz/stream/s-2/99999/sub';
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 5, 'sub');
      expect(url).toBe('https://megaplay.buzz/stream/s-2/99999/sub');
    });
  });

  describe('VidNest provider', () => {
    it('should generate correct URL with sub language', () => {
      const url = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://vidnest.fun/anime/21/1/sub');
    });

    it('should generate correct URL with dub language', () => {
      const url = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 1, 'dub');
      expect(url).toBe('https://vidnest.fun/anime/21/1/dub');
    });

    it('should handle different episode numbers', () => {
      const url1 = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 5, 'sub');
      const url2 = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 100, 'dub');
      expect(url1).toBe('https://vidnest.fun/anime/21/5/sub');
      expect(url2).toBe('https://vidnest.fun/anime/21/100/dub');
    });

    it('URL starts with "https://"', () => {
      const url = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 1, 'sub');
      expect(url.startsWith('https://')).toBe(true);
    });
  });

  describe('VidSrc provider', () => {
    it('should generate correct URL for episode 1', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://vidsrc.cc/v2/embed/anime/21/1');
    });

    it('URL starts with "https://"', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 1, 'sub');
      expect(url.startsWith('https://')).toBe(true);
    });
  });

  describe('All providers HTTPS verification', () => {
    it('should return HTTPS URLs for all active providers that produce URLs', () => {
      // Seed MegaPlay cache so it returns a URL
      episodeEmbedCache['21-1-sub'] = 'https://megaplay.buzz/stream/s-2/170320/sub';
      STREAM_PROVIDERS.forEach((provider) => {
        if (provider.active) {
          const url = provider.buildUrl(sampleEntry, 1, 'sub');
          if (url) expect(url).toMatch(/^https:\/\//);
        }
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle episode 0 MegaPlay (no cache)', () => {
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 0, 'sub');
      expect(url).toBe('');
    });

    it('should handle episode 0 MegaPlay (cached)', () => {
      episodeEmbedCache['21-0-sub'] = 'https://megaplay.buzz/stream/s-2/0/sub';
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 0, 'sub');
      expect(url).toBe('https://megaplay.buzz/stream/s-2/0/sub');
    });

    it('should handle large episode numbers in cache', () => {
      episodeEmbedCache['21-9999-sub'] = 'https://megaplay.buzz/stream/s-2/9999/sub';
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 9999, 'sub');
      expect(url).toBe('https://megaplay.buzz/stream/s-2/9999/sub');
    });

    it('should handle different anime IDs with VidNest', () => {
      const entry1 = { anilistId: 1, title: "Cowboy Bebop" };
      const entry2 = { anilistId: 12345, title: "Test Anime" };
      const url1 = STREAM_PROVIDERS[1].buildUrl(entry1, 1, 'sub');
      const url2 = STREAM_PROVIDERS[1].buildUrl(entry2, 1, 'sub');
      expect(url1).toBe('https://vidnest.fun/anime/1/1/sub');
      expect(url2).toBe('https://vidnest.fun/anime/12345/1/sub');
    });

    it('should handle different anime IDs with VidSrc', () => {
      const entry1 = { anilistId: 1, title: "Cowboy Bebop" };
      const entry2 = { anilistId: 12345, title: "Test Anime" };
      const url1 = STREAM_PROVIDERS[2].buildUrl(entry1, 1, 'sub');
      const url2 = STREAM_PROVIDERS[2].buildUrl(entry2, 1, 'sub');
      expect(url1).toBe('https://vidsrc.cc/v2/embed/anime/1/1');
      expect(url2).toBe('https://vidsrc.cc/v2/embed/anime/12345/1');
    });
  });

  describe('buildStreamUrl function', () => {
    it('should return empty when MegaPlay has no cache (index 0)', () => {
      const url = buildStreamUrl(sampleEntry, 1, 'sub', 0);
      expect(url).toBe('');
    });

    it('should return MegaPlay URL from cache when available', () => {
      episodeEmbedCache['21-1-sub'] = 'https://megaplay.buzz/stream/s-2/170320/sub';
      const url = buildStreamUrl(sampleEntry, 1, 'sub', 0);
      expect(url).toBe('https://megaplay.buzz/stream/s-2/170320/sub');
    });

    it('should return VidNest URL when specifying provider index 1', () => {
      const url = buildStreamUrl(sampleEntry, 1, 'sub', 1);
      expect(url).toBe('https://vidnest.fun/anime/21/1/sub');
    });

    it('should return VidSrc URL when specifying provider index 2', () => {
      const url = buildStreamUrl(sampleEntry, 1, 'sub', 2);
      expect(url).toBe('https://vidsrc.cc/v2/embed/anime/21/1');
    });

    it('should return empty string for out-of-bounds provider index', () => {
      const url = buildStreamUrl(sampleEntry, 1, 'sub', 999);
      expect(url).toBe('');
    });

    it('should return empty string for negative provider index', () => {
      const url = buildStreamUrl(sampleEntry, 1, 'sub', -1);
      expect(url).toBe('');
    });

    it('should return empty string for missing entry', () => {
      const url = buildStreamUrl(null, 1, 'sub');
      expect(url).toBe('');
    });

    it('should return empty string for entry without anilistId', () => {
      const url = buildStreamUrl({ title: "Test" }, 1, 'sub');
      expect(url).toBe('');
    });

    it('should return empty string for entry with falsy anilistId', () => {
      const url = buildStreamUrl({ anilistId: 0, title: "Test" }, 1, 'sub');
      expect(url).toBe('');
    });

    it('should return only the requested provider URL with no fallthrough', () => {
      episodeEmbedCache['21-1-sub'] = 'https://megaplay.buzz/stream/s-2/170320/sub';
      const url0 = buildStreamUrl(sampleEntry, 1, 'sub', 0);
      expect(url0).toBe('https://megaplay.buzz/stream/s-2/170320/sub');
      const url1 = buildStreamUrl(sampleEntry, 1, 'sub', 1);
      expect(url1).toBe('https://vidnest.fun/anime/21/1/sub');
    });
  });

  describe('Language parameter handling', () => {
    it('should handle sub language for VidNest', () => {
      const url = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toContain('/sub');
    });

    it('should handle dub language for VidNest', () => {
      const url = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 1, 'dub');
      expect(url).toContain('/dub');
    });

    it('should handle sub language for MegaPlay with cache', () => {
      episodeEmbedCache['21-1-sub'] = 'https://megaplay.buzz/stream/s-2/170320/sub';
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toContain('/sub');
    });

    it('should handle dub language for MegaPlay with cache', () => {
      episodeEmbedCache['21-1-dub'] = 'https://megaplay.buzz/stream/s-2/170320/dub';
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 1, 'dub');
      expect(url).toContain('/dub');
    });
  });

  describe('Provider schema validation', () => {
    it('should have required fields for all providers', () => {
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

    it('should have exactly 3 active providers', () => {
      const activeProviders = STREAM_PROVIDERS.filter(p => p.active);
      expect(activeProviders).toHaveLength(3);
    });

    it('should have correct idType for each provider', () => {
      expect(STREAM_PROVIDERS[0].idType).toBe('anikoto');
      expect(STREAM_PROVIDERS[1].idType).toBe('anilist');
      expect(STREAM_PROVIDERS[2].idType).toBe('anilist');
    });
  });
});
