
import { normalizeAnime } from './animeUtils';

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
    // Direct AniList endpoint — MegaPlay resolves the series server-side, so no
    // proxy/scan is needed (the old Anikoto pre-resolution depended on a CORS
    // proxy that is no longer reliable).
    buildUrl: (anilistId, ep, lang) => buildMegaPlayAniListUrl(anilistId, ep, lang),
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
    name: "TryEmbed",
    buildUrl: (anilistId, ep, lang) =>
      `https://tryembed.us.cc/embed/anime/${anilistId}/${ep}/${sd(lang)}`,
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

export const SEARCH_QUERY = `query($search:String,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(search:$search,type:ANIME,sort:POPULARITY_DESC){${MEDIA_CARD_FIELDS}}}}`;
export const TRENDING_QUERY = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){pageInfo{hasNextPage}media(type:ANIME,sort:[TRENDING_DESC,POPULARITY_DESC]){${MEDIA_CARD_FIELDS}}}}`;
// Currently-airing anime by popularity — a clean "new / airing now" feed straight
// from AniList (CORS-friendly), replacing the old proxy-dependent Anikoto feed.
export const AIRING_QUERY = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){pageInfo{hasNextPage}media(type:ANIME,status:RELEASING,sort:[POPULARITY_DESC]){${MEDIA_CARD_FIELDS}}}}`;

export async function fetchTrendingAnimePage(page = 1, perPage = 30) {
  const pageData = await anilistPageFetch(TRENDING_QUERY, { page, perPage });
  const results = (pageData?.media || []).map(normalizeAnime).filter(Boolean);
  return {
    results,
    page,
    hasMore: Boolean(pageData?.pageInfo?.hasNextPage),
  };
}

export async function fetchRecentAnimePage(page = 1, perPage = 30) {
  const pageData = await anilistPageFetch(AIRING_QUERY, { page, perPage });
  const results = (pageData?.media || []).map(normalizeAnime).filter(Boolean);
  return {
    results,
    page,
    hasMore: Boolean(pageData?.pageInfo?.hasNextPage),
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
