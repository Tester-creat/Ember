#### **🧑 \[P\] Persona**

You are a **senior vanilla JavaScript developer** specializing in single-page applications built without frameworks. You are highly skilled at cross-project feature porting — reading a feature from one codebase and cleanly implementing its equivalent in a different but structurally related codebase, while respecting each project's existing architecture, naming conventions, CSS class patterns, and rendering model.

---

#### **🎯 \[T\] Task**

Perform the following **three precise, ordered tasks** in the **Ember project** (`https://github.com/Tester-creat/Ember`), using the **AniVault project** (`https://github.com/Tester-creat/AniVault`) as the reference source for the Stats tab design and analytics:

**Task 1 — Add a "Stats" tab to Ember's navigation**

* In `index.html`, add a `<button class="nav__link" data-tab="stats" data-action="tab">Stats</button>` to the desktop `#navCenter` nav links, positioned **after "Library"** (making the final tab order: Home → Browse → Seasonal → Library → Stats)  
* In `index.html`, add a corresponding `<button class="mobile-tab" data-tab="stats" data-action="tab">` entry to the `#mobileTabs` `.mobile-bar`, complete with an appropriate SVG icon (use a bar-chart or analytics icon) and `<span>Stats</span>` label

**Task 2 — Remove the "Library Overview" stats block from the Home tab**

* In `app.js`, locate the function that renders the **Home tab content** (likely `renderHome()` or similar)  
* Find and **completely remove** the "Library Overview" / stats section HTML string from within it — this includes all stat cards, completion rate, average rating counters, and any helper functions used exclusively by that section  
* Do **not** remove or alter any other part of the Home tab (hero recommendations, seasonal previews, etc.)

**Task 3 — Implement the Stats tab in Ember, mirroring AniVault's Stats analytics**

* In `app.js`, read the Stats tab rendering function from AniVault (likely `renderStats()` or `paintStats()`) and port it fully to Ember  
* The Stats tab in Ember must include **all** of the following analytics sections that exist in AniVault's Stats tab:  
  * Total titles, episodes watched, completion rate, average rating — as summary stat cards  
  * Status distribution breakdown (Watching / Completed / Plan to Watch / Dropped / Paused)  
  * Genre/tag breakdown (top genres from library entries)  
  * Rating distribution chart or histogram  
  * Watch time estimate (if AniVault computes one)  
  * Any other analytics blocks present in AniVault's Stats tab  
* Wire the new `renderStats()` function into Ember's **existing tab-switch handler** in `app.js` so that switching to `data-tab="stats"` calls it and renders into `#content`  
* Apply Ember's **existing CSS design tokens and glassmorphism style** (CSS variables like `--glass`, `--accent`, `--space-*`, etc.) — do **not** copy AniVault's CSS verbatim; adapt the markup to use Ember's class naming and design system

---

#### **🗂️ \[C\] Context**

**Ember (target project — currently being worked on):**

* Stack: **Vanilla JS \+ HTML \+ CSS** — zero frameworks, zero build step  
* Rendering model: Tab content rendered into `<div class="content" id="content"></div>` by `app.js`; tab switching driven by `data-action="tab"` click delegation  
* Current desktop nav tabs (in `index.html` `#navCenter`): Home, Browse, Seasonal, Library  
* Current mobile bar tabs (in `index.html` `#mobileTabs`): Home, Browse, Search, Library  
* Stats currently lives **inside the Home tab** as a "Library Overview" section — this must be moved out  
* Design system: transparent glassmorphism UI with CSS custom properties (`--glass`, `--accent`, `--border`, `--space-*`, `--radius-*`, etc.) defined in `styles.css`  
* localStorage: standard localStorage usage (key likely `ember_library` or similar — check `app.js`)  
* Library entry shape: each entry contains at minimum — status, rating (1–10), episodesWatched, totalEpisodes, title metadata (genres, etc.)

**AniVault (reference/source project):**

* Stack: **Vanilla JS \+ HTML \+ CSS** — fully JS-rendered; `index.html` has only `<div id="app">` shell  
* App size: \~2,900 lines in `app.js`  
* localStorage key: `anivault_v2`  
* Stats tab: already fully implemented with a rich analytics dashboard (status breakdown, rating distribution, genre breakdown, completion rate, average rating, watch time estimate)  
* The Stats tab is one of four top-level tabs: Home, Browse, Library, **Stats**  
* AniVault's navbar and all tab content is 100% JS-rendered (unlike Ember where the nav is in HTML)

**Key constraint:** Ember's navbar is **HTML-defined** (not JS-rendered), so the Stats tab button must be added directly to `index.html`, not dynamically injected by JS. Ember's app.js only renders the **content area** (`#content`), not the nav.

**Do not:**

* Copy AniVault's CSS class names or design tokens into Ember  
* Add any new npm dependencies or build steps  
* Break or alter any existing Ember tabs (Home, Browse, Seasonal, Library)  
* Leave any dead/orphaned stat-related code in the Home tab renderer after removal

---

#### **📋 \[F\] Format**

Deliver the solution structured **exactly** as follows:

**1\. Pre-flight Audit (before writing any code)**

* Confirm the exact function name(s) in Ember's `app.js` that render the Home tab and contain the Library Overview stats block  
* Confirm the exact function name(s) in AniVault's `app.js` that render the Stats tab  
* Confirm the localStorage key Ember uses for library data  
* List all stat metrics AniVault's Stats tab displays (so none are missed in the port)

**2\. `index.html` changes** — show the exact diff/replacement for:

* The desktop nav links block (adding Stats button)  
* The mobile bar block (adding Stats mobile tab with SVG icon)

**3\. `app.js` changes — Home tab** — show the exact code block being removed (the Library Overview section) with a clear before/after

**4\. `app.js` changes — New Stats tab** — provide the complete `renderStats()` function (or equivalent), adapted to:

* Use Ember's data structure and localStorage key  
* Use Ember's CSS class naming conventions and design tokens  
* Be wired into the existing tab-switch handler with a `case 'stats':` or equivalent

**5\. `styles.css` additions (if needed)** — only new CSS rules required for Stats tab layout that don't already exist in Ember's stylesheet

**6\. Verification checklist** — a short list of manual checks to confirm the feature works correctly (tab switching, data accuracy, mobile layout, no regressions on other tabs)

