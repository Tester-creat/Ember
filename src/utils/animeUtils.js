
export function _normTitle(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeTitleCtx(titleOrEntry) {
  if (titleOrEntry && typeof titleOrEntry === "object" && !Array.isArray(titleOrEntry)) {
    return titleOrEntry;
  }
  const s = titleOrEntry == null ? "" : String(titleOrEntry);
  return { title: s, titleEnglish: s };
}

export function collectTitleNeedles(ctx, anilistCache = {}) {
  const needles = new Set();
  const add = (raw) => {
    const n = _normTitle(raw);
    if (n.length >= 2) needles.add(n);
  };
  const addVariants = (raw) => {
    const n = _normTitle(raw);
    if (!n) return;
    add(n);
    add(n.replace(/\bseason\s+\d+\b/g, ""));
    add(n.replace(/\bpart\s+\d+\b/g, ""));
    add(n.replace(/\b\d+(st|nd|rd|th)\s+season\b/g, ""));
    add(n.replace(/\b(tv|movie|ova|ona|special)\b/g, ""));
  };
  if (!ctx) return [];
  if (typeof ctx.title === "string") addVariants(ctx.title);
  if (typeof ctx.titleEnglish === "string") addVariants(ctx.titleEnglish);
  if (ctx.title && typeof ctx.title === "object") {
    addVariants(ctx.title.romaji);
    addVariants(ctx.title.english);
    addVariants(ctx.title.native);
  }
  if (Array.isArray(ctx.synonyms)) ctx.synonyms.forEach(addVariants);
  const aid = String(ctx.anilistId || ctx.id || "");
  if (aid) {
    const c = anilistCache[aid];
    if (c) {
      add(getTitle(c));
      add(c.titleEnglish);
      if (c.title?.romaji) add(c.title.romaji);
      if (c.title?.english) add(c.title.english);
      if (c.title?.native) add(c.title.native);
      if (Array.isArray(c.synonyms)) c.synonyms.forEach(addVariants);
    }
  }
  return [...needles];
}

export function scoreAnikotoTitleMatch(item, needles) {
  const hay = _normTitle(
    [item.title, item.alternative, item.native, item.titles || ""].filter(Boolean).join(" ")
  );
  let best = 0;
  for (const n of needles) {
    if (n.length < 4) continue;
    if (hay === n) return 100;
    if (hay.includes(n)) best = Math.max(best, 85);
    else {
      const nt = _normTitle(item.title || "");
      const na = _normTitle(item.alternative || "");
      if (nt.includes(n) || na.includes(n)) best = Math.max(best, 72);
    }
  }
  return best;
}

export function pickAnikotoEpisode(episodes, epNum) {
  if (!episodes?.length) return null;
  const n = Number(epNum);
  let ep = episodes.find(e => Number(e.number) === n);
  if (ep) return ep;
  ep = episodes.find(e => String(e.number) === String(epNum));
  if (ep) return ep;
  const sorted = [...episodes].sort((a, b) => Number(a.number) - Number(b.number));
  if (n >= 1 && n <= sorted.length && Number(sorted[n - 1]?.number) === n) {
    return sorted[n - 1];
  }
  return null;
}

export function normalizeAnime(m) {
  if (!m) return null;
  const titleIsObj = typeof m.title === "object" && m.title !== null;
  const titleObj = titleIsObj ? m.title : {};
  const coverObj = m.coverImage || m.cover || {};
  const episodes = m.episodes || (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : 0) || 0;

  let avgScore = m.averageScore || 0;
  if (!avgScore && m.score && m.score !== "?") {
    avgScore = Math.round(parseFloat(m.score) * 10);
  }

  let genres = m.genres || [];
  if (!genres.length && m.terms_by_type?.genre) {
    genres = m.terms_by_type.genre;
  }

  let format = m.format || "";
  if (!format && m.terms_by_type?.type?.length) {
    format = m.terms_by_type.type[0];
  }

  const anikotoTitle = !titleIsObj ? (m.alternative || m.title) : "";
  const anikotoEnglish = !titleIsObj ? (m.title || "") : "";

  return {
    id:              m.id || m.anilistId,
    anilistId:       m.id || m.anilistId,
    idMal:           m.idMal || m.id_mal || 0,
    title:           titleObj.romaji || titleObj.english || anikotoTitle || m.title || "",
    titleEnglish:    titleObj.english || m.titleEnglish || anikotoEnglish || "",
    cover:           coverObj.extraLarge || coverObj.large || coverObj.medium || m.cover || m.poster || "",
    banner:          m.bannerImage || m.banner || "",
    episodes:        Number(episodes) || 0,
    format:          format,
    averageScore:    avgScore,
    description:     m.description || "",
    genres:          genres,
    synonyms:        Array.isArray(m.synonyms) ? m.synonyms : [],
    year:            m.seasonYear || m.year || (m.startDate ? m.startDate.year : 0) || 0,
    season:          m.season || "",
    status:          m.status || ""
  };
}

export function getTitle(media) {
  if (!media) return "Unknown Title";
  return media.titleEnglish || media.title?.english || media.title?.romaji || media.title || media.title?.native || "Unknown Title";
}

export function getDisplayTitle(entry) {
  return getTitle(entry);
}

export function getCoverSrc(anime) {
  if (!anime) return "";
  return anime.cover || anime.coverImage?.large || anime.coverImage?.medium || anime.poster || "";
}

export function getPlainDescription(value) {
  if (!value) return "";
  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + "..." : s || "";
}

export function getStatusLabel(s) {
  const map = { 
    "watching": "Watching", 
    "queued": "Up Next",
    "plan-to-watch": "Plan to Watch", 
    "rewatching": "Rewatching",
    "paused": "Paused", 
    "favorites": "Favorites",
    "completed": "Completed", 
    "archived": "Archived",
    "dropped": "Dropped", 
    "untracked": "Untracked" 
  };
  return map[s] || s || "Add to List";
}

export const STATUS_COLOR_MAP = {
  watching: '#A78BFA',
  queued: '#2DD4BF',
  'plan-to-watch': '#3080FF',
  rewatching: '#E879F9',
  paused: '#F99C00',
  favorites: '#FACC15',
  completed: '#00C758',
  archived: '#94A3B8',
  dropped: '#FB2C36',
  untracked: '#737373',
};

export function getStatusColor(status) {
  return STATUS_COLOR_MAP[status] || '#DFDFDF';
}

export function getStatusTransitionPatch(entry, nextStatus) {
  const wasCompleted = entry?.status === 'completed';
  const isCompleted = nextStatus === 'completed';

  return {
    status: nextStatus,
    completedAt: isCompleted ? entry?.completedAt || Date.now() : wasCompleted ? 0 : entry?.completedAt || 0,
  };
}

export const STATUS_ORDER = [
  "watching", "queued", "plan-to-watch", "rewatching",
  "paused", "favorites", "completed", "archived", "dropped", "untracked"
];

export const LIBRARY_FILTER_STATUSES = [
  "all", "watching", "queued", "plan-to-watch", "rewatching",
  "paused", "favorites", "completed", "archived", "dropped", "untracked"
];

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

export function parseFranchise(title) {
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

export const FORMAT_SORT_RANK = {
  TV: 0, TV_SHORT: 1, MOVIE: 2, OVA: 3, ONA: 4, SPECIAL: 5, MUSIC: 9,
};

export function formatSortRank(entry) {
  const f = String(entry.format || "").toUpperCase().replace(/\s+/g, "_");
  if (Object.prototype.hasOwnProperty.call(FORMAT_SORT_RANK, f)) return FORMAT_SORT_RANK[f];
  return 6;
}

export function sortCompletedEntries(entries) {
  const parsed = entries.map(e => {
    const t = getTitle(e) || "";
    const info = parseFranchise(t);
    return { entry: e, title: t, ...info };
  });

  parsed.sort((a, b) => {
    const fa = a.franchise || a.title;
    const fb = b.franchise || b.title;
    const cmp = fa.localeCompare(fb);
    if (cmp !== 0) return cmp;

    const ya = a.entry.year || 0;
    const yb = b.entry.year || 0;
    if (ya !== yb && ya > 0 && yb > 0) return ya - yb;

    if (a.season !== b.season) return (a.season || 0) - (b.season || 0);

    const ra = formatSortRank(a.entry);
    const rb = formatSortRank(b.entry);
    if (ra !== rb) return ra - rb;

    const ca = a.entry.completedAt || 0;
    const cb = b.entry.completedAt || 0;
    if (ca !== cb) return ca - cb;

    return String(a.entry.id).localeCompare(String(b.entry.id));
  });

  return parsed.map(p => p.entry);
}

// kebab-case a title for slug-based embed providers (e.g. "One Piece" -> "one-piece").
export function slugifyTitle(s) {
  return _normTitle(s).replace(/\s+/g, "-");
}

/**
 * Ranked slug guesses for a library entry, used by slug-based providers that
 * address episodes as `{slug}-episode-{n}`. Tries romaji/english/synonyms, each
 * with and without the release year (some providers append it, some don't).
 */
export function buildSlugCandidates(entry) {
  const titles = [];
  if (entry?.title) titles.push(entry.title);
  if (entry?.titleEnglish) titles.push(entry.titleEnglish);
  if (Array.isArray(entry?.synonyms)) titles.push(...entry.synonyms);

  const year = entry?.year || 0;
  const out = [];
  const seen = new Set();
  const add = (slug) => {
    if (slug && slug.length >= 2 && !seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  };

  for (const title of titles) {
    const base = slugifyTitle(title);
    add(base);
    if (year) add(`${base}-${year}`);
  }
  return out;
}

export function getCurrentSeason() {
  const m = new Date().getMonth();
  if (m < 3) return "WINTER";
  if (m < 6) return "SPRING";
  if (m < 9) return "SUMMER";
  return "FALL";
}

export function escapeHtml(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
