# Project Overview: AniVault (Ember)

AniVault (codenamed "Ember") is a premium cinematic anime streaming platform designed for high performance and deep metadata integration. It prioritizes aesthetic excellence and robust provider resolution.

## 🚀 Tech Stack
- **Framework**: React 18+ (Vite)
- **State Management**: React Context API (`AnimeProvider` in `src/hooks/useAnimeData.jsx`)
- **Styling**: Vanilla CSS with a cinematic design system (CSS Variables, Glassmorphism, GPU-accelerated animations)
- **Data Fetching**: 
  - **AniList API (GraphQL)**: Primary metadata source for titles, descriptions, genres, and relations.
  - **Anikoto API (REST)**: Provider bridge for stream URLs and episode metadata.
- **Persistence**: `localStorage` (key: `ember_data` for user library, `anikoto_mapping_v1` for provider cache).

## 🛠 Core Features & Architecture

### 1. Library Management
- **Schema**: Uses `anivault_v2` schema for cross-platform compatibility.
- **Statuses**: `watching`, `queued`, `plan-to-watch`, `rewatching`, `paused`, `favorites`, `completed`, `archived`, `dropped`, `untracked`.
- **Logic**: Managed via `useAnimeData` hook, providing `addToLibrary`, `updateEntry`, and `saveData` utilities.

### 2. Intelligent Provider Resolution (`src/utils/api.js`)
- **MegaPlay (Anikoto)**: The primary provider. Since Anikoto uses internal IDs, the system implements a multi-stage resolver:
  1. **Direct ID Mapping**: Matches AniList/MAL IDs directly from Anikoto's `ani_id`/`mal_id` fields.
  2. **Deep Pagination Scanning**: Scans up to 50 pages of the `recent-anime` endpoint to find legacy or archived titles.
  3. **Fuzzy Title Matching**: Uses normalized title scoring (`scoreAnikotoTitleMatch`) to resolve titles with slight variations.
- **Fallbacks**: Seamlessly transitions to `VidNest`, `VidSrc`, or `AnimeSuge` if MegaPlay resolution fails.

### 3. Metadata & Discovery
- **Search**: Real-time AniList search with result normalization.
- **Seasonal**: Full integration with AniList GraphQL for seasonal browsing.
- **Watch Order**: Automatically resolves franchise relations (Preqels, Sequels, Side Stories) using AniList's relation graph.

### 4. Cinematic Player (`src/sections/Watch.jsx`)
- **Dynamic Resolution**: Asynchronously resolves stream URLs based on selected provider and language (Sub/Dub).
- **Status Overlay**: Shows real-time feedback during provider deep-scanning ("Searching Anikoto database...").
- **Persistence**: Automatically updates `episodesWatched` and `lastWatched` timestamps upon marking episodes.

## 📁 Key Directories
- `src/components`: UI components (Hero, Navbar, AnimeRows).
- `src/sections`: Main page views (Home, Browse, Library, Watch).
- `src/utils`: Core logic (`api.js` for fetching, `animeUtils.js` for normalization/sorting).
- `src/hooks`: Global state hooks.

## ⚠️ Important Considerations for AI Assistants
- **Respect Rate Limits**: Anikoto API has a limit of 60 requests / 120 seconds. Resolution logic should be efficient.
- **Title Normalization**: Always use `_normTitle` from `animeUtils.js` when comparing titles to ignore special characters and case.
- **Mapping Cache**: Always check `anikoto_mapping_v1` in `localStorage` before performing a deep scan.
- **Aesthetics**: Maintain the "Premium/Cinematic" feel. UI changes should prioritize smooth transitions and consistent spacing using the established design tokens.

## 🔧 Local Development
- **Vite Proxy**: A proxy is configured in `vite.config.js` to map `/api/anikoto` to `https://anikotoapi.site` to bypass CORS.
- **GitHub Pages**: The project is configured for deployment via `.github/workflows/static.yml` with the base path `/Ember/`.
