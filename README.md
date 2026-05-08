# Ember

A ShuttleTV.su-inspired anime streaming platform with a transparent glass UI. Stream episodes from multiple providers, track your watch progress, rate titles, and manage your library — all in your browser.

## Features

- **Streaming** — 4 providers (MegaPlay, Cinetaro, VidPlus, VidNest) with auto-fallback
- **Anikoto API** — Resolves verified embed URLs for better stream reliability
- **Library** — Track watching, completed, plan-to-watch, dropped, paused
- **Rating** — 5-star (1–10) rating per title
- **Seasonal** — Browse current/upcoming season anime
- **Notes** — Per-title personal notes
- **Import/Export** — JSON library backup
- **Keyboard Shortcuts** — Press `?` to view all shortcuts
- **Stats Dashboard** — Library overview with completion rate and average rating
- **Service Worker** — Offline-capable cache
- **No accounts, no servers** — Everything in localStorage

## Quick Start

```bash
npx serve .
```

## Test

```bash
npm test
```

## Tech

Vanilla JS, HTML, CSS — no frameworks, no build step.
