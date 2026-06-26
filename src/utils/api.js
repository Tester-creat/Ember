
import { normalizeAnime, scoreAnikotoTitleMatch, collectTitleNeedles, pickAnikotoEpisode } from './animeUtils';

const ANILIST_API = "https://graphql.anilist.co";
const MEDIA_CARD_FIELDS = `
  id
  idMal
  title { romaji english native }
  synonyms
  coverImage { extraLarge large medium }
  episodes
  nextAiringEpisode { episode }
  duration
  status
  averageScore
  genres
  season
  seasonYear
  format
  description
  startDate { year month day }
  bannerImage
`;

const sd = (lang) => (lang === 'dub' ? 'dub' : 'sub');

// Verified against the live VidNest docs on 2026-05-11.
export function buildVidNestUrl(anilistId, ep, lang = 'sub') {
  return `https://vidnest.fun/anime/${anilistId}/${ep}/${sd(lang)}`;
}

// Verified against the live MegaPlay API docs on 2026-05-11.
export function buildMegaPlayAniListUrl(anilistId, ep, lang = 'sub') {
  return `https://megaplay.buzz/stream/ani/${anilistId}/${ep}/${sd(lang)}`;
}

/**
 * Streaming providers, ordered by observed reliability. Each embeds in an iframe
 * and is keyed off the AniList id (or MAL id for VidLink) + episode + sub/dub.
 * The Watch player cycles to the next provider automatically on failure.
 *
 * buildUrl(anilistId, episode, lang, entry) — `entry` is the saved library item
 * and is only needed by providers that require a MAL id. Provider URL shapes
 * verified 2026-06-27.
 */
export const STREAM_PROVIDERS = [
  {
    name: "MegaPlay",
    isAnikoto: true,
    buildUrl: (anikotoUrl) => anikotoUrl,
    buildAniListUrl: buildMegaPlayAniListUrl,
  },
  {
    name: "VidNest",
    buildUrl: (anilistId, ep, lang) => buildVidNestUrl(anilistId, ep, lang),
  },
  {
    name: "VidSrc",
    // vidsrc.cc requires an explicit /sub or /dub segment.
    buildUrl: (anilistId, ep, lang) =>
      `https://vidsrc.cc/v2/embed/anime/${anilistId}/${ep}/${sd(lang)}`,
  },
  {
    name: "Videasy",
    buildUrl: (anilistId, ep, lang) =>
      `https://player.videasy.net/anime/${anilistId}/${ep}?color=ff6a3d&episodeSelector=true&nextEpisode=true${lang === 'dub' ? '&dub=true' : ''}`,
  },
  {
    name: "VidPlus",
    buildUrl: (anilistId, ep, lang) =>
      `https://player.vidplus.to/embed/anime/${anilistId}/${ep}?dub=${lang === 'dub'}`,
  },
  {
    name: "VidSrc.icu",
    // Trailing flag: 0 = sub, 1 = dub.
    buildUrl: (anilistId, ep, lang) =>
      `https://vidsrc.icu/embed/anime/${anilistId}/${ep}/${lang === 'dub' ? 1 : 0}`,
  },
  {
    name: "VidLink",
    usesMalId: true,
    // VidLink keys off the MyAnimeList id; skipped (empty url) when unknown.
    buildUrl: (anilistId, ep, lang, entry) => {
      const malId = entry?.idMal;
      return malId ? `https://vidlink.pro/anime/${malId}/${ep}/${sd(lang)}` : '';
    },
  },
  {
    name: "AnimeSuge",
    buildUrl: (anilistId, ep) => `https://animesuge.to/embed/anilist/${anilistId}/${ep}`,
  },
];


async function anilistPageFetch(query, vars, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ANILIST_API, {
      method: "POST", 
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: vars }),
      signal: controller.signal
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.errors?.[0]?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    const json = await res.json();
    return json.data?.Page || null;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request timed out", { cause: e });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function anilistFetch(query, vars, timeoutMs = 10000) {
  const page = await anilistPageFetch(query, vars, timeoutMs);
  return page?.media || [];
}

export function anikotoFetch(endpoint) {
  const isLive = window.location.hostname.includes("github.io");
  const url = isLive 
    ? `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://anikotoapi.site' + endpoint)}` 
    : `/api/anikoto${endpoint}`;
  return fetch(url);
}

export const SEARCH_QUERY = `query($search:String,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(search:$search,type:ANIME,sort:POPULARITY_DESC){${MEDIA_CARD_FIELDS}}}}`;
export const TRENDING_QUERY = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){pageInfo{hasNextPage}media(type:ANIME,sort:[TRENDING_DESC,POPULARITY_DESC]){${MEDIA_CARD_FIELDS}}}}`;

export async function fetchTrendingAnimePage(page = 1, perPage = 30) {
  const pageData = await anilistPageFetch(TRENDING_QUERY, { page, perPage });
  const results = (pageData?.media || []).map(normalizeAnime).filter(Boolean);
  return {
    results,
    page,
    hasMore: Boolean(pageData?.pageInfo?.hasNextPage),
  };
}

export async function fetchRecentAnimePage(page = 1, perPage = 50) {
  const res = await anikotoFetch(`/recent-anime?page=${page}&per_page=${perPage}`);
  if (!res.ok) {
    throw new Error(`Recent anime request failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  const list = Array.isArray(json?.data) ? json.data : [];
  const results = list
    .map((item) => normalizeAnime({ ...item, id: item.ani_id }))
    .filter(Boolean);

  return {
    results,
    page,
    hasMore: results.length >= perPage,
  };
}


export async function searchAnime(query) {
  if (!query || query.length < 2) return [];
  const results = await anilistFetch(SEARCH_QUERY, { search: query, page: 1, perPage: 30 });
  return results.map(normalizeAnime);
}

export const WATCH_ORDER_QUERY = `
query($id: Int) {
  Media(id: $id, type: ANIME) {
    title { romaji english native }
    synonyms
    relations {
      edges {
        relationType
        node {
          id
          type
          title { romaji english native }
          synonyms
          coverImage { medium large }
          format
          status
          episodes
          seasonYear
          averageScore
          startDate { year month day }
        }
      }
    }
  }
}`;

export async function fetchWatchOrder(anilistId) {
  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: WATCH_ORDER_QUERY, variables: { id: Number(anilistId) } })
    });
    if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
    const json = await res.json();
    return json?.data?.Media?.relations?.edges || [];
  } catch (err) {
    console.error("fetchWatchOrder error:", err);
    throw err;
  }
}

// --- Anikoto Resolution Logic ---

const ANIKOTO_MAPPING_KEY = "anikoto_mapping_v1";

function getStoredMapping() {
  try {
    return JSON.parse(localStorage.getItem(ANIKOTO_MAPPING_KEY)) || {};
  } catch { return {}; }
}

function saveMapping(mapping) {
  localStorage.setItem(ANIKOTO_MAPPING_KEY, JSON.stringify(mapping));
}

export async function resolveAnikotoSeries(anilistId, animeContext) {
  const mapping = getStoredMapping();
  if (mapping[anilistId]) return mapping[anilistId];

  console.log(`[Anikoto] Resolving series for AniList ID: ${anilistId}`);
  const needles = collectTitleNeedles(animeContext);
  
  // Strategy 1: Scan recent pages (Deep Pagination Scanning)
  // We'll scan up to 20 pages by default, which covers most recent/semi-old anime.
  // For truly legacy anime, we'll continue if nothing is found.
  let page = 1;
  const maxPages = 50; // Deep scan limit

  while (page <= maxPages) {
    try {
      const res = await anikotoFetch(`/recent-anime?page=${page}`);
      if (!res.ok) break;
      const data = await res.json();
      const list = data.data || [];
      if (!list.length) break;

      // Try exact AniList ID match first
      let found = list.find(item => String(item.ani_id) === String(anilistId) || String(item.mal_id) === String(animeContext?.idMal));
      
      if (!found) {
        // Fallback to fuzzy title match
        const scored = list.map(item => ({
          item,
          score: scoreAnikotoTitleMatch(item, needles)
        })).filter(x => x.score > 70)
           .sort((a, b) => b.score - a.score);
        
        if (scored.length > 0) {
          found = scored[0].item;
        }
      }

      if (found) {
        console.log(`[Anikoto] Found match on page ${page}: ${found.title} (ID: ${found.id})`);
        mapping[anilistId] = { id: found.id, title: found.title };
        saveMapping(mapping);
        return mapping[anilistId];
      }

      page++;
      // Performance: If we've scanned 10 pages and haven't found anything, log progress
      if (page % 10 === 0) console.log(`[Anikoto] Scanned ${page} pages...`);
    } catch (e) {
      console.error(`[Anikoto] Error on page ${page}:`, e);
      break;
    }
  }

  throw new Error(`Could not resolve Anikoto series ID after scanning ${maxPages} recent pages`);
}

const SERIES_CACHE = new Map();

export async function fetchAnikotoEpisode(seriesId, epNum, lang = 'sub') {
  let data;
  if (SERIES_CACHE.has(seriesId)) {
    data = SERIES_CACHE.get(seriesId);
  } else {
    const res = await anikotoFetch(`/series/${seriesId}`);
    if (!res.ok) throw new Error(`Anikoto series fetch failed: ${res.status}`);
    data = await res.json();
    SERIES_CACHE.set(seriesId, data);
  }

  const episodes = data.data?.episodes || [];
  const ep = pickAnikotoEpisode(episodes, epNum);
  if (!ep) throw new Error(`Episode ${epNum} not found in Anikoto`);

  const embedUrl = ep.embed_url?.[lang] || ep.embed_url?.['sub'] || ep.embed_url?.['dub'];
  if (typeof embedUrl !== 'string' || embedUrl.trim() === '') {
    throw new Error(`No ${lang} embed found for episode ${epNum}`);
  }
  
  return embedUrl.trim();
}
