/**
 * Test utilities and generators for Ember property-based tests.
 * Uses fast-check arbitraries to generate valid, malformed, and partial
 * anime entry objects, provider configs, and color pairs.
 */
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STATUS_OPTIONS = [
  "watching",
  "completed",
  "queued",
  "plan-to-watch",
  "dropped",
  "paused",
  "untracked",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a hex color string (#rrggbb) from three 0-255 integers.
 */
function toHex(r, g, b) {
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

/**
 * Converts a single 8-bit channel value to its linear (sRGB) component
 * as defined by WCAG 2.1.
 * @param {number} channel - Integer 0-255
 * @returns {number} Linear light value 0-1
 */
function linearize(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Computes the relative luminance of a hex color per WCAG 2.1.
 * @param {string} hex - Hex color string in the form #rrggbb
 * @returns {number} Relative luminance in the range [0, 1]
 */
function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculates the WCAG 2.1 contrast ratio between two hex colors.
 * The ratio ranges from 1:1 (no contrast) to 21:1 (black on white).
 *
 * @param {string} color1 - Hex color string (#rrggbb)
 * @param {string} color2 - Hex color string (#rrggbb)
 * @returns {number} Contrast ratio (1 to 21)
 */
export function calculateContrastRatio(color1, color2) {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Arbitrary for a URL-like string (starts with "https://").
 * Generates simple but structurally valid URL strings.
 */
const arbUrl = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z0-9-]{2,20}$/),
    fc.stringMatching(/^[a-z]{2,6}$/)
  )
  .map(([sub, domain, tld]) => `https://${sub}.${domain}.${tld}`);

/**
 * Arbitrary for a valid anime entry object with all fields populated.
 * Matches the localStorage schema defined in design.md.
 */
export const arbAnimeEntry = fc.record({
  id: fc.integer({ min: 1, max: 2_000_000 }),
  anilistId: fc.integer({ min: 1, max: 2_000_000 }),
  title: fc.string({ minLength: 1, maxLength: 120 }),
  titleEnglish: fc.string({ minLength: 0, maxLength: 120 }),
  cover: arbUrl,
  banner: fc.oneof(fc.constant(""), arbUrl),
  episodes: fc.integer({ min: 0, max: 2000 }),
  status: fc.oneof(...STATUS_OPTIONS.map((s) => fc.constant(s))),
  episodesWatched: fc.integer({ min: 0, max: 2000 }),
  language: fc.oneof(fc.constant("sub"), fc.constant("dub")),
  rating: fc.integer({ min: 0, max: 10 }),
  dateAdded: fc.integer({ min: 1, max: 9_999_999_999_999 }),
  lastWatched: fc.integer({ min: 0, max: 9_999_999_999_999 }),
  completedAt: fc.integer({ min: 0, max: 9_999_999_999_999 }),
  notes: fc.string({ minLength: 0, maxLength: 500 }),
  genres: fc.array(fc.string({ minLength: 1, maxLength: 40 }), {
    minLength: 0,
    maxLength: 10,
  }),
  year: fc.integer({ min: 1960, max: 2030 }),
  sessionLog: fc.array(fc.integer({ min: 0, max: 9_999_999_999_999 }), {
    minLength: 0,
    maxLength: 200,
  }),
  averageScore: fc.integer({ min: 0, max: 100 }),
});

/**
 * Arbitrary for a malformed or partial anime entry object.
 * Generates objects that may be missing fields, have wrong types,
 * or be completely empty — useful for testing normalizeEntry() robustness.
 */
export const arbMalformedEntry = fc.oneof(
  // Completely empty object
  fc.constant({}),

  // Random subset of valid fields (partial entry)
  fc
    .record(
      {
        id: fc.oneof(
          fc.integer({ min: 1 }),
          fc.string(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        anilistId: fc.oneof(
          fc.integer({ min: 1 }),
          fc.string(),
          fc.constant(null)
        ),
        title: fc.oneof(
          fc.string(),
          fc.integer(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        titleEnglish: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        cover: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        banner: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        episodes: fc.oneof(
          fc.integer(),
          fc.string(),
          fc.constant(null),
          fc.constant(-1)
        ),
        status: fc.oneof(
          fc.string(),
          fc.integer(),
          fc.constant(null),
          fc.constant("invalid-status"),
          fc.constant("")
        ),
        episodesWatched: fc.oneof(
          fc.integer(),
          fc.string(),
          fc.constant(null),
          fc.constant(-5)
        ),
        language: fc.oneof(
          fc.constant("sub"),
          fc.constant("dub"),
          fc.string(),
          fc.constant(null)
        ),
        rating: fc.oneof(
          fc.integer({ min: -100, max: 100 }),
          fc.string(),
          fc.constant(null)
        ),
        dateAdded: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
        lastWatched: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
        completedAt: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
        notes: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        genres: fc.oneof(
          fc.array(fc.string()),
          fc.string(),
          fc.constant(null),
          fc.constant("Action")
        ),
        year: fc.oneof(
          fc.integer({ min: 1900, max: 2100 }),
          fc.string(),
          fc.constant(null)
        ),
        sessionLog: fc.oneof(
          fc.array(fc.integer()),
          fc.string(),
          fc.constant(null)
        ),
        averageScore: fc.oneof(
          fc.integer({ min: -10, max: 110 }),
          fc.string(),
          fc.constant(null)
        ),
      },
      // Each field is independently present or absent
      { requiredKeys: [] }
    )
);

/**
 * Arbitrary for a streaming provider configuration object.
 * Matches the STREAM_PROVIDERS schema from design.md.
 */
export const arbProviderConfig = fc.record({
  name: fc.string({ minLength: 1, maxLength: 60 }),
  active: fc.boolean(),
  idType: fc.oneof(fc.constant("anilist"), fc.constant("slug")),
  buildUrl: fc
    .tuple(
      fc.stringMatching(/^[a-z]{3,10}$/),
      fc.stringMatching(/^[a-z0-9-]{2,20}$/),
      fc.stringMatching(/^[a-z]{2,6}$/)
    )
    .map(([sub, domain, tld]) => {
      const base = `https://${sub}.${domain}.${tld}`;
      return (entry, ep, lang) => `${base}/${entry.anilistId}/${ep}/${lang}`;
    }),
  notes: fc.string({ minLength: 0, maxLength: 200 }),
});

/**
 * Arbitrary for a text/background color pair.
 * Both colors are valid hex strings in the form #rrggbb.
 */
export const arbColorPair = fc
  .tuple(
    // textColor components
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    // bgColor components
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([tr, tg, tb, br, bg, bb]) => ({
    textColor: toHex(tr, tg, tb),
    bgColor: toHex(br, bg, bb),
  }));
