#### **🧑 \[P\] Persona**

You are a **senior vanilla JavaScript developer** with deep expertise in DOM manipulation, partial UI updates, and cross-project feature porting in frameworkless single-page applications. You are specifically skilled at adapting watch-view features — episode navigation systems, grouping/pagination logic, and franchise relation displays — across codebases that share the same tech stack but differ in architecture and naming conventions.

---

#### **🎯 \[T\] Task**

Port **two distinct watch-view features** from the **AniVault project** (`https://github.com/Tester-creat/AniValt`) into the **Ember project** (`https://github.com/Tester-creat/Ember`). These are independent features but both live inside the watch/player view. Implement them in this exact order:

---

**Feature 1 — Episode Group Selector (40-episode grouping)**

AniVault groups episodes into chunks of 50 inside `paintEpisodeList()`, rendering a group-selector UI above the episode list so users of long series (e.g. One Piece at 1,160+ episodes) can navigate between ranges (1–50, 51–100, etc.).

Port this feature to Ember with the following **mandatory modification**: the chunk/group size must be **40 episodes** (not 50). So the group labels become: 1–40, 41–80, 81–120, …, and so on dynamically based on total episode count.

Specific requirements:

* The group selector must only appear when total episodes exceed 40; for shorter series it must be completely hidden  
* The active group must be highlighted/selected visually using Ember's existing active-state CSS pattern  
* On episode change (next/previous navigation, direct episode click), the active group must automatically update to whichever group the current episode belongs to  
* The selected group must be persisted in `uiState` (or Ember's equivalent ephemeral state object) so it survives re-renders without resetting to group 1  
* The episode list must only render the 40 episodes of the currently selected group — not all episodes at once (critical for performance on 1,000+ episode series)

---

**Feature 2 — Watch Order Panel (bottom of watch view)**

AniVault renders a "Watch Order" section at the bottom of the watch view via `renderWatchOrder()`. This panel fetches franchise relations from the **AniList GraphQL API** and displays related titles (Sequel, Prequel, Side Story, Alternative, Spin-off, etc.) in a visually distinct panel below the video player. Each entry is clickable and navigates directly into that title's watch view.

Port this feature to Ember exactly, including:

* The AniList GraphQL query for `relations { edges { relationType node { id title { romaji } coverImage { medium } } } }`  
* The relation type labels displayed (Sequel, Prequel, Side Story, Spin-off, Alternative, Summary — map AniList's enum values to human-readable labels)  
* Sorted display: Prequel first, then Sequel, then Side Story/Spin-off, then Other — matching AniVault's recommended watch order sort  
* Each entry card shows: cover image, title (romaji), and relation type badge  
* Clicking an entry loads that anime's watch view (reusing Ember's existing watch-navigation logic — do not create a new routing mechanism)  
* The panel must render below the iframe player but above the footer — do not break the existing rating/status bar or episode list layout  
* Show a graceful empty state ("No related titles found") when AniList returns no relations or the fetch fails

---

#### **🗂️ \[C\] Context**

**AniVault (reference/source):**

* Stack: Vanilla JS \+ HTML \+ CSS, \~2,900 lines in `app.js`, fully JS-rendered  
* Episode grouping implemented in `paintEpisodeList()` — this is a **targeted partial DOM update**, NOT a full re-render via `renderApp()`; it updates only the episode panel container directly  
* Watch order implemented in `renderWatchOrder()` — also a **targeted update** for a specific container, called from `afterRender()` post hook after the watch view is painted  
* AniList GraphQL endpoint: `https://graphql.anilist.co`  
* AniList uses the anime's **AniList ID** (not MAL ID) for all relation lookups  
* Group size in AniVault: 50 → **must be changed to 40 in Ember**  
* Episode grouping active group is tracked in `uiState` to survive re-renders  
* Watch order panel is positioned at the bottom of the watch layout, below the player iframe  
* The `renderWatchOrder()` function is called with the current anime's AniList ID, fetches async, then injects HTML into a dedicated `#watchOrder` container (or equivalent)  
* Known CSS fix in AniVault relevant to this: `.watch-sidebar` must have `overflow: visible` (not `overflow: hidden`) to allow `position: sticky` on the group selector — verify and apply this in Ember too

**Ember (target project):**

* Stack: Vanilla JS \+ HTML \+ CSS — no frameworks, no build step  
* Watch view is rendered into `<div class="content" id="content"></div>` by `app.js`  
* The video player is an `<iframe>` embedded via one of 4 providers: MegaPlay, Cinetaro, VidPlus, VidNest  
* Episode list is rendered in the watch sidebar — find the function rendering this (likely `renderWatchView()`, `renderPlayer()`, or similar — confirm by reading `app.js`)  
* Ember uses **AniList IDs** for all anime (confirmed from provider URL patterns using AniList-based IDs)  
* Ephemeral UI state is tracked in a state object in `app.js` (likely `uiState` — confirm exact name)  
* Tab/view switching uses `data-action="tab"` click delegation; watch-view navigation likely uses `data-action="watch"` or `data-id` attributes — confirm and reuse the same pattern for Watch Order card clicks  
* localStorage key: confirm by reading `app.js` (likely `ember_library` or similar)  
* Design system: glassmorphism with CSS custom properties — use Ember's own `--glass`, `--accent`, `--border`, `--radius-*`, `--space-*` tokens; do NOT import AniVault's CSS  
* Do not add any npm packages or external libraries — AniList GraphQL is called via native `fetch()`

**Do not:**

* Use 50 as the group size — it must be exactly **40**  
* Make `paintEpisodeList()` or the watch order panel trigger a full `renderApp()` re-render — both must be targeted partial DOM updates only  
* Copy AniVault's CSS class names into Ember wholesale; adapt them to Ember's naming convention  
* Create any new routing or navigation mechanism — reuse whatever click-delegation and state mutation pattern Ember already uses to navigate to a watch view  
* Break the existing rating/status bar, episode keyboard shortcuts (`←`/`→`, `M`), or provider-switching logic

---

#### **📋 \[F\] Format**

Deliver the solution in the following structure:

**1\. Pre-flight Audit**

* Confirm the exact function name(s) in Ember's `app.js` that render the watch view and the episode list  
* Confirm the exact name of Ember's ephemeral UI state object (e.g. `uiState`, `state`, `appState`)  
* Confirm how Ember navigates to a watch view (what data attribute / function call handles `"watch"` actions)  
* Confirm the localStorage key Ember uses  
* Confirm whether Ember's watch sidebar already has `overflow` set in `styles.css` and whether it needs fixing for sticky group selector

**2\. Feature 1 — Episode Grouping (app.js)**

* The new/modified episode list rendering function with 40-episode grouping logic  
* Group selector HTML generation (clearly commented)  
* Auto-scroll / auto-select group logic when current episode changes  
* Show a before/after diff for wherever the old episode list was rendered

**3\. Feature 1 — CSS fix (styles.css, if needed)**

* Only new rules needed for the group selector UI and the `overflow: visible` fix on the watch sidebar

**4\. Feature 2 — Watch Order Panel (app.js)**

* The complete `renderWatchOrder()` function including:  
  * AniList GraphQL query (copy the exact query shape from AniVault)  
  * Relation type sorting logic (Prequel → Sequel → Side Story → Other)  
  * HTML generation for the panel and each entry card  
  * Empty state and error state handling  
  * Click handler wiring for navigating to related titles  
* Where to call `renderWatchOrder()` in Ember's post-render flow (after watch view is painted)

**5\. Feature 2 — CSS (styles.css)**

* Rules for the watch order panel container, relation type badge, entry cards, and hover states — using Ember's CSS custom properties

**6\. Verification Checklist**

* One Piece (1,160+ episodes): group selector appears with correct 40-ep ranges, active group auto-switches correctly  
* Short series (≤40 episodes): group selector is completely hidden  
* Episode keyboard shortcuts (`←`/`→`) still work and update the active group  
* Watch order panel loads and displays correctly for a franchise anime (e.g. Naruto, Attack on Titan)  
* Watch order panel shows graceful empty state for a standalone film  
* Clicking a related title in the watch order panel navigates correctly without a page reload  
* No full `renderApp()` call is triggered by either feature during normal operation

