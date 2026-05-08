/* ══ STATE ════════════════════════════════════════════════════ */
let currentTab = "home";
let userData = {};
let anilistCache = {};
let browseData = { results: [], loading: false, error: null, page: 0, mode: "trending" };
let seasonalData = { results: [], loading: false, error: null, page: 0, season: null, year: null };
let currentWatchId = null;
let currentEpisode = 1;
const ANILIST_API = "https://graphql.anilist.co";

/* ══ PROVIDERS ════════════════════════════════════════════════ */
const episodeEmbedCache = {};
const anikotoIdCache = {};

const STREAM_PROVIDERS = [
  { name: "MegaPlay", active: true, idType: "anilist",
    buildUrl: (entry, ep, lang) => {
      const cached = episodeEmbedCache[`${entry.anilistId}-${ep}-${lang}`];
      if (cached) return cached;
      return `https://megaplay.buzz/stream/ani/${entry.anilistId}/${ep}/${lang}`;
    },
    notes: "Primary provider — resolves via Anikoto API for verified embed URLs" },
  { name: "Cinetaro", active: true, idType: "anilist",
    buildUrl: (entry, ep, lang) => `https://api.cinetaro.buzz/embed/anime/${entry.anilistId}/1/${ep}?type=${lang}`,
    notes: "Fallback provider" },
  { name: "VidPlus", active: true, idType: "anilist",
    buildUrl: (entry, ep, lang) => `https://player.vidplus.to/embed/anime/${entry.anilistId}/${ep}?dub=${lang === "dub"}&autoplay=true`,
    notes: "Fallback provider" },
  { name: "VidNest", active: true, idType: "anilist",
    buildUrl: (entry, ep, lang) => `https://vidnest.fun/anime/${entry.anilistId}/${ep}/${lang}`,
    notes: "Fallback provider" },
];
let currentProvider = 0;
let streamFallbackTimer = null;

/* ══ ANIKOTO API ═══════════════════════════════════════════════ */
function normalizeAnikotoItem(item) {
  const aniId = Number(item.ani_id) || 0;
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
    episodes: Number(item.episodes) || 0,
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
    const res = await fetch('https://anikotoapi.site/recent-anime?page=1&per_page=50');
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

async function preloadEpisodeUrls(anilistId) {
  const anikotoId = anikotoIdCache[String(anilistId)];
  if (!anikotoId) return;
  try {
    const res = await fetch(`https://anikotoapi.site/series/${anikotoId}`);
    const data = await res.json();
    if (data.ok && data.data?.episodes) {
      data.data.episodes.forEach(ep => {
        if (ep.embed_url?.sub) episodeEmbedCache[`${anilistId}-${ep.number}-sub`] = ep.embed_url.sub;
        if (ep.embed_url?.dub) episodeEmbedCache[`${anilistId}-${ep.number}-dub`] = ep.embed_url.dub;
      });
      const currentKey = `${anilistId}-${currentEpisode}-${getEntry(currentWatchId)?.language || "sub"}`;
      if (episodeEmbedCache[currentKey]) {
        const iframe = document.querySelector("[data-watch-iframe]");
        if (iframe && iframe.src !== episodeEmbedCache[currentKey]) {
          iframe.src = episodeEmbedCache[currentKey];
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
function exportLibrary() {
  const data = JSON.stringify(userData, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ember-library-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Library exported.", "success");
}

function importLibrary(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== "object" || data === null) throw new Error("Invalid format");
      const entries = Object.values(data).filter(v => v && typeof v === "object");
      if (entries.length === 0) throw new Error("No entries found");
      let count = 0;
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === "object" && val.id) {
          if (!userData[key]) { userData[key] = val; count++; }
        }
      }
      saveData(); renderContent();
      showToast(`Imported ${count} titles.`, "success");
    } catch (err) {
      showToast(`Import failed: ${err.message}`, "error");
    }
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
    if (page === 1) seasonalData.results = [];
    const res = await fetch(`https://anikotoapi.site/recent-anime?page=${page}&per_page=50`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || 'API error');
    const raw = data.data || [];
    const filtered = raw.filter(item => {
      const s = (item.season || '').toUpperCase();
      return s === season && String(item.year) === String(year);
    });
    seasonalData._hasMore = raw.length >= 50;
    const normalized = filtered.map(normalizeAnikotoItem);
    seasonalData.results = page === 1 ? normalized : [...seasonalData.results, ...normalized];
    seasonalData.page = page;
  } catch (e) { seasonalData.error = e.message; console.error("loadSeasonal:", e); }
  seasonalData.loading = false; renderContent();
}

/* ══ ANILIST API ═══════════════════════════════════════════════ */
const SEARCH_QUERY = `query($search:String,$page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(search:$search,type:ANIME,sort:POPULARITY_DESC){id idMal title{romaji english native}coverImage{large}episodes duration status averageScore genres season year format description startDate{year month day}}}}`;
const TRENDING_QUERY = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(type:ANIME,sort:TRENDING_DESC){id idMal title{romaji english native}coverImage{large}episodes duration status averageScore genres season year format description startDate{year month day}}}}`;
const POPULAR_QUERY = `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(type:ANIME,sort:POPULARITY_DESC){id idMal title{romaji english native}coverImage{large}episodes duration status averageScore genres season year format description startDate{year month day}}}}`;
const SEASONAL_QUERY = `query($page:Int,$perPage:Int,$season:MediaSeason,$year:Int){Page(page:$page,perPage:$perPage){media(type:ANIME,season:$season,seasonYear:$year,sort:POPULARITY_DESC){id idMal title{romaji english native}coverImage{large}episodes duration status averageScore genres season year format description startDate{year month day}}}}`;

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
  return anilistFetch(SEARCH_QUERY, { search: query, page: 1, perPage: 30 });
}

async function loadBrowse(mode, page = 1) {
  browseData.loading = true; browseData.error = null; browseData._hasMore = false; renderContent();
  try {
    const res = await fetch(`https://anikotoapi.site/recent-anime?page=${page}&per_page=50`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || 'API error');
    const raw = data.data || [];
    browseData._hasMore = raw.length >= 50;
    const results = raw.map(normalizeAnikotoItem);
    if (page === 1) browseData.results = results;
    else browseData.results = [...browseData.results, ...results];
    browseData.page = page;
    browseData.mode = mode;
  } catch (e) { browseData.error = e.message; console.error("loadBrowse:", e); }
  browseData.loading = false; renderContent();
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
  const map = { "watching": "Watching", "completed": "Completed", "plan-to-watch": "Plan to Watch", "queued": "Queued", "dropped": "Dropped", "paused": "Paused" };
  return map[s] || s || "Add to List";
}

/* ══ RENDER ════════════════════════════════════════════════════ */
function renderContent() {
  const content = document.getElementById("content");
  if (!content) return;
  switch (currentTab) {
    case "home": content.innerHTML = renderHome(); break;
    case "browse": content.innerHTML = renderBrowse(); break;
    case "seasonal": content.innerHTML = renderSeasonal(); break;
    case "search": content.innerHTML = renderSearch(); break;
    case "library": content.innerHTML = renderLibrary(); break;
    case "watch": content.innerHTML = renderWatch(); break;
    default: content.innerHTML = renderHome();
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
  if (currentTab === "browse" && !browseData.results.length && !browseData.loading) loadBrowse("trending");
  if (currentTab === "seasonal" && !seasonalData.results.length && !seasonalData.loading) {
    loadSeasonal(seasonalData.season || getCurrentSeason(), seasonalData.year || new Date().getFullYear());
  }
  if (currentTab === "search") {
    const inp = document.getElementById("searchPageInput");
    if (inp) inp.focus();
  }
  if (currentWatchId && currentTab === "watch") setupWatchPlayer();
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
  const watching = entries.filter(e => e.status === "watching").sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
  const completed = entries.filter(e => e.status === "completed").sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).slice(0, 20);
  const stats = entries.length ? getLibraryStats() : null;
  return `
    ${watching.length ? renderContinueWatching(watching) : ""}
    ${stats ? renderStatsDashboard(stats) : ""}
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
function getLibraryStats() {
  const entries = getAnimeEntries();
  return entries.reduce((s, e) => {
    s.total++; s.eps += e.episodesWatched || 0;
    if (e.status === "watching") s.watching++;
    if (e.status === "completed") s.completed++;
    if (e.rating > 0) { s.rated++; s.ratingSum += e.rating; }
    return s;
  }, { total: 0, watching: 0, completed: 0, eps: 0, rated: 0, ratingSum: 0 });
}

function renderStatsDashboard(stats) {
  const avg = stats.rated > 0 ? (stats.ratingSum / stats.rated).toFixed(1) : "--";
  const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  return `<section class="section">
    <div class="section__head"><div class="section__title">Library at a Glance</div></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card__value">${stats.total}</div><div class="stat-card__label">Total</div></div>
      <div class="stat-card stat-card--accent"><div class="stat-card__value">${stats.watching}</div><div class="stat-card__label">Watching</div></div>
      <div class="stat-card stat-card--green"><div class="stat-card__value">${stats.completed}</div><div class="stat-card__label">Completed</div></div>
      <div class="stat-card"><div class="stat-card__value">${stats.eps}</div><div class="stat-card__label">Episodes</div></div>
      <div class="stat-card"><div class="stat-card__value">${avg}</div><div class="stat-card__label">Avg Rating</div></div>
      <div class="stat-card"><div class="stat-card__value">${rate}%</div><div class="stat-card__label">Completion</div></div>
    </div>
  </section>`;
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
    <div class="anime-card__media">${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">` : ""}</div>
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
  return `<div class="search-page section">
    <input type="search" id="searchPageInput" class="search-input--page" placeholder="Search anime..." autocomplete="off" aria-label="Search">
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
      if (data.length === 0) { results.innerHTML = `<div class="empty-state"><div class="empty-state__title">No results for "${escapeHtml(value)}"</div></div>`; return; }
      results.innerHTML = `<div class="grid">${data.map(renderCard).join("")}</div>`;
    } catch (e) { results.innerHTML = `<div class="empty-state"><div class="empty-state__title">Search failed</div><div class="empty-state__text">${escapeHtml(e.message)}</div></div>`; }
  }, 400);
}

/* ══ LIBRARY ════════════════════════════════════════════════════ */
function renderLibrary() {
  const entries = getAnimeEntries();
  const statuses = ["all", "watching", "completed", "plan-to-watch", "queued", "dropped"];
  if (entries.length === 0) return `<div class="library-empty"><div class="empty-state__icon">&#128218;</div><div class="empty-state__title">Your library is empty</div><div class="empty-state__text">Browse anime and add them to your library to get started.</div><button class="btn btn--primary" style="margin-top:var(--space-3)" data-action="tab" data-tab="browse">Browse Anime</button></div>`;
  return `<div class="section">
    <div class="library-controls">
      <div class="chip-group" id="libraryStatusFilters">
        ${statuses.map(s => `<button class="chip ${s === "all" ? "is-active" : ""}" data-action="filter-library" data-status="${s}">${s === "all" ? "All" : getStatusLabel(s)}</button>`).join("")}
      </div>
      <div style="display:flex;gap:var(--space-2);margin-left:auto">
        <button class="btn btn--sm btn--glass" data-action="export-library">Export</button>
        <button class="btn btn--sm btn--glass" data-action="import-library">Import</button>
      </div>
    </div>
    <div class="grid" id="libraryGrid">${entries.map(renderEntryCard).join("")}</div>
  </div>`;
}

/* ══ WATCH ══════════════════════════════════════════════════════ */
function renderWatch() {
  const entry = getEntry(currentWatchId);
  if (!entry) return `<div class="empty-state"><div class="empty-state__title">Title not found</div></div>`;
  const totalEps = entry.episodes || 1;
  const url = buildStreamUrl(entry, currentEpisode, entry.language || "sub", currentProvider);
  const provider = STREAM_PROVIDERS[currentProvider];
  return `<div class="section">
    <div class="watch-layout">
      <div>
        <div class="watch-player"><iframe data-watch-iframe src="${escapeHtml(url)}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
        <div class="watch-meta">
          <div class="watch-meta__title">${escapeHtml(getDisplayTitle(entry))}</div>
          <div class="watch-meta__info">Episode ${currentEpisode} of ${totalEps}</div>
        </div>
        <div class="watch-actions">
          <button class="btn btn--sm btn--glass" data-action="prev-episode" ${currentEpisode <= 1 ? "disabled" : ""}>&#9664; Prev</button>
          <button class="btn btn--sm btn--glass" data-action="next-episode" ${currentEpisode >= totalEps ? "disabled" : ""}>Next &#9654;</button>
          <button class="btn btn--sm btn--amber" data-action="switch-provider">Provider: ${provider.name}</button>
          <button class="btn btn--sm btn--glass" data-action="mark-watched" data-id="${entry.id}">&#10003; Mark Watched</button>
          <button class="btn btn--sm btn--glass" data-action="close-watch">&times; Close</button>
        </div>
      </div>
      <div class="watch-sidebar" id="episodeSidebar">
        <div class="watch-sidebar__title">Episodes</div>
        ${renderEpisodeList(entry, totalEps)}
      </div>
    </div>
  </div>`;
}

function renderEpisodeList(entry, total) {
  let html = "";
  for (let i = 1; i <= total; i++) {
    const isCurrent = i === currentEpisode;
    const watched = i <= (entry.episodesWatched || 0);
    html += `<div class="ep-row ${isCurrent ? "is-current" : ""} ${watched ? "is-watched" : ""}" data-action="set-episode" data-ep="${i}" role="button" tabindex="0">
      <span class="ep-num">${watched ? "&#10003; " : ""}${i}</span>
      <span class="ep-info">Episode ${i}</span>
    </div>`;
  }
  return html;
}

function buildStreamUrl(entry, ep, lang, idx) {
  if (!entry?.anilistId) return "";
  const p = STREAM_PROVIDERS[idx] || STREAM_PROVIDERS[0];
  return p.buildUrl(entry, ep, lang);
}

function setupWatchPlayer() {
  clearTimeout(streamFallbackTimer);
  const iframe = document.querySelector("[data-watch-iframe]");
  if (!iframe) return;
  const entry = getEntry(currentWatchId);
  if (entry) preloadEpisodeUrls(entry.anilistId);
  const knownOrigins = ["megaplay.buzz", "cinetaro.buzz", "vidplus.to", "vidnest.fun"];
  const idxAtStart = currentProvider;
  const onMsg = (e) => {
    if (!knownOrigins.some(o => e.origin.includes(o))) return;
    clearTimeout(streamFallbackTimer);
    window.removeEventListener("message", onMsg);
  };
  window.addEventListener("message", onMsg);
  streamFallbackTimer = setTimeout(() => {
    window.removeEventListener("message", onMsg);
    if (currentProvider !== idxAtStart) return;
    const next = idxAtStart + 1;
    if (next < STREAM_PROVIDERS.length) {
      currentProvider = next;
      renderContent();
      showToast(`${STREAM_PROVIDERS[idxAtStart].name} timed out — trying ${STREAM_PROVIDERS[next].name}…`, "error");
    } else {
      showToast("All providers exhausted. Try again later.", "error");
    }
  }, 30000);
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
    <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4)">
      ${img ? `<img src="${escapeHtml(img)}" style="width:100px;border-radius:var(--radius-sm);aspect-ratio:2/3;object-fit:cover" alt="">` : ""}
      <div style="flex:1">
        <div class="overlay-card__title">${escapeHtml(title)}</div>
        <div style="font-size:var(--text-sm);color:rgba(255,255,255,0.5);margin-bottom:var(--space-2)">
          ${anime.episodes ? `${anime.episodes} eps` : ""}${anime.averageScore ? ` • ${anime.averageScore}%` : ""}${anime.year ? ` • ${anime.year}` : ""}
        </div>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
          ${(anime.genres || []).slice(0, 3).map(g => `<span style="padding:2px 10px;border-radius:12px;background:var(--glass-bg);border:1px solid var(--glass-border);font-size:var(--text-xs)">${escapeHtml(g)}</span>`).join("")}
        </div>
      </div>
    </div>
    ${anime.description ? `<div class="overlay-card__text">${truncate(escapeHtml(anime.description.replace(/<[^>]*>/g, "")), 300)}</div>` : ""}
    ${existing ? renderRatingSection(anime.id, entryRating) : ""}
    ${existing ? renderNotesSection(anime.id, existing.notes || "") : ""}
    <div class="overlay-card__actions" style="margin-top:var(--space-3)">
      ${existing ? `<button class="btn btn--primary" data-action="open-watch" data-id="${existing.id}">&#9654; Watch</button>` : `<button class="btn btn--primary" data-action="add-to-library" data-id="${anime.id}">+ Add to Library</button>`}
      <button class="btn btn--glass" data-action="close-overlay">Close</button>
    </div>
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
  const anime = anilistCache[id] || browseData.results.find(r => String(r.id) === String(id));
  if (anime) showOverlay(renderDetailOverlay(anime));
  if (currentTab === "library") renderContent();
}

/* ══ ACTIONS ══════════════════════════════════════════════════ */
function addToLibrary(anime) {
  const id = String(anime.id);
  if (userData[id]) { showToast("Already in library.", "error"); return; }
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

function openWatchView(id) {
  const entry = getEntry(id);
  if (!entry) { showToast("Title not found.", "error"); return; }
  currentWatchId = id;
  currentEpisode = Math.min((entry.episodesWatched || 0) + 1, entry.episodes || 1);
  currentProvider = 0;
  entry.status = "watching";
  entry.lastWatched = Date.now();
  saveData();
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
  const total = entry.episodes || 1;
  entry.episodesWatched = Math.min((entry.episodesWatched || 0) + 1, total);
  entry.lastWatched = Date.now();
  if (entry.episodesWatched >= total && entry.status !== "completed") {
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
    if (currentTab === "browse" && !browseData.results.length && !browseData.loading) loadBrowse(browseData.mode);
    if (currentTab === "seasonal" && !seasonalData.results.length && !seasonalData.loading) {
      loadSeasonal(seasonalData.season || getCurrentSeason(), seasonalData.year || new Date().getFullYear());
    }
    if (currentTab === "search") { const inp = document.getElementById("searchPageInput"); if (inp) inp.focus(); }
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
      const found = browseData.results.find(r => String(r.id) === id) || anilistCache[id];
      if (found) anime = found;
    }
    if (!anime) { showToast("Could not load details.", "error"); return; }
    anilistCache[anime.id] = anime;
    showOverlay(renderDetailOverlay(anime));
  }

  if (action === "close-overlay") { hideOverlay(); }

  if (action === "add-to-library") {
    const id = target.dataset.id;
    const anime = anilistCache[id] || browseData.results.find(r => String(r.id) === id);
    if (anime) { addToLibrary(anime); hideOverlay(); }
  }

  if (action === "open-watch") {
    const id = Number(target.dataset.id);
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
    const total = entry.episodes || 1;
    if (currentEpisode < total) { currentEpisode++; renderContent(); }
  }

  if (action === "prev-episode") {
    if (currentEpisode > 1) { currentEpisode--; renderContent(); }
  }

  if (action === "set-episode") {
    const ep = Number(target.dataset.ep);
    if (ep > 0) { currentEpisode = ep; renderContent(); }
  }

  if (action === "switch-provider") {
    currentProvider = (currentProvider + 1) % STREAM_PROVIDERS.length;
    renderContent();
    showToast(`Switched to ${STREAM_PROVIDERS[currentProvider].name}`, "success");
  }

  if (action === "mark-watched") {
    const id = Number(target.dataset.id);
    if (id) markEpisodeWatched(id);
  }

  if (action === "filter-library") {
    document.querySelectorAll("[data-action='filter-library']").forEach(b => b.classList.remove("is-active"));
    target.classList.add("is-active");
    const status = target.dataset.status;
    const grid = document.getElementById("libraryGrid");
    if (!grid) return;
    const entries = getAnimeEntries();
    const filtered = status === "all" ? entries : entries.filter(e => e.status === status);
    grid.innerHTML = filtered.map(renderEntryCard).join("");
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
    if (currentTab !== "search") {
      currentTab = "search";
      renderContent();
      document.getElementById("hero")?.style.setProperty("display", "none");
      const inp = document.getElementById("searchPageInput");
      if (inp) { inp.value = e.target.value; inp.focus(); }
    }
    handleSearchInput(e.target.value);
  }
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
  if (e.key === "2" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "browse"; renderContent(); if (!browseData.results.length && !browseData.loading) loadBrowse(browseData.mode); document.getElementById("hero")?.style.setProperty("display", "none"); }
  if (e.key === "3" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "seasonal"; renderContent(); if (!seasonalData.results.length && !seasonalData.loading) loadSeasonal(seasonalData.season || getCurrentSeason(), seasonalData.year || new Date().getFullYear()); document.getElementById("hero")?.style.setProperty("display", "none"); }
  if (e.key === "4" && !e.target.closest("input,textarea")) { e.preventDefault(); currentTab = "library"; renderContent(); document.getElementById("hero")?.style.setProperty("display", "none"); }

  if (e.key === "w" && currentWatchId && !e.target.closest("input,textarea")) {
    e.preventDefault();
    currentProvider = (currentProvider + 1) % STREAM_PROVIDERS.length;
    renderContent();
    showToast(`Switched to ${STREAM_PROVIDERS[currentProvider].name}`, "success");
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
  showToast("Open via HTTP server (npx serve .) for API access", "error");
}
if (!browseData.results.length) loadBrowse("trending");
initAnikotoCache();
