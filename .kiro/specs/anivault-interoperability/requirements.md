# Requirements Document

## Introduction

This feature adds full AniVault interoperability to Ember — a vanilla JS + HTML + CSS anime library tracker. It covers three sequential tasks:

1. **Status parity** — add the two statuses AniVault uses (`Queued`, `Untracked`) to every location in Ember where statuses are defined, rendered, or filtered.
2. **AniVault-compatible import** — upgrade Ember's existing JSON import to correctly read, validate, and merge `anivault_v2`-format files, preserving the `__meta` passthrough and reporting merge counts.
3. **AniVault-compatible export** — upgrade Ember's export to produce valid `anivault_v2` JSON that AniVault can re-import without modification.

All changes must use native browser APIs only (no npm dependencies), must never silently drop or corrupt data, and must use Ember's existing glassmorphism design tokens for any new CSS.

---

## Glossary

- **Ember**: The target vanilla JS + HTML + CSS anime library tracker application.
- **AniVault**: The reference anime tracker application whose data format Ember must interoperate with.
- **anivault_v2**: The JSON schema used by AniVault for library export/import. A flat object keyed by AniList ID strings, plus a reserved `__meta` key.
- **AniList_ID**: A numeric identifier string used as the primary key for anime entries in both Ember and AniVault.
- **Library_Entry**: A single anime record stored in Ember's `ember_data` localStorage key, keyed by AniList ID string.
- **Status**: A string value representing a user's watch state for an anime. Valid values: `watching`, `completed`, `plan-to-watch`, `queued`, `dropped`, `paused`, `untracked`.
- **Status_Picker**: The UI control (select element or button group) that lets a user assign a status to a library entry.
- **Library_Filter**: The chip/button group in the Library tab that filters displayed entries by status.
- **Status_Badge**: A coloured pill/label rendered on anime cards and in the library to display the current status.
- **__meta**: A reserved top-level key in `anivault_v2` JSON that holds AniVault app-level settings (e.g. theme). It is not a library entry and must never be treated as one.
- **ember_anivault_meta**: The localStorage key where Ember stores the `__meta` passthrough value extracted from an AniVault import.
- **Merge**: An import strategy where new entries are added, existing entries are updated, and entries absent from the import file are left untouched.
- **Toast**: A transient notification message shown to the user after an action.
- **Import_Handler**: The `importLibrary` function in `app.js` that processes an uploaded JSON file.
- **Export_Handler**: The `exportLibrary` function in `app.js` that serialises and downloads the library as JSON.
- **Design_Token**: A CSS custom property defined in `:root` in `styles.css` (e.g. `--glass`, `--accent`, `--border`, `--space-*`, `--radius-*`).

---

## Requirements

### Requirement 1: Status Parity — Status Label Map

**User Story:** As a user, I want all seven statuses (including Queued and Untracked) to display correct human-readable labels everywhere in the app, so that I never see a raw status key string in the UI.

#### Acceptance Criteria

1. THE `getStatusLabel` function SHALL return `"Queued"` when called with `"queued"`.
2. THE `getStatusLabel` function SHALL return `"Untracked"` when called with `"untracked"`.
3. THE `getStatusLabel` function SHALL return a non-empty string for every value in the set `{ watching, completed, plan-to-watch, queued, dropped, paused, untracked }`.
4. FOR ALL valid status strings in the set above, calling `getStatusLabel` twice with the same input SHALL return the same output (idempotent).

---

### Requirement 2: Status Parity — Status Picker

**User Story:** As a user, I want to be able to assign Queued or Untracked to any anime in my library, so that I can accurately reflect my intent for titles I haven't started or don't want to track actively.

#### Acceptance Criteria

1. WHEN the Status_Picker is rendered for any library entry, THE Status_Picker SHALL include an option for `"queued"` with the label `"Queued"`.
2. WHEN the Status_Picker is rendered for any library entry, THE Status_Picker SHALL include an option for `"untracked"` with the label `"Untracked"`.
3. WHEN a user selects `"queued"` in the Status_Picker, THE Library_Entry SHALL have its `status` field set to `"queued"` and be persisted to `ember_data` in localStorage.
4. WHEN a user selects `"untracked"` in the Status_Picker, THE Library_Entry SHALL have its `status` field set to `"untracked"` and be persisted to `ember_data` in localStorage.
5. THE Status_Picker SHALL list all seven statuses in the order: `watching`, `completed`, `plan-to-watch`, `queued`, `dropped`, `paused`, `untracked`.

---

### Requirement 3: Status Parity — Library Filter Buttons

**User Story:** As a user, I want to filter my library by Queued or Untracked, so that I can view only the entries with those statuses.

#### Acceptance Criteria

1. WHEN the Library tab is rendered, THE Library_Filter SHALL include a chip button for `"queued"` labelled `"Queued"`.
2. WHEN the Library tab is rendered, THE Library_Filter SHALL include a chip button for `"untracked"` labelled `"Untracked"`.
3. WHEN a user activates the `"queued"` Library_Filter chip, THE library grid SHALL display only entries whose `status` is `"queued"`.
4. WHEN a user activates the `"untracked"` Library_Filter chip, THE library grid SHALL display only entries whose `status` is `"untracked"`.
5. THE Library_Filter chip list SHALL include all seven statuses plus `"all"`, in the order: `all`, `watching`, `completed`, `plan-to-watch`, `queued`, `dropped`, `paused`, `untracked`.

---

### Requirement 4: Status Parity — Stats Tab

**User Story:** As a user, I want the Stats tab to show counts and chart segments for Queued and Untracked entries, so that my full library breakdown is accurately represented.

#### Acceptance Criteria

1. THE Stats tab status distribution chart SHALL include a segment for `"queued"` whenever at least one entry has `status === "queued"`.
2. THE Stats tab status distribution chart SHALL include a segment for `"untracked"` whenever at least one entry has `status === "untracked"`.
3. THE `STATS_STATUS_OPTIONS` array SHALL contain all seven status values: `watching`, `completed`, `queued`, `plan-to-watch`, `dropped`, `paused`, `untracked`.
4. WHEN computing status counts, THE Stats module SHALL initialise a count of `0` for both `"queued"` and `"untracked"` before iterating entries, so that statuses with zero entries still appear in the breakdown.
5. THE `STATS_STATUS_LABELS` map SHALL map `"queued"` to a non-empty display string and `"untracked"` to a non-empty display string.

---

### Requirement 5: Status Parity — CSS Badge Styling

**User Story:** As a user, I want Queued and Untracked status badges to be visually distinct and consistent with Ember's design language, so that I can identify entry statuses at a glance.

#### Acceptance Criteria

1. THE stylesheet SHALL define a CSS rule for the `Queued` status badge that sets a background colour and text colour using only Design_Tokens from Ember's `:root` (e.g. `--glass`, `--accent`, `--border`, `--space-*`, `--radius-*`).
2. THE stylesheet SHALL define a CSS rule for the `Untracked` status badge that sets a background colour and text colour using only Design_Tokens from Ember's `:root`.
3. THE `Queued` badge colour SHALL be visually distinct from the `Watching`, `Completed`, `Dropped`, `Paused`, and `Plan to Watch` badge colours.
4. THE `Untracked` badge colour SHALL be visually distinct from all other status badge colours including `Queued`.
5. WHERE a status badge is rendered on an anime card or in the library, THE badge SHALL use the CSS class or inline style that applies the correct colour for the entry's status.

---

### Requirement 6: Status Parity — Home Tab Recommendations Logic

**User Story:** As a user, I want the Home tab's "Continue Watching" row to exclude Queued and Untracked entries, so that only actively-in-progress titles appear in that section.

#### Acceptance Criteria

1. WHEN rendering the Home tab, THE `renderHome` function SHALL exclude entries with `status === "queued"` from the "Continue Watching" row.
2. WHEN rendering the Home tab, THE `renderHome` function SHALL exclude entries with `status === "untracked"` from the "Continue Watching" row.
3. WHILE an entry has `status === "queued"`, THE Home tab SHALL NOT display that entry in the "Continue Watching" row.
4. WHILE an entry has `status === "untracked"`, THE Home tab SHALL NOT display that entry in the "Continue Watching" row.
5. THE "Continue Watching" row SHALL continue to display only entries with `status === "watching"`, consistent with the existing behaviour for `completed`, `dropped`, and `paused` entries.

---

### Requirement 7: AniVault Import — File Validation

**User Story:** As a user, I want Ember to validate an uploaded file before importing it, so that corrupt or incompatible files never damage my library.

#### Acceptance Criteria

1. WHEN a file is uploaded for import, THE Import_Handler SHALL parse the file content as JSON before processing any entries.
2. IF the uploaded file is not valid JSON, THEN THE Import_Handler SHALL display an error Toast with a descriptive message and SHALL NOT modify `ember_data` in localStorage.
3. IF the parsed JSON is not an object (e.g. it is an array, string, or null), THEN THE Import_Handler SHALL display an error Toast and SHALL NOT modify `ember_data` in localStorage.
4. IF the parsed JSON object contains no keys that are numeric AniList ID strings (i.e. no valid library entries), THEN THE Import_Handler SHALL display an error Toast and SHALL NOT modify `ember_data` in localStorage.
5. THE Import_Handler SHALL complete validation before writing any data to localStorage, so that a partially-valid file cannot corrupt existing entries.

---

### Requirement 8: AniVault Import — `__meta` Detection and Passthrough

**User Story:** As a user, I want Ember to preserve AniVault's `__meta` settings block when I import an AniVault file, so that re-exporting and re-importing into AniVault restores AniVault's own preferences.

#### Acceptance Criteria

1. WHEN the Import_Handler processes an `anivault_v2` file, THE Import_Handler SHALL detect the presence of a `__meta` key at the top level of the JSON object.
2. WHEN a `__meta` key is detected, THE Import_Handler SHALL store its value in localStorage under the key `ember_anivault_meta` as a JSON string.
3. THE Import_Handler SHALL exclude the `__meta` key from the set of entries processed as library entries — it SHALL NOT be added to `ember_data` as an anime entry.
4. IF no `__meta` key is present in the imported file, THE Import_Handler SHALL NOT write anything to `ember_anivault_meta` in localStorage.
5. THE Import_Handler SHALL treat the `__meta` value as an opaque passthrough — it SHALL NOT modify, validate, or interpret the contents of `__meta`.

---

### Requirement 9: AniVault Import — Merge Behaviour

**User Story:** As a user, I want importing an AniVault file to merge with my existing library rather than overwrite it, so that I never lose entries that are not in the imported file.

#### Acceptance Criteria

1. WHEN the Import_Handler processes a valid `anivault_v2` file, THE Import_Handler SHALL add each entry whose AniList_ID does not already exist in `ember_data` as a new Library_Entry.
2. WHEN the Import_Handler processes a valid `anivault_v2` file, THE Import_Handler SHALL update each entry whose AniList_ID already exists in `ember_data` with the imported values.
3. WHEN the Import_Handler processes a valid `anivault_v2` file, THE Import_Handler SHALL leave all entries in `ember_data` whose AniList_ID is NOT present in the imported file completely unchanged.
4. WHEN the import completes successfully, THE Import_Handler SHALL display a success Toast reporting the count of added entries, updated entries, and skipped entries (entries that were identical and required no change).
5. FOR ALL valid `anivault_v2` files, importing the same file twice SHALL result in zero added entries on the second import, and all entries SHALL remain in `ember_data` (idempotent merge).
6. THE Import_Handler SHALL map `anivault_v2` field names to Ember's internal field names, including at minimum: `status`, `rating`, `episodesWatched`, `totalEpisodes` (mapped to `episodes`), `notes`, and title metadata fields.

---

### Requirement 10: AniVault Export — `anivault_v2` Schema

**User Story:** As a user, I want Ember's export file to be directly importable by AniVault without modification, so that I can move my library between the two apps seamlessly.

#### Acceptance Criteria

1. WHEN the Export_Handler runs, THE Export_Handler SHALL produce a JSON object where every key is an AniList_ID string corresponding to a Library_Entry.
2. WHEN the Export_Handler runs, THE Export_Handler SHALL include the following fields for each entry: `status`, `rating`, `episodesWatched`, `totalEpisodes`, `notes`, and title metadata fields (`title` with at minimum `romaji` and `english` sub-fields).
3. THE Export_Handler SHALL NOT include Ember-internal fields that have no equivalent in `anivault_v2` as top-level entry fields that would confuse AniVault's importer.
4. WHEN the Export_Handler runs and `ember_anivault_meta` exists in localStorage, THE Export_Handler SHALL include the stored `__meta` value as the `__meta` key in the exported JSON object.
5. WHEN the Export_Handler runs and `ember_anivault_meta` does NOT exist in localStorage, THE Export_Handler SHALL generate a minimal `__meta` block of the form `{ "source": "ember", "exportedAt": "<ISO 8601 timestamp>" }` and include it as the `__meta` key in the exported JSON object.
6. THE exported JSON SHALL be valid `anivault_v2` format: a flat object with AniList_ID string keys for entries and a `__meta` key, with no nested library structure.

---

### Requirement 11: AniVault Export — Filename Convention

**User Story:** As a user, I want the exported file to follow AniVault's naming convention, so that the files are immediately recognisable and interchangeable between apps.

#### Acceptance Criteria

1. WHEN the Export_Handler triggers a file download, THE Export_Handler SHALL use the filename pattern `anivault-backup-YYYY-MM-DD.json`, where `YYYY-MM-DD` is the current date in ISO 8601 format.
2. THE Export_Handler SHALL derive the date from `new Date()` at the time of export, formatted as a zero-padded year-month-day string.
3. FOR ALL export operations, the filename SHALL begin with `anivault-backup-` and end with `.json`.

---

### Requirement 12: Data Integrity — No Silent Data Loss

**User Story:** As a developer and user, I want all import and export operations to be safe and transparent, so that no data is ever silently dropped or corrupted.

#### Acceptance Criteria

1. THE Import_Handler SHALL NOT overwrite `ember_data` in localStorage with a wholesale replacement — it SHALL only add or update individual entries via the merge algorithm.
2. IF any error occurs during import processing after validation passes, THEN THE Import_Handler SHALL display an error Toast and SHALL leave `ember_data` in its pre-import state.
3. THE Export_Handler SHALL read from `ember_data` in localStorage without modifying it.
4. THE Import_Handler SHALL use only native browser APIs: `FileReader`, `JSON.parse`, `JSON.stringify`, and `localStorage` — no npm dependencies.
5. THE Export_Handler SHALL use only native browser APIs: `JSON.stringify`, `Blob`, `URL.createObjectURL`, and `localStorage` — no npm dependencies.
