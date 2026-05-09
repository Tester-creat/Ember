**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**  
**PERSONA**  
**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

**You are a senior full-stack engineer who specialises in**  
**vanilla JavaScript streaming platforms, third-party embed**  
**APIs, and postMessage-based player event systems.**  
**You write precise, minimal diffs — you never refactor**  
**code that isn't part of the task, and you never omit**  
**error handling or cache management.**

**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**  
**TASK**  
**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

**Integrate the MegaPlay Anikoto API into AniVault**  
**so the platform gains a high-reliability primary embed**  
**path using native Anikoto episode IDs (/stream/s-2/…),**  
**while keeping the existing /stream/ani/ path as the**  
**automatic fallback. Also wire up every postMessage**  
**player event the API documents, including the \`error\`**  
**event for immediate provider failure detection.**

**Specifically, you must complete ALL of the following:**

**TASK 1 — Anikoto series resolution**  
  **Add an async function fetchAnikotoSeries(anilistId, titleRomaji)**  
  **that resolves the Anikoto internal series ID for any AniList entry:**  
    **a) Call GET https://anikotoapi.site/recent-anime with pagination**  
       **(pages 1–5 max) searching for a title match against titleRomaji.**  
       **Use a fuzzy match: normalise both strings to lowercase, strip**  
       **punctuation, and check if one includes the other.**  
    **b) If found, return that series' Anikoto ID.**  
    **c) Cache result in a module-level Map called anikotoSeriesCache**  
       **keyed by anilistId (number). Cache null on confirmed miss so**  
       **you never re-request the same ID.**  
    **d) If the Anikoto API returns a network error or no match after**  
       **5 pages, resolve to null (silent fail, fallback to ani/ path).**

**TASK 2 — Anikoto episode embed ID resolution**  
  **Add an async function fetchAnikotoEpisodeEmbedId(anikotoSeriesId, epNum)**  
  **that:**  
    **a) Calls GET https://anikotoapi.site/series/{anikotoSeriesId}**  
    **b) Finds the episode whose episode number matches epNum.**  
       **Use the field names from the Anikoto API response — the embed**  
       **ID field is called \`episode\_embed\_id\`.**  
    **c) Returns the episode\_embed\_id string, or null if the episode**  
       **isn't in the list yet (ongoing series).**  
    **d) Cache the entire episodes array in a Map called**  
       **anikotoEpisodeCache keyed by anikotoSeriesId.**  
       **On a cache hit, skip the network request and scan locally.**

**TASK 3 — New provider entry: Anikoto/s-2 (highest priority)**  
  **Prepend a new entry to the STREAM\_PROVIDERS array so it becomes**  
  **index 0 (tried first). Structure:**

  **{**  
    **name: "Anikoto",**  
    **async buildUrl(entry, epNum, lang) {**  
      **// Step 1: resolve series ID**  
      **const seriesId \= await fetchAnikotoSeries(**  
        **entry.anilistId || entry.id,**  
        **entry.title**  
      **);**  
      **if (\!seriesId) return null; // signal: skip this provider**

      **// Step 2: resolve episode embed ID**  
      **const embedId \= await fetchAnikotoEpisodeEmbedId(seriesId, epNum);**  
      **if (\!embedId) return null;**

      **// Step 3: build the s-2 URL**  
      **return \`https://megaplay.buzz/stream/s-2/${embedId}/${lang}\`;**  
    **}**  
  **}**

  **The existing providers (/stream/ani/, Cinetaro, VidPlus, VidNest)**  
  **keep their current index positions, shifted up by one.**

**TASK 4 — Update setupWatchPlayer() to handle async buildUrl**  
  **The current STREAM\_PROVIDERS entries use synchronous buildUrl().**  
  **The new Anikoto entry is async. Update setupWatchPlayer() so it:**  
    **a) Calls await provider.buildUrl(entry, currentEpisode, lang)**  
    **b) If buildUrl() resolves to null (provider can't serve this**  
       **episode), IMMEDIATELY advance to the next provider without**  
       **waiting for the 30-second timeout.**  
    **c) If buildUrl() throws, treat it the same as null.**  
    **d) Only set iframe.src and start the 30-second timeout when**  
       **buildUrl() returns a non-null URL string.**  
    **e) Show a loading indicator (add class \`is-resolving\` to**  
       **.watch-player\_\_frame) while the async resolution is in**  
       **progress. Remove the class once the URL is set or skipped.**  
    **f) The 30-second timeout behaviour for the remaining sync**  
       **providers is unchanged.**

**TASK 5 — Wire up the \`error\` postMessage event**  
  **The MegaPlay API documents an \`error\` event:**  
    **{ event: "error" }**  
  **In the onTimeMessage listener inside setupWatchPlayer(), add:**

    **if (payload.event \=== "error" || payload.type \=== "error") {**  
      **// Player confirmed failure — skip immediately, don't wait 30s**  
      **window.clearTimeout(streamFallbackTimer);**  
      **window.removeEventListener("message", onTimeMessage);**  
      **if (uiState.watch.currentProvider \!== providerIndexAtStart) return;**  
      **const nextIndex \= providerIndexAtStart \+ 1;**  
      **if (nextIndex \< STREAM\_PROVIDERS.length) {**  
        **uiState.watch.currentProvider \= nextIndex;**  
        **uiState.watch.streamLoaded \= false;**  
        **uiState.watch.forceFallback \= false;**  
        **renderApp();**  
        **showToast(\`${providerName} failed — trying ${STREAM\_PROVIDERS\[nextIndex\].name}…\`, "info");**  
      **} else {**  
        **uiState.watch.currentProvider \= 0;**  
        **showToast("All providers tried. Switch manually or use the link below.", "error");**  
      **}**  
      **return;**  
    **}**

**TASK 6 — Reset Anikoto resolution state on episode/anime change**  
  **In switchEpisode() and openWatchView(), add:**  
    **uiState.watch.currentProvider \= 0;**  
    **uiState.watch.streamLoaded \= false;**  
    **uiState.watch.forceFallback \= false;**  
  **This ensures the Anikoto provider is tried fresh for every new**  
  **episode rather than jumping straight to a fallback.**

**TASK 7 — CSS: is-resolving loading state**  
  **In styles.css, add:**

  **.watch-player\_\_frame.is-resolving::after {**  
    **content: "Resolving stream…";**  
    **position: absolute; inset: 0;**  
    **display: flex; align-items: center; justify-content: center;**  
    **background: rgba(10, 10, 15, 0.85);**  
    **color: var(--text2);**  
    **font-size: var(--text-sm, 0.875rem);**  
    **font-weight: 600;**  
    **letter-spacing: 0.04em;**  
    **border-radius: inherit;**  
    **animation: pulse 1.4s ease-in-out infinite;**  
  **}**  
  **@keyframes pulse {**  
    **0%, 100% { opacity: 0.5; }**  
    **50%       { opacity: 1.0; }**  
  **}**

**TASK 8 — Expose Anikoto as a browse source (optional but implement it)**  
  **The Anikoto API's GET /recent-anime?page=N\&per\_page=20 returns**  
  **anime titles the platform actually has available. Add a new browse**  
  **mode called "anikoto" to the existing browse system:**  
    **a) In uiState.browse.mode options, add "anikoto".**  
    **b) Add a button in renderBrowse() labelled "Available Now" that**  
       **sets browse mode to "anikoto".**  
    **c) Add a loadBrowseAnikoto(page) function that fetches from**  
       **https://anikotoapi.site/recent-anime?page=N\&per\_page=20**  
       **and maps each result to the same shape as AniList browse**  
       **results so existing renderBrowseCard() works without changes:**  
         **{**  
           **id: \<use anilistId field if present, else hash the title\>,**  
           **title: { romaji: item.title, english: item.title\_english || "" },**  
           **coverImage: { large: item.image || item.cover || "" },**  
           **episodes: item.episodes || 0,**  
           **averageScore: item.score ? item.score \* 10 : 0,**  
           **genres: item.genres || \[\],**  
           **seasonYear: item.year || 0,**  
           **status: item.status || "FINISHED"**  
         **}**  
    **d) Append results with the existing pagination/infinite scroll**  
       **logic (browseSentinel IntersectionObserver already handles this).**

**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**  
**CONTEXT**  
**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

**CODEBASE FACTS (read these before touching any code):**

**1\. STREAM\_PROVIDERS is a module-level array of objects. Each entry**  
   **currently has at minimum: { name: String, buildUrl: Function }.**  
   **buildUrl receives (entry, epNum, lang) where:**  
     **entry \= the full userData entry object (has .anilistId, .title,**  
             **.titleEnglish, .language)**  
     **epNum \= integer episode number (currentEpisode)**  
     **lang  \= "sub" or "dub" string**

**2\. setupWatchPlayer() lives at line \~2499 in app.js. It:**  
   **\- Clears streamFallbackTimer**  
   **\- Gets the iframe via querySelector("\[data-watch-iframe\]")**  
   **\- Sets uiState.watch.streamLoaded \= false**  
   **\- Attaches a window message listener (onTimeMessage) that listens**  
     **for { event:"time" }, { type:"watching-log" }, { channel:"megacloud" }**  
     **as SUCCESS signals — cancels the 30s timeout on any of these**  
   **\- Sets a 30-second setTimeout (streamFallbackTimer) as FAILURE signal**  
   **\- On failure: auto-advances to next provider via renderApp(), or**  
     **wraps back to 0 and shows the HiAnime external link**

**3\. handleMessage() at line \~2773 handles { event:"ended" } and**  
   **{ event:"complete" } for the auto-next / completion flow.**  
   **It reads from knownOrigins which currently lists:**  
   **\["megaplay.buzz", "cinetaro.buzz", "vidplus.to", "vidnest.fun"\]**  
   **Do NOT modify handleMessage() — only modify the onTimeMessage**  
   **closure inside setupWatchPlayer().**

**4\. The hero carousel is initialised in initHeroCarousel() with a guard**  
   **that prevents restarts if the slide count hasn't changed. Do not**  
   **touch this function.**

**5\. renderApp() / patchZones() re-renders everything when called. The**  
   **Anikoto fetch happens BEFORE renderApp() is called — set the URL**  
   **on the iframe directly after fetching, do not re-trigger a full**  
   **render just to update the src.**

**6\. anikotoSeriesCache and anikotoEpisodeCache are NEW module-level**  
   **declarations. Add them near the existing episodeCache and**  
   **franchiseCache declarations (around line 111–113).**

**7\. The iframe's data-watch-iframe attribute is how it's selected in**  
   **setupWatchPlayer(). Do not change the iframe's HTML structure.**

**8\. The existing STREAM\_PROVIDERS already contains:**  
   **\- An entry using /stream/ani/{anilist-id}/{ep-num}/{lang}**  
   **\- Potentially Cinetaro and VidPlus entries added in a prior session**  
   **The Anikoto/s-2 entry must become index 0 (highest priority).**

**API FACTS (from https://megaplay.buzz/api — read this carefully):**

**A. Three MegaPlay embed URL patterns:**  
   **/stream/s-2/{episode\_embed\_id}/{lang}    — uses Anikoto episode\_embed\_id**  
   **/stream/mal/{mal-id}/{ep-num}/{lang}     — uses MAL ID**  
   **/stream/ani/{anilist-id}/{ep-num}/{lang} — uses AniList ID**

**B. Anikoto API base URL: https://anikotoapi.site**  
   **Endpoints documented:**  
     **GET /recent-anime?page=1\&per\_page=20   — paginated catalog**  
     **GET /series/{id}                       — series detail \+ episode list**

**C. episode\_embed\_id — the field name in Anikoto's /series/{id} response**  
   **that contains the embed ID for use in /stream/s-2/**

**D. postMessage events from the player (all originate from megaplay.buzz):**  
   **{ event: "time",     time: Number, duration: Number, percent: Number }**  
   **{ event: "complete"  }**  
   **{ event: "error"     }   ← newly documented, not yet handled in code**  
   **{ type: "watching-log", currentTime: Number, duration: Number }**  
   **{ channel: "megacloud", ...data }   ← internal MegaPlay channel**

**E. In production, verify event.origin includes "megaplay.buzz" before**  
   **trusting any message. The knownOrigins check already does this.**

**F. The /stream/s-2/ endpoint is the most reliable because it uses the**  
   **native server IDs. The /stream/ani/ path depends on AniList→Anikoto**  
   **mapping being complete — the docs warn some titles aren't mapped yet.**  
   **This is exactly why s-2 must be tried FIRST.**

**G. The Anikoto catalog is the same library as HiAnime. Legacy HiAnime**  
   **episode IDs remain valid. This means any user who has old embed IDs**  
   **stored will still work.**

**WHAT NOT TO CHANGE:**  
**\- normalizeEntry(), saveData(), loadData()**  
**\- Library, search, stats, or overlay render functions**  
**\- AniList API calls (SEARCH\_QUERY, BROWSE\_QUERY, EPISODE\_DATA\_QUERY)**  
**\- The hero carousel, initHeroCarousel(), renderHeroCarousel()**  
**\- Theme, accent colour, compact mode, or import/export logic**  
**\- Any data stored in localStorage or the userData object shape**

**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**  
**FORMAT**  
**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

**Deliver your output in this exact structure:**

**── OUTPUT BLOCK 1: app.js changes ──────────────────**  
**For each change, provide:**

  **LOCATION: \[description of where in the file\]**  
  **FIND THIS EXACT TEXT:**

**\[the exact existing code to locate — enough lines for unambiguous identification, 3–10 lines\]**

 **REPLACE WITH:**

**\[the complete replacement code\]**

**REASON: \[one sentence explaining why\]**

**List all changes in file order (top to bottom).**  
**Do not output the entire app.js — only the diffs.**

**── OUTPUT BLOCK 2: styles.css changes ──────────────**  
**Please use the same LOCATION / FIND / REPLACE / REASON format.**  
**Only the is-resolving block and any pulse keyframe.**  
**Place it after the existing .watch-player\_\_frame rules.**

**── OUTPUT BLOCK 3: verification checklist ──────────**  
**A numbered list of exactly 10 things to manually test**  
**after applying the changes, specific to this feature.**  
**Example format:**  
  **1\. Open an anime with a known AniList ID. Confirm**  
     **the console logs an Anikoto series ID fetch before**  
     **the iframe src is set.**

**── OUTPUT BLOCK 4: known edge cases & how you handled them ──**  
**A table with columns: Edge Case | How It's Handled**  
**Cover at a minimum these 8 cases:**  
  **\- Anikoto API is down**  
  **\- Anime not in the Anikoto catalog**  
  **\- Episode exists in the series, but episode\_embed\_id is null/empty**  
  **\- buildUrl() takes \>5s (slow connection)**  
  **\- User switches episode before Anikoto resolves**  
  **\- Language is "dub" but only "sub" exists on s-2**  
  **\- Same AniList ID requested twice quickly (race condition)**  
  **\- Anikoto /recent-anime returns a different title spelling**

**Do not output anything outside these four blocks.**  
**Do not write prose introductions or summaries.**  
**Start directly with OUTPUT BLOCK 1\.**  
