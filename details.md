# Ember — Project Details

## Overview

Ember is a browser-based anime streaming and tracking platform. Originally forked from AniVault, it was redesigned to use **Anikoto API** as the primary anime data source (replacing AniList for browsing/seasonal) while keeping **AniList GraphQL** as a fallback for search only. The UI is inspired by ShuttleTV.su — a transparent glass design with a floating centered navbar.

**No backend, no accounts, no servers.** All user data is stored in `localStorage`.

---

## Architecture

- **Vanilla JS** — no frameworks, no build step, no SPA router
- **CSS** — custom properties, glass-morphism via `backdrop-filter`, responsive
- **HTML** — single `index.html` with all UI in the DOM
- **Testing** — Vitest + fast-check (property-based testing), 73 tests across 8 files
- **PWA** — Service worker (`sw.js`) caches static assets for offline access

### File Structure

```
anivalt/
  index.html         — Main HTML shell (navbar, hero, content, overlay, footer, mobile bar)
  styles.css         — All CSS (675 lines), no framework
  app.js             — All application logic (1022 lines), no modules
  sw.js              — Service worker with cache name "ember-v1-cache"
  manifest.json      — PWA manifest
  README.md          — Brief intro
  details.md         — This file
  package.json       — vitest + fast-check dev deps
  tests/
    setup.js         — Verifies fast-check import
    generators.js    — fast-check arbitraries for property tests
    p1_library_roundtrip.test.js — JSON serialization preserves entry fields
    p3_provider_schema.test.js   — Provider objects have correct schema
    p4_provider_url_validity.test.js — Provider URLs start with https://
    p5_provider_fallback.test.js  — Provider cycling wraps correctly
    p6_search_debounce.test.js    — Debounced search fires once per burst
    p7_status_coercion.test.js    — Status values match known set
    p8_text_contrast.test.js      — WCAG AA contrast compliance
    providers.test.js  — Provider URL generation tests
```

---

## Data Sources

### 1. Anikoto API (Primary — Browse, Seasonal, Trending)

**Base URL:** `https://anikotoapi.site`

**Endpoints used:**

| Endpoint | Purpose |
|---|---|
| `GET /recent-anime?page={n}&per_page=50` | Get paginated list of recently updated anime |
| `GET /series/{anikotoId}` | Get episode list with embed URLs |

**`/recent-anime` response shape** (per item):
```json
{
  "id": 8730,                    // Anikoto internal ID
  "title": "English Title",      // English title
  "alternative": "Romaji Title", // Romaji/alternative title
  "native": "Native Title",      // Native script title
  "slug": "url-slug",
  "poster": "https://...",       // Poster image URL
  "description": "...",
  "season": "Spring",            // "Spring", "Summer", "Fall", "Winter"
  "year": 2026,                  // Release year
  "status": "Currently Airing",  // or "Finished Airing", etc.
  "score": "8.59",               // Score as string like "8.59" or "?"
  "episodes": "12",              // Episode count as string
  "ani_id": "187869",            // AniList ID (string)
  "mal_id": "61186",             // MyAnimeList ID (string)
  "duration": "?min",
  "rating": "?",                 // Age rating, not score
  "terms_by_type": {
    "genre": ["Action", "Comedy"],
    "type": ["TV"],
    "studios": ["Studio Name"],
    "producers": ["Producer"]
  }
}
```

**Normalization** (`normalizeAnikotoItem` in `app.js:37`):
```javascript
// Input (Anikoto raw) → Output (AniList-like format)
item.title              → media.title.english
item.alternative        → media.title.romaji
item.native             → media.title.native
item.poster             → media.coverImage.large
item.score ("8.59")     → media.averageScore (86 = Math.round(8.59 * 10))
item.episodes ("12")    → media.episodes (12)
item.ani_id ("187869")  → media.id / media.anilistId (187869)
item.terms_by_type.genre → media.genres
item.description        → media.description
item.season ("Spring")  → media.season ("SPRING")
item.year (2026)        → media.year (2026)
item.terms_by_type.type[0] → media.format ("TV")
```

**Key limitations:**
- No search endpoint — search must use AniList
- No browse/catalog/popular/trending/seasonal endpoints — all filtering/sorting is client-side
- Sort order is by `updated_at` (most recently updated first)
- Seasonal filtering: fetch from `/recent-anime` and filter by `item.season` + `item.year` client-side
- Both "Trending" and "Popular" browse modes return the same data (same endpoint)
- No CORS issues when served via HTTP

### 2. AniList GraphQL (Fallback — Search Only)

**Endpoint:** `https://graphql.anilist.co` (POST)

**Query used:** `SEARCH_QUERY` only (`app.js:185`)
```graphql
query($search:String, $page:Int, $perPage:Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      id idMal title { romaji english native }
      coverImage { large }
      episodes duration status averageScore genres season seasonYear
      format description startDate { year month day }
    }
  }
}
```

**Important:** The `Media` type uses `seasonYear`, NOT `year`. Search results have `seasonYear`. Normalized Anikoto items have `year`. The `renderDetailOverlay` function handles both with `anime.seasonYear || anime.year`.

**`anilistFetch`** (`app.js:187`):
- 10-second AbortController timeout
- Proper error handling with `res.ok` check
- Returns `data.data.Page.media` array

**Rate limiting:** AniList aggressively rate-limits from WSL (HTTP 429 after first request). Works in browsers with proper CORS.

---

## Streaming Providers

4 providers in `STREAM_PROVIDERS` array (`app.js:15`):

| Provider | URL Pattern | Status |
|---|---|---|
| **MegaPlay** | `https://megaplay.buzz/stream/ani/{anilistId}/{ep}/{lang}` | Primary — resolves via Anikoto API for verified embed URLs |
| **Cinetaro** | `https://api.cinetaro.buzz/embed/anime/{anilistId}/1/{ep}?type={lang}` | Fallback |
| **VidPlus** | `https://player.vidplus.to/embed/anime/{anilistId}/{ep}?dub={bool}&autoplay=true` | Fallback |
| **VidNest** | `https://vidnest.fun/anime/{anilistId}/{ep}/{lang}` | Fallback |

**All providers use `anilistId` as the identifier.** Entries stored in localStorage have both `id` and `anilistId` (same value — the AniList ID).

**Provider fallback mechanism:**
- `setupWatchPlayer` (`app.js:541`) sets a 30-second timer
- If the iframe receives no `message` event from the provider origin within 30s, it advances to the next provider
- Manual switching via "Provider" button or `W` key

**Anikoto embed URL resolution:**
- `preloadEpisodeUrls` (`app.js:79`) fetches `GET /series/{anikotoId}` to get verified embed URLs
- Cached in `episodeEmbedCache` keyed as `{anilistId}-{ep}-{lang}`
- If a cached URL exists, it takes priority over the direct MegaPlay URL

---

## State Management

All state is in global variables in `app.js`:

```javascript
let currentTab = "home";                    // "home" | "browse" | "seasonal" | "search" | "library" | "watch"
let userData = {};                          // localStorage data, keyed by anime ID (string)
let anilistCache = {};                      // Cache of anime detail objects (from open-detail)
let browseData = { results: [], loading: false, error: null, page: 0, mode: "trending", _hasMore: false };
let seasonalData = { results: [], loading: false, error: null, page: 0, season: null, year: null, _hasMore: false };
let currentWatchId = null;                  // Currently watching entry ID
let currentEpisode = 1;                     // Currently selected episode number
let currentProvider = 0;                    // Index into STREAM_PROVIDERS
```

### localStorage Schema

Key: `ember_data` | Value: JSON object keyed by anime ID

Each entry (`app.js:694-703`):
```javascript
{
  id: Number,               // AniList ID
  anilistId: Number,        // Same as id
  title: String,            // getTitle(anime) — english || romaji || native || "Unknown"
  titleEnglish: String,     // anime.title?.english || ""
  cover: String,            // anime.coverImage?.large || ""
  episodes: Number,         // Total episodes
  episodesWatched: Number,  // 0 initially
  status: String,           // "plan-to-watch" | "watching" | "completed" | "dropped" | "paused"
  lastWatched: Number,      // Timestamp (Date.now())
  rating: Number,           // 0-10 (0 = unrated, stored as 2x star clicks)
  genres: Array<String>,
  averageScore: Number,     // 0-100
  notes: String,
  dateAdded: Number         // Timestamp
}
```

---

## UI Components & Tabs

### Navbar (`nav#navbar`)
- Floating, centered (`position: fixed; top: 12px; left: 50%; translateX(-50%)`)
- Max-width: 1180px, border-radius: 12px
- `backdrop-filter: blur(20px)` glass effect
- `::before` gradient reflection overlay
- `::after` accent underline glow
- Scroll hide: `.is-hidden` class slides it up with opacity transition
- Contains: brand logo, 4 nav links, search input, mobile search button

### Hero (`div#hero`)
- Shows only on home tab
- Hidden (`display: none`) on all other tabs
- Gradient background with glow
- Title, subtitle, CTA buttons

### Home (`renderHome`)
- Continue Watching section (entries with status "watching")
- Stats Dashboard (library overview)
- Trending Now row (first 10 from `browseData.results`)
- Completed section (last 20 completed entries)

### Browse (`renderBrowse`)
- Two mode chips: "Trending" and "Popular" (both return same Anikoto data)
- Grid of anime cards
- Load More button (shown when `browseData._hasMore` is true)
- Status text showing result count or error

### Seasonal (`renderSeasonal`)
- Season chips: WINTER, SPRING, SUMMER, FALL
- Year chips: current, previous, next year
- Grid of anime cards filtered client-side from Anikoto data
- Load More button (shown when `seasonalData._hasMore` is true)

### Search (`renderSearch`)
- Full-width search input
- Results rendered as grid of anime cards
- 400ms debounce on input
- Uses AniList GraphQL search

### Library (`renderLibrary`)
- Status filter chips (All, Watching, Completed, Plan to Watch, Queued, Dropped)
- Export/Import buttons
- Grid of entry cards with watch progress and star ratings

### Watch (`renderWatch`)
- Video iframe player (16:9 aspect ratio)
- Episode sidebar with scrollable list
- Controls: Prev/Next episode, Switch Provider, Mark Watched, Close
- Provider auto-fallback (30s timeout)

### Overlay (`div#overlay`)
- Detail overlay on card click
- Shows: poster, title, metadata, genres, description, rating, notes
- Actions: Watch (if in library) or Add to Library + Close

### Toast (`div#toastContainer`)
- Fixed bottom-center notifications
- Auto-dismiss after 3 seconds
- Types: `success` (green border), `error` (red border)

### Shortcuts Modal (`div#shortcutsModal`)
- Toggle with `?` key
- Lists all keyboard shortcuts

### Mobile Bar (`div#mobileTabs`)
- Fixed bottom tab bar on screens ≤ 768px
- 4 tabs: Home, Browse, Search, Library

---

## Event Handling

All click events are delegated to `document` using `[data-action]` attribute pattern (`app.js:783`).

Key actions:
- `tab` → switch tabs (includes hero show/hide logic)
- `browse-mode` → switch between Trending/Popular
- `browse-more` / `seasonal-more` → paginate
- `open-detail` → show detail overlay
- `add-to-library` → add to library, close overlay
- `open-watch` → open watch view with entry
- `next-episode` / `prev-episode` / `set-episode` → episode navigation
- `switch-provider` → cycle streaming provider
- `mark-watched` → mark current episode watched
- `filter-library` → filter library by status
- `export-library` / `import-library` → data persistence

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `?` | Toggle shortcuts help |
| `1` | Home tab |
| `2` | Browse tab |
| `3` | Seasonal tab |
| `4` | Library tab |
| `/` | Focus search input |
| `W` | Switch provider (on watch page) |
| `Esc` | Close overlay/modal |
| `←` `→` | Scroll media rows (focus required) |

---

## Key Behaviors & Constraints

1. **No OAuth.** Do not add AniList login/auth.

2. **Anikoto API is the primary data source.** AniList is only used for search (Anikoto has no search endpoint).

3. **Browse and Seasonal both use `/recent-anime`.** Trending/Popular modes return identical data. Seasonal filters client-side by season+year.

4. **`year` vs `seasonYear`:** Anikoto normalized items have `.year`. AniList search results have `.seasonYear`. Always check both: `anime.seasonYear || anime.year`.

5. **Provider URLs use `anilistId`.** Entries stored in localStorage must have `anilistId` set for streaming to work.

6. **Hero is hidden on all non-home tabs** via `display: none`. The `main#app` gets `padding-top: calc(var(--nav-height) + 16px)` when hero is hidden.

7. **Home auto-loads browse data** on first render via `afterRender` (line 273) and init (line 1021).

8. **file:// protocol detection:** If opened directly from the filesystem, a warning toast tells the user to use `npx serve .`.

9. **Confetti animation** fires when an anime is completed (canvas-based, auto-removes after 5s).

10. **Service Worker** caches with `ember-v1-cache`. Update cache name on significant asset changes.

---

## Testing

**Runner:** Vitest v2.1.9
**Property testing:** fast-check v4.7.0
**Total tests:** 73 (8 files)

| File | Tests | What it tests |
|---|---|---|
| `providers.test.js` | 31 | Provider URL generation, edge cases, schema validation |
| `p1_library_roundtrip.test.js` | 2 | JSON serialization preserves all entry fields |
| `p3_provider_schema.test.js` | 8 | Provider config objects have required fields |
| `p4_provider_url_validity.test.js` | 5 | All provider URLs start with `https://` |
| `p5_provider_fallback.test.js` | 8 | Provider cycling wraps correctly |
| `p6_search_debounce.test.js` | 5 | Debounce fires once per burst, resets correctly |
| `p7_status_coercion.test.js` | 2 | Status values are from known set |
| `p8_text_contrast.test.js` | 12 | WCAG AA contrast compliance |

**Run:** `npm test` or `npx vitest run`

---

## Build & Run

```bash
npx serve .          # Serve locally (required for API access)
npm test             # Run all 73 tests
```

No build step needed. No frameworks. Open `http://localhost:3000` in a browser.
