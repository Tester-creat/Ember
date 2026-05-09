/* ══ STATE ════════════════════════════════════════════════════ */
let currentTab = "home";
let libraryFilter = "all";
let userData = {};
let anilistCache = {};
let browseData = { results: [], loading: false, error: null, page: 0, mode: "trending" };
let seasonalData = { results: [], loading: false, error: null, page: 0, season: null, year: null };
let currentWatchId = null;
let currentEpisode = 1;
let currentEpisodeGroup = 0;   // Feature 1: active 40-ep group index (survives re-renders)
let searchResults = [];
let pendingSearchQuery = "";
const ANILIST_API = "https://graphql.anilist.co";

/* ══ HERO STATE ════════════════════════════════════════════════ */
let heroItems = [];
let heroIndex = 0;
let heroTimer = null;
let heroObserver = null;
let heroSwipeStartX = 0;
let heroSwipeStartY = 0;
/** Bumps when watching list or browse feed (hero padding) changes; avoids re-init on every home re-render. */
let heroSourceSig = null;
const HERO_INTERVAL = 8000; // 8 seconds per slide

// Feature 1: group size constant — 40 episodes per group
const EP_GROUP_SIZE = 40;

// Feature 2: franchise relations cache keyed by anilistId
const franchiseCache = {};

/* ══ PROVIDERS ════════════════════════════════════════════════ */
const episodeEmbedCache = {};
const anikotoIdCache = {};
const dubAvailable = {};

// Anikoto resolution caches (keyed by anilistId / anikotoSeriesId)
const anikotoSeriesCache = new Map();
const anikotoEpisodeCache = new Map();

// Helpers: normalise a title string for fuzzy matching
function _normTitle(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

// Task 1 — resolve Anikoto series ID from AniList ID + romaji title
async function fetchAnikotoSeries(anilistId, title) {
  const key = Number(anilistId);
  if (anikotoSeriesCache.has(key)) return anikotoSeriesCache.get(key);
  // Check anikotoIdCache first (populated by findAnikotoId / preloadEpisodeUrls)
  const fastId = anikotoIdCache[String(anilistId)];
  if (fastId) {
    anikotoSeriesCache.set(key, fastId);
    return fastId;
  }
  // Fast path: try AniList ID directly as Anikoto series ID
  try {
    const directRes = await anikotoFetch(`/series/${key}`);
    const directData = await directRes.json();
    if (directData.ok && directData.data?.episodes?.length > 0) {
      anikotoSeriesCache.set(key, key);
      return key;
    }
  } catch {} // API rejected the direct ID — fall through to page scan
  const needle = _normTitle(typeof title === "object" ? (title?.romaji || title?.english) : title);
  for (let page = 1; page <= 20; page++) {
    try {
      const res = await anikotoFetch(`/recent-anime?page=${page}&per_page=50`);
      const data = await res.json();
      if (!data.ok || !data.data) break;
      for (const item of data.data) {
        // Build the anilistId → anikotoId side-cache while we scan
        const aId = String(item.ani_id);
        if (aId && aId !== "0" && !anikotoIdCache[aId]) anikotoIdCache[aId] = item.id;
        // Check by AniList ID first (exact)
        if (aId === String(anilistId)) {
          anikotoSeriesCache.set(key, item.id);
          return item.id;
        }
        // Fuzzy title match as fallback
        const haystack = _normTitle(item.title) + " " + _normTitle(item.alternative);
        if (needle && (haystack.includes(needle) || needle.includes(_normTitle(item.title)))) {
          anikotoSeriesCache.set(key, item.id);
          return item.id;
        }
      }
      if (data.data.length < 50) break;
    } catch { break; }
  }
  anikotoSeriesCache.set(key, null); // confirmed miss — don't re-request
  console.warn(`[MegaPlay] fetchAnikotoSeries: no series found for anilistId=${anilistId} needle=${needle}`);
  return null;
}

// Task 2 — resolve episode_embed_id from Anikoto series
async function fetchAnikotoEpisodeEmbedId(anikotoSeriesId, epNum, lang) {
  if (!anikotoSeriesId) return null;
  let episodes = anikotoEpisodeCache.get(anikotoSeriesId);
  if (!episodes) {
    try {
      const res = await anikotoFetch(`/series/${anikotoSeriesId}`);
      const data = await res.json();
      if (!data.ok || !data.data?.episodes) return null;
      episodes = data.data.episodes;
      anikotoEpisodeCache.set(anikotoSeriesId, episodes);
    } catch (e) {
      console.error("[MegaPlay] fetchAnikotoEpisodeEmbedId: failed to fetch series", e);
      return null;
    }
  }
  const ep = episodes.find(e => Number(e.number) === Number(epNum));
  if (!ep) {
    console.warn(`[MegaPlay] fetchAnikotoEpisodeEmbedId: episode ${epNum} not found in series ${anikotoSeriesId}`);
    return null;
  }
  // embed_url.sub / embed_url.dub are the full megaplay URLs
  const url = (lang === "dub" ? ep.embed_url?.dub : ep.embed_url?.sub) || ep.embed_url?.sub || null;
  return url || null;
}

const STREAM_PROVIDERS = [
  { name: "MegaPlay", active: true, idType: "anikoto",
    async buildUrl(entry, ep, lang) {
      // Fast path: check episodeEmbedCache first (populated by preloadEpisodeUrls)
      const cacheKey = `${entry.anilistId || entry.id}-${ep}-${lang}`;
      const cached = episodeEmbedCache[cacheKey];
      if (cached) return cached;
      try {
        const seriesId = await fetchAnikotoSeries(entry.anilistId || entry.id, entry.title);
        if (!seriesId) return null;
        const url = await fetchAnikotoEpisodeEmbedId(seriesId, ep, lang);
        if (url) episodeEmbedCache[cacheKey] = url;
        return url || null;
      } catch (e) {
        console.error("[MegaPlay] buildUrl error:", e);
        return null;
      }
    },
    notes: "Primary — Anikoto /series/{id} native embed (s-2 path). Highest reliability." },
  { name: "VidNest", active: true, idType: "anilist",
    buildUrl: (entry, ep, lang) => `https://vidnest.fun/anime/${entry.anilistId || entry.id}/${ep}/${lang}`,
    notes: "Direct AniList ID embed. Reliable synchronous fallback." },
  { name: "VidSrc", active: true, idType: "anilist",
    buildUrl: (entry, ep, lang) => `https://vidsrc.cc/v2/embed/anime/${entry.anilistId || entry.id}/${ep}${lang === 'dub' ? '/dub' : ''}`,
    notes: "VidSrc anime embed. Direct AniList ID embed." }
];
let currentProvider = 0;
let currentLanguage = "sub";
let watchPlayerError = null; // { provider, message, detail } when provider fails

/* ══ ANIKOTO API ═══════════════════════════════════════════════ */
function anikotoFetch(endpoint) {
  const isLive = window.location.hostname.includes("github.io");
  const url = isLive ? `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://anikotoapi.site' + endpoint)}` : `/api/anikoto${endpoint}`;
  return fetch(url);
}

function normalizeAnime(m) {
  if (!m) return null;
  // Handle both AniList GraphQL shape and Anikoto proxy shape
  const titleIsObj = typeof m.title === "object" && m.title !== null;
  const titleObj = titleIsObj ? m.title : {};
  const coverObj = m.coverImage || m.cover || {};
  const episodes = m.episodes || (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : 0) || 0;

  // Anikoto format: score is a string like "8.59", convert to 0-100 integer
  let avgScore = m.averageScore || 0;
  if (!avgScore && m.score && m.score !== "?") {
    avgScore = Math.round(parseFloat(m.score) * 10);
  }

  // Anikoto format: genres are in terms_by_type.genre
  let genres = m.genres || [];
  if (!genres.length && m.terms_by_type?.genre) {
    genres = m.terms_by_type.genre;
  }

  // Anikoto format: format is in terms_by_type.type[0]
  let format = m.format || "";
  if (!format && m.terms_by_type?.type?.length) {
    format = m.terms_by_type.type[0];
  }

  // Anikoto format: title=English, alternative=Romaji
  const anikotoTitle = !titleIsObj ? (m.alternative || m.title) : "";
  const anikotoEnglish = !titleIsObj ? (m.title || "") : "";

  return {
    id:              m.id || m.anilistId,
    anilistId:       m.id || m.anilistId,
    title:           titleObj.romaji || titleObj.english || anikotoTitle || m.title || "",
    titleEnglish:    titleObj.english || m.titleEnglish || anikotoEnglish || "",
    cover:           coverObj.large || coverObj.medium || m.cover || m.poster || "",
    banner:          m.bannerImage || m.banner || coverObj.large || coverObj.medium || m.cover || m.poster || "",
    episodes:        Number(episodes) || 0,
    format:          format,
    averageScore:    avgScore,
    description:     m.description || "",
    genres:          genres,
    year:            m.seasonYear || m.year || (m.startDate ? m.startDate.year : 0) || 0,
    season:          m.season || "",
    status:          m.status || ""
  };
}

async function initAnikotoCache() {
  try {
    const res = await anikotoFetch('/recent-anime?page=1&per_page=50');
    const data = await res.json();
    if (data.ok && data.data) {
      data.data.forEach(anime => {
        const aId = String(anime.ani_id);
        if (aId && aId !== "0" && !anikotoIdCache[aId]) {
          anikotoIdCache[aId] = anime.id;
        }
      });
    }
  } catch {}
}

async function findAnikotoId(anilistId) {
  const cached = anikotoIdCache[String(anilistId)];
  if (cached) return cached;
  // Fast path: try AniList ID directly as Anikoto series ID
  try {
    const directRes = await anikotoFetch(`/series/${Number(anilistId)}`);
    const directData = await directRes.json();
    if (directData.ok && directData.data?.episodes?.length > 0) {
      anikotoIdCache[String(anilistId)] = Number(anilistId);
      return Number(anilistId);
    }
  } catch {}
  for (let page = 1; page <= 20; page++) {
    try {
      const res = await anikotoFetch(`/recent-anime?page=${page}&per_page=50`);
      const data = await res.json();
      if (!data.ok || !data.data) break;
      for (const anime of data.data) {
        const aId = String(anime.ani_id);
        if (aId && aId !== "0") {
          anikotoIdCache[aId] = anime.id;
        }
        if (aId === String(anilistId)) {
          return anime.id;
        }
      }
      if (data.data.length < 50) break;
    } catch { break; }
  }
  return null;
}

async function preloadEpisodeUrls(anilistId) {
  let anikotoId = anikotoIdCache[String(anilistId)];
  if (!anikotoId) {
    anikotoId = await findAnikotoId(anilistId);
  }

  const entry = getEntry(anilistId);

  if (!anikotoId) {
    // Anikoto doesn't have this series. If the entry still has episodes=0
    // (unknown), try to recover the count from the AniList cache which
    // may have been populated during search (includes nextAiringEpisode).
    if (entry && !entry.episodes) {
      const cached = anilistCache[String(anilistId)];
      if (cached) {
        let count = cached.episodes || 0;
        // For currently-airing series AniList returns episodes:null but
        // provides nextAiringEpisode.episode (= next ep number, so -1 = last aired).
        if (!count && cached.nextAiringEpisode?.episode) {
          count = Math.max(1, cached.nextAiringEpisode.episode - 1);
        }
        if (count > 0) {
          entry.episodes = count;
          saveData();
        }
      }
    }
    return;
  }

  try {
    const res = await anikotoFetch(`/series/${anikotoId}`);
    const data = await res.json();
    if (data.ok && data.data) {
      if (data.data.anime?.episodes) {
        const apiTotal = Number(data.data.anime.episodes);
        // Update whenever apiTotal is a valid positive number — this covers
        // the case where entry.episodes was 0 (unknown) as well as the case
        // where the series has grown since the entry was last saved.
        if (entry && apiTotal > 0 && apiTotal > (entry.episodes || 0)) {
          entry.episodes = apiTotal;
          saveData();
        }
      }
      if (data.data.episodes) {
        let hasDub = false;
        data.data.episodes.forEach(ep => {
          if (ep.embed_url?.sub) episodeEmbedCache[`${anilistId}-${ep.number}-sub`] = ep.embed_url.sub;
          if (ep.embed_url?.dub) {
            episodeEmbedCache[`${anilistId}-${ep.number}-dub`] = ep.embed_url.dub;
            hasDub = true;
          }
        });
        dubAvailable[String(anilistId)] = hasDub;

        // If the entry episode count is still 0 after the anime-level check
        // above, use the length of the episodes array as a minimum floor.
        if (entry && !entry.episodes && data.data.episodes.length > 0) {
          entry.episodes = data.data.episodes.length;
          saveData();
        }
      }
    }
  } catch {}
}

/* ══ DATA PERSISTENCE ════════════════════════════════════════ */
function loadData() {
  try { userData = JSON.parse(localStorage.getItem("ember_data")) || {}; }
  catch { userData = {}; }
}
function saveData() {
  const dataStr = JSON.stringify(userData);
  if (dataStr.length > 4500000) {
    showToast("Library data is getting large. Consider exporting a backup.", "warning");
  }
  localStorage.setItem("ember_data", dataStr);
}
function getAnimeEntries() {
  return Object.values(userData).filter(e => e && e.id);
}
function getEntry(id) {
  return userData[String(id)] || null;
}

/* ══ IMPORT / EXPORT ════════════════════════════════════════════ */
function importLibrary(file) {
  const reader = new FileReader();
  reader.onerror = () => showToast("Import failed: could not read file", "error");
  reader.onload = e => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch {
      showToast("Import failed: invalid JSON", "error");
      return;
    }

    const isAniVault = data.schemaVersion === 1 && data.library && typeof data.library === "object";
    const isEmberFlat = !data.schemaVersion && typeof data === "object" && data !== null && !Array.isArray(data);

    if (!isAniVault && !isEmberFlat) {
      showToast("Import failed: Unrecognised file format", "error");
      return;
    }

    let rawEntries = [];
    let externalRatings = data.ratings || {};

    if (isAniVault) {
      // Flatten status arrays
      rawEntries = Object.values(data.library).flat();
    } else {
      // Ember flat format
      rawEntries = Object.values(data);
    }

    const STATUS_MAP = {
      "watching":    "watching",
      "Watching":    "watching",
      "completed":   "completed",
      "Completed":   "completed",
      "planToWatch": "plan-to-watch",
      "Plan to Watch": "plan-to-watch",
      "plan-to-watch": "plan-to-watch",
      "queued":      "queued",
      "Queued":      "queued",
      "dropped":     "dropped",
      "Dropped":     "dropped",
      "paused":      "paused",
      "Paused":      "paused",
      "untracked":   "untracked",
      "Untracked":   "untracked"
    };

    let added = 0;
    let updated = 0;

    rawEntries.forEach(entry => {
      if (!entry.anilistId) return;
      const id = String(entry.anilistId);
      
      // Map status
      const emberStatus = STATUS_MAP[entry.status] || "untracked";
      
      // Get real rating from ratings object if it's AniVault format
      const realRating = isAniVault ? (externalRatings[id] || 0) : (entry.rating || 0);

      const mapped = {
        id:              entry.id || entry.anilistId,
        anilistId:       entry.anilistId,
        title:           (entry.title && (entry.title.romaji || entry.title.english)) || entry.title || "",
        titleEnglish:    (entry.title && entry.title.english) || entry.titleEnglish || "",
        cover:           (entry.coverImage && entry.coverImage.large) || entry.cover || "",
        banner:          entry.banner || "",
        episodes:        entry.episodes || entry.totalEpisodes || 0,
        episodesWatched: entry.episodesWatched || 0,
        status:          emberStatus,
        language:        entry.language || "sub",
        rating:          realRating,
        dateAdded:       entry.dateAdded || Date.now(),
        lastWatched:     entry.lastWatched || 0,
        completedAt:     entry.completedAt || 0,
        notes:           entry.notes || "",
        genres:          entry.genres || [],
        year:            entry.year || entry.seasonYear || 0,
        averageScore:    entry.averageScore || 0,
        format:          entry.format || "",
      };

      if (userData[id]) {
        userData[id] = { ...userData[id], ...mapped };
        updated++;
      } else {
        userData[id] = mapped;
        added++;
      }
    });

    saveData();
    renderContent();
    showToast(`Imported ${rawEntries.length} entries — ${added} added, ${updated} updated`, "success");
  };
  reader.readAsText(file);
}

function generateExportFilename() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `anivault-backup-${yyyy}-${mm}-${dd}.json`;
}

function exportLibrary() {
  const library = {
    watching: [],
    completed: [],
    queued: [],
    planToWatch: [],
    dropped: [],
    paused: [],
    untracked: []
  };
  const ratings = {};

  const STATUS_REVERSE = {
    "watching":      "watching",
    "completed":     "completed",
    "plan-to-watch": "planToWatch",
    "queued":        "queued",
    "dropped":       "dropped",
    "paused":        "paused",
    "untracked":     "untracked"
  };

  const entries = Object.values(userData);
  entries.forEach(entry => {
    const avStatus = STATUS_REVERSE[entry.status] || "untracked";
    const avEntry = {
      id:              entry.id,
      anilistId:       entry.anilistId,
      title:           { romaji: entry.title || "", english: entry.titleEnglish || "" },
      titleEnglish:    entry.titleEnglish || "",
      cover:           entry.cover || "",
      banner:          entry.banner || "",
      episodes:        entry.episodes || 0,
      episodesWatched: entry.episodesWatched || 0,
      status:          avStatus,
      language:        entry.language || "sub",
      rating:          0, // Always 0 in entry, real rating in ratings object
      dateAdded:       entry.dateAdded || 0,
      lastWatched:     entry.lastWatched || 0,
      completedAt:     entry.completedAt || 0,
      notes:           entry.notes || "",
      genres:          entry.genres || [],
      year:            entry.year || 0,
      sessionLog:      [],
      averageScore:    entry.averageScore || 0
    };

    if (library[avStatus]) {
      library[avStatus].push(avEntry);
    } else {
      library.untracked.push(avEntry);
    }

    if (entry.rating > 0) {
      ratings[String(entry.anilistId)] = entry.rating;
    }
  });

  const output = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    totalEntries: entries.length,
    library,
    ratings
  };

  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = generateExportFilename();
  a.click();
  URL.revokeObjectURL(url);
  showToast("Library exported.", "success");
}

/* ══ SEASONAL ════════════════════════════════════════════════ */
function getCurrentSeason() {
  const m = new Date().getMonth();
  if (m < 3) return "WINTER";
  if (m < 6) return "SPRING";
  if (m < 9) return "SUMMER";
  return "FALL";
}

const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];

async function loadSeasonal(season, year, page = 1) {
  seasonalData.loading = true; seasonalData.error = null; seasonalData.season = season; seasonalData.year = year;
  seasonalData._hasMore = false;
  renderContent();
  try {
    const query = `
      query($season: MediaSeason, $year: Int, $page: Int) {
        Page(page: $page, perPage: 50) {
          pageInfo { hasNextPage }
          media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
            id idMal title { romaji english native } coverImage { large }
            episodes nextAiringEpisode { episode } duration status averageScore
            genres season seasonYear format description
          }
        }
      }
    `;
    const data = await anilistFetch(query, { season, year, page });
    const raw = data || [];
    seasonalData._hasMore = false; 
    
    const normalized = raw.map(normalizeAnime);
    seasonalData.results = page === 1 ? normalized : [...seasonalData.results, ...normalized];
    normalized.forEach(a => { if (a?.id) anilistCache[a.id] = a; });
    seasonalData.page = page;
  } catch (e) {
    seasonalData.error = e.message;
    console.error("loadSeasonal:", e);
  }
  seasonalData.loading = false;
  renderContent();
}

/* ══ ANILIST API ═══════════════════════════════════════════════ */
const SEARCH_QUERY = `query($search:String,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(search:$search,type:ANIME,sort:POPULARITY_DESC){id idMal title{romaji english native}coverImage{large}episodes nextAiringEpisode{episode} duration status averageScore genres season seasonYear format description startDate{year month day}}}}`;

async function anilistFetch(query, vars, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ANILIST_API, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: vars }),
      signal: controller.signal
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.errors?.[0]?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return await res.json().then(d => d.data?.Page?.media || []);
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request timed out");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function searchAnime(query) {
  if (!query || query.length < 2) return [];
  const results = await anilistFetch(SEARCH_QUERY, { search: query, page: 1, perPage: 30 });
  const normalized = results.map(normalizeAnime);
  normalized.forEach(r => { anilistCache[r.id] = r; });
  return normalized;
}

async function loadBrowse(mode, page = 1) {
  browseData.loading = true; browseData.error = null; browseData._hasMore = false; renderContent();
  try {
    const res = await anikotoFetch(`/recent-anime?page=${page}&per_page=50`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || 'API error');
    const raw = data.data || [];
    raw.forEach(anime => {
      const aId = String(anime.ani_id);
      if (aId && aId !== "0" && !anikotoIdCache[aId]) {
        anikotoIdCache[aId] = anime.id;
      }
    });
    browseData._hasMore = raw.length >= 50;
    const results = raw.map(m => normalizeAnime({ ...m, id: m.ani_id }));
    results.forEach(a => { anilistCache[a.id] = a; });
    if (page === 1) {
      browseData.results = results;
      if (results[0]) updateHeroBackground(results[0]);
    }
    else browseData.results = [...browseData.results, ...results];
    browseData.page = page;
    browseData.mode = mode;
  } catch (e) { browseData.error = e.message; console.error("loadBrowse:", e); }
  browseData.loading = false; renderContent();
}

function updateHeroBackground(anime) {
  // Legacy function - kept for compatibility but logic moved to hero controller
}

/** Fingerprint of data that feeds the cinematic hero (INSTRUCTIONS §1 fallback uses browse results). */
function getHeroSourceSignature() {
  const entries = getAnimeEntries();
  const watching = entries
    .filter(e => e.status === "watching")
    .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
  const wids = watching.map(e => String(e.id)).join(",");
  const bids = browseData.results.slice(0, 40).map(a => String(a.id)).join(",");
  return `${wids}|${bids}`;
}

/* ══ HERO SYSTEM ═══════════════════════════════════════════════ */
function initHeroSystem() {
  const entries = getAnimeEntries();
  // Priority: 1. Watching (most recently watched first), 2. Trending Fallback
  let items = entries.filter(e => e.status === "watching").sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));

  if (items.length < 5) {
    const trending = browseData.results.filter(a => !items.some(i => String(i.id) === String(a.id)));
    items = [...items, ...trending.slice(0, 8 - items.length)];
  }

  heroItems = items.map(normalizeAnime).filter(Boolean);
  if (heroItems.length === 0) return;

  // Build indicator dots
  const indicatorsEl = document.getElementById("heroIndicators");
  if (indicatorsEl) {
    indicatorsEl.innerHTML = heroItems.map((_, i) =>
      `<button class="hero__dot${i === 0 ? " is-active" : ""}" data-action="hero-dot" data-index="${i}" aria-label="Slide ${i + 1}"></button>`
    ).join("");
  }

  heroIndex = 0;
  renderHeroSlide();
  startHeroRotation();
  setupHeroObserver();
  setupHeroTouch();
}

function renderHeroSlide() {
  const heroEl = document.getElementById("hero");
  if (!heroEl || heroItems.length === 0) return;

  const anime = heroItems[heroIndex];
  const heroBg = document.getElementById("heroBg");
  const heroBody = heroEl.querySelector(".hero__body");
  const entry = getEntry(anime.id);
  const isWatching = entry?.status === "watching";
  const title = getTitle(anime);
  const banner = anime.banner || getCoverSrc(anime);
  const description = truncate(anime.description?.replace(/<[^>]*>/g, ""), 200);

  // Rich metadata
  const score    = anime.averageScore ? `${anime.averageScore}%` : "";
  const year     = anime.year ? String(anime.year) : "";
  const episodes = anime.episodes ? `${anime.episodes} eps` : "";
  const format   = anime.format ? anime.format.replace(/_/g, " ") : "";
  const nextEp   = isWatching && entry ? `Ep ${(entry.episodesWatched || 0) + 1}` : "";
  const metaParts = [score, year, episodes].filter(Boolean);
  const metaHtml  = metaParts.map(p => `<span>${escapeHtml(p)}</span>`).join("");
  const genreChips = (anime.genres || []).slice(0, 3)
    .map(g => `<span class="hero__genre-chip">${escapeHtml(g)}</span>`).join("");

  // Crossfade background with CSS animations (gradient fallback if no art — INSTRUCTIONS §1)
  if (heroBg) {
    const prevBg = heroEl.querySelector(".hero__bg--prev");
    if (prevBg) prevBg.remove();

    if (banner) {
      heroBg.classList.remove("hero__bg--placeholder");
      heroBg.style.backgroundImage = `url(${banner})`;
      heroBg.classList.remove("hero__bg--ken-burns", "hero__bg--crossfade-in");
      void heroBg.offsetWidth;
      heroBg.classList.add("hero__bg--crossfade-in", "hero__bg--ken-burns");
    } else {
      heroBg.style.backgroundImage = "";
      heroBg.classList.remove("hero__bg--ken-burns", "hero__bg--crossfade-in");
      heroBg.classList.add("hero__bg--placeholder");
    }
  }

  // Slide content transition: fade-out old, then fade-in new
  heroBody.style.opacity = "0";
  heroBody.style.transform = "translateY(8px)";
  heroBody.style.transition = "opacity 0.3s ease, transform 0.3s ease";

  setTimeout(() => {
    heroBody.innerHTML = `
      <div class="hero__accent fade-in-left">${isWatching ? "&#9654; Continue Watching" : "Trending Now"}</div>
      ${format ? `<div class="hero__meta-format fade-in-left">${escapeHtml(format)}</div>` : ""}
      <h1 class="hero__title fade-in-left">${escapeHtml(title)}</h1>
      <div class="hero__meta fade-in-left">${metaHtml}</div>
      ${genreChips ? `<div class="hero__genres fade-in-left">${genreChips}</div>` : ""}
      ${description ? `<p class="hero__subtitle fade-in-left">${escapeHtml(description)}</p>` : ""}
      <div class="hero__actions fade-in-left">
        <button class="btn btn--primary" data-action="${isWatching ? "open-watch" : "open-detail"}" data-id="${anime.id}">
          ${isWatching ? (nextEp ? `&#9654; Resume ${nextEp}` : "&#9654; Resume") : "View Details"}
        </button>
        <button class="btn btn--glass" data-action="open-status-picker" data-id="${anime.id}">+ My List</button>
      </div>
    `;

    heroBody.style.opacity = "1";
    heroBody.style.transform = "translateY(0)";

    // Stagger fade-in animations
    heroBody.querySelectorAll(".fade-in-left").forEach((el, i) => {
      el.style.animationDelay = `${i * 0.07}s`;
    });
  }, 300);

  // Update indicator dots
  const indicatorsEl = document.getElementById("heroIndicators");
  if (indicatorsEl) {
    indicatorsEl.querySelectorAll(".hero__dot").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === heroIndex);
    });
  }

  // Restart progress bar
  const progressBar = document.getElementById("heroProgress");
  if (progressBar) {
    progressBar.style.transition = "none";
    progressBar.style.width = "0%";
    void progressBar.offsetWidth;
    progressBar.style.transition = `width ${HERO_INTERVAL}ms linear`;
    progressBar.style.width = "100%";
  }
}

function startHeroRotation() {
  stopHeroRotation();
  if (heroItems.length <= 1) return;
  heroTimer = setInterval(() => {
    heroIndex = (heroIndex + 1) % heroItems.length;
    renderHeroSlide();
  }, HERO_INTERVAL);
}

function stopHeroRotation() {
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
  if (heroObserver) {
    heroObserver.disconnect();
    heroObserver = null;
  }
}

function setupHeroObserver() {
  const heroEl = document.getElementById("hero");
  if (!heroEl) return;
  if (heroObserver) heroObserver.disconnect();
  heroObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        stopHeroRotation();
      } else if (heroItems.length > 1 && heroTimer === null) {
        startHeroRotation();
      }
    }
  }, { threshold: 0 });
  heroObserver.observe(heroEl);
}

function setupHeroTouch() {
  const heroEl = document.getElementById("hero");
  if (!heroEl || heroEl.dataset.emberHeroTouch === "1") return;
  heroEl.dataset.emberHeroTouch = "1";
  heroEl.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    if (t) handleHeroSwipeStart(t.clientX, t.clientY);
  }, { passive: true });
  heroEl.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    if (t) handleHeroSwipeEnd(t.clientX, t.clientY);
  }, { passive: true });
}

function goToHeroSlide(index) {
  if (index < 0 || index >= heroItems.length || index === heroIndex) return;
  stopHeroRotation();
  heroIndex = index;
  renderHeroSlide();
  startHeroRotation();
}

function handleHeroSwipeStart(x, y) {
  heroSwipeStartX = x;
  heroSwipeStartY = y;
}

function handleHeroSwipeEnd(x, y) {
  const dx = x - heroSwipeStartX;
  const dy = y - heroSwipeStartY;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
  if (dx > 0) {
    heroIndex = (heroIndex - 1 + heroItems.length) % heroItems.length;
  } else {
    heroIndex = (heroIndex + 1) % heroItems.length;
  }
  renderHeroSlide();
  startHeroRotation();
}

/* ══ UTILITY ═══════════════════════════════════════════════════ */
function escapeHtml(s) {
  if (typeof s !== "string") return "";
  const d = document.createElement("div"); d.textContent = s; return d.innerHTML;
}

function getCoverSrc(anime) {
  return anime.cover || anime.coverImage?.large || anime.coverImage?.medium || anime.poster || "";
}

/** Placeholder-backed cover (INSTRUCTIONS §4 — no empty / broken-image gaps). */
function renderCoverMedia(src, title, variant = "card") {
  const allowed = new Set(["card", "continue-bg", "continue-poster", "stop-ep", "overlay", "wo"]);
  const v = allowed.has(variant) ? variant : "card";
  const initial = escapeHtml((title || "?").trim().slice(0, 1).toUpperCase());
  const ph = `<span class="cover-media__ph">${initial}</span>`;
  const vClass = `cover-media--${v}`;
  if (!src) {
    return `<div class="cover-media ${vClass} is-fallback">${ph}</div>`;
  }
  return `<div class="cover-media ${vClass}">
    <img src="${escapeHtml(src)}" alt="${escapeHtml(title || "")}" loading="lazy" class="cover-media__img" onerror="const p=this.parentElement;this.remove();p.classList.add('is-fallback');">
    ${ph}
  </div>`;
}

function renderImgSafe(src, alt, className, variant = "card") {
  return renderCoverMedia(src, alt || "", variant);
}
function getTitle(media) {
  return media.titleEnglish || media.title?.english || media.title?.romaji || media.title || media.title?.native || "Unknown Title";
}
function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + "..." : s || "";
}
function getStatusLabel(s) {
  const map = { "watching": "Watching", "completed": "Completed", "plan-to-watch": "Plan to Watch", "queued": "Queued", "dropped": "Dropped", "paused": "Paused", "untracked": "Untracked" };
  return map[s] || s || "Add to List";
}

// Canonical ordered list of all statuses for the status picker
const STATUS_ORDER = [
  "watching", "completed", "plan-to-watch",
  "queued", "dropped", "paused", "untracked"
];

// Canonical ordered list for the library filter (includes "all")
const LIBRARY_FILTER_STATUSES = [
  "all", "watching", "completed", "plan-to-watch",
  "queued", "dropped", "paused", "untracked"
];

/* ══ FEATURE 2: WATCH ORDER ════════════════════════════════════ */

// AniList relation types to include in the watch order panel
const WATCH_ORDER_RELATIONS = new Set([
  "PREQUEL", "SEQUEL", "SIDE_STORY", "ALTERNATIVE",
  "SPIN_OFF", "PARENT", "COMPILATION", "CONTAINS"
]);

// Human-readable labels for each relation type
const RELATION_LABELS = {
  PREQUEL:     "Prequel",
  SEQUEL:      "Sequel",
  PARENT:      "Parent Story",
  SIDE_STORY:  "Side Story",
  SPIN_OFF:    "Spin-off",
  ALTERNATIVE: "Alternative",
  COMPILATION: "Compilation",
  CONTAINS:    "Contains",
};

// Sort priority: lower = shown first
const RELATION_PRIORITY = {
  PREQUEL: 1, PARENT: 2, SEQUEL: 3,
  SIDE_STORY: 4, SPIN_OFF: 5,
  CONTAINS: 6, COMPILATION: 7, ALTERNATIVE: 8
};

// GraphQL query — fetches relations for a given AniList anime ID
const WATCH_ORDER_QUERY = `
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
        }
      }
    }
  }
}`;

/**
 * Fetches franchise relations from AniList and injects the Watch Order panel
 * into #watchOrderMount. This is a targeted partial DOM update — it never
 * calls renderContent() or renderApp().
 *
 * @param {number} anilistId - The AniList ID of the currently-watching anime
 */
async function renderWatchOrder(anilistId) {
  const mount = document.getElementById("watchOrderMount");
  if (!mount) return;

  // Show loading state immediately
  mount.innerHTML = `<div class="wo-panel">
    <div class="wo-panel__title">Watch Order</div>
    <div class="wo-panel__loading">Loading related titles…</div>
  </div>`;

  // Return cached result if available
  if (franchiseCache[anilistId]) {
    _paintWatchOrder(mount, anilistId, franchiseCache[anilistId]);
    return;
  }

  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: WATCH_ORDER_QUERY, variables: { id: Number(anilistId) } })
    });
    if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
    const json = await res.json();
    const edges = json?.data?.Media?.relations?.edges || [];

    // Filter to ANIME-type entries with known watch-order relation types
    const relations = edges
      .filter(e => e.node && e.node.type === "ANIME" && WATCH_ORDER_RELATIONS.has(e.relationType))
      .map(e => ({ ...e.node, relationType: e.relationType }));

    franchiseCache[anilistId] = relations;
    _paintWatchOrder(mount, anilistId, relations);
  } catch (err) {
    // Graceful error state — don't crash the watch view
    if (document.getElementById("watchOrderMount") === mount) {
      mount.innerHTML = `<div class="wo-panel">
        <div class="wo-panel__title">Watch Order</div>
        <div class="wo-panel__empty">Could not load related titles.</div>
      </div>`;
    }
  }
}

/** Injects the rendered watch-order HTML into the mount point. */
function _paintWatchOrder(mount, anilistId, relations) {
  // Guard: user may have navigated away while fetch was in flight
  if (!document.getElementById("watchOrderMount")) return;
  if (currentWatchId === null) return;

  if (!relations.length) {
    mount.innerHTML = `<div class="wo-panel">
      <div class="wo-panel__title">Watch Order</div>
      <div class="wo-panel__empty">No related titles found for this series.</div>
    </div>`;
    return;
  }

  // Sort primarily by release year/date for canonical order
  const sorted = [...relations].sort((a, b) => {
    // 1. Sort by year
    const ya = a.seasonYear || (a.startDate?.year) || 0;
    const yb = b.seasonYear || (b.startDate?.year) || 0;
    if (ya !== yb) return ya - yb;

    // 2. Sort by month if same year
    const ma = a.startDate?.month || 0;
    const mb = b.startDate?.month || 0;
    if (ma !== mb) return ma - mb;

    // 3. Fallback to priority for relations in same timeframe
    const pa = RELATION_PRIORITY[a.relationType] || 99;
    const pb = RELATION_PRIORITY[b.relationType] || 99;
    return pa - pb;
  });

  const cards = sorted.map(item => {
    const title  = item.title?.english || item.title?.romaji || "Untitled";
    const cover  = item.coverImage?.medium || item.coverImage?.large || "";
    const badge  = RELATION_LABELS[item.relationType] || item.relationType;
    const meta   = [
      item.format ? item.format.replace(/_/g, " ") : "",
      item.seasonYear || "",
      item.episodes   ? `${item.episodes} eps` : "",
    ].filter(Boolean).join(" · ");

    // Check if this related title is already in the user's library
    const inLibrary = !!getEntry(item.id);

    return `<div class="wo-card" data-action="open-watch-order" data-id="${item.id}" role="button" tabindex="0">
      <div class="wo-card__cover">
        ${renderCoverMedia(cover, title, "wo")}
      </div>
      <div class="wo-card__body">
        <div class="wo-card__badge">${escapeHtml(badge)}</div>
        <div class="wo-card__title">${escapeHtml(title)}</div>
        ${meta ? `<div class="wo-card__meta">${escapeHtml(meta)}</div>` : ""}
        ${inLibrary ? `<div class="wo-card__in-library">In Library</div>` : ""}
      </div>
    </div>`;
  }).join("");

  mount.innerHTML = `<div class="wo-panel">
    <div class="wo-panel__title">Watch Order</div>
    <div class="wo-cards">${cards}</div>
  </div>`;
}

/* ══ RENDER ════════════════════════════════════════════════════ */
function renderContent() {
  const content = document.getElementById("content");
  if (!content) return;
  switch (currentTab) {
    case "home":     content.innerHTML = renderHome();     break;
    case "browse":   content.innerHTML = renderBrowse();   break;
    case "seasonal": content.innerHTML = renderSeasonal(); break;
    case "search":   content.innerHTML = renderSearch();   break;
    case "library":  content.innerHTML = renderLibrary();  break;
    case "watch":    content.innerHTML = renderWatch();    break;
    case "stats":    content.innerHTML = renderStats();    break;
    default:         content.innerHTML = renderHome();
  }
  afterRender();
}

function setupMarquees() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll(".marquee-track").forEach(track => {
        const childCount = track.children.length / 2;
        if (childCount === 0) return;
        const gap = parseFloat(getComputedStyle(track).gap) || 12;
        const firstChild = track.children[0];
        const childWidth = firstChild?.getBoundingClientRect().width || 180;
        const copyWidth = childCount * childWidth + (childCount - 1) * gap;
        const speed = 60;
        const dur = Math.max(copyWidth / speed, 15);
        track.style.setProperty("--marquee-dur", `${dur}s`);
      });
    });
  });
}

function afterRender() {
  setupMarquees();
  document.querySelectorAll("[data-row-track]").forEach(t => {
    t.setAttribute("tabindex", "0");
    t.setAttribute("role", "region");
    t.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { e.preventDefault(); t.scrollBy({ left: 200, behavior: "smooth" }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); t.scrollBy({ left: -200, behavior: "smooth" }); }
    });
  });
  if (currentTab === "browse" && !browseData.results.length && !browseData.loading && !browseData.error) loadBrowse("trending");
  if (currentTab === "seasonal" && !seasonalData.results.length && !seasonalData.loading && !seasonalData.error) {
    loadSeasonal(seasonalData.season || getCurrentSeason(), seasonalData.year || new Date().getFullYear());
  }
  if (currentTab === "search") {
    requestAnimationFrame(() => {
      const inp = document.getElementById("searchPageInput");
      if (inp) {
        inp.focus();
      }
    });
  }
  if (currentWatchId && currentTab === "watch") {
    setupWatchPlayer();
    // Feature 1: scroll current episode into view after render
    const currentRow = document.querySelector("#episodeListContainer .ep-row.is-current");
    if (currentRow) currentRow.scrollIntoView({ block: "nearest" });
    // Feature 2: load watch order panel (targeted async update, not a re-render)
    const entry = getEntry(currentWatchId);
    if (entry && entry.anilistId) renderWatchOrder(entry.anilistId);
  }
  updateNavActive();
  
  // Hero section management (INSTRUCTIONS §5: only on Home, not during watch)
  const heroEl = document.getElementById("hero");
  if (currentTab === "home" && currentWatchId === null) {
    if (heroEl) heroEl.style.display = "flex";
    const sig = getHeroSourceSignature();
    if (sig !== heroSourceSig) {
      heroSourceSig = sig;
      initHeroSystem();
    } else if (heroItems.length > 1 && !heroTimer) {
      startHeroRotation();
      setupHeroObserver();
    }
  } else {
    if (heroEl) heroEl.style.display = "none";
    stopHeroRotation();
  }

}

function updateNavActive() {
  document.querySelectorAll(".nav__link, .mobile-tab").forEach(b => {
    b.classList.toggle("is-active", b.dataset.tab === currentTab);
  });
}

/* ══ FRANCHISE HELPERS ═════════════════════════════════════════ */
const SEASON_PATTERNS = [
  /^(.+?)\s+season\s+(\d+)$/i,
  /^(.+?)\s+(\d+)(?:st|nd|rd|th)?\s*season$/i,
  /^(.+?)\s+(\d+)$/i,
  /^(.+?)\s+(?:part|vol)\.?\s*(\d+)$/i,
  /^(.+?)\s+(?:series|season)\s+(one|two|three|four|five|six|seven|eight|nine|ten)$/i,
];

const SEASON_WORD_MAP = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function parseFranchise(title) {
  if (!title) return null;
  const lower = title.trim();
  for (const pattern of SEASON_PATTERNS) {
    const m = lower.match(pattern);
    if (m) {
      const base = m[1].trim();
      let season = parseInt(m[2], 10);
      if (isNaN(season)) season = SEASON_WORD_MAP[m[2].toLowerCase()] || 1;
      return { franchise: base, season };
    }
  }
  return { franchise: lower, season: 0 };
}

/** Tie-break within same year/franchise (INSTRUCTIONS §3 — TV / movie / OVA ordering). */
const FORMAT_SORT_RANK = {
  TV: 0, TV_SHORT: 1, MOVIE: 2, OVA: 3, ONA: 4, SPECIAL: 5, MUSIC: 9,
};

function formatSortRank(entry) {
  const f = String(entry.format || "").toUpperCase().replace(/\s+/g, "_");
  if (Object.prototype.hasOwnProperty.call(FORMAT_SORT_RANK, f)) return FORMAT_SORT_RANK[f];
  return 6;
}

function sortCompletedEntries(entries) {
  const parsed = entries.map(e => {
    const info = parseFranchise(e.titleEnglish || e.title || "");
    return { entry: e, ...info };
  });

  parsed.sort((a, b) => {
    const fa = a.franchise || "";
    const fb = b.franchise || "";
    const cmp = fa.localeCompare(fb);
    if (cmp !== 0) return cmp;

    const ya = a.entry.year || 0;
    const yb = b.entry.year || 0;
    if (ya !== yb) return ya - yb;

    if (a.season !== b.season) return (a.season || 0) - (b.season || 0);

    const ra = formatSortRank(a.entry);
    const rb = formatSortRank(b.entry);
    if (ra !== rb) return ra - rb;

    const ca = a.entry.completedAt || 0;
    const cb = b.entry.completedAt || 0;
    if (ca !== cb) return ca - cb;

    const ta = a.entry.titleEnglish || a.entry.title || "";
    const tb = b.entry.titleEnglish || b.entry.title || "";
    const tcmp = String(ta).localeCompare(String(tb));
    if (tcmp !== 0) return tcmp;

    return String(a.entry.id).localeCompare(String(b.entry.id));
  });

  return parsed.map(p => p.entry);
}

/* ══ HOME ══════════════════════════════════════════════════════ */
function renderHome() {
  const entries = getAnimeEntries();
  const watching = entries.filter(e => e.status === "watching").sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
  
  // Sort completed by franchise and chronology
  const completed = sortCompletedEntries(entries.filter(e => e.status === "completed"));

  return `
    <section class="section">
      <div class="section__head">
        <div class="section__title">Trending Now</div>
        <button class="btn btn--sm btn--glass" data-action="tab" data-tab="browse">View All</button>
      </div>
      <div class="media-row">
        <div class="media-row__viewport marquee-container">
          <div class="media-row__track marquee-track" id="trendingTrack">
            ${browseData.results.map(renderCard).join("")}
            ${browseData.results.map(renderCard).join("")} 
          </div>
        </div>
      </div>
    </section>

    ${watching.length ? renderContinueWatching(watching) : ""}

    ${completed.length ? `
    <section class="section">
      <div class="section__head">
        <div class="section__title">Completed Masterpieces</div>
      </div>
      <div class="media-row">
        <div class="media-row__viewport marquee-container">
          <div class="media-row__track marquee-track marquee-track--reverse" id="completedTrack">
            ${completed.map(renderEntryCard).join("")}
            ${completed.map(renderEntryCard).join("")}
          </div>
        </div>
      </div>
    </section>` : ""}
  `;
}

function renderContinueWatching(entries) {
  return `<section class="section">
    <div class="section__head"><div class="section__title">Continue Watching</div></div>
    <div class="media-row"><div class="media-row__viewport" data-row-track="continueRow"><div class="media-row__track">${entries.map(renderContinueCard).join("")}</div></div></div>
  </section>`;
}

function renderContinueCard(entry) {
  const poster = getCoverSrc(entry);
  const t = getDisplayTitle(entry);
  const nextEp = (entry.episodesWatched || 0) + 1;
  const totalEp = entry.episodes || "?";
  return `<div class="continue-card" data-action="open-watch" data-id="${entry.id}" role="button" tabindex="0">
    <div class="continue-card__bg">${renderCoverMedia(poster, t, "continue-bg")}</div>
    <div class="continue-card__content">
      <div class="continue-card__poster">${renderCoverMedia(poster, t, "continue-poster")}</div>
      <div class="continue-card__info">
        <div class="continue-card__title">${escapeHtml(getDisplayTitle(entry))}</div>
        <div class="continue-card__ep">Ep ${nextEp} / ${totalEp}</div>
      </div>
      <div class="continue-card__play">&#9654;</div>
    </div>
  </div>`;
}

function getDisplayTitle(entry) {
  return getTitle(entry);
}

/* ══ STATS ═════════════════════════════════════════════════════ */

// ── Status labels used in the Stats tab ──────────────────────────
const STATS_STATUS_LABELS = {
  watching: "Watching", completed: "Completed", queued: "Queued",
  "plan-to-watch": "Plan to Watch", dropped: "Dropped",
  paused: "Paused", untracked: "Untracked"
};
const STATS_STATUS_OPTIONS = ["watching","completed","queued","plan-to-watch","dropped","paused","untracked"];

// ── Compute all analytics from localStorage entries ───────────────
function computeStats() {
  const entries = getAnimeEntries();
  if (!entries.length) return null;

  // Status counts
  const statusCounts = {};
  STATS_STATUS_OPTIONS.forEach(s => { statusCounts[s] = 0; });
  entries.forEach(e => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });

  // Episode & time stats
  const totalEpisodes = entries.reduce((s, e) => s + (e.episodesWatched || 0), 0);
  const avgEpDuration = 24; // minutes — standard anime episode
  const totalMinutes  = totalEpisodes * avgEpDuration;
  const totalDays     = (totalMinutes / 1440).toFixed(1);
  const totalHours    = Math.floor(totalMinutes / 60);

  // Ratings
  const rated    = entries.filter(e => e.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1)
    : null;
  const ratingDist = Array.from({ length: 10 }, (_, i) => ({
    score: i + 1,
    count: entries.filter(e => e.rating === i + 1).length
  }));
  const maxRatingCount = Math.max(...ratingDist.map(r => r.count), 1);

  // Genre counts
  const genreMap = {};
  entries.forEach(e => (e.genres || []).forEach(g => {
    genreMap[g] = (genreMap[g] || 0) + 1;
  }));
  const topGenres = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([genre, count]) => ({ genre, count }));
  const maxGenreCount = topGenres.length ? topGenres[0].count : 1;

  // Year distribution
  const yearMap = {};
  entries.forEach(e => {
    const yr = e.year || 0;
    if (yr > 0) yearMap[yr] = (yearMap[yr] || 0) + 1;
  });
  const yearDist = Object.entries(yearMap)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([year, count]) => ({ year: Number(year), count }));
  const maxYearCount = yearDist.length ? Math.max(...yearDist.map(y => y.count)) : 1;

  // Activity heatmap — last 365 days
  const now     = Date.now();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const dayMap  = {};
  
  entries.forEach(e => {
    const logs = e.sessionLog || [];
    // Fallback to lastWatched and dateAdded if logs are missing
    if (logs.length === 0) {
      if (e.lastWatched) logs.push(e.lastWatched);
      if (e.dateAdded) logs.push(e.dateAdded);
    }
    
    logs.forEach(ts => {
      if (ts > 0 && now - ts < oneYear) {
        const d   = new Date(ts);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        dayMap[key] = (dayMap[key] || 0) + 1;
      }
    });
  });
  const maxDayCount = Math.max(...Object.values(dayMap), 1);

  // Streak calculation
  let currentStreak = 0, longestStreak = 0, streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    const d   = new Date(today); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (dayMap[key]) {
      streak++;
      if (i === 0 || i === 1) currentStreak = streak;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      if (i > 1) streak = 0;
    }
  }

  // Completion rate (started = any status except plan-to-watch)
  const started        = entries.filter(e => e.status !== "plan-to-watch").length;
  const completedCount = statusCounts['completed'] || 0;
  const completionRate = started > 0 ? Math.round((completedCount / started) * 100) : 0;

  // Top anime by episodes watched
  const topByEpisodes = [...entries]
    .filter(e => e.episodesWatched > 0)
    .sort((a, b) => (b.episodesWatched || 0) - (a.episodesWatched || 0))
    .slice(0, 5);

  // Critic profile — your avg vs AniList avg
  const bothScored = entries.filter(e => e.rating > 0 && e.averageScore > 0);
  const avgAniList = bothScored.length
    ? (bothScored.reduce((s, e) => s + e.averageScore, 0) / bothScored.length / 10).toFixed(1)
    : null;
  const scoreDiff = (avgRating && avgAniList)
    ? (parseFloat(avgRating) - parseFloat(avgAniList)).toFixed(1)
    : null;

  // Most active month this year
  const thisYear  = new Date().getFullYear();
  const monthMap  = {};
  entries.forEach(e => {
    (e.sessionLog || []).forEach(ts => {
      if (ts > 0) {
        const d = new Date(ts);
        if (d.getFullYear() === thisYear) {
          monthMap[d.getMonth()] = (monthMap[d.getMonth()] || 0) + 1;
        }
      }
    });
  });
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mostActiveMonth = Object.keys(monthMap).length
    ? MONTH_NAMES[Number(Object.entries(monthMap).sort((a,b) => b[1]-a[1])[0][0])]
    : null;

  return {
    total: entries.length, statusCounts, totalEpisodes, totalDays, totalHours,
    avgRating, ratingDist, maxRatingCount, topGenres, maxGenreCount,
    yearDist, maxYearCount, dayMap, maxDayCount,
    currentStreak, longestStreak, completionRate,
    topByEpisodes, avgAniList, scoreDiff, bothScored: bothScored.length,
    mostActiveMonth, rated: rated.length
  };
}

// ── Activity heatmap (last 52 weeks) ─────────────────────────────
function renderStatsHeatmap(dayMap, maxDayCount) {
  const weeks = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay()); // align to Sunday

  const monthLabels = [];
  let lastMonth = -1, weekIndex = 0;
  const d = new Date(start);

  while (d <= today) {
    const week = [];
    for (let dow = 0; dow < 7; dow++) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const count    = dayMap[key] || 0;
      const isFuture = d > today;
      const intensity = isFuture ? 0 : count === 0 ? 0 : Math.ceil((count / maxDayCount) * 4);
      week.push({ key, count, intensity, isFuture });
      if (d.getMonth() !== lastMonth && dow === 0) {
        monthLabels.push({ index: weekIndex, label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] });
        lastMonth = d.getMonth();
      }
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
    weekIndex++;
  }

  const totalSessions = Object.values(dayMap).reduce((s, v) => s + v, 0);
  const activeDays    = Object.keys(dayMap).length;

  const monthRow = `<div class="sheatmap-months">${monthLabels.map(m => `<span style="grid-column:${m.index+1}">${m.label}</span>`).join('')}</div>`;
  const grid     = `<div class="sheatmap-grid">${weeks.map(week =>
    `<div class="sheatmap-week">${week.map(cell =>
      `<div class="sheatmap-cell sheatmap-cell--${cell.intensity}${cell.isFuture ? ' sheatmap-cell--future' : ''}" title="${cell.isFuture ? '' : cell.count > 0 ? cell.count + ' session' + (cell.count > 1 ? 's' : '') + ' on ' + cell.key : 'No activity on ' + cell.key}"></div>`
    ).join('')}</div>`
  ).join('')}</div>`;

  return `<div class="sheatmap-wrap">
    ${monthRow}
    ${grid}
    <div class="sheatmap-legend">
      <span class="sheatmap-legend__label">Less</span>
      <div class="sheatmap-cell sheatmap-cell--0"></div>
      <div class="sheatmap-cell sheatmap-cell--1"></div>
      <div class="sheatmap-cell sheatmap-cell--2"></div>
      <div class="sheatmap-cell sheatmap-cell--3"></div>
      <div class="sheatmap-cell sheatmap-cell--4"></div>
      <span class="sheatmap-legend__label">More</span>
    </div>
    <div class="sheatmap-summary">${totalSessions} sessions across ${activeDays} active days in the last year</div>
  </div>`;
}

// ── SVG donut chart for status distribution ───────────────────────
function renderStatsDonut(statusCounts, total) {
  const STATUS_COLORS = {
    watching: '#3b9eff', completed: '#22c55e', queued: '#f59e0b',
    'plan-to-watch': '#a78bfa', dropped: '#ef4444',
    paused: '#fbbf24', untracked: '#50506a'
  };
  const r = 54, cx = 64, cy = 64, circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = STATS_STATUS_OPTIONS
    .filter(s => statusCounts[s] > 0)
    .map(s => {
      const pct  = statusCounts[s] / total;
      const dash = pct * circumference;
      const seg  = { status: s, count: statusCounts[s], pct: Math.round(pct * 100), dash, offset, color: STATUS_COLORS[s] };
      offset += dash;
      return seg;
    });

  const arcs = segments.map(seg =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${seg.color}" stroke-width="18"
      stroke-dasharray="${seg.dash} ${circumference - seg.dash}"
      stroke-dashoffset="${circumference - seg.offset}"
      transform="rotate(-90 ${cx} ${cy})">
      <title>${STATS_STATUS_LABELS[seg.status]}: ${seg.count} (${seg.pct}%)</title>
    </circle>`
  ).join('');

  const legend = segments.map(seg =>
    `<div class="sdonut-legend-item">
      <span class="sdonut-legend-dot" style="background:${seg.color}"></span>
      <span class="sdonut-legend-label">${STATS_STATUS_LABELS[seg.status]}</span>
      <span class="sdonut-legend-count">${seg.count}</span>
    </div>`
  ).join('');

  return `<div class="sdonut-wrap">
    <svg class="sdonut-svg" viewBox="0 0 128 128">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="18"/>
      ${arcs}
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="sdonut-center-num">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" class="sdonut-center-label">Total</text>
    </svg>
    <div class="sdonut-legend">${legend}</div>
  </div>`;
}

// ── Main Stats tab renderer ───────────────────────────────────────
function renderStats() {
  const s = computeStats();

  if (!s) {
    return `<div class="section" style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--sp-4);text-align:center">
      <div style="font-size:48px;opacity:0.4">📊</div>
      <div class="section__title">No data yet</div>
      <p style="color:var(--text2);max-width:380px">Add anime to your library and start watching to see your personal analytics here.</p>
      <button class="btn btn--primary" data-action="tab" data-tab="browse">Browse Anime</button>
    </div>`;
  }

  // ── Hero stat cards ─────────────────────────────────────────────
  const heroCards = [
    { value: s.total,                          label: 'Total Anime',      color: 'var(--accent-hi)' },
    { value: s.totalEpisodes.toLocaleString(), label: 'Episodes Watched', color: '#3b9eff' },
    { value: s.totalHours.toLocaleString()+'h',label: 'Time Watched',     color: '#22c55e' },
    { value: s.totalDays + 'd',                label: 'Days of Anime',    color: '#f59e0b' },
    { value: s.avgRating ? '★ ' + s.avgRating : '—', label: 'Avg Rating', color: '#fbbf24' },
    { value: s.completionRate + '%',           label: 'Completion Rate',  color: '#a78bfa' },
  ].map(c => `<div class="sstat-hero-card">
    <div class="sstat-hero-card__value" style="color:${c.color}">${escapeHtml(String(c.value))}</div>
    <div class="sstat-hero-card__label">${escapeHtml(c.label)}</div>
  </div>`).join('');

  // ── Rating distribution bars ────────────────────────────────────
  const ratingBars = s.ratingDist.map(r => {
    const h     = s.maxRatingCount > 0 ? Math.round((r.count / s.maxRatingCount) * 100) : 0;
    const isAvg = s.avgRating && Math.round(parseFloat(s.avgRating)) === r.score;
    return `<div class="srating-bar-col">
      <div class="srating-bar-count">${r.count > 0 ? r.count : ''}</div>
      <div class="srating-bar-track">
        <div class="srating-bar-fill${isAvg ? ' srating-bar-fill--avg' : ''}" style="height:${h}%"></div>
      </div>
      <div class="srating-bar-label">${r.score}</div>
    </div>`;
  }).join('');

  // ── Genre horizontal bars ───────────────────────────────────────
  const genreBars = s.topGenres.map((g, i) => {
    const w   = Math.round((g.count / s.maxGenreCount) * 100);
    const hue = (i * 28) % 360;
    return `<div class="sgenre-bar-row">
      <div class="sgenre-bar-name">${escapeHtml(g.genre)}</div>
      <div class="sgenre-bar-track">
        <div class="sgenre-bar-fill" style="width:${w}%;background:hsl(${hue},65%,60%)"></div>
      </div>
      <div class="sgenre-bar-count">${g.count}</div>
    </div>`;
  }).join('');

  // ── Year distribution bars ──────────────────────────────────────
  const yearBars = s.yearDist.map(y => {
    const w = Math.round((y.count / s.maxYearCount) * 100);
    return `<div class="sgenre-bar-row">
      <div class="sgenre-bar-name">${y.year}</div>
      <div class="sgenre-bar-track">
        <div class="sgenre-bar-fill" style="width:${w}%;background:var(--accent)"></div>
      </div>
      <div class="sgenre-bar-count">${y.count}</div>
    </div>`;
  }).join('');

  // ── Top anime by episodes ───────────────────────────────────────
  const topEpCards = s.topByEpisodes.map(e => {
    const pct = e.episodes > 0 ? Math.round((e.episodesWatched / e.episodes) * 100) : 100;
    return `<div class="stop-ep-card" data-action="open-watch" data-id="${e.id}" role="button" tabindex="0">
      <div class="stop-ep-card__cover">${renderCoverMedia(getCoverSrc(e), getDisplayTitle(e), "stop-ep")}</div>
      <div class="stop-ep-card__info">
        <div class="stop-ep-card__title">${escapeHtml(getDisplayTitle(e))}</div>
        <div class="stop-ep-card__eps">${e.episodesWatched} / ${e.episodes || '?'} eps</div>
        <div class="stop-ep-card__bar"><div class="stop-ep-card__fill" style="width:${pct}%"></div></div>
      </div>
      <div class="stop-ep-card__pct">${pct}%</div>
    </div>`;
  }).join('');

  // ── Critic profile card ─────────────────────────────────────────
  let criticHtml = '';
  if (s.scoreDiff !== null && s.bothScored >= 3) {
    const diff  = parseFloat(s.scoreDiff);
    const label = diff > 0.5 ? 'Generous Rater 😊' : diff < -0.5 ? 'Harsh Critic 🧐' : 'Aligned with Community 🎯';
    const desc  = diff > 0.5
      ? `You rate anime ${s.scoreDiff} points higher than the AniList community average.`
      : diff < -0.5
      ? `You rate anime ${Math.abs(diff).toFixed(1)} points lower than the AniList community average.`
      : `Your ratings closely match the AniList community consensus.`;
    criticHtml = `<div class="scritic-card">
      <div class="scritic-card__label">${label}</div>
      <div class="scritic-card__row">
        <div class="scritic-card__score"><span class="scritic-card__num">${s.avgRating}</span><span style="color:var(--text2);font-size:var(--t-xs)">Your avg</span></div>
        <div class="scritic-card__vs">vs</div>
        <div class="scritic-card__score"><span class="scritic-card__num">${s.avgAniList}</span><span style="color:var(--text2);font-size:var(--t-xs)">AniList avg</span></div>
      </div>
      <div style="color:var(--text2);font-size:var(--t-xs);margin-top:var(--sp-2)">${escapeHtml(desc)}</div>
      <div style="color:var(--text3);font-size:var(--t-xs);margin-top:var(--sp-1)">Based on ${s.bothScored} rated anime</div>
    </div>`;
  }

  // ── Streak card ─────────────────────────────────────────────────
  const streakHtml = `<div class="sstreak-card">
    <div class="sstreak-item">
      <div class="sstreak-item__num" style="color:var(--accent-hi)">${s.currentStreak}</div>
      <div class="sstreak-item__label">Current Streak</div>
      <div style="color:var(--text3);font-size:var(--t-xs)">days</div>
    </div>
    <div class="sstreak-divider"></div>
    <div class="sstreak-item">
      <div class="sstreak-item__num" style="color:#f59e0b">${s.longestStreak}</div>
      <div class="sstreak-item__label">Longest Streak</div>
      <div style="color:var(--text3);font-size:var(--t-xs)">days</div>
    </div>
    ${s.mostActiveMonth ? `<div class="sstreak-divider"></div>
    <div class="sstreak-item">
      <div class="sstreak-item__num" style="color:#22c55e">${escapeHtml(s.mostActiveMonth)}</div>
      <div class="sstreak-item__label">Most Active Month</div>
      <div style="color:var(--text3);font-size:var(--t-xs)">${new Date().getFullYear()}</div>
    </div>` : ''}
  </div>`;

  return `<div class="section">
    <div class="section__head" style="margin-bottom:var(--sp-5)">
      <div>
        <div class="section__title">Your Anime Stats</div>
        <div style="color:var(--text2);font-size:var(--t-sm);margin-top:var(--sp-1)">A deep dive into your watching history and habits</div>
      </div>
    </div>

    <!-- Hero number cards -->
    <div class="sstat-hero-grid">${heroCards}</div>

    <!-- Row 1: Donut + Rating distribution -->
    <div class="sstats-row sstats-row--2col">
      <div class="sstats-card">
        <div class="sstats-card__title">Library Breakdown</div>
        <div class="sstats-card__sub">Status distribution across all ${s.total} titles</div>
        ${renderStatsDonut(s.statusCounts, s.total)}
      </div>
      <div class="sstats-card">
        <div class="sstats-card__title">Your Rating Distribution</div>
        <div class="sstats-card__sub">${s.rated} rated anime · avg ${s.avgRating || '—'} / 10</div>
        <div class="srating-bars">${ratingBars}</div>
      </div>
    </div>

    <!-- Row 2: Top genres -->
    <div class="sstats-card">
      <div class="sstats-card__title">Top Genres in Your Library</div>
      <div class="sstats-card__sub">Ranked by number of anime per genre</div>
      <div class="sgenre-bars">${genreBars}</div>
    </div>

    <!-- Row 3: Activity heatmap -->
    <div class="sstats-card">
      <div class="sstats-card__title">Watch Activity — Last 12 Months</div>
      <div class="sstats-card__sub">Each cell is one day · darker = more sessions</div>
      ${renderStatsHeatmap(s.dayMap, s.maxDayCount)}
    </div>

    <!-- Row 4: Streaks + Critic profile -->
    <div class="sstats-row sstats-row--2col">
      <div class="sstats-card">
        <div class="sstats-card__title">Watching Streaks</div>
        <div class="sstats-card__sub">Consecutive days with watch sessions</div>
        ${streakHtml}
      </div>
      ${criticHtml ? `<div class="sstats-card">
        <div class="sstats-card__title">Critic Profile</div>
        <div class="sstats-card__sub">How your taste compares to AniList</div>
        ${criticHtml}
      </div>` : ''}
    </div>

    <!-- Row 5: Most watched anime -->
    ${s.topByEpisodes.length ? `<div class="sstats-card">
      <div class="sstats-card__title">Most Watched Anime</div>
      <div class="sstats-card__sub">By episodes watched</div>
      <div class="stop-ep-list">${topEpCards}</div>
    </div>` : ''}

    <!-- Row 6: Anime by release year -->
    <div class="sstats-card">
      <div class="sstats-card__title">Anime by Release Year</div>
      <div class="sstats-card__sub">Which eras you watch most</div>
      <div class="sgenre-bars">${yearBars}</div>
    </div>
  </div>`;
}

/* ══ SEASONAL ══════════════════════════════════════════════════ */
function renderSeasonal() {
  const curSeason = getCurrentSeason();
  const curYear = new Date().getFullYear();
  const s = seasonalData.season || curSeason;
  const y = seasonalData.year || curYear;
  const years = [curYear, curYear - 1, curYear + 1];
  return `<div class="section section--seasonal">
    <div class="browse-controls">
      <div class="chip-group">
        ${SEASONS.map(season => `<button class="chip ${s === season ? "is-active" : ""}" data-action="seasonal-mode" data-season="${season}" data-year="${y}">${season}</button>`).join("")}
      </div>
      <div class="chip-group">
        ${years.map(year => `<button class="chip ${y === year ? "is-active" : ""}" data-action="seasonal-year" data-year="${year}" data-season="${s}">${year}</button>`).join("")}
      </div>
      <div class="browse-status">${seasonalData.loading ? "Loading..." : seasonalData.error || `Showing ${seasonalData.results.length} titles`}</div>
    </div>
    ${seasonalData.loading ? `<div class="empty-state"><div class="empty-state__icon">&#8987;</div><div class="empty-state__title">Loading...</div></div>` :
      seasonalData.error ? `<div class="empty-state"><div class="empty-state__title">${escapeHtml(seasonalData.error)}</div></div>` :
      `<div class="grid">${seasonalData.results.map(renderCard).join("")}</div>
      ${seasonalData._hasMore ? `<div style="text-align:center;margin-top:var(--space-4)"><button class="btn btn--glass" data-action="seasonal-more">Load More</button></div>` : ""}`
    }
  </div>`;
}

/* ══ CARDS ════════════════════════════════════════════════════ */
function renderCard(anime) {
  const title = getTitle(anime);
  const img = getCoverSrc(anime);
  const meta = [anime.episodes ? `${anime.episodes} eps` : "", anime.averageScore ? `${anime.averageScore}%` : ""].filter(Boolean).join(" • ");
  return `<div class="anime-card" data-action="open-detail" data-id="${anime.id}" role="button" tabindex="0">
    <div class="anime-card__media">${renderCoverMedia(img, title, "card")}</div>
    <div class="anime-card__body">
      <div class="anime-card__title">${escapeHtml(title)}</div>
      ${meta ? `<div class="anime-card__meta">${escapeHtml(meta)}</div>` : ""}
    </div>
  </div>`;
}

function renderEntryCard(entry) {
  const title = getDisplayTitle(entry);
  const img = getCoverSrc(entry);
  const meta = entry.episodes ? `${entry.episodesWatched || 0}/${entry.episodes}` : "";
  const stars = entry.rating > 0 ? renderStarsInline(entry.rating) : "";
  return `<div class="anime-card" data-action="open-watch" data-id="${entry.id}" role="button" tabindex="0">
    <div class="anime-card__media">
      ${renderCoverMedia(img, title, "card")}
      <div class="status-badge" data-status="${entry.status}">${getStatusLabel(entry.status)}</div>
    </div>
    <div class="anime-card__body">
      <div class="anime-card__title">${escapeHtml(title)}</div>
      ${meta ? `<div class="anime-card__meta">${escapeHtml(meta)}</div>` : ""}
      ${stars ? `<div class="anime-card__stars">${stars}</div>` : ""}
    </div>
  </div>`;
}

function renderStarsInline(rating) {
  const full = Math.floor(rating / 2);
  const half = rating % 2;
  let s = "";
  for (let i = 0; i < full; i++) s += '<span class="star-inline is-filled">&#9733;</span>';
  if (half) s += '<span class="star-inline is-half">&#9733;</span>';
  for (let i = full + half; i < 5; i++) s += '<span class="star-inline">&#9733;</span>';
  return s;
}

/* ══ BROWSE ════════════════════════════════════════════════════ */
function renderBrowse() {
  const modes = [["trending", "Trending"], ["popular", "Popular"]];
  return `<div class="section">
    <div class="browse-controls">
      <div class="chip-group">
        ${modes.map(([m, l]) => `<button class="chip ${browseData.mode === m ? "is-active" : ""}" data-action="browse-mode" data-mode="${m}">${l}</button>`).join("")}
      </div>
      <div class="browse-status">${browseData.loading ? "Loading..." : browseData.error || `Showing ${browseData.results.length} titles`}</div>
    </div>
    ${browseData.loading ? `<div class="empty-state"><div class="empty-state__icon">&#8987;</div><div class="empty-state__title">Loading...</div></div>` :
      browseData.error ? `<div class="empty-state"><div class="empty-state__title">${escapeHtml(browseData.error)}</div></div>` :
      `<div class="grid">${browseData.results.map(renderCard).join("")}</div>
      ${browseData._hasMore ? `<div style="text-align:center;margin-top:var(--space-4)"><button class="btn btn--glass" data-action="browse-more">Load More</button></div>` : ""}`
    }
  </div>`;
}

/* ══ SEARCH ════════════════════════════════════════════════════ */
function renderSearch() {
  const val = escapeHtml(pendingSearchQuery);
  return `<div class="search-page section">
    <input type="search" id="searchPageInput" class="search-input--page" placeholder="Search anime..." value="${val}" autocomplete="off" aria-label="Search">
    <div id="searchResults"></div>
  </div>`;
}
let searchTimer = null;
function handleSearchInput(value) {
  clearTimeout(searchTimer);
  const results = document.getElementById("searchResults");
  if (!results) return;
  if (value.length < 2) { results.innerHTML = ""; return; }
  results.innerHTML = `<div class="empty-state"><div class="empty-state__icon">&#8987;</div><div class="empty-state__title">Searching...</div></div>`;
  searchTimer = setTimeout(async () => {
    try {
      const data = await searchAnime(value);
      searchResults = data;
      if (data.length === 0) { results.innerHTML = `<div class="empty-state"><div class="empty-state__title">No results for "${escapeHtml(value)}"</div></div>`; return; }
      results.innerHTML = `<div class="grid">${data.map(renderCard).join("")}</div>`;
    } catch (e) { results.innerHTML = `<div class="empty-state"><div class="empty-state__title">Search failed</div><div class="empty-state__text">${escapeHtml(e.message)}</div></div>`; }
  }, 400);
}

/* ══ LIBRARY ════════════════════════════════════════════════════ */
function renderLibrary() {
  const allEntries = getAnimeEntries();
  const statuses = LIBRARY_FILTER_STATUSES;
  
  if (allEntries.length === 0) {
    return `<div class="library-empty"><div class="empty-state__icon">&#128218;</div><div class="empty-state__title">Your library is empty</div><div class="empty-state__text">Browse anime and add them to your library to get started.</div><button class="btn btn--primary" style="margin-top:var(--space-3)" data-action="tab" data-tab="browse">Browse Anime</button></div>`;
  }

  let contentHtml = "";
  if (libraryFilter === "all") {
    // Grouping logic: render sections for each status that has entries
    STATUS_ORDER.forEach(status => {
      const groupEntries = allEntries.filter(e => e.status === status);
      if (groupEntries.length > 0) {
        contentHtml += `
          <div class="library-group">
            <h2 class="library-group__title">${getStatusLabel(status)} <span>(${groupEntries.length})</span></h2>
            <div class="grid">${groupEntries.map(renderEntryCard).join("")}</div>
          </div>
        `;
      }
    });
  } else {
    const filtered = allEntries.filter(e => e.status === libraryFilter);
    if (filtered.length === 0) {
      contentHtml = `<div class="library-empty" style="min-height:30vh"><div class="empty-state__title">No ${getStatusLabel(libraryFilter)} titles</div></div>`;
    } else {
      contentHtml = `<div class="grid">${filtered.map(renderEntryCard).join("")}</div>`;
    }
  }

  return `<div class="section">
    <div class="library-controls">
      <div class="chip-group" id="libraryStatusFilters">
        ${statuses.map(s => `<button class="chip ${s === libraryFilter ? "is-active" : ""}" data-action="filter-library" data-status="${s}">${s === "all" ? "All" : getStatusLabel(s)}</button>`).join("")}
      </div>
      <div style="display:flex;gap:var(--space-2);margin-left:auto">
        <button class="btn btn--sm btn--glass" data-action="export-library">Export</button>
        <button class="btn btn--sm btn--glass" data-action="import-library">Import</button>
      </div>
    </div>
    <div id="libraryGrid">${contentHtml}</div>
  </div>`;
}

/* ══ WATCH ══════════════════════════════════════════════════════ */

// ── Feature 1 helpers ────────────────────────────────────────────

/** Returns array of group objects: { start, end, label } for a given total. */
function getEpisodeGroups(total) {
  const groups = [];
  // Use 9999 sentinel as a large-but-finite ceiling for windowing
  const ceiling = total === 9999 ? Math.max(currentEpisode + EP_GROUP_SIZE, EP_GROUP_SIZE) : total;
  for (let i = 1; i <= ceiling; i += EP_GROUP_SIZE) {
    const start = i;
    const end   = Math.min(i + EP_GROUP_SIZE - 1, ceiling);
    groups.push({ start, end, label: `${start}–${end}` });
  }
  return groups;
}

/** Returns the group index that contains the given episode number. */
function getGroupForEpisode(ep, groups) {
  for (let i = 0; i < groups.length; i++) {
    if (ep >= groups[i].start && ep <= groups[i].end) return i;
  }
  return 0;
}

function renderWatch() {
  const entry = getEntry(currentWatchId);
  if (!entry) return `<div class="empty-state"><div class="empty-state__title">Title not found</div></div>`;

  // 9999 is the sentinel for "ongoing / count unknown". Show "?" in the UI
  // instead of the raw number so users aren't confused.
  const totalEps  = entry.episodes || 9999;
  const totalLabel = (totalEps === 9999) ? "?" : totalEps;

  const provider    = STREAM_PROVIDERS[currentProvider];
  const canDub      = dubAvailable[String(entry.anilistId)] !== false;
  const langIcon    = currentLanguage === "sub" ? "SUB" : "DUB";
  const nextDisabled = (totalEps !== 9999 && currentEpisode >= totalEps) ? "disabled" : "";
  const errorState = watchPlayerError;

  // Feature 1: compute groups and ensure currentEpisodeGroup is in sync
  const groups = getEpisodeGroups(totalEps);
  currentEpisodeGroup = getGroupForEpisode(currentEpisode, groups);

  return `<div class="watch-layout">
    <div class="watch-main">
      <div class="watch-player is-resolving${errorState ? ' has-error' : ''}">
        <iframe data-watch-iframe allow="autoplay; fullscreen" allowfullscreen></iframe>
        ${errorState ? `
          <div class="watch-player__error-overlay">
            <div class="watch-player__error-icon">⚠</div>
            <div class="watch-player__error-title">${escapeHtml(errorState.provider)} Error</div>
            <div class="watch-player__error-msg">${escapeHtml(errorState.message)}</div>
            <div class="watch-player__error-detail">${escapeHtml(errorState.detail)}</div>
            <div class="watch-player__error-actions">
              <button class="btn btn--primary btn--sm" data-action="retry-provider">Retry ${escapeHtml(errorState.provider)}</button>
              <button class="btn btn--glass btn--sm" data-action="switch-provider">Switch Provider</button>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="watch-meta" style="margin-top:var(--space-lg)">
        <h1 class="watch-meta__title" style="font-family:var(--font-display);font-size:32px;font-weight:800">${escapeHtml(getDisplayTitle(entry))}</h1>
        <div class="watch-meta__info" style="color:var(--text-muted);margin-top:var(--space-xs)">Episode ${currentEpisode} of ${totalLabel} &bull; ${currentLanguage.toUpperCase()}</div>
        
        <div class="watch-actions" style="margin-top:var(--space-lg);display:flex;gap:var(--space-md);flex-wrap:wrap">
          <div style="display:flex;gap:var(--space-sm)">
            <button class="btn btn--glass btn--sm" data-action="prev-episode" ${currentEpisode <= 1 ? "disabled" : ""}>Previous</button>
            <button class="btn btn--glass btn--sm" data-action="next-episode" ${nextDisabled}>Next</button>
          </div>
          
          <div style="display:flex;gap:var(--space-sm)">
            ${canDub ? `<button class="btn btn--glass btn--sm" data-action="toggle-language">${langIcon}</button>` : ""}
            <button class="btn btn--primary btn--sm" data-action="switch-provider">Provider: ${provider.name}</button>
          </div>

          <button class="btn btn--glass btn--sm" data-action="mark-watched" data-id="${entry.id}">Mark Watched</button>
          <button class="btn btn--glass btn--sm" data-action="close-watch" style="margin-left:auto">Close Player</button>
        </div>
      </div>

      <!-- Feature 2: Watch Order panel rendered here after async fetch -->
      <div id="watchOrderMount"></div>
    </div>
    <div class="watch-sidebar" id="episodeSidebar">
      <div class="watch-sidebar__title">Episodes${totalLabel !== "?" ? ` (${totalLabel})` : ""}</div>

      <!-- Feature 1: group selector — only shown when total > EP_GROUP_SIZE -->
      ${groups.length > 1 ? renderGroupDropdown(totalEps, currentEpisodeGroup) : ""}

      <div class="watch-sidebar__list" id="episodeListContainer">
        ${renderEpisodeList(entry, totalEps)}
      </div>
    </div>
  </div>`;
}

function renderEpisodeList(entry, total) {
  // Feature 1: render only the 40 episodes of the current group.
  // For unknown totals (9999 sentinel) we build groups dynamically based on
  // how far the user has watched, so the list is always manageable.
  const groups = getEpisodeGroups(total);

  // Clamp group index in case total changed since last render
  const groupIdx = Math.min(currentEpisodeGroup, groups.length - 1);
  const group    = groups[groupIdx] || groups[0];

  let html = "";

  for (let i = group.start; i <= group.end; i++) {
    const isCurrent = i === currentEpisode;
    const watched   = i <= (entry.episodesWatched || 0);
    html += `<div class="ep-row ${isCurrent ? "is-current" : ""} ${watched ? "is-watched" : ""}" data-action="set-episode" data-ep="${i}" role="button" tabindex="0">
      <span class="ep-num">${watched ? "&#10003;" : i}</span>
      <span class="ep-info">Episode ${i}</span>
    </div>`;
  }

  // For ongoing/unknown series, show a hint after the last rendered episode
  if (total === 9999) {
    html += `<div class="ep-row" style="opacity:0.5;font-size:0.75rem;justify-content:center">
      … use Next to continue beyond episode ${group.end} …
    </div>`;
  }

  return html;
}

/**
 * Feature 1: Targeted partial DOM update for the episode list and group selector.
 * Called after any episode/group change instead of a full renderContent().
 * Does NOT trigger renderApp() or renderContent().
 */
function paintEpisodeList() {
  const entry = getEntry(currentWatchId);
  if (!entry) return;

  const total  = entry.episodes || 9999;
  const groups = getEpisodeGroups(total);

  // Sync group to current episode
  currentEpisodeGroup = getGroupForEpisode(currentEpisode, groups);

  // Update group selector label and active state
  const btn = document.querySelector(".episode-group-btn");
  if (btn) {
    const group = groups[currentEpisodeGroup];
    btn.innerHTML = `Episodes ${group.start} – ${group.end} <span class="chevron">▾</span>`;
  }
  
  const list = document.querySelector(".episode-group-list");
  if (list) {
    list.querySelectorAll("li").forEach((li, i) => {
      li.classList.toggle("is-active", i === currentEpisodeGroup);
    });
    // If open and group changed via navigation, auto-close
    if (list.classList.contains("is-open")) toggleEpisodeDropdown(false);
  }

  // Update episode list content
  const listContainer = document.getElementById("episodeListContainer");
  if (listContainer) {
    listContainer.innerHTML = renderEpisodeList(entry, total);
    // Auto-scroll the current episode into view
    const currentRow = listContainer.querySelector(".ep-row.is-current");
    if (currentRow) currentRow.scrollIntoView({ block: "nearest" });
  }
}

/** Renders the new custom dropdown selector for episode groups */
function renderGroupDropdown(total, activeIdx) {
  const groups = getEpisodeGroups(total);
  const active = groups[activeIdx] || groups[0];
  
  return `
    <div class="ep-group-selector" id="epGroupSelector">
      <button class="episode-group-btn" data-action="toggle-ep-groups">
        Episodes ${active.start} – ${active.end} <span class="chevron">▾</span>
      </button>
      <ul class="episode-group-list">
        ${groups.map((g, i) => `
          <li class="${i === activeIdx ? 'is-active' : ''}" data-action="select-ep-group" data-group="${i}">
            Episodes ${g.start} – ${g.end}
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

/** Toggles the episode group dropdown state */
function toggleEpisodeDropdown(forceState) {
  const selector = document.getElementById("epGroupSelector");
  const btn = selector?.querySelector(".episode-group-btn");
  const list = selector?.querySelector(".episode-group-list");
  if (!selector || !btn || !list) return;

  const isOpen = forceState !== undefined ? forceState : !list.classList.contains("is-open");
  
  list.classList.toggle("is-open", isOpen);
  btn.classList.toggle("is-active", isOpen);

  if (isOpen) {
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleDropdownKeydown);
  } else {
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleDropdownKeydown);
  }
}

function handleOutsideClick(e) {
  const selector = document.getElementById("epGroupSelector");
  if (selector && !selector.contains(e.target)) {
    toggleEpisodeDropdown(false);
  }
}

function handleDropdownKeydown(e) {
  if (e.key === "Escape") {
    toggleEpisodeDropdown(false);
    document.querySelector(".episode-group-btn")?.focus();
  }
}

// buildStreamUrl — async-aware; callers that need a URL must await this.
async function buildStreamUrl(entry, ep, lang, idx) {
  if (!entry?.anilistId) return "";
  const p = STREAM_PROVIDERS[idx];
  if (!p || !p.active) return "";
  const result = await Promise.resolve(p.buildUrl(entry, ep, lang));
  return result || "";
}

// Task 4 — setupWatchPlayer with async resolution + is-resolving state + error postMessage
function setupWatchPlayer() {
  if (watchPlayerError) return; // Don't retry automatically while error is showing
  const entry = getEntry(currentWatchId);
  if (!entry) return;
  const iframe = document.querySelector("[data-watch-iframe]");
  if (!iframe) return;

  const playerWrap = iframe.closest(".watch-player");

  // Mark as resolving while we fetch the URL
  if (playerWrap) playerWrap.classList.add("is-resolving");

  const providerIndexAtStart = currentProvider;
  const provider = STREAM_PROVIDERS[providerIndexAtStart];
  if (!provider) return;

  let streamFallbackTimer = null;

  function cleanup() {
    clearTimeout(streamFallbackTimer);
    window.removeEventListener("message", onMessage);
  }

  function advanceProvider(reason) {
    cleanup();
    if (currentProvider !== providerIndexAtStart) return; // user already switched
    const next = providerIndexAtStart + 1;
    if (next < STREAM_PROVIDERS.length) {
      currentProvider = next;
      showToast(`${provider.name} ${reason} — trying ${STREAM_PROVIDERS[next].name}`, "error");
      renderContent();
    } else {
      currentProvider = 0;
      showToast("All providers tried. Switch manually.", "error");
    }
  }

  function onMessage(evt) {
    const payload = evt.data;
    if (!payload || typeof payload !== "object") return;
    // Task 5 — error event: skip immediately
    if (payload.event === "error" || payload.type === "error") {
      advanceProvider("reported an error");
      return;
    }
    // Success signals — cancel the fallback timer
    if (payload.event === "time" || payload.type === "watching-log" || payload.channel === "megacloud") {
      cleanup();
    }
  }

  window.addEventListener("message", onMessage);

  // Resolve URL (async for MegaPlay, instant for others)
  buildStreamUrl(entry, currentEpisode, currentLanguage, providerIndexAtStart).then(url => {
    if (playerWrap) playerWrap.classList.remove("is-resolving");
    if (currentProvider !== providerIndexAtStart) return; // user switched while resolving

    if (!url) {
      cleanup();
      if (providerIndexAtStart === 0) {
        // MegaPlay failed — show persistent error instead of silent fallback
        if (playerWrap) playerWrap.classList.remove("is-resolving");
        watchPlayerError = {
          provider: provider.name,
          message: "Stream not available for this episode",
          detail: "Could not find a playable source. The series may not be available on this provider."
        };
        renderContent(); // Re-render to show the error overlay
        return;
      }
      // Other providers: auto-advance
      advanceProvider("has no stream for this episode");
      return;
    }

    iframe.src = url;

    // 30-second fallback timeout for slow/hung players
    streamFallbackTimer = setTimeout(() => {
      advanceProvider("timed out");
    }, 30000);
  }).catch(() => {
    if (playerWrap) playerWrap.classList.remove("is-resolving");
    advanceProvider("failed to resolve");
  });
}

/* ══ TOAST ════════════════════════════════════════════════════ */
function showToast(msg, type = "success") {
  const c = document.getElementById("toastContainer");
  if (!c) return;
  const t = document.createElement("div");
  t.className = `toast toast--${type}`; t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 300); }, 3000);
}

/* ══ CONFETTI ══════════════════════════════════════════════════ */
function fireConfetti() {
  const existing = document.getElementById("confetti-canvas");
  if (existing) existing.remove();
  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * w, y: Math.random() * h - h,
    w: Math.random() * 8 + 3, h: Math.random() * 5 + 2,
    color: `hsl(${Math.random() * 360}, 80%, 60%)`,
    vy: Math.random() * 3 + 2, vx: (Math.random() - .5) * 2,
    rot: Math.random() * 360, rotV: (Math.random() - .5) * 6, o: 1,
  }));
  let frame;
  function anim() {
    let alive = false;
    ctx.clearRect(0, 0, w, h);
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.rotV; p.o -= 0.003;
      if (p.o <= 0 || p.y > h) continue;
      alive = true;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = p.o; ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (alive) frame = requestAnimationFrame(anim);
    else { canvas.remove(); cancelAnimationFrame(frame); }
  }
  anim();
  setTimeout(() => { cancelAnimationFrame(frame); canvas.remove(); }, 5000);
}

/* ══ OVERLAY ══════════════════════════════════════════════════ */
function showOverlay(html) {
  const overlay = document.getElementById("overlay");
  if (!overlay) return;
  overlay.innerHTML = html;
  overlay.style.display = "flex";
}
function hideOverlay() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.style.display = "none";
}

function renderDetailOverlay(anime) {
  const title = getTitle(anime);
  const img = getCoverSrc(anime);
  const existing = getEntry(anime.id);
  const entryRating = existing?.rating || 0;
  return `<div class="overlay-card" data-overlay-card>
    <div class="overlay-card__media">
      ${renderCoverMedia(img, title, "overlay")}
    </div>
    <div class="overlay-card__content" style="padding:var(--space-lg);display:flex;flex-direction:column;gap:var(--space-md)">
      <div>
        <div class="overlay-card__title" style="font-family:var(--font-display);font-size:32px;font-weight:800;margin-bottom:var(--space-xs)">${escapeHtml(title)}</div>
        <div style="font-size:14px;color:var(--text-muted);display:flex;gap:12px">
          <span>${anime.format}</span>
          <span>${anime.episodes ? `${anime.episodes} Episodes` : "?? Eps"}</span>
          <span>${anime.averageScore ? `${anime.averageScore}% Score` : ""}</span>
          <span>${anime.seasonYear || anime.year || ""}</span>
        </div>
      </div>
      
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${(anime.genres || []).slice(0, 4).map(g => `<span style="padding:4px 12px;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);border-radius:100px;font-size:12px;font-weight:600">${escapeHtml(g)}</span>`).join("")}
      </div>

      <div class="overlay-card__text" style="color:var(--text-muted);font-size:15px;line-height:1.6;flex:1">
        ${truncate(escapeHtml(anime.description?.replace(/<[^>]*>/g, "") || "No description available."), 400)}
      </div>

      ${existing ? renderStatusPicker(anime.id, existing.status) : ""}
      ${existing ? renderRatingSection(anime.id, entryRating) : ""}
      
      <div class="overlay-card__actions" style="margin-top:auto;display:flex;gap:var(--space-md)">
        <button class="btn btn--primary" data-action="open-watch" data-id="${anime.id}">Watch Now</button>
        <button class="btn btn--glass" data-action="add-to-library" data-id="${anime.id}">${existing ? 'Update Status' : '+ Library'}</button>
        <button class="btn btn--glass" data-action="close-overlay">Close</button>
      </div>
    </div>
  </div>`;
}

function renderStatusPicker(id, currentStatus) {
  return `<div style="margin-top:var(--space-3)">
    <label style="font-size:12px;color:var(--text-2);display:block;margin-bottom:var(--space-1)">Status</label>
    <div style="display:flex;gap:var(--space-2);align-items:center">
      <div class="status-badge" data-status="${currentStatus}">${getStatusLabel(currentStatus)}</div>
      <button class="btn btn--sm btn--glass" data-action="open-status-picker" data-id="${id}">Change</button>
    </div>
  </div>`;
}

function renderStatusPickerModal(id, currentStatus) {
  const entry = getEntry(id);
  const anime = anilistCache[id] || browseData.results.find(r => String(r.id) === String(id)) || searchResults.find(r => String(r.id) === String(id));
  const title = getTitle(anime || entry);
  const isUpdate = !!entry;

  return `<div class="status-modal">
    <div class="status-modal__title">${isUpdate ? 'Update Status' : 'Add to Library'}</div>
    <div class="status-modal__subtitle">${escapeHtml(title)}</div>
    <div class="status-options">
      ${STATUS_ORDER.map(s => `
        <label class="status-option ${currentStatus === s ? 'is-selected' : ''}">
          <input type="radio" name="status-choice" value="${s}" ${currentStatus === s ? 'checked' : ''} onchange="this.parentElement.parentElement.querySelectorAll('.status-option').forEach(el=>el.classList.remove('is-selected'));this.parentElement.classList.add('is-selected')">
          <span>${getStatusLabel(s)}</span>
        </label>
      `).join('')}
    </div>
    <div class="status-modal__actions">
      <button class="btn btn--glass" data-action="close-status-picker">Cancel</button>
      <button class="btn btn--primary" data-action="confirm-status" data-id="${id}">${isUpdate ? 'Update' : 'Add'}</button>
    </div>
  </div>`;
}

function openStatusPicker(id) {
  const entry = getEntry(id);
  const currentStatus = entry ? entry.status : "plan-to-watch";
  const overlay = document.getElementById("statusPickerOverlay");
  if (!overlay) return;
  overlay.innerHTML = renderStatusPickerModal(id, currentStatus);
  overlay.style.display = "flex";
}

function hideStatusPicker() {
  const overlay = document.getElementById("statusPickerOverlay");
  if (overlay) overlay.style.display = "none";
}

function renderRatingSection(id, currentRating) {
  const full = Math.floor(currentRating / 2);
  const half = currentRating % 2;
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    const cls = i <= full ? "is-active" : (i === full + 1 && half ? "is-active is-half" : "");
    stars += `<span class="rating-star ${cls}" data-rating="${i}" data-entry="${id}">&#9733;</span>`;
  }
  return `<div class="rating-overlay" style="margin-top:var(--space-3)">
    <div class="rating-title">Your Rating</div>
    <div class="rating-stars" data-rating-entry="${id}">${stars}</div>
  </div>`;
}

function renderNotesSection(id, notes) {
  return `<div style="margin-top:var(--space-3)">
    <label style="font-size:12px;color:var(--text-2);display:block;margin-bottom:var(--space-1)">Notes</label>
    <textarea class="notes-input" data-notes-entry="${id}" rows="3" placeholder="Add your notes...">${escapeHtml(notes || "")}</textarea>
    <button class="btn btn--sm btn--glass" style="margin-top:var(--space-1)" data-action="save-notes" data-entry="${id}">Save Notes</button>
  </div>`;
}

/* ══ RATING ACTIONS ════════════════════════════════════════════ */
function setRating(id, stars) {
  const entry = getEntry(id);
  if (!entry) return;
  const newRating = stars * 2;
  entry.rating = entry.rating === newRating ? 0 : newRating;
  saveData();
  showToast(entry.rating > 0 ? `Rated ${entry.rating}/10` : "Rating removed", "success");
  const anime = anilistCache[id] || browseData.results.find(r => String(r.id) === String(id)) || searchResults.find(r => String(r.id) === String(id));
  if (anime) showOverlay(renderDetailOverlay(anime));
  if (currentTab === "library") renderContent();
}

/* ══ ACTIONS ══════════════════════════════════════════════════ */
function addToLibrary(anime, status = "plan-to-watch") {
  const id = String(anime.id);
  const isUpdate = !!userData[id];
  
  const entryData = {
    id:              anime.id,
    anilistId:       anime.id,
    title:           getTitle(anime),
    titleEnglish:    anime.title?.english || anime.titleEnglish || "",
    cover:           (anime.coverImage && anime.coverImage.large) || anime.cover || "",
    banner:          anime.bannerImage || anime.banner || "",
    episodes:        anime.episodes || 0,
    episodesWatched: isUpdate ? userData[id].episodesWatched : 0,
    status:          status,
    language:        isUpdate ? userData[id].language : "sub",
    rating:          isUpdate ? userData[id].rating : 0,
    genres:          anime.genres || [],
    averageScore:    anime.averageScore || 0,
    format:          isUpdate ? (userData[id].format || anime.format || "") : (anime.format || ""),
    notes:           isUpdate ? userData[id].notes : "",
    dateAdded:       isUpdate ? userData[id].dateAdded : Date.now(),
    lastWatched:     isUpdate ? userData[id].lastWatched : 0,
    year:            anime.seasonYear || anime.year || 0
  };

  userData[id] = entryData;
  saveData();
  showToast(`${isUpdate ? 'Updated' : 'Added'} "${entryData.title}" in library as ${getStatusLabel(status)}.`, "success");
  
  // Refresh UI
  const detailOverlay = document.getElementById("overlay");
  if (detailOverlay && detailOverlay.style.display === "flex") {
    showOverlay(renderDetailOverlay(anime));
  }
  if (currentTab === "library") renderContent();
}

async function openWatchView(id) {
  const entry = getEntry(id);
  if (!entry) { showToast("Title not found.", "error"); return; }

  // Instant UI Feedback: Switch tab first
  currentWatchId = id;
  currentTab = "watch";
  currentProvider = 0;
  currentEpisodeGroup = 0;
  currentLanguage = entry.language || "sub";
  
  // Optimistic status update
  entry.status = "watching";
  entry.lastWatched = Date.now();
  saveData();
  
  renderContent();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Resolve episode metadata in background
  try {
    await preloadEpisodeUrls(entry.anilistId);
    
    const knownTotal = entry.episodes || 9999;
    currentEpisode = Math.min((entry.episodesWatched || 0) + 1, knownTotal);
    
    // Clear any error from the first player attempt and re-render with populated caches
    watchPlayerError = null;
    renderContent();
  } catch (e) {
    console.error("openWatchView preflight failed:", e);
    // Even if preflight fails, we can still try to render the player
    renderContent();
  }
}

function markEpisodeWatched(id) {
  const entry = getEntry(id);
  if (!entry) return;
  // Use 9999 sentinel for unknown totals — never auto-complete an ongoing series
  const total = entry.episodes || 9999;
  entry.episodesWatched = (total === 9999)
    ? (entry.episodesWatched || 0) + 1
    : Math.min((entry.episodesWatched || 0) + 1, total);
  entry.lastWatched = Date.now();
  if (total !== 9999 && entry.episodesWatched >= total && entry.status !== "completed") {
    entry.status = "completed";
    entry.completedAt = Date.now();
    saveData();
    showToast(`Completed "${getDisplayTitle(entry)}"!`, "success");
    fireConfetti();
  } else {
    if (entry.status === "plan-to-watch") entry.status = "watching";
    saveData();
    showToast(`Marked episode ${entry.episodesWatched} watched.`, "success");
  }
  renderContent();
}

function saveNotes(id) {
  const textarea = document.querySelector(`[data-notes-entry="${id}"]`);
  if (!textarea) return;
  const entry = getEntry(id);
  if (!entry) return;
  entry.notes = textarea.value;
  saveData();
  showToast("Notes saved.", "success");
}

/* ══ SHORTCUTS ════════════════════════════════════════════════ */
const SHORTCUTS = [
  { key: "?", desc: "Toggle this help overlay" },
  { key: "1-4", desc: "Switch tabs (Home, Browse, Seasonal, Library)" },
  { key: "/", desc: "Focus search" },
  { key: "W", desc: "Switch streaming provider (on watch page)" },
  { key: "L", desc: "Toggle Sub/Dub audio (on watch page)" },
  { key: "Esc", desc: "Close overlay / modal" },
  { key: "← →", desc: "Navigate episode list / scroll rows" },
];

function renderShortcutsGrid() {
  const grid = document.getElementById("shortcutsGrid");
  if (!grid) return;
  grid.innerHTML = SHORTCUTS.map(s =>
    `<div class="shortcut-row"><span class="shortcut-desc">${s.desc}</span><span class="shortcut-key">${s.key}</span></div>`
  ).join("");
}

function toggleShortcuts(show) {
  const modal = document.getElementById("shortcutsModal");
  if (!modal) return;
  const isOpen = show !== undefined ? show : !modal.classList.contains("is-open");
  modal.classList.toggle("is-open", isOpen);
  if (isOpen) renderShortcutsGrid();
}

/* ══ EVENT HANDLING ════════════════════════════════════════════ */
document.addEventListener("click", e => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "tab") {
    currentTab = target.dataset.tab;
    const hero = document.getElementById("hero");
    const app = document.getElementById("app");
    if (currentTab === "home") {
      if (hero) hero.style.display = "flex";
      if (app) app.style.paddingTop = "0";
    } else {
      if (hero) hero.style.display = "none";
      if (app) app.style.paddingTop = "calc(var(--nav-height) + 16px)";
    }
    renderContent();
    if (currentTab === "browse" && !browseData.results.length && !browseData.loading && !browseData.error) loadBrowse(browseData.mode);
    if (currentTab === "seasonal" && !seasonalData.results.length && !seasonalData.loading && !seasonalData.error) {
      loadSeasonal(seasonalData.season || getCurrentSeason(), seasonalData.year || new Date().getFullYear());
    }
    if (currentTab === "search") {
      pendingSearchQuery = ""; // Clear for fresh navigation
      const inp = document.getElementById("searchPageInput");
      if (inp) inp.focus();
    }
  }

  if (action === "browse-mode") {
    browseData.mode = target.dataset.mode;
    browseData.results = [];
    browseData.page = 0;
    renderContent();
    loadBrowse(browseData.mode);
  }

  if (action === "browse-more") { loadBrowse(browseData.mode, browseData.page + 1); }

  if (action === "seasonal-mode") {
    const season = target.dataset.season;
    const year = Number(target.dataset.year);
    seasonalData.results = [];
    seasonalData.page = 0;
    renderContent();
    loadSeasonal(season, year);
  }

  if (action === "seasonal-year") {
    const season = target.dataset.season;
    const year = Number(target.dataset.year);
    seasonalData.results = [];
    seasonalData.page = 0;
    renderContent();
    loadSeasonal(season, year);
  }

  if (action === "seasonal-more") {
    loadSeasonal(seasonalData.season, seasonalData.year, seasonalData.page + 1);
  }

  if (action === "open-detail") {
    const id = target.dataset.id;
    const anime = anilistCache[id] || getEntry(id);
    if (!anime) { showToast("Could not load details.", "error"); return; }
    anilistCache[anime.id] = anime;
    showOverlay(renderDetailOverlay(anime));
    findAnikotoId(anime.id);
  }

  if (action === "close-overlay") { hideOverlay(); }

  if (action === "add-to-library" || action === "open-status-picker") {
    const id = target.dataset.id;
    openStatusPicker(id);
  }

  if (action === "close-status-picker") {
    hideStatusPicker();
  }

  if (action === "confirm-status") {
    const id = target.dataset.id;
    const modal = target.closest(".status-modal");
    const selected = modal.querySelector('input[name="status-choice"]:checked')?.value;
    if (selected) {
      const anime = anilistCache[id] || browseData.results.find(r => String(r.id) === id) || searchResults.find(r => String(r.id) === id) || getEntry(id);
      if (anime) {
        addToLibrary(anime, selected);
        hideStatusPicker();
      }
    }
  }

  if (action === "open-watch") {
    const id = Number(target.dataset.id);
    if (!getEntry(id)) {
      const animeStr = String(id);
      const anime = anilistCache[animeStr] || browseData.results.find(r => String(r.id) === animeStr) || searchResults.find(r => String(r.id) === animeStr) || seasonalData.results.find(r => String(r.id) === animeStr);
      if (anime) addToLibrary(anime);
    }
    openWatchView(id);
    hideOverlay();
  }

  // Feature 2: navigate to a related title from the Watch Order panel
  if (action === "open-watch-order") {
    const id = Number(target.dataset.id);
    if (!id) return;
    // If not in library yet, we can't watch it — show a toast and bail
    if (!getEntry(id)) {
      showToast("Add this title to your library first to watch it.", "info");
      return;
    }
    openWatchView(id);
  }

  if (action === "close-watch") {
    watchPlayerError = null;
    currentWatchId = null;
    currentTab = "home";
    // Force cleanup of any active player listeners/timers
    window.dispatchEvent(new MessageEvent("message", { data: { event: "error" } }));
    renderContent();
    document.getElementById("hero")?.style.setProperty("display", "flex");
    document.getElementById("app")?.style.setProperty("padding-top", "0");
  }

  if (action === "next-episode") {
    const entry = getEntry(currentWatchId);
    if (!entry) return;
    // Use 9999 sentinel for unknown totals so Next is never blocked
    const total = entry.episodes || 9999;
    if (total === 9999 || currentEpisode < total) {
      currentEpisode++;
      currentProvider = 0;
      watchPlayerError = null;
      // Feature 1: targeted update — no full re-render needed for episode change
      paintEpisodeList();
      renderContent();
    }
  }

  if (action === "prev-episode") {
    if (currentEpisode > 1) {
      currentEpisode--;
      currentProvider = 0;
      watchPlayerError = null;
      paintEpisodeList();
      renderContent();
    }
  }

  if (action === "set-episode") {
    const ep = Number(target.dataset.ep);
    if (ep > 0) {
      currentEpisode = ep;
      currentProvider = 0;
      watchPlayerError = null;
      paintEpisodeList();
      renderContent();
    }
  }

  // Feature 1: dropdown toggle
  if (action === "toggle-ep-groups") {
    toggleEpisodeDropdown();
  }

  // Feature 1: switch episode group without changing current episode
  if (action === "select-ep-group") {
    const groupIdx = Number(target.dataset.group);
    if (!isNaN(groupIdx) && currentWatchId) {
      currentEpisodeGroup = groupIdx;
      // Jump current episode to the first episode of the selected group
      const entry  = getEntry(currentWatchId);
      const total  = entry ? (entry.episodes || 9999) : 9999;
      const groups = getEpisodeGroups(total);
      const group  = groups[groupIdx];
      if (group) {
        // Only move currentEpisode if it's outside the new group
        if (currentEpisode < group.start || currentEpisode > group.end) {
          currentEpisode = group.start;
        }
      }
      paintEpisodeList();
      toggleEpisodeDropdown(false);
      renderContent();
    }
  }

  if (action === "retry-provider") {
    watchPlayerError = null;
    renderContent();
    showToast(`Retrying ${STREAM_PROVIDERS[currentProvider].name}…`, "success");
  }

  if (action === "switch-provider") {
    watchPlayerError = null;
    currentProvider = (currentProvider + 1) % STREAM_PROVIDERS.length;
    renderContent();
    showToast(`Switched to ${STREAM_PROVIDERS[currentProvider].name}`, "success");
  }

  if (action === "toggle-language") {
    const entry = getEntry(currentWatchId);
    if (!entry) return;
    currentLanguage = currentLanguage === "sub" ? "dub" : "sub";
    entry.language = currentLanguage;
    saveData();
    renderContent();
    showToast(`Switched to ${currentLanguage === "sub" ? "Sub" : "Dub"}`, "success");
  }

  if (action === "mark-watched") {
    const id = Number(target.dataset.id);
    if (id) markEpisodeWatched(id);
  }

  if (action === "filter-library") {
    const status = target.dataset.status;
    if (status) {
      libraryFilter = status;
      renderContent();
    }
  }

  if (action === "export-library") {
    exportLibrary();
  }

  if (action === "import-library") {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = () => { if (input.files[0]) importLibrary(input.files[0]); };
    input.click();
  }

  if (action === "save-notes") {
    const id = Number(target.dataset.entry);
    if (id) saveNotes(id);
  }

  if (action === "close-shortcuts") {
    toggleShortcuts(false);
  }

  if (action === "hero-dot") {
    const index = Number(target.dataset.index);
    if (!isNaN(index)) goToHeroSlide(index);
  }
});

/* ══ RATING CLICKS (delegated) ════════════════════════════════ */
document.addEventListener("click", e => {
  const star = e.target.closest(".rating-star[data-rating]");
  if (!star) return;
  const id = Number(star.dataset.entry);
  const stars = Number(star.dataset.rating);
  if (id && stars) setRating(id, stars);
});

/* ══ INPUT HANDLING ══════════════════════════════════════════════ */
document.addEventListener("input", e => {
  if (e.target.id === "searchPageInput") {
    const val = e.target.value;
    pendingSearchQuery = val;
    handleSearchInput(val);
  }
});

/* ══ STATUS PICKER ════════════════════════════════════════════ */
document.addEventListener("change", e => {
  const select = e.target.closest(".status-select[data-action='set-status']");
  if (!select) return;
  const id = Number(select.dataset.entry);
  const newStatus = select.value;
  if (!id || !STATUS_ORDER.includes(newStatus)) return;
  const entry = getEntry(id);
  if (!entry) return;
  entry.status = newStatus;
  saveData();
  showToast(`Status set to ${getStatusLabel(newStatus)}`, "success");
  if (currentTab === "library") renderContent();
});

/* ══ KEYBOARD ══════════════════════════════════════════════════ */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    const picker = document.getElementById("statusPickerOverlay");
    if (picker?.style.display === "flex") { hideStatusPicker(); return; }
    const overlay = document.getElementById("overlay");
    if (overlay?.style.display === "flex") { hideOverlay(); return; }
    const modal = document.getElementById("shortcutsModal");
    if (modal?.classList.contains("is-open")) { toggleShortcuts(false); return; }
  }

  if (e.key === "Enter") {
    const picker = document.getElementById("statusPickerOverlay");
    if (picker?.style.display === "flex") {
      const confirmBtn = picker.querySelector('[data-action="confirm-status"]');
      if (confirmBtn) {
        e.preventDefault();
        confirmBtn.click();
      }
    }
  }

  // Hero keyboard navigation
  if (currentTab === "home" && heroItems.length > 1 && !e.target.closest("input,textarea,button")) {
    if (e.key === "ArrowLeft") { e.preventDefault(); goToHeroSlide((heroIndex - 1 + heroItems.length) % heroItems.length); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); goToHeroSlide((heroIndex + 1) % heroItems.length); return; }
  }

  if (e.key === "?" && !e.target.closest("input,textarea")) {
    e.preventDefault();
    toggleShortcuts();
  }

  if (e.key === "/" && !e.target.closest("input,textarea")) {
    e.preventDefault();
    currentTab = "search";
    renderContent();
    document.getElementById("hero")?.style.setProperty("display", "none");
  }

  if (e.key === "1" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "home"; renderContent(); updateNavActive(); document.getElementById("hero")?.style.setProperty("display", "flex"); }
  if (e.key === "2" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "browse"; renderContent(); if (!browseData.results.length && !browseData.loading && !browseData.error) loadBrowse(browseData.mode); document.getElementById("hero")?.style.setProperty("display", "none"); }
  if (e.key === "3" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "seasonal"; renderContent(); if (!seasonalData.results.length && !seasonalData.loading && !seasonalData.error) loadSeasonal(seasonalData.season || getCurrentSeason(), seasonalData.year || new Date().getFullYear()); document.getElementById("hero")?.style.setProperty("display", "none"); }
  if (e.key === "4" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "library"; renderContent(); document.getElementById("hero")?.style.setProperty("display", "none"); }

  if (e.key === "w" && currentWatchId && !e.target.closest("input,textarea")) {
    e.preventDefault();
    watchPlayerError = null;
    currentProvider = (currentProvider + 1) % STREAM_PROVIDERS.length;
    renderContent();
    showToast(`Switched to ${STREAM_PROVIDERS[currentProvider].name}`, "success");
  }

  if (e.key === "l" && currentWatchId && !e.target.closest("input,textarea")) {
    const entry = getEntry(currentWatchId);
    if (!entry) return;
    e.preventDefault();
    currentLanguage = currentLanguage === "sub" ? "dub" : "sub";
    entry.language = currentLanguage;
    saveData();
    renderContent();
    showToast(`Switched to ${currentLanguage === "sub" ? "Sub" : "Dub"}`, "success");
  }

  // Feature 1: ← → navigate episodes in watch view
  if (currentWatchId && currentTab === "watch" && !e.target.closest("input,textarea")) {
    if (e.key === "ArrowLeft" && currentEpisode > 1) {
      e.preventDefault();
      currentEpisode--;
      currentProvider = 0;
      watchPlayerError = null;
      paintEpisodeList();
      renderContent();
    }
    if (e.key === "ArrowRight") {
      const entry = getEntry(currentWatchId);
      const total = entry ? (entry.episodes || 9999) : 9999;
      if (total === 9999 || currentEpisode < total) {
        e.preventDefault();
        currentEpisode++;
        currentProvider = 0;
        watchPlayerError = null;
        paintEpisodeList();
        renderContent();
      }
    }
  }
});

/* ══ NAVBAR SCROLL ═══════════════════════════════════════════════ */
let lastScrollY = 0;
let navHidden = false;
window.addEventListener("scroll", () => {
  const nav = document.getElementById("navbar");
  if (!nav) return;
  const delta = window.scrollY - lastScrollY;
  if (delta > 40 && window.scrollY > 120 && !navHidden) {
    nav.classList.add("is-hidden");
    navHidden = true;
  } else if (delta < -10 && navHidden) {
    nav.classList.remove("is-hidden");
    navHidden = false;
  }
  lastScrollY = window.scrollY;

  // Hero parallax effect
  const heroEl = document.getElementById("hero");
  if (heroEl && heroEl.style.display !== "none") {
    const scrollY = window.scrollY;
    const heroTop = heroEl.getBoundingClientRect().top;
    if (heroTop < 0) {
      heroEl.style.transform = `translateY(${scrollY * 0.15}px)`;
    } else {
      heroEl.style.transform = "";
    }
  }
}, { passive: true });


/* ══ INIT ═══════════════════════════════════════════════════════ */
loadData();
renderContent();
if (location.protocol === "file:") {
  showToast("Open via HTTP server (node server.js) for API access", "error");
}
if (!browseData.results.length) loadBrowse("trending");
initAnikotoCache();

