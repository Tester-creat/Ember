# Design Document — AniVault Interoperability

## Overview

This feature adds full AniVault interoperability to Ember — a vanilla JS + HTML + CSS anime library tracker. It is implemented as three sequential, dependent tasks:

1. **Status parity** — add `queued` and `untracked` to every location in Ember where statuses are defined, rendered, or filtered.
2. **AniVault-compatible import** — upgrade Ember's `importLibrary` function to read, validate, and merge `anivault_v2`-format files, preserving the `__meta` passthrough.
3. **AniVault-compatible export** — upgrade Ember's `exportLibrary` function to produce valid `anivault_v2` JSON that AniVault can re-import without modification.

All changes use native browser APIs only (no npm dependencies), never silently drop or corrupt data, and use Ember's existing glassmorphism design tokens for any new CSS.

---

## Architecture

Ember is a single-file vanilla JS SPA. There is no build step, no module bundler, and no framework. All logic lives in `app.js`; all styles live in `styles.css`. The app uses a single localStorage key (`ember_data`) as its database, storing a flat JSON object keyed by AniList ID strings.

The three tasks are strictly sequential because:
- Task 2 (import) must correctly handle all seven statuses, so Task 1 must be complete first.
- Task 3 (export) must produce entries with all seven statuses and include the `__meta` passthrough stored by Task 2, so both Task 1 and Task 2 must be complete first.

```
┌─────────────────────────────────────────────────────────────────┐
│  Ember SPA (app.js + styles.css)                                │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  Task 1      │   │  Task 2      │   │  Task 3          │   │
│  │  Status      │──▶│  Import      │──▶│  Export          │   │
│  │  Parity      │   │  (merge)     │   │  (anivault_v2)   │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
│         │                  │                    │               │
│         ▼                  ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  localStorage                                           │   │
│  │  ember_data          (library entries, keyed by ID)     │   │
│  │  ember_anivault_meta (__meta passthrough from AniVault) │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### Task 1 — Status Parity

**Affected locations in `app.js`:**

| Location | Current state | Required change |
|---|---|---|
| `getStatusLabel()` | Missing `"untracked"` | Add `"untracked": "Untracked"` to the map |
| `STATS_STATUS_LABELS` | Already has both | No change needed |
| `STATS_STATUS_OPTIONS` | Already has both | No change needed |
| `renderLibrary()` — `statuses` array | Missing `"paused"` and `"untracked"` | Add both; full order: `all, watching, completed, plan-to-watch, queued, dropped, paused, untracked` |
| `renderHome()` — continue watching filter | Filters only `status === "watching"` | Already correct; no change needed |
| `STATUS_COLORS` in `renderStatsDonut()` | Already has both | No change needed |

**Affected locations in `styles.css`:**

New CSS badge colour rules for `queued` and `untracked` status badges, using only existing design tokens.

**New exported constant (for testability):**

```js
// Canonical ordered list of all statuses for the status picker
const STATUS_ORDER = [
  "watching", "completed", "plan-to-watch",
  "queued", "dropped", "paused", "untracked"
];

// Canonical ordered list for the library filter (includes "all")
const LIBRARY_FILTER_STATUSES = [
  "all", "watching", "completed", "plan-to-watch",
  "queued", "dropped", "paused", "untracked"
];
```

### Task 2 — Import Handler

The upgraded `importLibrary(file)` function follows this pipeline:

```
FileReader.readAsText(file)
  → JSON.parse()                    [validation: must be valid JSON]
  → isObject() check                [validation: must be a plain object]
  → hasNumericKeys() check          [validation: must have at least one AniList ID key]
  → extractMeta()                   [side-effect: store __meta to ember_anivault_meta]
  → mergeEntries()                  [core: add new, update existing, skip identical]
  → saveData()                      [persist merged ember_data]
  → showToast(added, updated, skipped)
```

**`extractMeta(data)`** — detects and removes `__meta` from the entry set:
```js
function extractMeta(data) {
  if ("__meta" in data) {
    localStorage.setItem("ember_anivault_meta", JSON.stringify(data.__meta));
  }
  const { __meta, ...entries } = data;
  return entries;
}
```

**`mergeEntries(importedEntries)`** — merge algorithm:
```js
function mergeEntries(importedEntries) {
  let added = 0, updated = 0, skipped = 0;
  for (const [idStr, imported] of Object.entries(importedEntries)) {
    if (!/^\d+$/.test(idStr)) continue;          // skip non-numeric keys
    const mapped = mapAniVaultEntry(idStr, imported);
    const existing = userData[idStr];
    if (!existing) {
      userData[idStr] = mapped;
      added++;
    } else {
      const merged = { ...existing, ...mapped };
      if (JSON.stringify(merged) !== JSON.stringify(existing)) {
        userData[idStr] = merged;
        updated++;
      } else {
        skipped++;
      }
    }
  }
  return { added, updated, skipped };
}
```

**`mapAniVaultEntry(idStr, av2Entry)`** — field mapping from `anivault_v2` to Ember's internal schema:

| `anivault_v2` field | Ember internal field | Notes |
|---|---|---|
| *(key)* | `id`, `anilistId` | Numeric AniList ID |
| `status` | `status` | Direct copy; lowercase |
| `rating` | `rating` | Direct copy; integer 1–10 |
| `episodesWatched` | `episodesWatched` | Direct copy |
| `totalEpisodes` | `episodes` | Renamed |
| `notes` | `notes` | Direct copy |
| `title.romaji` | `title` | Fallback to `title.english` |
| `title.english` | `titleEnglish` | Direct copy |
| `title.native` | *(stored in title object)* | Preserved |
| `coverImage.large` | `cover` | Direct copy |
| `genres` | `genres` | Direct copy |
| `averageScore` | `averageScore` | Direct copy |
| `year` / `seasonYear` | `year` | Direct copy |

### Task 3 — Export Handler

The upgraded `exportLibrary()` function:

```js
function exportLibrary() {
  const output = {};

  // Add all library entries mapped to anivault_v2 schema
  for (const [idStr, entry] of Object.entries(userData)) {
    if (!entry || !entry.id) continue;
    output[idStr] = mapEmberToAniVault(entry);
  }

  // Include __meta passthrough or generate minimal block
  const storedMeta = localStorage.getItem("ember_anivault_meta");
  output.__meta = storedMeta
    ? JSON.parse(storedMeta)
    : { source: "ember", exportedAt: new Date().toISOString() };

  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = generateExportFilename();
  a.click();
  URL.revokeObjectURL(url);
  showToast("Library exported.", "success");
}
```

**`mapEmberToAniVault(entry)`** — field mapping from Ember to `anivault_v2`:

| Ember internal field | `anivault_v2` field | Notes |
|---|---|---|
| `id` / `anilistId` | *(key)* | Used as the object key |
| `status` | `status` | Direct copy |
| `rating` | `rating` | Direct copy |
| `episodesWatched` | `episodesWatched` | Direct copy |
| `episodes` | `totalEpisodes` | Renamed |
| `notes` | `notes` | Direct copy |
| `title`, `titleEnglish` | `title.romaji`, `title.english` | Reconstructed title object |
| `cover` | `coverImage.large` | Reconstructed coverImage object |
| `genres` | `genres` | Direct copy |
| `averageScore` | `averageScore` | Direct copy |
| `year` | `year` | Direct copy |
| `lastWatched`, `dateAdded`, `sessionLog`, `language`, `completedAt` | *(omitted)* | Ember-internal only |

**`generateExportFilename()`**:
```js
function generateExportFilename() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `anivault-backup-${yyyy}-${mm}-${dd}.json`;
}
```

---

## Data Models

### Ember Internal Entry Schema (`ember_data`)

```js
{
  id: Number,              // AniList ID (numeric)
  anilistId: Number,       // AniList ID (duplicate for compatibility)
  title: String,           // Romaji title (display fallback)
  titleEnglish: String,    // English title
  cover: String,           // Cover image URL
  episodes: Number,        // Total episode count (0 = unknown)
  episodesWatched: Number, // Episodes watched
  status: String,          // One of STATUS_ORDER values
  rating: Number,          // 1–10 (0 = unrated)
  notes: String,           // User notes
  genres: String[],        // Genre tags
  averageScore: Number,    // AniList score 0–100
  year: Number,            // Release year
  language: String,        // "sub" | "dub"
  lastWatched: Number,     // Unix timestamp ms
  dateAdded: Number,       // Unix timestamp ms
  completedAt: Number,     // Unix timestamp ms (0 if not completed)
  sessionLog: Number[],    // Array of Unix timestamps for activity heatmap
}
```

### AniVault v2 Entry Schema (`anivault_v2`)

```js
{
  // Top-level keys are AniList ID strings, plus "__meta"
  "12345": {
    status: String,          // "Watching" | "Completed" | "Queued" | etc.
    rating: Number,          // 1–10
    episodesWatched: Number,
    totalEpisodes: Number,
    notes: String,
    title: {
      romaji: String,
      english: String,
      native: String,
    },
    coverImage: {
      large: String,         // URL
    },
    genres: String[],
    averageScore: Number,
    year: Number,
  },
  "__meta": {
    theme: String,           // AniVault theme preference (opaque)
    // ... other AniVault app-level settings
  }
}
```

### Status Value Mapping

AniVault uses title-case status strings; Ember uses lowercase kebab-case. The import handler normalises on read:

| AniVault value | Ember value |
|---|---|
| `"Watching"` | `"watching"` |
| `"Completed"` | `"completed"` |
| `"Queued"` | `"queued"` |
| `"Plan to Watch"` | `"plan-to-watch"` |
| `"Dropped"` | `"dropped"` |
| `"Paused"` | `"paused"` |
| `"Untracked"` | `"untracked"` |

The export handler normalises on write (reverse mapping).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: getStatusLabel completeness

*For any* status string in the set `{ watching, completed, plan-to-watch, queued, dropped, paused, untracked }`, `getStatusLabel(status)` returns a non-empty string.

**Validates: Requirements 1.3**

---

### Property 2: getStatusLabel determinism

*For any* status string in the valid set, calling `getStatusLabel` twice with the same input returns the same output.

**Validates: Requirements 1.4**

---

### Property 3: Status picker contains all statuses

*For any* library entry, the rendered status picker HTML contains an option or button for every status in `STATUS_ORDER`, each with a non-empty label.

**Validates: Requirements 2.1, 2.2**

---

### Property 4: Status persistence round-trip

*For any* library entry and any valid status value, setting the entry's status to that value and saving to localStorage, then reading it back, produces the same status value.

**Validates: Requirements 2.3, 2.4**

---

### Property 5: Library filter correctness

*For any* array of library entries and any valid status value `s`, filtering the entries by status `s` returns exactly the entries whose `status` field equals `s` — no more, no less.

**Validates: Requirements 3.3, 3.4**

---

### Property 6: Stats counts include all statuses

*For any* array of library entries (including empty), `computeStats()` returns a `statusCounts` object where both `"queued"` and `"untracked"` are defined (not `undefined`), with a value of at least `0`.

**Validates: Requirements 4.4**

---

### Property 7: Continue watching excludes non-watching statuses

*For any* array of library entries, the continue watching list contains exactly the entries whose `status` is `"watching"` — entries with any other status (including `"queued"` and `"untracked"`) are excluded.

**Validates: Requirements 6.1, 6.2, 6.5**

---

### Property 8: Import rejects invalid JSON

*For any* string that is not valid JSON, calling the import validation logic with that string does not modify `ember_data` in localStorage.

**Validates: Requirements 7.2**

---

### Property 9: Import rejects non-object JSON

*For any* JSON-serializable value that is not a plain object (arrays, strings, numbers, booleans, null), the import validation logic rejects it and does not modify `ember_data`.

**Validates: Requirements 7.3**

---

### Property 10: __meta passthrough round-trip

*For any* value used as `__meta` in an `anivault_v2` import file, after a successful import, `JSON.parse(localStorage.getItem("ember_anivault_meta"))` deep-equals the original `__meta` value.

**Validates: Requirements 8.2, 8.5**

---

### Property 11: __meta is never treated as a library entry

*For any* `anivault_v2` file containing a `__meta` key, after import, `ember_data` does not contain a key `"__meta"` as a library entry.

**Validates: Requirements 8.3**

---

### Property 12: Merge adds new entries

*For any* valid `anivault_v2` file containing entries whose AniList IDs are not present in `ember_data`, after import, all those entries exist in `ember_data`.

**Validates: Requirements 9.1**

---

### Property 13: Merge preserves untouched entries

*For any* `ember_data` state and any `anivault_v2` import file, all entries in `ember_data` whose AniList IDs are NOT present in the import file remain byte-for-byte identical after the import.

**Validates: Requirements 9.3, 12.1**

---

### Property 14: Import idempotence

*For any* valid `anivault_v2` file, importing it twice produces the same `ember_data` as importing it once — the second import adds zero new entries.

**Validates: Requirements 9.5**

---

### Property 15: Export schema compliance

*For any* `ember_data` state, the object produced by `exportLibrary()` is a flat object where every key (except `__meta`) is a numeric string, and every entry contains at minimum `status`, `rating`, `episodesWatched`, `totalEpisodes`, `notes`, and a `title` object with `romaji` and `english` sub-fields.

**Validates: Requirements 10.1, 10.2, 10.6**

---

### Property 16: Export __meta round-trip

*For any* value stored in `ember_anivault_meta`, the exported JSON's `__meta` field deep-equals the stored value.

**Validates: Requirements 10.4**

---

### Property 17: Export does not mutate localStorage

*For any* `ember_data` state, calling `exportLibrary()` leaves `ember_data` in localStorage byte-for-byte identical to its pre-export state.

**Validates: Requirements 12.3**

---

### Property 18: Export filename format

*For any* date, the filename generated by `generateExportFilename()` matches the pattern `anivault-backup-YYYY-MM-DD.json` — it starts with `"anivault-backup-"`, ends with `".json"`, and the middle segment is a valid ISO 8601 date string.

**Validates: Requirements 11.1, 11.3**

---

## Error Handling

### Import Errors

All import errors are surfaced via `showToast(message, "error")` and leave `ember_data` unchanged.

| Error condition | Toast message |
|---|---|
| File is not valid JSON | `"Import failed: invalid JSON"` |
| Parsed value is not a plain object | `"Import failed: expected an object"` |
| Object has no numeric AniList ID keys | `"Import failed: no valid library entries found"` |
| FileReader error | `"Import failed: could not read file"` |

### Export Errors

Export errors are rare (localStorage read failures) and surfaced via `showToast(message, "error")`.

### Data Integrity Guarantee

The import handler uses a read-then-write pattern: it builds the merged result entirely in memory before calling `saveData()`. If any error occurs during the merge loop, `saveData()` is never called and `ember_data` remains unchanged.

---

## Testing Strategy

The project uses **Vitest** with **fast-check** for property-based testing. Tests live in `tests/`.

### Unit Tests

Unit tests cover specific examples, edge cases, and error conditions:

- `getStatusLabel("queued")` returns `"Queued"`
- `getStatusLabel("untracked")` returns `"Untracked"`
- `STATS_STATUS_OPTIONS` contains all seven values
- `LIBRARY_FILTER_STATUSES` is in the correct order
- Import with no `__meta` does not write `ember_anivault_meta`
- Export with no `ember_anivault_meta` generates a minimal `__meta` block with `source` and `exportedAt`
- Import toast message contains correct added/updated/skipped counts

### Property-Based Tests

Each correctness property is implemented as a single property-based test using fast-check, configured to run a minimum of 100 iterations.

Tag format: `Feature: anivault-interoperability, Property {N}: {property_text}`

**Test file mapping:**

| Test file | Properties covered |
|---|---|
| `tests/p_status_label.test.js` | P1, P2 |
| `tests/p_status_picker.test.js` | P3, P4 |
| `tests/p_library_filter.test.js` | P5 |
| `tests/p_stats_counts.test.js` | P6 |
| `tests/p_continue_watching.test.js` | P7 |
| `tests/p_import_validation.test.js` | P8, P9 |
| `tests/p_import_meta.test.js` | P10, P11 |
| `tests/p_import_merge.test.js` | P12, P13, P14 |
| `tests/p_export_schema.test.js` | P15, P16, P17 |
| `tests/p_export_filename.test.js` | P18 |

### PBT Library

**fast-check** (already installed and used in the project). Each property test uses `fc.assert(fc.property(...), { numRuns: 100 })`.

### Verification Checklist

1. Import an AniVault export: all 7 statuses land correctly, `__meta` is preserved, merge counts toast shows correctly.
2. Import the same file twice: second import shows 0 added, N updated or 0 updated (idempotent).
3. Export from Ember and import into AniVault: AniVault accepts the file without errors, all entries appear correctly, `__meta`/theme is restored.
4. Queued and Untracked entries appear correctly in Library filters, Stats tab, and status picker.
5. No existing Ember entries are lost or corrupted during any import.
