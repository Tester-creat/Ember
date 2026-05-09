#### **🧑 \[P\] Persona**

You are a **senior vanilla JavaScript developer** with expertise in DOM focus management, event delegation, and SPA navigation patterns. You are precise about eliminating duplicate input sources and you understand that programmatic `.focus()` calls must happen **after** the DOM has been updated — never before.

---

#### **🎯 \[T\] Task**

Fix a critical search UX bug in the **Ember project** (`https://github.com/Tester-creat/Ember`) where two search inputs exist simultaneously, causing focus loss, character reordering, and persistent stale text.

The fix has **four precise steps** — all must be done together, as they are one atomic change:

---

**Step 1 — Remove the navbar search input from `index.html`**

Locate the `.nav__search` div in `index.html`:

html  
\<div class\="nav\_\_search" id\="navSearch"\>  
  \<svg class\="nav\_\_search-icon" ...\>\</svg\>  
  \<input type\="search" id\="globalSearch" class\="search-input" placeholder\="Search..." ...\>  
\</div\>

Replace it with a plain icon-only button that navigates to the search tab on click:

html  
\<button class\="nav\_\_search-icon-btn" id\="navSearchBtn" data-tab\="search" data-action\="tab" aria-label\="Search"\>  
  \<svg class\="nav\_\_search-icon" viewBox\="0 0 24 24" fill\="none" stroke\="currentColor" stroke-width\="2"\>  
    \<circle cx\="11" cy\="11" r\="8"/\>\<path d\="m21 21-4.35-4.35"/\>  
  \</svg\>  
\</button\>

* No `<input>` in the navbar. Ever. The icon is the entire affordance.  
* The `data-tab="search"` and `data-action="tab"` attributes mean Ember's existing click delegation handles the navigation — no new JS needed for the click itself

---

**Step 2 — Remove all `#globalSearch` input event listeners from `app.js`**

Find every event listener, handler, or reference in `app.js` tied to `#globalSearch` — this includes:

* Any `input`, `keyup`, `keydown`, or `change` listener on `#globalSearch`  
* Any debounced search function triggered by `#globalSearch` value changes  
* Any code that reads `document.getElementById('globalSearch').value` and uses it to seed the search tab's input or trigger a search  
* Any code that sets `#globalSearch.value` from `uiState`

**Remove all of these entirely.** The navbar input is gone — none of this logic should survive.

---

**Step 3 — Auto-focus the content search input after the search tab renders**

In `app.js`, find where the search tab content is rendered (the function that generates the full-width search input in `#content` — likely inside `renderSearch()` or the `case 'search':` branch of the tab renderer).

After the search tab's HTML is injected into `#content`, add a programmatic focus call using `requestAnimationFrame` to guarantee the DOM has painted before focus is attempted:

javascript  
requestAnimationFrame(() \=\> {  
  const searchInput \= document.getElementById('contentSearch'); // confirm actual ID  
  if (searchInput) {  
    searchInput.focus();  
    // If navigating from the navbar button, the input value should be empty  
    // Do NOT seed it with any value from the old \#globalSearch  
  }  
});

* This must fire **every time** the search tab is activated — whether from the navbar button, the mobile bar Search tab, or any `data-tab="search"` trigger anywhere in the app  
* The content search input must start **empty** on every fresh navigation to the search tab — do not preserve or transfer any previous value unless Ember already has intentional search-query persistence in `uiState` (if so, preserve that behaviour but confirm it is intentional)

---

**Step 4 — Clean up `uiState` and `styles.css`**

* In `app.js`: if `uiState` has a `searchQuery` or similar property that was being synced to/from `#globalSearch`, confirm whether it is still needed. If it only existed to bridge the two inputs, remove it. If it drives the actual search results in the content area, keep it but ensure it is only ever written to by the content search input — never by the removed navbar input.  
* In `styles.css`: remove or repurpose any styles scoped to `.nav__search input`, `#globalSearch`, or `.search-input` inside the nav context. The `.nav__search` container styles can be replaced with simple icon-button styles (see Format section below).  
* The `#mobileSearchBtn` (the separate mobile search toggle button already in `index.html`) — confirm whether it duplicates the mobile bar's Search tab button. If it does, remove it; if it serves a distinct purpose (e.g. toggling a mobile search overlay), leave it untouched but ensure it also does not reference `#globalSearch`.

---

#### **🗂️ \[C\] Context**

**Ember's current search architecture (the broken state):**

* `index.html` has `<input id="globalSearch">` inside `.nav__search` in the navbar  
* `app.js` listens to this input, and on any keystroke switches to the search tab and triggers content rendering  
* The search tab renders a second, full-width input in `#content` for the actual search experience  
* The first keystroke in the navbar input triggers tab switch → focus is lost from navbar input → second input appears without programmatic focus → user continues typing into second input without `S` from first input being properly transferred → character order corruption results  
* The navbar input retains the first character typed, is never cleared, and is never properly synced

**Ember's tab system:**

* Tab navigation is driven by `data-action="tab"` and `data-tab="..."` attributes via click delegation in `app.js`  
* Switching tabs calls `renderApp()` which rebuilds `#content`  
* After `renderApp()`, an `afterRender()` hook runs — this is the correct place to call `.focus()` on the content search input when `uiState.activeTab === 'search'`

**Ember's stack:** Vanilla JS \+ HTML \+ CSS — no frameworks, no build step

**Do not:**

* Add a new search input anywhere in the navbar — one input, in `#content` only  
* Call `.focus()` synchronously immediately after `innerHTML` assignment — always use `requestAnimationFrame`  
* Seed the content search input with any value from the removed navbar input  
* Touch the search results rendering logic, debounce timing, or AniList API call — only the input source and focus behaviour change  
* Remove the mobile bar's Search tab button (`data-tab="search"` in `#mobileTabs`) — that is correct and must stay

---

#### **📋 \[F\] Format**

Deliver in this exact structure:

**1\. Pre-flight Audit**

* List every reference to `#globalSearch` or `globalSearch` in `app.js` — event listeners, value reads, value writes, uiState sync  
* Confirm the exact ID of the content-area search input (the full-width one rendered inside `#content`)  
* Confirm whether `afterRender()` exists and whether it already handles focus restoration for other inputs — if so, add the search focus logic there consistently  
* Confirm whether `#mobileSearchBtn` is redundant with the mobile bar Search tab or serves a distinct purpose

**2\. `index.html` changes**

* Exact before/after for the `.nav__search` block replacement  
* Confirm no other `<input>` or reference to `#globalSearch` remains in `index.html`

**3\. `app.js` changes**

* Complete list of removed event listeners and handlers (with the code shown so the removal is auditable)  
* The `requestAnimationFrame` focus call — exactly where it is inserted (inside `afterRender()` or equivalent, gated on `uiState.activeTab === 'search'`)  
* Any `uiState` property cleanup

**4\. `styles.css` changes**

* Remove: styles for `#globalSearch` and `.nav__search input` in the nav context  
* Add: `.nav__search-icon-btn` — a clean icon button style matching the nav's existing icon button pattern (no background, no border, correct sizing, hover opacity transition using Ember's design tokens)

**5\. Verification Checklist**

* Click search icon in desktop navbar → search tab opens → content search input is focused immediately → typing `SOLO` produces `SOLO` in the content input, in order  
* No text remains in any navbar input after navigating to search (there is no navbar input)  
* Navigate away from search tab and back → content input is focused again, starts empty  
* Mobile bar Search tab button still works and also focuses the content input on arrival  
* All other tabs (Home, Browse, Seasonal, Library, Stats) are completely unaffected

