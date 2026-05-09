
import { normalizeAnime, scoreAnikotoTitleMatch, collectTitleNeedles, pickAnikotoEpisode } from './animeUtils';

const ANILIST_API = "https://graphql.anilist.co";

export const STREAM_PROVIDERS = [
  { 
    name: "MegaPlay", 
    isAnikoto: true,
    buildUrl: (anikotoUrl) => anikotoUrl
  },
  { 
    name: "VidNest", 
    buildUrl: (anilistId, ep, lang) => `https://vidnest.fun/anime/${anilistId}/${ep}/${lang}` 
  },
  { 
    name: "VidSrc", 
    buildUrl: (anilistId, ep, lang) => `https://vidsrc.cc/v2/embed/anime/${anilistId}/${ep}${lang === 'dub' ? '/dub' : ''}` 
  },
  { 
    name: "AnimeSuge", 
    buildUrl: (anilistId, ep) => `https://animesuge.to/embed/anilist/${anilistId}/${ep}` 
  }
];


export async function anilistFetch(query, vars, timeoutMs = 10000) {
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
    return json.data?.Page?.media || [];
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request timed out", { cause: e });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function anikotoFetch(endpoint) {
  const isLive = window.location.hostname.includes("github.io");
  const url = isLive 
    ? `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://anikotoapi.site' + endpoint)}` 
    : `/api/anikoto${endpoint}`;
  return fetch(url);
}

export const SEARCH_QUERY = `query($search:String,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(search:$search,type:ANIME,sort:POPULARITY_DESC){id idMal title{romaji english native}coverImage{extraLarge large}episodes nextAiringEpisode{episode} duration status averageScore genres season seasonYear format description startDate{year month day} bannerImage}}}`;


export async function searchAnime(query) {
  if (!query || query.length < 2) return [];
  const results = await anilistFetch(SEARCH_QUERY, { search: query, page: 1, perPage: 30 });
  return results.map(normalizeAnime);
}

export const WATCH_ORDER_QUERY = `
query($id: Int) {
  Media(id: $id, type: ANIME) {
    title { romaji english }
    relations {
      edges {
        relationType
        node {
          id
          type
          title { romaji english }
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
  let maxPages = 50; // Deep scan limit
  let found = null;

  while (page <= maxPages) {
    try {
      const res = await anikotoFetch(`/recent-anime?page=${page}`);
      if (!res.ok) break;
      const data = await res.json();
      const list = data.data || [];
      if (!list.length) break;

      // Try exact AniList ID match first
      found = list.find(item => String(item.ani_id) === String(anilistId) || String(item.mal_id) === String(animeContext?.idMal));
      
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

  throw new Error("Could not resolve Anikoto series ID");
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
  if (!embedUrl) throw new Error(`No ${lang} embed found for episode ${epNum}`);
  
  return embedUrl;
}
