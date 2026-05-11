# Ember → AniVault Feature Parity Prompt
### Format: Persona–Task–Context–Format (PTCF)

---

## 🧑 [P] PERSONA

You are a **senior vanilla JavaScript developer** and UI/UX engineer specialising in single-page browser applications built without frameworks. You have deep expertise in:

- DOM-based state management and `localStorage` persistence
- Event delegation patterns (`data-action` / `data-*` attributes)
- CSS custom properties, glassmorphism, and responsive layout
- Anime streaming platform architecture (providers, embed URLs, fallback chains)
- Incremental, zero-regression feature porting between related codebases

You are meticulous, surgical in your diffs, and always read all three files (`app.js`, `index.html`, `styles.css`) before touching any of them. You never introduce regressions and you document every change with inline comments.

---

## 🎯 [T] TASK

Port **six specific missing features and fixes** from **AniVault** into **Ember**, making changes only to `app.js`, `index.html`, and `styles.css`. The two repos share the same owner and the same vanilla-JS, no-framework, `localStorage`-first architecture. Ember is a redesign of AniVault, not a replacement — all AniVault features listed below must be faithfully reproduced inside Ember's glass UI and Anikoto-first data model.

The six workstreams are:

1. **Fix the navbar search Input/Output (I/O) bug**
2. **Add all 7 library statuses (port from AniVault)**
3. **Add status picker inside the detail overlay (port from AniVault)**
4. **Add episode grouping — 40 episodes per group (port from AniVault)**
5. **Investigate and fix the two broken streaming providers (MegaPlay + VidNest)**
6. **Redesign the Stats tab to match AniVault's richness**

Each workstream is fully specified below. All six must be delivered together as a single atomic changeset.

---

## 🗂️ [C] CONTEXT

### The two repositories

| | AniVault | Ember |
|---|---|---|
| Repo | `https://github.com/Tester-creat/AniValt` | `https://github.com/Tester-creat/Ember` |
| Primary data | AniList GraphQL | Anikoto API (AniList as search fallback) |
| Providers | MegaPlay, Cinetaro, VidPlus, Anikoto (4) | MegaPlay, VidNest (2) |
| Library statuses | 7 (full set) | 5 (missing Queued, Untracked) |
| Episode grouping | ✅ 40 per group | ❌ Missing |
| Status picker in overlay | ✅ Present | ❌ Missing |
| Stats tab | ✅ Rich dashboard | ❌ Basic / minimal |
| localStorage key | `anivault_v2` | `ember_data` |
| Entry schema | `id`, `status`, `rating` (1–10), `notes`, `episodesWatched`, `dateAdded`, etc. | Same fields; `status` values are a subset |

---

### WORKSTREAM 1 — Fix Navbar Search I/O



### WORKSTREAM 2 — All 7 Library Statuses

**AniVault's complete status set (copy exactly):**

| Status value | Display label |
|---|---|
| `watching` | Watching |
| `completed` | Completed |
| `queued` | Queued |
| `plan-to-watch` | Plan to Watch |
| `paused` | Paused |
| `dropped` | Dropped |
| `untracked` | Untracked |

**Ember currently has:** `watching`, `completed`, `plan-to-watch`, `dropped`, `paused` (missing `queued` and `untracked`).

**Changes required:**

- **`app.js`** — Add `queued` and `untracked` to every place statuses are defined, listed, or switched on. This includes:
  - The `STATUS_OPTIONS` / `STATUSES` constant (or equivalent array/object)
  - The `renderLibrary()` filter chips
  - The status picker rendered inside the detail overlay (see Workstream 3)
  - The `handleStatusChange()` handler or equivalent
  - Auto-status logic: when `episodesWatched >= totalEpisodes && totalEpisodes > 0`, auto-advance to `completed` — this must not accidentally fire on `untracked` or `queued` entries
  - The `renderHome()` "Continue Watching" section (should still only show `watching` entries)

- **`styles.css`** — Add colour tokens / badge styles for `queued` and `untracked` that are visually consistent with the existing status badge styles. Suggested:
  - `queued` → teal / cyan accent (distinct from watching's blue)
  - `untracked` → muted grey (it's a non-committal state)

- **`localStorage`** — No migration needed; new statuses are additive. Existing entries with old statuses remain valid.

---

### WORKSTREAM 3 — Status Picker in the Detail Overlay

**AniVault behaviour (replicate exactly):**

When a user opens the detail overlay for any anime (by clicking a card), the overlay shows:
- Poster, title, metadata, genres, description
- A **status picker** — a set of labelled buttons/chips for all 7 statuses — visible regardless of whether the anime is already in the library
- A **rating widget** (already present in Ember — leave untouched)
- A **notes field** (already present — leave untouched)
- Primary CTA: if not in library → "Add to Library" button that saves with the selected status (defaults to `plan-to-watch` if no status chip is selected); if already in library → "Watch" button

**Ember's current gap:**

The overlay's "Add to Library" button only saves with `plan-to-watch` hardcoded. There is no status picker in the overlay.

**Changes required:**

- **`app.js`** — In `renderDetailOverlay()` (or wherever overlay HTML is assembled), insert a status picker row between the metadata section and the rating widget:
  ```html
  <div class="overlay-status-picker">
    <span class="overlay-status-label">Add as:</span>
    <div class="status-chips" data-group="overlay-status">
      <!-- One chip per status, data-status="watching" etc. -->
      <!-- Default selected chip: plan-to-watch -->
    </div>
  </div>
  ```
  - Clicking a chip sets `uiState.overlaySelectedStatus` (or equivalent transient state)
  - "Add to Library" reads `uiState.overlaySelectedStatus` instead of the hardcoded value
  - If the anime is already in the library, the picker shows the current status as selected and changes to it are saved immediately (replaces the existing status-change mechanism if any)

- **`styles.css`** — Style `.overlay-status-picker` and `.status-chips` inside the overlay. The chips must be compact (not full-width), use Ember's glass token set, and show an active/selected state with a bright accent border and subtle background highlight. Must be visually consistent with the filter chips in the library view.

---

### WORKSTREAM 4 — Episode Grouping (40 per group)

**AniVault behaviour (replicate exactly):**

When an anime has more than 40 episodes, the episode sidebar in the watch view displays **group selector tabs** at the top of the sidebar. Each group covers 40 consecutive episodes:

- Group 1: Episodes 1–40
- Group 2: Episodes 41–80
- Group 3: Episodes 81–120
- etc.

The group selector is a drop down (`1–40`, `41–80`, etc.). The active group's in the dropdown preview is highlighted. Only the episodes in the active group are rendered in the scrollable episode list below. The group selector must remain **sticky** at the top of the sidebar (AniVault fixed this exact bug; see its Known Issues section: `.watch-sidebar` must use `overflow: visible`, not `overflow: hidden`, for `position: sticky` to work on descendants).

**Ember's current gap:**

`renderWatch()` / `paintEpisodeList()` renders all episodes as a flat list with no grouping.

**Changes required:**

- **`app.js`**:
  - Add a `EPISODE_GROUP_SIZE = 40` constant
  - Add `uiState.episodeGroup` (integer, 0-indexed, default `0`) to track the active group
  - In `paintEpisodeList()` (or equivalent), compute groups:
    ```js
    const totalGroups = Math.ceil(totalEpisodes / EPISODE_GROUP_SIZE);
    const groupStart = uiState.episodeGroup * EPISODE_GROUP_SIZE + 1;
    const groupEnd = Math.min(groupStart + EPISODE_GROUP_SIZE - 1, totalEpisodes);
    ```
  - Render group selector chips only when `totalGroups > 1`
  - Render only episodes `groupStart` through `groupEnd` in the list
  - Add a `data-action="set-episode-group"` + `data-group="{index}"` click handler that updates `uiState.episodeGroup` and re-runs `paintEpisodeList()`
  - When navigating to a new episode via `next-episode` / `prev-episode`, auto-switch the active group if the target episode falls outside the current group's range
  - When opening watch view for an entry with saved progress, auto-select the group that contains `episodesWatched + 1`

- **`styles.css`**:
  - `.episode-group-selector` — sticky row, `position: sticky; top: 0; z-index: 10`, glass background matching the sidebar
  - `.episode-group-chip` — compact pill, same token set as existing chips
  - `.episode-group-chip.active` — accent highlight
  - Ensure `.watch-sidebar` uses `overflow: visible` (or `overflow-y: auto` only on the episode list container, not the sidebar root)

---

### WORKSTREAM 5 — Fix Broken Providers (MegaPlay + VidNest)

**Background (from `details.md`):**

Ember's provider array currently has only 2 entries:

| Provider | URL pattern | ID source |
|---|---|---|
| MegaPlay | `https://megaplay.buzz/stream/s-2/{embedId}/{lang}` | Anikoto embed cache (async) |
| VidNest | `https://vidnest.fun/anime/{anilistId}/{ep}/{lang}` | AniList ID (sync) |

MegaPlay embed URLs are resolved via `GET /series/{anikotoId}` on the Anikoto API, proxied through `server.js`. If the proxy isn't running or the Anikoto API is unreachable, MegaPlay returns an empty string and the iframe is blank.

**Investigation required (do all four checks):**

1. **MegaPlay empty-string guard** — In `buildStreamUrl()`, if the resolved MegaPlay embed URL is an empty string, do not set it as the iframe `src`. Instead, immediately trigger the provider fallback logic (cycle to VidNest). Add a clear `console.warn` so the failure is visible.

2. **VidNest URL format audit** — Confirm that `https://vidnest.fun/anime/{anilistId}/{ep}/{lang}` is the correct current URL pattern. VidNest (and similar embed services) change their URL schemes periodically. The prompt should instruct the AI to: (a) test the URL structure against a known anime (e.g. AniList ID `1535`, episode 1, sub), (b) if the pattern is stale, update it to the correct pattern, and (c) add a comment with the date the pattern was last verified.

3. **Auto-fallback restoration** — `details.md` explicitly states "No auto-fallback. The 15s auto-advance timer was removed." This is a regression vs AniVault. Restore **30-second auto-fallback**: if the iframe `src` is set but the provider hasn't signalled a load within 30 seconds, cycle to the next provider automatically. Use `setTimeout` + `iframe.onload` / `iframe.onerror` with the same pattern AniVault uses.

4. **Provider cycling wrap** — Confirm `currentProvider` wraps correctly from index 1 back to 0 (only 2 providers; the existing tests in `p5_provider_fallback.test.js` should cover this — do not break the tests).

---

### WORKSTREAM 6 — Redesign the Stats Tab

**AniVault's Stats tab features (port all of these):**

AniVault's stats tab is a rich dashboard that shows the user's complete library at a glance. It includes:

1. **Top summary row** — Four stat cards in a horizontal row:
   - Total Anime in Library (count)
   - Total Episodes Watched (sum of `episodesWatched` across all entries)
   - Average Rating (mean of all non-zero ratings, displayed as `X.X / 10`)
   - Completion Rate (percentage of entries with status `completed`)

2. **Status breakdown** — A visual bar for each of the 7 statuses showing count + percentage of total library. Each bar uses the status colour token (same as the badge colours from Workstream 2). Bars are proportional in width to their share of the library.

3. **Genre breakdown** — Top 8 genres across the user's library, ranked by frequency. Shown as horizontal bars with genre name, count, and a fill bar. Genres are sourced from `entry.genres` arrays.

4. **Top-rated titles** — A list of the user's top 5 rated titles (rating > 0, sorted descending). Each row shows: cover thumbnail, title, rating badge, status badge.

5. **Recently completed** — The last 5 entries where `status === 'completed'`, sorted by `lastWatched` descending. Same row format as top-rated.

6. **Empty state** — If the library has fewer than 3 entries, show a friendly empty state: "Your stats will appear here once you've added some anime to your library."

**Ember's current gap:**

`renderStats()` (or the equivalent section in `renderHome()`) shows only a basic count overview — no breakdowns, no charts, no top-rated list.

**Changes required:**

- **`app.js`** — Rewrite `renderStats()` completely to produce the six sections above. All data is computed from `userData` (the `ember_data` localStorage object). No new APIs needed.

- **`styles.css`** — Add styles for:
  - `.stats-grid` — 4-column summary card row (collapses to 2×2 on mobile)
  - `.stats-card` — glass card with large number, label, subtle icon
  - `.stats-section` — section wrapper with heading
  - `.status-bar-row` — flex row: status label, bar fill, count
  - `.genre-bar-row` — same structure
  - `.stat-entry-row` — cover + title + badges in a compact horizontal row
  - All components must use Ember's existing CSS custom properties (`--glass-bg`, `--accent`, `--text-primary`, etc.) — do not introduce hardcoded colours

---

## 📋 [F] FORMAT

Deliver the complete changeset in the following structure. Do not skip any section. Do not summarise — show the full code for every change.

### 1. Pre-flight Audit (before any code)

For each of the six workstreams, list:
- The exact functions, constants, and DOM elements in the current `app.js` / `index.html` / `styles.css` that will be modified or removed
- Any cross-workstream dependencies (e.g. "Workstream 3 depends on the status constants added in Workstream 2")
- Confirm the exact IDs of key elements: the content-area search input, the watch sidebar container, the episode list container, the overlay container, the stats render target

### 2. `index.html` changes

Show exact before/after for every modified block. Do not show unchanged sections.

### 3. `app.js` changes

Show every function that is added, replaced, or modified. For deletions, show the removed code with a comment explaining why it was removed. For additions, add an inline comment on the first line of each new block: `// [EMBER-PORT] Workstream N — description`.

### 4. `styles.css` changes

Show every new rule block and every modified existing rule. Group new rules by workstream. Prefix each group with a CSS comment: `/* [EMBER-PORT] Workstream N — description */`.

### 5. Verification Checklist

For each workstream, provide a numbered list of manual test steps and expected outcomes. The checklist must be exhaustive enough that a non-developer can follow it in a browser to confirm each feature works correctly.

### 6. Regression Guard

List all existing Ember features that were **not** changed but are adjacent to the modified code, and confirm they still work:
- Home tab Continue Watching section
- Browse and Seasonal tabs
- Keyboard shortcuts (`?`, `1`–`4`, `/`, `W`, `Esc`)
- Import / Export library (JSON round-trip)
- Mobile tab bar (all four tabs)
- Confetti animation on completion
- Service worker / PWA offline cache (`ember-v1-cache`)
- All 71 existing Vitest tests (`npm test` must still pass)

---

## ⚠️ HARD CONSTRAINTS

2. **No new localStorage keys.** All new data (e.g. `uiState.overlaySelectedStatus`, `uiState.episodeGroup`) is ephemeral UI state — never persisted.
3. **The `ember_data` schema is additive-only.** New status values (`queued`, `untracked`) are valid additions. Do not rename or remove existing fields.
5. **Do not change the Anikoto API integration**, the AniList search fallback, or the `normalizeAnikotoItem` function — these are working correctly.
6. **Do not add AniList OAuth or any login mechanism.**
7. **Preserve Ember's glass UI identity.** All new UI elements must use `backdrop-filter: blur(...)`, Ember's existing CSS token set, and Ember's colour palette. Do not import new fonts or icon libraries.
8. **`npm test` must pass with zero failures** after all changes. Do not modify tests — fix the code to match them.
