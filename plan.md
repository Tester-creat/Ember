# AI Planning File
**Purpose:** This file serves as the central planning document for any AI assistant working on the Ember (anivalt) codebase. AIs are granted full authority to rewrite, restructure, and update the contents of this file as project requirements evolve. Before making significant codebase changes, outline the goals, the step-by-step plan, and track the completion status here.

---

## Current Initiative: CSS Overhaul & Alignment Fix
**Goal:** Fix severe CSS syntax/logical errors, missing classes, and misalignment issues across the application to bring the Ember platform up to an industry-standard, premium "glassmorphism" design.

**Status:** 100% Complete ✅

### Execution Plan:
1. **Phase 1: Core Layout, Typography, and Universal Components (100% Complete ✅)**
   - Fixed `.main` and `.content` layout containers with correct padding/flex structure.
   - Added `.btn--sm` and `.btn--amber` modifier classes.
   - Fully styled `.empty-state`, `.chip`, `.chip-group` filter pills with hover and active states.

2. **Phase 2: Premium Cards, Dashboard, and Overlay (100% Complete ✅)**
   - Implemented `.stats-grid` and `.stat-card` with gradient typography and hover lift.
   - Styled `.continue-card` and `.media-row` with glass overlays, play button, poster, and smooth hover transitions.
   - Fixed overlay internals: `.overlay-card__media`, `.overlay-card__content`, `.overlay-card__title`, `.overlay-card__text`, `.overlay-card__actions`.
   - Added interactive `.rating-overlay`, `.rating-title`, `.rating-stars`, `.rating-star` with amber glow on active.
   - Styled `.notes-input` textarea with focus accent ring.

3. **Phase 3: Watch View Polish & Mobile Experience (100% Complete ✅)**
   - Added `.watch-main`, `.watch-meta__title`, `.watch-meta__info`, `.watch-sidebar__list` for a clean player layout.
   - Styled `.watch-actions` flex container with aligned controls.
   - Added `.ep-num`, `.ep-info`, `.ep-row.is-watched` styles.
   - Fully styled `.mobile-bar`, `.mobile-tab` bottom nav with active glow, and `.mobile-search-btn`.
   - Added `.nav__search-icon` sizing and `.nav__actions` wrapper support.
   - Styled `.shortcuts-modal`, `.shortcuts-panel`, `.shortcuts-title`, `.shortcut-row`, `.shortcut-key`, `.shortcut-desc`.
   - Added `.footer` styling.
   - Added `.hero__glow`, `.hero__actions`, `.browse-controls`, `.browse-status`, `.library-controls`, `.library-empty`, `.search-page`, `.search-input--page`, `.search-input` styles.
   - Added `.star-inline`, `.anime-card__stars` for card star ratings.
   - Fixed `.overlay.is-open` and `.shortcuts-modal.is-open` display states.
   - Fixed hero negative margin to correctly bleed behind the floating navbar.

### Notes for Future AIs:
- The `styles.css` now fully covers all classes used in both `index.html` and `app.js` rendered HTML.
- The design system uses CSS custom properties (`--var-*`) defined in `:root` — always extend these rather than adding hard-coded values.
- Mobile breakpoint is `768px`. The bottom mobile bar (`display: none` by default) is activated there.
- Glass surfaces use `--glass-strong` + `backdrop-filter: var(--glass-blur)` — keep this consistent on new modals/overlays.

---

## Current Initiative: API Proxy Debugging & Episode Count Fixes
**Goal:** Fix the blank "Trending Now" section, the `Unexpected token '<'` JSON errors on the Browse/Seasonal tabs, and the issue where ongoing long-running anime (like One Piece) only load 1 episode in the MegaPlay fallback stack.

**Status:** 100% Complete ✅

### Execution Plan:
1. **Fix Anikoto API Proxy (`server.js`) (100% Complete ✅)**
   - **Error:** The server was returning HTML 404/Redirect pages to `app.js` instead of JSON, crashing `loadBrowse` and `loadSeasonal`.
   - **Root Cause:** `https.get` in Node.js does not automatically follow 301/308 HTTP redirects. The Anikoto API sometimes redirects requests.
   - **Fix:** Switched `proxyAnikoto` to use the global `fetch()` API, which transparently handles redirects, ensuring valid JSON is returned to the client.

2. **Fix Episode Count for Ongoing Series (`app.js`) (100% Complete ✅)**
   - **Error:** "One Piece with over 1160 episodes only load one episode."
   - **Root Cause:** AniList API returns `episodes: null` for currently airing series. Because One Piece isn't in the first 5-20 pages of Anikoto's `/recent-anime` catalog, the app failed to sync its Anikoto ID, leaving `entry.episodes` at its default fallback value of `1`.
   - **Fix:** Updated the AniList `SEARCH_QUERY` to include `nextAiringEpisode { episode }`. Added logic in `searchAnime` to fallback to `nextAiringEpisode.episode - 1` if the true episode count is `null`. This dynamically injects the correct current episode count (e.g. 1104+) into the UI for long-running series.

3. **MegaPlay Fallback Verification (100% Complete ✅)**
   - **Error:** "MegaPlay has no stream for this episode — trying VidNest".
   - **Root Cause:** This is **expected behavior** per the integration instructions. To prevent 10-second lookup hangs, `fetchAnikotoSeries` only scans up to 5 pages of `/recent-anime`. If an anime isn't found, it gracefully fails and triggers the VidNest fallback, which utilizes AniList IDs directly.
   - **Action:** No changes needed to the fallback logic itself, as it is functioning exactly as intended by switching to VidNest.

4. **Live Site (GitHub Pages) MegaPlay Support (100% Complete ✅)**
   - **Error:** MegaPlay immediately skips to VidNest without trying when hosted on `tester-creat.github.io`.
   - **Root Cause:** The Anikoto API (`anikotoapi.site`) does not support CORS. On GitHub Pages, there is no Node.js `server.js` backend to act as a proxy, so requests to `/api/anikoto` return 404 HTML, causing MegaPlay to instantly fail and skip to VidNest.
   - **Fix:** Created an `anikotoFetch()` wrapper in `app.js`. If the app detects it is running on a live site (`github.io`), it automatically routes Anikoto API requests through the public `api.codetabs.com` CORS proxy, restoring MegaPlay's functionality on the deployed static site.

5. **Streamline "Watch Now" Experience (100% Complete ✅)**
   - **Error:** User complained that they could only watch anime after manually adding it to their library.
   - **Fix:** Redesigned the detail overlay. The primary "Watch Now" button is now always visible regardless of library status. Clicking it will implicitly add the anime to the library (since tracking requires it) and immediately launch the watch player in one seamless action.

