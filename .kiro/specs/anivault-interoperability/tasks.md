# Implementation Plan: AniVault Interoperability

## Overview

Three sequential tasks that add full AniVault interoperability to Ember. Each task depends on the previous one: status parity must land before import (which must handle all seven statuses), and import must land before export (which must emit all seven statuses and pass through the `__meta` block stored by import). All changes are confined to `app.js` and `styles.css`; no npm dependencies are introduced.

## Tasks

- [x] 1. Task 1 — Status Parity
  - [x] 1.1 Add `"untracked"` to `getStatusLabel()` and export `STATUS_ORDER` / `LIBRARY_FILTER_STATUSES` constants
    - In `app.js`, add `"untracked": "Untracked"` to the map inside `getStatusLabel()`.
    - Declare and export two new module-level constants immediately after `getStatusLabel()`:
      ```js
      export const STATUS_ORDER = [
        "watching", "completed", "plan-to-watch",
        "queued", "dropped", "paused", "untracked"
      ];
      export const LIBRARY_FILTER_STATUSES = [
        "all", "watching", "completed", "plan-to-watch",
        "queued", "dropped", "paused", "untracked"
      ];
      ```
    - These constants are the single source of truth for all status lists in the app.
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Write property tests for `getStatusLabel` completeness and determinism (P1, P2)
    - Create `tests/p_status_label.test.js`.
    - **Property 1: getStatusLabel completeness** — for every status in `STATUS_ORDER`, `getStatusLabel(status)` returns a non-empty string.
    - **Property 2: getStatusLabel determinism** — calling `getStatusLabel` twice with the same valid status returns the same string.
    - Use `fc.constantFrom(...STATUS_ORDER)` as the arbitrary.
    - Tag: `Feature: anivault-interoperability, Property 1` and `Property 2`.
    - **Validates: Requirements 1.3, 1.4**

  - [x] 1.3 Replace the hardcoded `statuses` array in `renderLibrary()` with `LIBRARY_FILTER_STATUSES`
    - In `app.js`, find the line inside `renderLibrary()` that declares `const statuses = [...]`.
    - Replace it with `const statuses = LIBRARY_FILTER_STATUSES;`.
    - This adds the `"paused"` and `"untracked"` filter chips that are currently missing.
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 1.4 Write property tests for library filter correctness (P5)
    - Create `tests/p_library_filter.test.js`.
    - **Property 5: Library filter correctness** — for any array of entries and any valid status `s`, filtering by `s` returns exactly the entries whose `status === s`.
    - Generate entries using `arbAnimeEntry` from `tests/generators.js`; generate status using `fc.constantFrom(...STATUS_ORDER)`.
    - **Validates: Requirements 3.3, 3.4**

  - [x] 1.5 Replace the hardcoded status picker options in the detail/edit modal with `STATUS_ORDER`
    - In `app.js`, locate the HTML template that renders the status `<select>` or button group in the anime detail overlay.
    - Replace any hardcoded `<option>` list or button array with a `.map()` over `STATUS_ORDER`, calling `getStatusLabel()` for each label.
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 1.6 Write property tests for status picker completeness and status persistence round-trip (P3, P4)
    - Create `tests/p_status_picker.test.js`.
    - **Property 3: Status picker contains all statuses** — the rendered status picker HTML contains an option/button for every status in `STATUS_ORDER`, each with a non-empty label.
    - **Property 4: Status persistence round-trip** — for any entry and any valid status, setting `entry.status = s`, serialising to JSON and parsing back, produces the same status value.
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 1.7 Verify `computeStats()` initialises counts for all seven statuses and `renderStatsDonut()` includes `"untracked"`
    - In `app.js`, confirm `computeStats()` iterates `STATS_STATUS_OPTIONS` (which already contains all seven values) to pre-seed `statusCounts`. No logic change needed if already correct; add `"untracked"` to `STATS_STATUS_OPTIONS` if it is missing.
    - Confirm `renderStatsDonut()` has a colour entry for `"untracked"` in `STATUS_COLORS`. Add one using an existing design token if missing (e.g. `untracked: 'var(--text3)'` or a concrete hex).
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.8 Write property test for stats counts including all statuses (P6)
    - Create `tests/p_stats_counts.test.js`.
    - **Property 6: Stats counts include all statuses** — for any array of entries (including empty), `computeStats()` returns a `statusCounts` object where both `"queued"` and `"untracked"` are defined (not `undefined`) with a value ≥ 0.
    - **Validates: Requirements 4.4**

  - [x] 1.9 Verify `renderHome()` continue-watching filter excludes `"queued"` and `"untracked"`
    - In `app.js`, confirm the `watching` filter in `renderHome()` is `e.status === "watching"` (not a set membership check that might accidentally include new statuses).
    - No change needed if already correct; document the check with a comment referencing `STATUS_ORDER`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 1.10 Write property test for continue-watching exclusion (P7)
    - Create `tests/p_continue_watching.test.js`.
    - **Property 7: Continue watching excludes non-watching statuses** — for any array of entries, the continue-watching list contains exactly the entries whose `status === "watching"`.
    - **Validates: Requirements 6.1, 6.2, 6.5**

  - [x] 1.11 Add CSS badge colour rules for `queued` and `untracked` in `styles.css`
    - Add two new rules using only existing design tokens from `:root`:
      ```css
      /* AniVault interoperability — new status badges */
      [data-status="queued"]   .status-badge,
      .status-badge[data-status="queued"]   { background: rgba(245,158,11,0.18); color: #f59e0b; }

      [data-status="untracked"] .status-badge,
      .status-badge[data-status="untracked"] { background: var(--surface-md); color: var(--text3); }
      ```
    - Colours must be visually distinct from all other status badge colours.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Checkpoint — Task 1 complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify manually: Library filter shows all 8 chips (All + 7 statuses). Status picker in detail modal shows all 7 options. Stats tab shows Queued and Untracked segments. Continue Watching row does not show queued/untracked entries.

- [x] 3. Task 2 — AniVault-Compatible Import
  - [x] 3.1 Add `extractMeta()` helper to `app.js`
    - Implement the function exactly as specified in the design:
      ```js
      function extractMeta(data) {
        if ("__meta" in data) {
          localStorage.setItem("ember_anivault_meta", JSON.stringify(data.__meta));
        }
        const { __meta, ...entries } = data;
        return entries;
      }
      ```
    - Place it immediately before `importLibrary`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 3.2 Write property tests for `__meta` passthrough (P10, P11)
    - Create `tests/p_import_meta.test.js`.
    - **Property 10: `__meta` passthrough round-trip** — for any value used as `__meta`, after `extractMeta()` runs, `JSON.parse(localStorage.getItem("ember_anivault_meta"))` deep-equals the original `__meta` value.
    - **Property 11: `__meta` is never treated as a library entry** — for any `anivault_v2` object containing `__meta`, the object returned by `extractMeta()` does not contain the key `"__meta"`.
    - Use a mock `localStorage` (plain object with `getItem`/`setItem`) in the test environment.
    - **Validates: Requirements 8.2, 8.3, 8.5**

  - [x] 3.3 Add `mapAniVaultEntry(idStr, av2Entry)` helper to `app.js`
    - Implement the field mapping from `anivault_v2` schema to Ember's internal schema as specified in the design's Components table.
    - Normalise `status` from AniVault title-case to Ember lowercase kebab-case using the mapping table in the design (e.g. `"Watching"` → `"watching"`, `"Plan to Watch"` → `"plan-to-watch"`).
    - Fallback: if the normalised status is not in `STATUS_ORDER`, default to `"untracked"`.
    - Place it immediately before `extractMeta`.
    - _Requirements: 9.6_

  - [x] 3.4 Add `mergeEntries(importedEntries)` helper to `app.js`
    - Implement the merge algorithm exactly as specified in the design:
      - Skip keys that do not match `/^\d+$/`.
      - For each numeric key: add if absent, update if changed (spread merge), skip if identical (deep-equal via `JSON.stringify`).
      - Return `{ added, updated, skipped }`.
    - Place it immediately before `importLibrary`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 3.5 Write property tests for import merge behaviour (P12, P13, P14)
    - Create `tests/p_import_merge.test.js`.
    - **Property 12: Merge adds new entries** — for any valid `anivault_v2` entries whose IDs are absent from `userData`, after `mergeEntries()`, all those entries exist in `userData`.
    - **Property 13: Merge preserves untouched entries** — entries in `userData` whose IDs are NOT in the import remain byte-for-byte identical after `mergeEntries()`.
    - **Property 14: Import idempotence** — importing the same entries twice produces the same `userData` as importing once; the second call returns `added === 0`.
    - **Validates: Requirements 9.1, 9.3, 9.5**

  - [x] 3.6 Rewrite `importLibrary(file)` in `app.js` to use the new helpers and full validation pipeline
    - Replace the existing `importLibrary` body with the upgraded pipeline from the design:
      1. `FileReader.readAsText(file)` with an `onerror` handler that calls `showToast("Import failed: could not read file", "error")`.
      2. `JSON.parse()` — catch and call `showToast("Import failed: invalid JSON", "error")`, return without touching `ember_data`.
      3. `isObject()` check — if not a plain object, call `showToast("Import failed: expected an object", "error")`, return.
      4. `hasNumericKeys()` check — if no numeric AniList ID keys exist (after excluding `__meta`), call `showToast("Import failed: no valid library entries found", "error")`, return.
      5. `extractMeta(data)` — store `__meta` passthrough, get clean entries.
      6. `mergeEntries(entries)` — build merged result in memory.
      7. `saveData()` — only called after successful merge.
      8. `renderContent()` — refresh UI.
      9. `showToast(\`Imported: ${added} added, ${updated} updated, ${skipped} skipped.\`, "success")`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4, 12.1, 12.2, 12.4_

  - [x] 3.7 Write property tests for import file validation (P8, P9)
    - Create `tests/p_import_validation.test.js`.
    - **Property 8: Import rejects invalid JSON** — for any string that is not valid JSON, the validation logic does not modify `ember_data`.
    - **Property 9: Import rejects non-object JSON** — for any JSON-serialisable non-object value (array, string, number, boolean, null), the validation logic rejects it and does not modify `ember_data`.
    - Test the validation logic directly (not via `FileReader`); extract the parse-and-validate logic into a testable pure function or test it by calling the relevant guard conditions.
    - **Validates: Requirements 7.2, 7.3**

- [x] 4. Checkpoint — Task 2 complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify manually: import a real AniVault export file; confirm toast shows correct added/updated/skipped counts; confirm `ember_anivault_meta` is set in localStorage; confirm importing the same file a second time shows 0 added.

- [ ] 5. Task 3 — AniVault-Compatible Export
  - [x] 5.1 Add `generateExportFilename()` helper to `app.js`
    - Implement exactly as specified in the design:
      ```js
      function generateExportFilename() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `anivault-backup-${yyyy}-${mm}-${dd}.json`;
      }
      ```
    - Place it immediately before `exportLibrary`.
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 5.2 Write property test for export filename format (P18)
    - Create `tests/p_export_filename.test.js`.
    - **Property 18: Export filename format** — for any date, `generateExportFilename()` returns a string matching `anivault-backup-YYYY-MM-DD.json` where the date segment is a valid ISO 8601 date.
    - Mock `Date` or pass a date parameter; use `fc.date()` as the arbitrary.
    - **Validates: Requirements 11.1, 11.3**

  - [x] 5.3 Add `mapEmberToAniVault(entry)` helper to `app.js`
    - Implement the field mapping from Ember's internal schema to `anivault_v2` as specified in the design's export Components table.
    - Normalise `status` from Ember lowercase kebab-case to AniVault title-case (reverse of the import mapping).
    - Omit Ember-internal fields: `lastWatched`, `dateAdded`, `sessionLog`, `language`, `completedAt`.
    - Reconstruct `title` object (`{ romaji, english, native }`) and `coverImage` object (`{ large }`).
    - Place it immediately before `generateExportFilename`.
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 5.4 Rewrite `exportLibrary()` in `app.js` to produce valid `anivault_v2` JSON
    - Replace the existing `exportLibrary` body with the upgraded version from the design:
      1. Build `output = {}`.
      2. For each `[idStr, entry]` in `userData`: skip if `!entry || !entry.id`; otherwise `output[idStr] = mapEmberToAniVault(entry)`.
      3. Read `ember_anivault_meta` from localStorage; if present, set `output.__meta = JSON.parse(storedMeta)`; otherwise set `output.__meta = { source: "ember", exportedAt: new Date().toISOString() }`.
      4. Serialise with `JSON.stringify(output, null, 2)`, create a `Blob`, create an object URL, trigger download via a temporary `<a>` element, revoke the URL.
      5. Use `generateExportFilename()` for `a.download`.
      6. Call `showToast("Library exported.", "success")`.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 12.3, 12.5_

  - [ ] 5.5 Write property tests for export schema compliance, `__meta` round-trip, and localStorage immutability (P15, P16, P17)
    - Create `tests/p_export_schema.test.js`.
    - **Property 15: Export schema compliance** — for any `userData` state, the object produced by the export logic is a flat object where every key except `__meta` is a numeric string, and every entry contains at minimum `status`, `rating`, `episodesWatched`, `totalEpisodes`, `notes`, and a `title` object with `romaji` and `english` sub-fields.
    - **Property 16: Export `__meta` round-trip** — for any value stored in `ember_anivault_meta`, the exported object's `__meta` field deep-equals the stored value.
    - **Property 17: Export does not mutate localStorage** — calling the export logic leaves `ember_data` in localStorage byte-for-byte identical to its pre-export state.
    - Test the mapping and assembly logic directly (not the `Blob`/download side-effect); extract or import `mapEmberToAniVault` and the output-assembly logic.
    - Use `arbAnimeEntry` from `tests/generators.js` to generate entries.
    - **Validates: Requirements 10.1, 10.2, 10.4, 10.6, 12.3**

- [ ] 6. Final checkpoint — All tasks complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify manually: export from Ember produces a file named `anivault-backup-YYYY-MM-DD.json`; the file is valid `anivault_v2` JSON; importing it into AniVault succeeds without errors; re-importing the exported file back into Ember is idempotent.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery.
- Tasks must be executed in order: Task 1 → Task 2 → Task 3. Task 2 depends on `STATUS_ORDER` from Task 1; Task 3 depends on `ember_anivault_meta` written by Task 2.
- All code changes are confined to `app.js` and `styles.css`. No new files other than test files are created.
- The `ember_data` localStorage key is never wholesale-replaced — only individual entries are added or updated.
- The `ember_anivault_meta` localStorage key stores the opaque `__meta` passthrough from AniVault imports.
- Property tests use `fast-check` (already installed) with `{ numRuns: 100 }` unless otherwise noted.
- Unit tests and property tests are complementary; both are included as optional sub-tasks.
