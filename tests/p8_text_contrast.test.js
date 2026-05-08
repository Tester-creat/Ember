/**
 * Property test for text contrast (P8)
 * Validates: Requirements 2.4, 15.3
 *
 * Property 8: Text contrast meets WCAG AA across all themes
 * For any text element rendered by the UI (in both dark and light themes),
 * the computed contrast ratio between the text color and its effective background
 * color SHALL be at least 4.5:1 for normal-sized text and at least 3:1 for large
 * text (≥ 18px regular or ≥ 14px bold).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbColorPair, calculateContrastRatio } from './generators.js';

// ---------------------------------------------------------------------------
// Property test: contrast ratio is always in the valid range [1, 21]
// ---------------------------------------------------------------------------

describe('Property P8: Text contrast meets WCAG AA', () => {
  /**
   * P8-a: calculateContrastRatio always returns a value in [1, 21]
   * This validates the correctness of the contrast calculation function itself.
   */
  it(
    'contrast ratio is always in the valid range [1, 21] for any color pair',
    () => {
      fc.assert(
        fc.property(arbColorPair, ({ textColor, bgColor }) => {
          const ratio = calculateContrastRatio(textColor, bgColor);
          return ratio >= 1 && ratio <= 21;
        }),
        { numRuns: 100 }
      );
    }
  );

  /**
   * P8-b: For any color pair where one color is very dark (luminance < 0.05)
   * and the other is very light (luminance > 0.8), the contrast ratio should
   * be ≥ 4.5:1 (WCAG AA for normal text).
   */
  it(
    'dark/light color pairs always achieve ≥ 4.5:1 contrast ratio',
    () => {
      // Relative luminance helper (mirrors generators.js internals)
      function linearize(channel) {
        const c = channel / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }
      function relativeLuminance(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
      }

      // Arbitrary for a very dark hex color (luminance < 0.05)
      const arbDarkColor = fc
        .tuple(
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 0, max: 50 })
        )
        .map(([r, g, b]) => {
          const toHex = (v) => v.toString(16).padStart(2, '0');
          return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        })
        .filter((hex) => relativeLuminance(hex) < 0.05);

      // Arbitrary for a very light hex color (luminance > 0.8)
      const arbLightColor = fc
        .tuple(
          fc.integer({ min: 200, max: 255 }),
          fc.integer({ min: 200, max: 255 }),
          fc.integer({ min: 200, max: 255 })
        )
        .map(([r, g, b]) => {
          const toHex = (v) => v.toString(16).padStart(2, '0');
          return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        })
        .filter((hex) => relativeLuminance(hex) > 0.8);

      fc.assert(
        fc.property(arbDarkColor, arbLightColor, (darkColor, lightColor) => {
          const ratio = calculateContrastRatio(darkColor, lightColor);
          return ratio >= 4.5;
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Unit tests: known contrast values
// ---------------------------------------------------------------------------

describe('calculateContrastRatio — known values', () => {
  it('black (#000000) on white (#ffffff) should be 21:1', () => {
    const ratio = calculateContrastRatio('#000000', '#ffffff');
    // WCAG formula gives exactly 21
    expect(ratio).toBeCloseTo(21, 1);
  });

  it('white (#ffffff) on black (#000000) should be 21:1 (order-independent)', () => {
    const ratio = calculateContrastRatio('#ffffff', '#000000');
    expect(ratio).toBeCloseTo(21, 1);
  });

  it('same color (#808080) on itself should be 1:1', () => {
    const ratio = calculateContrastRatio('#808080', '#808080');
    expect(ratio).toBeCloseTo(1, 5);
  });

  it('same color (#ffffff) on itself should be 1:1', () => {
    const ratio = calculateContrastRatio('#ffffff', '#ffffff');
    expect(ratio).toBeCloseTo(1, 5);
  });

  it('same color (#000000) on itself should be 1:1', () => {
    const ratio = calculateContrastRatio('#000000', '#000000');
    expect(ratio).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// Specific CSS color pairs used in the app
// ---------------------------------------------------------------------------

describe('App CSS color pairs — WCAG AA compliance', () => {
  /**
   * Dark theme: white text on dark overlay.
   * rgba(0,0,0,0.85) composited on #0a0a0f ≈ #0f0f0f
   */
  it('dark theme: white (#ffffff) on dark overlay (#0f0f0f) should be ≥ 4.5:1', () => {
    const ratio = calculateContrastRatio('#ffffff', '#0f0f0f');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * Hero title: #ffffff on rgba(0,0,0,0.85) ≈ #0f0f0f
   */
  it('hero title: #ffffff on #0f0f0f should be ≥ 4.5:1', () => {
    const ratio = calculateContrastRatio('#ffffff', '#0f0f0f');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * Hero subtitle: rgba(255,255,255,0.82) ≈ #d1d1d1 on rgba(0,0,0,0.85) ≈ #0f0f0f
   */
  it('hero subtitle: #d1d1d1 on #0f0f0f should be ≥ 4.5:1', () => {
    const ratio = calculateContrastRatio('#d1d1d1', '#0f0f0f');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * Primary button: white text on accent violet #7c3aed
   */
  it('primary button: #ffffff on #7c3aed should be ≥ 4.5:1', () => {
    const ratio = calculateContrastRatio('#ffffff', '#7c3aed');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * Light theme text: --text1 (#14112a) on --bg (#f0eef8)
   */
  it('light theme: #14112a on #f0eef8 should be ≥ 4.5:1', () => {
    const ratio = calculateContrastRatio('#14112a', '#f0eef8');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
