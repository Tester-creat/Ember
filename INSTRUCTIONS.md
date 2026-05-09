#### **🧑 \[P\] Persona**

You are a **senior vanilla JavaScript developer** specializing in localStorage-based data persistence, JSON schema design, and library management UIs in frameworkless single-page applications. You are meticulous about data integrity — you never silently drop user data on import, and you write defensive parsers that handle schema variations gracefully.

---

#### **🎯 \[T\] Task**

Implement **three sequential, dependent tasks** in the **Ember project** (`https://github.com/Tester-creat/Ember`). Each task must be completed and verified before the next begins, as each one is a prerequisite for the next.

---

**Task 1 — Add missing status values to Ember (prerequisite for Tasks 2 & 3\)**

Ember currently supports these library statuses: `Watching`, `Completed`, `Plan to Watch`, `Dropped`, `Paused`. AniVault additionally has: `Queued` and `Untracked`. Add both missing statuses to every location in Ember's codebase where statuses are defined, rendered, or filtered:

* The **status picker** dropdown/selector in the watch view and library card UI  
* The **Library tab** filter buttons (so users can filter by Queued and Untracked)  
* The **Library tab** status grouping/sorting logic (Queued and Untracked must appear as distinct groups, not lumped into "Other")  
* The **Stats tab** status distribution breakdown (both new statuses must appear in the chart/counts)  
* Any **CSS badge or pill styling** for status labels — add appropriately coloured variants for Queued and Untracked that fit Ember's existing glassmorphism design token system  
* The **Home tab** recommendations logic — if it excludes `Completed` or `Dropped` from "continue watching" rows, apply the same exclusion rules sensibly to `Queued` and `Untracked`

---

**Task 2 — Implement AniVault-compatible import in Ember**

Ember already has a JSON import feature. Replace or upgrade it to correctly read and merge an **`anivault_v2`\-format** export file:

* The `anivault_v2` format is a JSON object keyed by **AniList ID strings**, where each value is a library entry containing at minimum: `status`, `rating`, `episodesWatched`, `totalEpisodes`, `notes`, and title metadata fields  
* It also contains a `__meta` key at the top level (not an anime entry) holding app-level settings like theme preference — this must be **detected and excluded** from the library entries, then **stored separately** in Ember's localStorage as `ember_anivault_meta` (a passthrough preserve, so round-trip exports don't lose AniVault's settings)  
* Import behaviour must be **merge, not overwrite**: for each entry in the imported file, if that AniList ID already exists in Ember's library, update it with the imported values; if it does not exist, add it as a new entry. Entries already in Ember's library that are NOT in the imported file must remain untouched  
* After a successful merge, show a toast notification reporting: how many entries were added, how many were updated, and how many were skipped (already up to date)  
* Validate the file before processing: confirm it is valid JSON, confirm it has the expected `anivault_v2` shape (object with AniList ID keys), and show a clear user-facing error toast if validation fails — never silently fail or corrupt localStorage  
* The import trigger (button, file input) must remain in whatever location Ember currently places it — do not redesign the UI layout, only upgrade the underlying logic

---

**Task 3 — Make Ember's export produce `anivault_v2`\-compatible JSON**

Upgrade Ember's existing export function so the file it produces can be directly imported by AniVault without modification:

* The exported JSON must be a flat object keyed by **AniList ID strings** — matching `anivault_v2` schema exactly  
* Each entry must include all fields AniVault expects: `status`, `rating`, `episodesWatched`, `totalEpisodes`, `notes`, and any title metadata fields AniVault stores (confirm field names by reading AniVault's `app.js` export function)  
* If the `__meta` passthrough was stored during a previous import (Task 2), include it in the export so AniVault gets its settings back on re-import  
* If no `__meta` exists (user never imported from AniVault), generate a minimal `__meta` block: `{ "source": "ember", "exportedAt": "<ISO timestamp>" }` so AniVault's importer doesn't fail on a missing `__meta`  
* The exported filename must follow the pattern: `anivault-backup-YYYY-MM-DD.json` — identical to AniVault's own export filename convention, making the files interchangeable and immediately recognisable

---

#### **🗂️ \[C\] Context**

**AniVault (reference schema source):**

* localStorage key: `anivault_v2`  
* Schema: flat JSON object, top-level keys are AniList ID strings plus one reserved key `__meta`  
* Status values (complete set): `Watching`, `Completed`, `Queued`, `Plan to Watch`, `Paused`, `Dropped`, `Untracked`  
* Rating: integer 1–10  
* `__meta` block holds: `theme` and potentially other app-level config — treat as opaque passthrough, never mutate its contents  
* Export filename convention: `anivault-backup-YYYY-MM-DD.json`

**Ember (target project):**

* Stack: Vanilla JS \+ HTML \+ CSS — no frameworks, no build step  
* Current statuses: `Watching`, `Completed`, `Plan to Watch`, `Dropped`, `Paused` — missing `Queued` and `Untracked`  
* localStorage key: confirm exact name by reading `app.js` before writing any code  
* Also uses AniList IDs as primary keys — confirmed from streaming provider URL patterns  
* Rating scale: 1–10 — identical to AniVault, no conversion needed  
* Import/export UI: already exists somewhere in the app — confirm location (likely in a settings panel, library tab header, or a `?` / menu button) before modifying  
* Design system: glassmorphism with CSS custom properties (`--glass`, `--accent`, `--border`, `--space-*`, `--radius-*`) — all new CSS for status badges must use these tokens only

**Do not:**

* Overwrite on import — always merge  
* Silently drop `__meta` — preserve it as a passthrough  
* Rename or restructure any existing Ember status values — only add the two new ones  
* Change the import/export button placement or redesign the menu UI  
* Add any npm dependencies — use native `fetch()`, `JSON.parse()`, `JSON.stringify()`, and the File API only  
* Produce an export file that only Ember can read — it must be valid `anivault_v2` that AniVault accepts without modification

---

#### **📋 \[F\] Format**

Deliver in this exact structure:

**1\. Pre-flight Audit**

* Confirm Ember's localStorage key  
* List every location in `app.js` and `styles.css` where statuses are hardcoded (picker, filters, stats, badges, CSS classes) — this is the complete checklist for Task 1  
* Confirm where Ember's current import/export UI lives (which tab, which function)  
* Read AniVault's export function and list every field it writes per entry — this is the field spec for Task 3

**2\. Task 1 — Status additions**

* All `app.js` changes: status arrays, picker HTML, filter logic, stats counts, library grouping  
* All `styles.css` changes: new badge colour variants for `Queued` and `Untracked` only

**3\. Task 2 — Import upgrade**

* Complete replacement for Ember's import handler function  
* `__meta` detection, extraction, and passthrough storage logic  
* Merge algorithm (add new, update existing, leave untouched entries alone)  
* Validation logic and error toasts  
* Success toast with added/updated/skipped counts

**4\. Task 3 — Export upgrade**

* Complete replacement for Ember's export function  
* Field mapping: Ember internal field → `anivault_v2` field (show a mapping table if any fields differ in name)  
* `__meta` passthrough inclusion logic  
* Filename generation: `anivault-backup-YYYY-MM-DD.json`

**5\. Verification Checklist**

* Import an AniVault export: all 7 statuses land correctly, `__meta` is preserved, merge counts toast shows correctly  
* Import the same file twice: second import shows 0 added, N updated or 0 updated (idempotent)  
* Export from Ember and import into AniVault: AniVault accepts the file without errors, all entries appear correctly, `__meta`/theme is restored  
* Queued and Untracked entries appear correctly in Library filters, Stats tab, and status picker  
* No existing Ember entries are lost or corrupted during any import

