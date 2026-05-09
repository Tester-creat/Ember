
import { normalizeAnime } from './animeUtils';

const ANILIST_API = "https://graphql.anilist.co";

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
    if (e.name === "AbortError") throw new Error("Request timed out");
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

export const SEARCH_QUERY = `query($search:String,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(search:$search,type:ANIME,sort:POPULARITY_DESC){id idMal title{romaji english native}coverImage{large}episodes nextAiringEpisode{episode} duration status averageScore genres season seasonYear format description startDate{year month day}}}}`;

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
