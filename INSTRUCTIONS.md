# Ember Private Streaming Roadmap

This file is the active performance and layout brief for Ember's Home tab and other
content-heavy tabs such as Browse, Library, Seasonal, Search, and Watch. Ember is a
private, personal-use anime streaming and tracking app. It is not being designed as a
public multi-user service right now, so the near-term scope deliberately excludes auth,
large account databases, payments, recommendations for other users, and heavy backend
infrastructure.

The current priority is to keep the GitHub-hosted frontend stable, maintainable, and
honest about provider reliability before discussing backend architecture.

## Current Architecture

- React 19 + Vite single-page app.
- Local navigation is driven by React state, not URL routes.
- Library data is stored in browser `localStorage` under `ember_data`.
- Metadata comes from AniList GraphQL.
- Recent anime and MegaPlay episode embeds are resolved through Anikoto.
- Playback uses third-party iframe embeds.
- The Vite dev server proxies `/api/anikoto` locally; GitHub Pages uses the current
  production fallback path.

## Private Scope Decisions

- No login/auth is required for the current personal build.
- No large backend database is required yet.
- Browser-local storage is acceptable for now, as long as import/export is available.
- Provider reliability should improve in the client first.
- A backend can be discussed later for caching, provider normalization, privacy
  proxying, or local metadata persistence.

## Completed Frontend Stabilization

- Hero rotation is capped to a small active pool.
- Trending marquee is capped.
- Completed marquee is capped so large completed libraries do not render every title
  in the animated row.
- Browse, search, seasonal, and library grids progressively reveal items.
- Search reports API failures instead of showing false empty results.
- Seasonal requests check HTTP and GraphQL errors.
- Seasonal requests abort when season/year changes.
- Watch iframe clears stale embeds while resolving a new provider or episode.
- Watch iframe uses `referrerPolicy="no-referrer"`. The sandbox attribute was
  removed because current stream providers reject sandboxed iframe embeds.
- Library import/export is available for local backup and transfer.
- Remote Google Fonts dependency has been removed.
- AniList synonyms are included in normalized media data for better title matching.
- Watch page uses a compact provider list.
- Home explains when the completed marquee is capped for animation performance.

## Remaining Frontend Tasks

### Provider Reliability

- Build a real client-side provider adapter shape.
- Track provider failures per title/episode during the session.
- Improve provider matching with AniList id, MAL id, synonyms, year, format, and
  normalized title variants.

### Playback UX

- Add a visible next-provider recovery action inside the player area.
- Preserve selected provider/language per library entry.
- Keep watched episode UI derived from saved state.

### Library UX

- Add merge-vs-replace choice for imports.
- Validate imported library schema more strictly.
- Add a small warning before overwriting an existing library.

### Performance

- Add a dev-only large-library stress fixture.
- Expand the performance HUD with rendered card counts per surface.
- Keep completed and archived collections out of animated surfaces by default.

### Documentation

- Keep this file focused on Ember's performance, provider, and content-tab behavior.
- Treat `flip7-card-game-DESIGN.md` as the Stats tab visual and interaction reference.
- Add a short provider-support table once provider adapters exist.

## Later Backend Discussion

Backend work is intentionally deferred. When ready, the backend discussion should
focus only on what a private personal setup actually needs:

- small local cache, not a large user database
- optional SQLite metadata/library store
- provider request normalization
- private image/font/proxy options
- better provider timeout and retry control
- local backup and restore

Do not add auth, public-user infrastructure, or large multi-tenant architecture unless
the product direction changes.
