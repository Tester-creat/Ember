# AI Planning File
**Purpose:** This file serves as the central planning document for any AI assistant working on the Ember (anivalt) codebase. AIs are granted full authority to rewrite, restructure, and update the contents of this file as project requirements evolve. Before making significant codebase changes, outline the goals, the step-by-step plan, and track the completion status here.

---

## Current Initiative: CSS Overhaul & Alignment Fix
**Goal:** Fix severe CSS syntax/logical errors, missing classes, and misalignment issues across the application to bring the Ember platform up to an industry-standard, premium "glassmorphism" design.

**Status:** 100% Complete ✅

### Execution Plan:
1. **Phase 1: Core Layout, Typography, and Universal Components (100% Complete ✅)**
   - Fixed `.main` and `.content` layout containers with correct padding/flex structure.
   - Added `.btn--sm` and `.btn--amber` modifier classes.
   - Fully styled `.empty-state`, `.chip`, `.chip-group` filter pills with hover and active states.

2. **Phase 2: Premium Cards, Dashboard, and Overlay (100% Complete ✅)**
   - Implemented `.stats-grid` and `.stat-card` with gradient typography and hover lift.
   - Styled `.continue-card` and `.media-row` with glass overlays, play button, poster, and smooth hover transitions.
   - Fixed overlay internals: `.overlay-card__media`, `.overlay-card__content`, `.overlay-card__title`, `.overlay-card__text`, `.overlay-card__actions`.
   - Added interactive `.rating-overlay`, `.rating-title`, `.rating-stars`, `.rating-star` with amber glow on active.
   - Styled `.notes-input` textarea with focus accent ring.

3. **Phase 3: Watch View Polish & Mobile Experience (100% Complete ✅)**
   - Added `.watch-main`, `.watch-meta__title`, `.watch-meta__info`, `.watch-sidebar__list` for a clean player layout.
   - Styled `.watch-actions` flex container with aligned controls.
   - Added `.ep-num`, `.ep-info`, `.ep-row.is-watched` styles.
   - Fully styled `.mobile-bar`, `.mobile-tab` bottom nav with active glow, and `.mobile-search-btn`.
   - Added `.nav__search-icon` sizing and `.nav__actions` wrapper support.
   - Styled `.shortcuts-modal`, `.shortcuts-panel`, `.shortcuts-title`, `.shortcut-row`, `.shortcut-key`, `.shortcut-desc`.
   - Added `.footer` styling.
   - Added `.hero__glow`, `.hero__actions`, `.browse-controls`, `.browse-status`, `.library-controls`, `.library-empty`, `.search-page`, `.search-input--page`, `.search-input` styles.
   - Added `.star-inline`, `.anime-card__stars` for card star ratings.
   - Fixed `.overlay.is-open` and `.shortcuts-modal.is-open` display states.
   - Fixed hero negative margin to correctly bleed behind the floating navbar.

### Notes for Future AIs:
- The `styles.css` now fully covers all classes used in both `index.html` and `app.js` rendered HTML.
- The design system uses CSS custom properties (`--var-*`) defined in `:root` — always extend these rather than adding hard-coded values.
- Mobile breakpoint is `768px`. The bottom mobile bar (`display: none` by default) is activated there.
- Glass surfaces use `--glass-strong` + `backdrop-filter: var(--glass-blur)` — keep this consistent on new modals/overlays.

