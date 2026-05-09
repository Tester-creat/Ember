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
  const needle = _normTitle(typeof title === "object" ? (title?.romaji || title?.english) : title);
  for (let page = 1; page <= 5; page++) {
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
    } catch { return null; }
  }
  const ep = episodes.find(e => Number(e.number) === Number(epNum));
  if (!ep) return null;
  // embed_url.sub / embed_url.dub are the full megaplay URLs
  const url = (lang === "dub" ? ep.embed_url?.dub : ep.embed_url?.sub) || ep.embed_url?.sub || null;
  return url || null;
}

const STREAM_PROVIDERS = [
  { name: "MegaPlay", active: true, idType: "anikoto",
    async buildUrl(entry, ep, lang) {
      try {
        const seriesId = await fetchAnikotoSeries(entry.anilistId || entry.id, entry.title);
        if (!seriesId) return null;
        const url = await fetchAnikotoEpisodeEmbedId(seriesId, ep, lang);
        return url || null;
      } catch { return null; }
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

/* ══ ANIKOTO API ═══════════════════════════════════════════════ */
function anikotoFetch(endpoint) {
  const isLive = window.location.hostname.includes("github.io");
  const url = isLive ? `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://anikotoapi.site' + endpoint)}` : `/api/anikoto${endpoint}`;
  return fetch(url);
}

function normalizeAnikotoItem(item) {
  const aniId = Number(item.ani_id) || 0;
  // Parse episode count safely: "?" / null / "0" all become 0 (unknown),
  // which signals "ongoing — count not yet known" rather than "1 episode".
  const rawEps = item.episodes;
  const parsedEps = (rawEps && rawEps !== "?" && rawEps !== "0")
    ? (Number(rawEps) || 0)
    : 0;
  return {
    id: aniId,
    anilistId: aniId,
    idMal: Number(item.mal_id) || 0,
    title: {
      english: item.title || '',
      romaji: item.alternative || '',
      native: item.native || ''
    },
    coverImage: {
      large: item.poster || ''
    },
    episodes: parsedEps,
    duration: item.duration ? parseInt(item.duration) : null,
    status: item.status || '',
    averageScore: item.score && item.score !== '?' ? Math.round(Number(item.score) * 10) : 0,
    genres: item.terms_by_type?.genre || [],
    season: (item.season || '').toUpperCase(),
    year: Number(item.year) || null,
    format: item.terms_by_type?.type?.[0] || 'TV',
    description: item.description || '',
    startDate: { year: Number(item.year) || null, month: null, day: null }
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
  localStorage.setItem("ember_data", JSON.stringify(userData));
}
function getAnimeEntries() {
  return Object.values(userData).filter(e => e && e.id);
}
function getEntry(id) {
  return userData[String(id)] || null;
}

/* ══ IMPORT / EXPORT ════════════════════════════════════════════ */
function mapEmberToAniVault(entry) {
  const STATUS_REVERSE = {
    "watching":      "Watching",
    "completed":     "Completed",
    "queued":        "Queued",
    "plan-to-watch": "Plan to Watch",
    "dropped":       "Dropped",
    "paused":        "Paused",
    "untracked":     "Untracked",
  };
  return {
    status:           STATUS_REVERSE[entry.status] || entry.status,
    rating:           entry.rating || 0,
    episodesWatched:  entry.episodesWatched || 0,
    totalEpisodes:    entry.episodes || 0,
    notes:            entry.notes || "",
    title: {
      romaji:  entry.title || "",
      english: entry.titleEnglish || "",
      native:  entry.titleNative || "",
    },
    coverImage: {
      large: entry.cover || "",
    },
    genres:       entry.genres || [],
    averageScore: entry.averageScore || 0,
    year:         entry.year || 0,
  };
}

function generateExportFilename() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `anivault-backup-${yyyy}-${mm}-${dd}.json`;
}

function exportLibrary() {
  const output = {};

  // Map all library entries to anivault_v2 schema
  for (const [idStr, entry] of Object.entries(userData)) {
    if (!entry || !entry.id) continue;
    output[idStr] = mapEmberToAniVault(entry);
  }

  // Include __meta passthrough or generate a minimal block
  const storedMeta = localStorage.getItem("ember_anivault_meta");
  output.__meta = storedMeta
    ? JSON.parse(storedMeta)
    : { source: "ember", exportedAt: new Date().toISOString() };

  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = generateExportFilename();
  a.click();
  URL.revokeObjectURL(url);
  showToast("Library exported.", "success");
}

function mapAniVaultEntry(idStr, av2Entry) {
  const STATUS_MAP = {
    "Watching": "watching",
    "Completed": "completed",
    "Queued": "queued",
    "Plan to Watch": "plan-to-watch",
    "Dropped": "dropped",
    "Paused": "paused",
    "Untracked": "untracked",
  };
  const numericId = parseInt(idStr, 10);
  const rawStatus = av2Entry.status || "";
  // Try title-case map first, then lowercase direct match, then fallback
  const status = STATUS_MAP[rawStatus]
    || (STATUS_ORDER.includes(rawStatus) ? rawStatus : "untracked");
  return {
    id: numericId,
    anilistId: numericId,
    title: (av2Entry.title && (av2Entry.title.romaji || av2Entry.title.english)) || "",
    titleEnglish: (av2Entry.title && av2Entry.title.english) || "",
    cover: (av2Entry.coverImage && av2Entry.coverImage.large) || "",
    episodes: av2Entry.totalEpisodes || 0,
    episodesWatched: av2Entry.episodesWatched || 0,
    status,
    rating: av2Entry.rating || 0,
    notes: av2Entry.notes || "",
    genres: av2Entry.genres || [],
    averageScore: av2Entry.averageScore || 0,
    year: av2Entry.year || av2Entry.seasonYear || 0,
  };
}

function extractMeta(data) {
  if ("__meta" in data) {
    localStorage.setItem("ember_anivault_meta", JSON.stringify(data.__meta));
  }
  const { __meta, ...entries } = data;
  return entries;
}

function mergeEntries(importedEntries) {
  let added = 0, updated = 0, skipped = 0;
  for (const [idStr, imported] of Object.entries(importedEntries)) {
    if (!/^\d+$/.test(idStr)) continue;          // skip non-numeric keys
    const mapped = mapAniVaultEntry(idStr, imported);
    const existing = userData[idStr];
    if (!existing) {
      userData[idStr] = mapped;
      added++;
    } else {
      const merged = { ...existing, ...mapped };
      if (JSON.stringify(merged) !== JSON.stringify(existing)) {
        userData[idStr] = merged;
        updated++;
      } else {
        skipped++;
      }
    }
  }
  return { added, updated, skipped };
}

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
    // Must be a plain object (not array, null, string, etc.)
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      showToast("Import failed: expected an object", "error");
      return;
    }
    // Must have at least one numeric AniList ID key (excluding __meta)
    const hasNumericKeys = Object.keys(data).some(k => k !== "__meta" && /^\d+$/.test(k));
    if (!hasNumericKeys) {
      showToast("Import failed: no valid library entries found", "error");
      return;
    }
    // Extract __meta passthrough, get clean entries
    const entries = extractMeta(data);
    // Merge entries into userData (in memory)
    const { added, updated, skipped } = mergeEntries(entries);
    // Persist and refresh
    saveData();
    renderContent();
    showToast(`Imported: ${added} added, ${updated} updated, ${skipped} skipped.`, "success");
  };
  reader.readAsText(file);
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
    const raw = data.data.Page.media || [];
    seasonalData._hasMore = data.data.Page.pageInfo.hasNextPage;
    
    // Normalize to our standard anime object
    const normalized = raw.map(m => ({
      id: m.id,
      anilistId: m.id,
      title: m.title.romaji || m.title.english || "",
      titleEnglish: m.title.english || "",
      cover: m.coverImage.large || "",
      episodes: m.episodes || (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : 0),
      format: m.format || "",
      averageScore: m.averageScore || 0,
      description: m.description || "",
      genres: m.genres || [],
      year: m.seasonYear || 0,
      season: m.season || ""
    }));

    seasonalData.results = page === 1 ? normalized : [...seasonalData.results, ...normalized];
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
  results.forEach(r => {
    if (!r.episodes && r.nextAiringEpisode) {
      r.episodes = Math.max(1, r.nextAiringEpisode.episode - 1);
    }
  });
  return results;
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
    const results = raw.map(normalizeAnikotoItem);
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
  const heroBg = document.getElementById("heroBg");
  if (!heroBg || !anime) return;
  const img = anime.coverImage?.large;
  if (img) heroBg.style.backgroundImage = `url(${img})`;
}

/* ══ UTILITY ═══════════════════════════════════════════════════ */
function escapeHtml(s) {
  if (typeof s !== "string") return "";
  const d = document.createElement("div"); d.textContent = s; return d.innerHTML;
}
function getTitle(media) {
  return media.title?.english || media.title?.romaji || media.title?.native || "Unknown";
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

  // Sort: Prequel → Sequel → Side Story → Other
  const sorted = [...relations].sort((a, b) => {
    const pa = RELATION_PRIORITY[a.relationType] || 99;
    const pb = RELATION_PRIORITY[b.relationType] || 99;
    if (pa !== pb) return pa - pb;
    return (a.seasonYear || 0) - (b.seasonYear || 0);
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
        ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" loading="lazy">` : ""}
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

function afterRender() {
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
    const inp = document.getElementById("searchPageInput");
    if (inp) inp.focus();
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
}

function updateNavActive() {
  document.querySelectorAll(".nav__link, .mobile-tab").forEach(b => {
    b.classList.toggle("is-active", b.dataset.tab === currentTab);
  });
}

/* ══ HOME ══════════════════════════════════════════════════════ */
function renderHome() {
  const entries = getAnimeEntries();
  // Only "watching" entries appear here — see STATUS_ORDER for all valid statuses
  const watching = entries.filter(e => e.status === "watching").sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
  const completed = entries.filter(e => e.status === "completed").sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).slice(0, 20);
  return `
    ${watching.length ? renderContinueWatching(watching) : ""}
    <section class="section">
      <div class="section__head">
        <div class="section__title">Trending Now</div>
        <button class="btn btn--sm btn--glass" data-action="tab" data-tab="browse">View All</button>
      </div>
      <div class="media-row"><div class="media-row__viewport" data-row-track="trendingRow"><div class="media-row__track" id="browseCards">${browseData.results.slice(0, 10).map(renderCard).join("")}</div></div></div>
    </section>
    ${completed.length ? `<section class="section"><div class="section__head"><div class="section__title">Completed</div></div><div class="media-row"><div class="media-row__viewport" data-row-track="completedRow"><div class="media-row__track">${completed.slice(0, 10).map(e => renderEntryCard(e)).join("")}</div></div></div></section>` : ""}
  `;
}

function renderContinueWatching(entries) {
  return `<section class="section">
    <div class="section__head"><div class="section__title">Continue Watching</div></div>
    <div class="media-row"><div class="media-row__viewport" data-row-track="continueRow"><div class="media-row__track">${entries.map(renderContinueCard).join("")}</div></div></div>
  </section>`;
}

function renderContinueCard(entry) {
  const poster = entry.cover || "";
  const nextEp = (entry.episodesWatched || 0) + 1;
  const totalEp = entry.episodes || "?";
  return `<div class="continue-card" data-action="open-watch" data-id="${entry.id}" role="button" tabindex="0">
    <div class="continue-card__bg">${poster ? `<img src="${escapeHtml(poster)}" alt="" loading="lazy">` : ""}</div>
    <div class="continue-card__content">
      <div class="continue-card__poster">${poster ? `<img src="${escapeHtml(poster)}" alt="" loading="lazy">` : ""}</div>
      <div class="continue-card__info">
        <div class="continue-card__title">${escapeHtml(getDisplayTitle(entry))}</div>
        <div class="continue-card__ep">Ep ${nextEp} / ${totalEp}</div>
      </div>
      <div class="continue-card__play">&#9654;</div>
    </div>
  </div>`;
}

function getDisplayTitle(entry) {
  return entry.titleEnglish || entry.title || "Unknown";
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

  // Activity heatmap — last 365 days from sessionLog
  const now     = Date.now();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const dayMap  = {};
  entries.forEach(e => {
    (e.sessionLog || []).forEach(ts => {
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

  // Completion rate (started = watching + completed + dropped + paused)
  const started        = entries.filter(e => ['watching','completed','dropped','paused'].includes(e.status)).length;
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
      <div class="stop-ep-card__cover">${e.cover ? `<img src="${escapeHtml(e.cover)}" alt="">` : ''}</div>
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
  const img = anime.coverImage?.large || "";
  const meta = [anime.episodes ? `${anime.episodes} eps` : "", anime.averageScore ? `${anime.averageScore}%` : ""].filter(Boolean).join(" • ");
  return `<div class="anime-card" data-action="open-detail" data-id="${anime.id}" data-source="${escapeHtml(JSON.stringify(anime))}" role="button" tabindex="0">
    <div class="anime-card__media">${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">` : ""}</div>
    <div class="anime-card__body">
      <div class="anime-card__title">${escapeHtml(title)}</div>
      ${meta ? `<div class="anime-card__meta">${escapeHtml(meta)}</div>` : ""}
    </div>
  </div>`;
}

function renderEntryCard(entry) {
  const title = getDisplayTitle(entry);
  const img = entry.cover || "";
  const meta = entry.episodes ? `${entry.episodesWatched || 0}/${entry.episodes}` : "";
  const stars = entry.rating > 0 ? renderStarsInline(entry.rating) : "";
  return `<div class="anime-card" data-action="open-watch" data-id="${entry.id}" role="button" tabindex="0">
    <div class="anime-card__media">
      ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">` : ""}
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

  // Feature 1: compute groups and ensure currentEpisodeGroup is in sync
  const groups = getEpisodeGroups(totalEps);
  currentEpisodeGroup = getGroupForEpisode(currentEpisode, groups);

  return `<div class="watch-layout">
    <div class="watch-main">
      <div class="watch-player is-resolving">
        <iframe data-watch-iframe allow="autoplay; fullscreen" allowfullscreen></iframe>
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
      // Provider can't serve this episode — skip immediately
      cleanup();
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
  const img = anime.coverImage?.large || "";
  const existing = getEntry(anime.id);
  const entryRating = existing?.rating || 0;
  return `<div class="overlay-card" data-overlay-card>
    <div class="overlay-card__media">
      ${img ? `<img src="${escapeHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover">` : ""}
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
        ${!existing ? `<button class="btn btn--glass" data-action="add-to-library" data-id="${anime.id}">+ Library</button>` : ""}
        <button class="btn btn--glass" data-action="close-overlay">Close</button>
      </div>
    </div>
  </div>`;
}

function renderStatusPicker(id, currentStatus) {
  return `<div style="margin-top:var(--space-3)">
    <label style="font-size:12px;color:var(--text-2);display:block;margin-bottom:var(--space-1)">Status</label>
    <select class="status-select" data-action="set-status" data-entry="${id}" style="background:var(--surface-md);color:var(--text1);border:1px solid var(--glass-border);border-radius:8px;padding:6px 10px;font-size:14px;width:100%;cursor:pointer">
      ${STATUS_ORDER.map(s => `<option value="${s}" ${currentStatus === s ? 'selected' : ''}>${getStatusLabel(s)}</option>`).join('')}
    </select>
  </div>`;
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
function addToLibrary(anime) {
  const id = String(anime.id);
  if (userData[id]) { showToast("Already in library.", "error"); return; }
  // Use the episode count from the anime object. For ongoing series where
  // the API returns "?" or 0, store 0 here — openWatchView will attempt
  // to resolve the real count via preloadEpisodeUrls before rendering.
  userData[id] = {
    id: anime.id, anilistId: anime.id,
    title: getTitle(anime), titleEnglish: anime.title?.english || "",
    cover: anime.coverImage?.large || "",
    episodes: anime.episodes || 0, episodesWatched: 0,
    status: "plan-to-watch", lastWatched: 0,
    rating: 0, genres: anime.genres || [],
    averageScore: anime.averageScore || 0,
    notes: "", dateAdded: Date.now(),
  };
  saveData();
  showToast(`Added "${getTitle(anime)}" to library.`, "success");
  renderContent();
}

async function openWatchView(id) {
  const entry = getEntry(id);
  if (!entry) { showToast("Title not found.", "error"); return; }
  currentWatchId = id;
  currentProvider = 0;
  currentEpisodeGroup = 0;   // Feature 1: reset group to start for new title
  currentLanguage = entry.language || "sub";
  entry.status = "watching";
  entry.lastWatched = Date.now();
  saveData();

  // Resolve the real episode count before rendering. This updates
  // entry.episodes in-place if Anikoto or the AniList cache has a better value.
  await preloadEpisodeUrls(entry.anilistId);

  // Use the now-resolved episode count. Fall back to a large sentinel (9999)
  // for ongoing series where the count is still unknown — this ensures the
  // episode list and Next button are never artificially capped at 1.
  const knownTotal = entry.episodes || 9999;

  // Start on the next unwatched episode, clamped to the known total.
  currentEpisode = Math.min((entry.episodesWatched || 0) + 1, knownTotal);

  currentTab = "watch";
  const hero = document.getElementById("hero");
  const app = document.getElementById("app");
  if (hero) hero.style.display = "none";
  if (app) app.style.paddingTop = "calc(var(--nav-height) + 16px)";
  renderContent();
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
    let anime;
    try { anime = JSON.parse(target.dataset.source); } catch { anime = null; }
    if (!anime) {
      const id = target.dataset.id;
      const found = browseData.results.find(r => String(r.id) === id) || searchResults.find(r => String(r.id) === id) || anilistCache[id];
      if (found) anime = found;
    }
    if (!anime) { showToast("Could not load details.", "error"); return; }
    anilistCache[anime.id] = anime;
    showOverlay(renderDetailOverlay(anime));
    findAnikotoId(anime.id);
  }

  if (action === "close-overlay") { hideOverlay(); }

  if (action === "add-to-library") {
    const id = target.dataset.id;
    const anime = anilistCache[id] || browseData.results.find(r => String(r.id) === id) || searchResults.find(r => String(r.id) === id);
    if (anime) { addToLibrary(anime); hideOverlay(); findAnikotoId(anime.id); }
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
    currentWatchId = null;
    currentTab = "home";
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
      // Feature 1: targeted update — no full re-render needed for episode change
      paintEpisodeList();
      renderContent();
    }
  }

  if (action === "prev-episode") {
    if (currentEpisode > 1) {
      currentEpisode--;
      currentProvider = 0;
      paintEpisodeList();
      renderContent();
    }
  }

  if (action === "set-episode") {
    const ep = Number(target.dataset.ep);
    if (ep > 0) {
      currentEpisode = ep;
      currentProvider = 0;
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

  if (action === "switch-provider") {
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
  if (e.target.id === "globalSearch" || e.target.id === "searchPageInput") {
    const val = e.target.value;
    if (currentTab !== "search") {
      pendingSearchQuery = val;
      currentTab = "search";
      renderContent();
      document.getElementById("hero")?.style.setProperty("display", "none");
    } else {
      pendingSearchQuery = val;
    }
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
    const overlay = document.getElementById("overlay");
    if (overlay?.style.display === "flex") { hideOverlay(); return; }
    const modal = document.getElementById("shortcutsModal");
    if (modal?.classList.contains("is-open")) { toggleShortcuts(false); return; }
  }

  if (e.key === "?" && !e.target.closest("input,textarea")) {
    e.preventDefault();
    toggleShortcuts();
  }

  if (e.key === "/" && !e.target.closest("input,textarea")) {
    e.preventDefault();
    const search = document.getElementById("globalSearch");
    if (search) search.focus();
  }

  if (e.key === "1" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "home"; renderContent(); updateNavActive(); document.getElementById("hero")?.style.setProperty("display", "flex"); }
  if (e.key === "2" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "browse"; renderContent(); if (!browseData.results.length && !browseData.loading && !browseData.error) loadBrowse(browseData.mode); document.getElementById("hero")?.style.setProperty("display", "none"); }
  if (e.key === "3" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "seasonal"; renderContent(); if (!seasonalData.results.length && !seasonalData.loading && !seasonalData.error) loadSeasonal(seasonalData.season || getCurrentSeason(), seasonalData.year || new Date().getFullYear()); document.getElementById("hero")?.style.setProperty("display", "none"); }
  if (e.key === "4" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "library"; renderContent(); document.getElementById("hero")?.style.setProperty("display", "none"); }

  if (e.key === "w" && currentWatchId && !e.target.closest("input,textarea")) {
    e.preventDefault();
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
}, { passive: true });

/* ══ MOBILE SEARCH ════════════════════════════════════════════ */
document.getElementById("mobileSearchBtn")?.addEventListener("click", () => {
  const search = document.getElementById("navSearch");
  search?.classList.toggle("is-open");
  if (search?.classList.contains("is-open")) {
    const inp = search.querySelector(".search-input");
    if (inp) setTimeout(() => inp.focus(), 100);
  }
});

/* ══ INIT ═══════════════════════════════════════════════════════ */
loadData();
renderContent();
if (location.protocol === "file:") {
  showToast("Open via HTTP server (node server.js) for API access", "error");
}
if (!browseData.results.length) loadBrowse("trending");
initAnikotoCache();
