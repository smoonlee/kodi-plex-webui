# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.14.1] - 2026-04-02

### Added

- **Blue theme** — introduced a new `Azure Blue` appearance option with a cool-toned palette for surfaces, controls, and accents
- **Featured hero auto-scroll** — Home featured carousel now advances automatically after a short delay, while pausing on hover/focus and respecting reduced-motion preferences

## [1.14.0] - 2026-04-02

### Improved

- **Featured hero transition** — refined the carousel with a smoother premium motion profile (softer easing, directional slide, and cinematic fade/blur handoff)
- **Featured hero controls** — upgraded previous/next buttons to polished chevron icon controls with improved hover/press micro-interactions and clearer active-state dots

### Fixed

- **Release marker alignment** — updated addon metadata, settings About label, and service worker cache key for the 1.14.0 release

## [1.13.0] - 2026-04-02

### Added

- **Featured hero carousel** — Home now supports browsing a rotating set of up to 5 featured films with previous/next controls and position dots

### Fixed

- **Detail rating panel padding** — improved spacing around language/audio tags and OMDB rating badges so the metadata block no longer feels cramped
- **Badge readability** — tuned chip/badge padding and line-height for cleaner visual balance in movie and TV detail overlays

## [1.12.1] - 2026-04-02

### Fixed

- **Collection view overlaps** — improved header/action wrapping in Movies and TV Shows to prevent control collisions on narrower viewports
- **Settings flyout wrapping** — fixed horizontal overflow in settings content rows/tables so long values and controls no longer overlap
- **Collection toolbar stability** — corrected toolbar alignment/sizing so filter groups and selects flow cleanly across breakpoints
- **Featured hero stylesheet bug** — moved ambient glow pseudo-element rules out of an invalid nested block to restore predictable CSS cascade

## [1.12.0] - 2026-04-02

### Added

- **TV spatial navigation** — arrow keys now move focus across actionable UI elements in a remote-control-friendly way
- **Back-key behavior** — `Backspace`/browser-back keys now close transient panels first, then navigate history
- **Focus restoration** — modals and settings flyout now return keyboard focus to the previously active control when closed

### Changed

- **Keyboard model** — directional arrows now prioritize lean-back UI focus movement; media seek is moved to `Shift + ←/→`
- **Shortcuts help** — keyboard shortcuts modal updated to document TV-style navigation and revised seek actions
- **App shell cache list** — service worker now caches the new `js/tv-navigation.js` module

### Improved

- **Lean-back visual polish** — focused elements receive stronger high-contrast focus rings, elevation, and card emphasis in TV navigation mode
- **Ambient motion design** — subtle hero-surface glow animation added for featured and now-playing hero treatments
- **Reduced-motion support** — new motion effects gracefully disable under `prefers-reduced-motion`

## [1.11.0] - 2026-04-02

### Added

- **Watchlist** — save movies, TV shows, and albums to a persistent local watchlist with a dedicated library view
- **Theme selector** — choose between Midnight Gold, Amethyst Glow, and Forest Night in Settings
- **Recent searches** — Search view now remembers and replays recent queries with quick-access chips
- **Advanced collection filters** — Movies and TV Shows now support genre, year, rating, and watched-status filters
- **Incremental grid rendering** — large collections render in batches for smoother browsing on big libraries
- **Featured home hero** — when nothing is playing, Home surfaces a premium featured-content hero card

### Changed

- **Collection architecture** — shared filtering, sorting, summaries, and lazy rendering extracted into `js/collections.js`
- **Kodi data access** — added cached data helpers in `js/data.js` to reduce repeated JSON-RPC calls across views
- **Personalisation state** — themes, watchlist, and recent searches are now managed centrally in `js/preferences.js`
- **Home experience** — Continue Watching, Watchlist, and featured content shelves now feel more like a modern streaming app
- **Search UX** — instant results are now cached and protected against stale async responses overwriting newer searches
- **Settings UX** — settings now expose appearance and personalisation controls in addition to system info and library stats

### Fixed

- **Player polling cadence** — polling now chooses the correct active/idle interval after the initial refresh
- **Inline-style cleanup** — moved remaining layout-oriented inline styles from JS-generated views into modular CSS classes
- **Modal state handling** — dialog open/close behavior now uses shared helpers and semantic hidden states more consistently

## [1.10.1] - 2026-03-31

### Added

- **Live TV channel name in Now Playing** — the now-playing bar and home hero banner now show the channel name (e.g. 📺 BBC One) when watching live TV
- **Channel guide button** — hero banner shows a 📋 Guide button linking to the current channel's EPG when watching live TV
- **Live TV hero label** — hero banner shows "Live TV" instead of "Now Playing" for PVR content

## [1.10.0] - 2026-03-30

### Changed

- **Modular architecture** — split the 2,500-line monolithic `app.js` into 14 ES module files for maintainability:
  - `state.js` — shared configuration and application state
  - `helpers.js` — utility functions, toast notifications, connection banner
  - `ui.js` — card rendering, shelves, image helpers, OMDB badges
  - `player.js` — now-playing bar, transport polling, player state
  - `router.js` — client-side navigation with route registry pattern
  - `actions.js` — event delegation, keyboard shortcuts, random pick
  - `views/home.js` — home page with Now Playing hero and shelves
  - `views/movies.js` — movie grid, genre filters, movie detail
  - `views/tvshows.js` — TV show grid, seasons, episodes
  - `views/music.js` — artist grid, albums, album detail
  - `views/livetv.js` — channel groups, channel list, EPG guide
  - `views/search.js` — topbar-driven multi-library search
  - `views/settings.js` — settings flyout, system info, OMDB config
- **ES modules** — switched from IIFE pattern to native ES modules (`import`/`export`) with `<script type="module">`
- **Service worker integrated** — moved SW registration into `app.js`; removed standalone `sw-register.js`
- **Updated SW cache** — app shell cache now includes all 14 module files

## [1.9.2] - 2026-03-30

### Fixed

- **Syntax error in showSeasonEpisodes** — removed stray extra closing brace that caused `SyntaxError: Missing catch or finally after try`, breaking the entire app

## [1.9.1] - 2026-03-30

### Fixed

- **Blank home page** — removed duplicate `<script src="js/app.js">` that caused the App module to initialise twice, breaking navigation
- **CSP inline script block** — moved service worker registration from inline `<script>` to external `js/sw-register.js`; added explicit `script-src 'self'` to Content-Security-Policy header

## [1.9.0] - 2026-03-30

### Added

- **Connection status banner** — auto-shows after 3 consecutive RPC failures with a retry button; hides on recovery
- **Keyboard shortcuts modal** — press `?` to view all keyboard shortcuts in a grouped modal dialog
- **Random Movie picker** — 🎲 button on Movies page selects a random unwatched movie with play/details options
- **Genre filter chips** — Movies and TV Shows pages show clickable genre pills for instant client-side filtering
- **Resume intelligence** — movie detail shows "▶ Resume from X:XX" with a secondary "Play from Start" button when a resume point exists
- **Stream detail tags** — movie detail displays audio/subtitle language tags (🔊 ENG, 💬 SPA, etc.) from stream metadata
- **Play Next Episode** — TV show season view finds the first unwatched episode and shows a "▶ Play S01E05" quick-play button
- **Episode watched indicators** — episode rows show ✓ Watched tag or unwatched dot based on playcount
- **Album detail view** — new page with album art, metadata, description, and numbered track list with per-track play buttons
- **"See All →" shelf links** — home page shelves link directly to Movies, TV Shows, and Music pages
- **Library statistics** — settings panel shows movie, show, artist, and album counts in a stat-card grid
- **Search includes Live TV** — topbar search now also matches channel names and shows results alongside media
- **Service worker (PWA)** — offline app shell caching with network-first HTML, cache-first assets, and `/jsonrpc` bypass
- **Page transitions** — smooth fade-in animation when navigating between views
- **Detail skeleton loaders** — shimmer placeholder layout while detail pages load instead of plain spinner
- **Actionable toasts** — toast notifications can now include clickable action labels
- **Mobile NP expand** — tap album art on mobile to expand now-playing bar to full-screen with seek/volume controls
- **Tablet breakpoint** — dedicated responsive styles for 641–900px screens

### Changed

- **Smart polling** — polls every 3s when a player is active, slows to 10s when idle to reduce unnecessary traffic
- **Card hover effects** — richer box-shadow and `will-change: transform` for smoother hover animations
- **Play overlay on cards** — hovering a card poster now fades in a ▶ play icon overlay
- **Shelf gradient hints** — horizontal shelves show gradient edge masks to hint at scrollable content
- **Nav indicator animation** — active nav link underline now animates via scaleX keyframes
- **Unwatched dot badge** — small accent-colored dot replaces large unwatched badge on cards
- **10-foot / TV mode** — larger focus rings and taller detail hero for couch-friendly navigation
- **Album card navigation** — clicking an album in artist view now opens album detail instead of immediately playing
- **Popstate routing** — browser back/forward now supports compound routes (movie/123, tvshow/123/2, album/123)

### Fixed

- **Empty state improvements** — empty libraries show icon, message, and "Scan Library" action button instead of blank space
- **Error state retry** — all views show a "Retry" button on load failure instead of a dead-end error message

## [1.8.0] - 2026-03-30

### Added

- **Show start/end times on Live TV channel list** — current and next programme rows now display broadcast times (e.g. "22:00 – 22:30")
- **Topbar search bar** — replaced the Search nav link with an inline search input in the top bar; typing triggers debounced results in the content area
- **Settings flyout panel** — Settings opens as a slide-in panel from the right instead of a full-page view, with overlay backdrop and Escape/click-away to close

### Changed

- **Now-playing bar redesign** — three-column grid layout (artwork + info | transport + seek | volume); gradient background, hover-reveal slider thumbs, micro-interaction animations
- **Mobile responsive improvements** — search bar fills available topbar space, settings flyout goes full-width on small screens, settings input fields stack vertically, brand spacing reduced

### Fixed

- **Focus-visible styles** — added keyboard focus outlines to settings button, search clear button, and flyout close button

## [1.7.0] - 2026-03-30

### Fixed

- **Back button alignment on episode view** — "← Back to Seasons" button is now left-aligned directly above the season title instead of having excessive padding

## [1.6.0] - 2026-03-30

### Added

- **Sort dropdown** — Movies and TV Shows views now have a sort selector (Name A–Z / Z–A, Newest/Oldest, Highest Rated)
- **Search clear button** — "✕" button appears in the search input when text is entered; `Escape` key also clears the search
- **EPG auto-scroll** — opening a channel's programme guide automatically scrolls to the currently-airing show
- **Touch swipe on shelves** — horizontal shelf rows respond to swipe gestures on touch devices
- **PWA manifest** — `manifest.json` added with Apple mobile web app meta tags for "Add to Home Screen" support
- **Version in Settings** — About section now shows the web UI version number

### Fixed

- **Stale addon description** — `addon.xml` description updated from "sidebar navigation" to "topbar navigation"

## [1.5.0] - 2026-03-30

### Fixed

- **Home page crash** — added missing `Kodi.getInProgressMovies()` and `Kodi.getInProgressEpisodes()` API methods that were called but never defined (critical bug from v1.4.0)
- **Search scroll arrows missing** — search results now wrapped in `<section class="shelf">` so `initShelves()` can attach scroll arrow buttons
- **Stale CSS variable name** — renamed `--bg-sidebar` to `--bg-topbar` throughout stylesheet since the sidebar was removed in v1.3.2

### Changed

- **Extracted `episodeLabel()` helper** — the `S00E00` formatting pattern (used 3 times) is now a single reusable function
- **Cached now-playing DOM refs** — `updateNowPlaying()` no longer runs ~10 `querySelector()` calls every 3-second poll cycle; refs are cached on first access
- **Removed duplicate CSS comment** — cleaned up the orphaned "Hamburger (mobile)" comment block

## [1.4.0] - 2026-03-30

### Added

- **Continue Watching shelf** — Home page shows in-progress movies and episodes with resume progress bars, sorted by last played
- **Browser history routing** — back/forward buttons navigate between top-level views; URL hash (`#movies`, `#tvshows`, etc.) is preserved across page reloads
- **Skeleton loading placeholders** — shimmer skeleton cards replace the generic spinner on Home, Movies, TV Shows, and Music views for better perceived performance
- **Shelf scroll arrows** — left/right arrow buttons appear on hover over horizontal shelves for mouse users (CSS + JS)
- **`/` keyboard shortcut** — press `/` to jump directly to the Search view
- **Topbar backdrop blur** — navigation bar uses translucent background with `backdrop-filter: blur(12px)` for depth
- **Active nav underline** — active navigation link now has an amber accent line underneath for clearer visual indication
- **Card image fade-in** — poster images animate in with a subtle 0.3s opacity transition instead of appearing abruptly
- **Card bottom gradient** — cards have a subtle bottom gradient overlay improving title readability against bright posters
- **Card hover lift** — cards elevate with `translateY(-6px)` and shadow on hover for tactile depth feedback

## [1.3.2] - 2026-03-30

### Changed

- **Horizontal top navigation** — replaced vertical sidebar with a horizontal topbar; brand + nav links sit in a single row across the top of the viewport, freeing up full-width content space
- **Mobile responsive nav** — on screens ≤640px the nav collapses behind a hamburger button that opens a dropdown menu; tapping outside or navigating auto-closes it
- **EPG live show highlight** — the currently airing programme now has a stronger amber background, inset border glow, and accent-coloured time and title text for better visibility
- **Mobile content padding** — reduced top padding since the fixed sidebar no longer overlaps content

### Removed

- Sidebar layout (`#sidebar`, `.sidebar-brand`, `.sidebar-nav`, `.sidebar-overlay`, `--sidebar-width`)

## [1.3.1] - 2026-03-30

### Changed

- **Cast cards link to IMDb** — clicking an actor opens an IMDb name search for that person in a new tab

## [1.3.0] - 2026-03-30

### Fixed

- **OMDB ratings missing title links** — `injectOmdbData()` now passes `title` to `renderOmdbRatings()`, fixing broken Rotten Tomatoes and Metacritic search URLs
- **Double-encoded rating URLs** — removed redundant `escapeHtml()` on already-percent-encoded RT/Metacritic URLs that broke titles with special characters
- **Live TV missing channel icons** — restored `"icon"` property to `PVR.GetChannels` request (accidentally removed in v1.2.0 fix)
- **Live TV invalid params error** — removed unsupported `sort` parameter from `PVR.GetChannels` that caused -32602 errors
- **Mobile now-playing bar invisible/cramped** — added stacked two-row layout for screens ≤640px with proper thumb/title/transport sizing and `safe-area-inset-bottom` for notched phones

### Added

- **Shared OMDB config** — new `config.json` in addon root; `OMDB.loadConfig()` reads shared API key on first lookup so all devices on the network get ratings without per-browser setup
- **Clickable rating badges** — IMDb, Rotten Tomatoes, and Metacritic badges now link to their respective websites
- **SVG transport icons** — replaced emoji transport controls (⏮⏭⏹▶⏸) with crisp inline SVG icons for consistent cross-browser rendering

### Changed

- **Square buttons** — all `.btn`, `.group-select`, `.search-bar input`, and `.genre-tag` elements use `border-radius: 6px` instead of pill-shaped `999px`
- Settings page now explains how to share the OMDB key via `config.json`

## [1.1.5] - 2026-03-30

### Fixed

- **Broken CSS variables in Live TV** — `.channel-row`, `.epg-row`, and `.btn-sm` referenced undefined CSS custom properties (`--card-bg`, `--sidebar-hover`, `--surface`, `--text`), causing invisible backgrounds and no hover states
- **Movies/TV shows played on click instead of showing detail** — Home page movie cards used `play-movie` action; now uses `show-movie` to display metadata, OMDB scores, and cast first
- **Missing poster art** — added `"art"` property to all Kodi API calls (movies, TV shows, seasons, episodes, recent items, search); new `getPoster()` helper prefers `art.poster` → `art["season.poster"]` → `art["tvshow.poster"]` → `thumbnail` fallback
- **Search results missing artwork** — `searchMovies`, `searchTVShows`, and `searchArtists` now request the `art` property

### Added

- **OMDB / IMDb integration** — new `omdb.js` module with in-memory cache and localStorage API key persistence; movie and TV show detail pages show IMDb, Rotten Tomatoes, and Metacritic rating badges, awards, box office, and IMDb link
- **OMDB settings UI** — API key input in Settings with save/clear and toast feedback
- **Live TV support** — PVR channel groups, channel list with icons/numbers/now playing/next/recording indicator, per-channel EPG programme guide with live badge and timer icons
- **Live TV group selector** — dropdown to switch between channel groups (replaces confusing card-based group selection)
- **Content Security Policy** — `<meta>` CSP tag with `connect-src` for OMDB API
- **`<meta name="theme-color">`** — matches the dark palette for mobile browsers
- **AbortController support** — `Kodi.sendRequest()` accepts `opts.signal`; navigation cancels in-flight requests via `navController`
- **30-second request timeout** — all Kodi JSON-RPC calls abort after 30s instead of hanging forever
- **Polling paused during navigation** — prevents RPC contention while views load
- **Polling in-flight guard** — `_pollingInFlight` boolean prevents stacking poll requests
- **`renderCard()` template helper** — single card renderer used across all views with `aria-label`, variants, badges, and progress bars
- **Firefox range track styling** — `::-moz-range-track` rules for progress and volume sliders
- **`prefers-reduced-motion`** — disables all animations and transitions for users who prefer reduced motion
- **10-foot TV breakpoint** — `@media (min-width: 1800px)` with larger cards, fonts, and transport controls

### Changed

- **UI overhaul** — deeper dark palette (#141414), richer shadows, pill-shaped buttons with hover glow, translucent glass-like secondary buttons, genre tags with subtle borders, card hover zoom + dark overlay, highlighted play/pause transport button, pill search input, stronger detail hero gradient, slim translucent scrollbar, smoother per-element transitions
- **Sidebar refined** — lighter font weight, subtler hover states, cleaner active indicator
- **Toast animation** — now rises from bottom instead of sliding from right
- **Border radius** — increased from 8px/4px to 10px/6px for a more modern feel
- **`imdbnumber`** added to `getMovieDetails` and `getTVShowDetails` properties
- **Inline `style="padding:1.5rem"`** replaced with `.detail-back` CSS class
- **`applyBackgrounds()`** — URL validation regex rejects non-proxy, non-http URLs

## [1.1.0] - 2026-03-30

### Security

- **Fixed XSS in poster fallback** — removed unsafe inline `onerror` handler; image errors now handled via delegated event listener in capture phase
- **Fixed CSS injection** — fanart background images are now applied via DOM property (`el.style.backgroundImage`) instead of inline `style` attribute injection
- **Fixed arbitrary method execution** — `inputDirection()` now validates against an allowlist of permitted directions

### Added

- **Toast notifications** — visual feedback for playback, library scan, and error actions
- **Keyboard shortcuts** — Space (play/pause), M (mute), ← → (seek ±5%), Enter (activate card)
- **Visibility-aware polling** — now-playing polling pauses when the browser tab is hidden
- **Navigation race-condition guard** — `navGeneration` counter prevents stale API responses from overwriting the current view
- **Cached player ID** — transport buttons reuse the cached `activePlayerId` instead of calling `getActivePlayers()` before every action
- **Mobile sidebar overlay** — semi-transparent backdrop with blur when sidebar is open on mobile
- **ARIA accessibility** — landmarks (`role="navigation"`, `role="main"`), `aria-label` on all controls, `aria-current="page"` on active nav, `aria-live="polite"` toast container
- **Focus-visible outlines** — keyboard focus indicators on cards, buttons, nav links, and episode rows
- **`.gitignore`** — excludes `dist/`, OS files, editor files
- **`.editorconfig`** — 2-space indent, LF line endings, UTF-8, trim trailing whitespace
- **`CONTRIBUTING.md`** — contributor guidelines

### Changed

- `escapeHtml()` now uses a static lookup map instead of creating a DOM element per call
- Search input uses a module-level debounce timer (prevents listener stacking on re-navigation)
- Seek slider uses `change` event instead of `input` to avoid flooding JSON-RPC calls
- Volume slider is throttled (100ms)
- Cast member limit extracted to `CONFIG.CAST_LIMIT` constant

### Removed

- Unused `--topbar-height` CSS custom property

## [1.0.0] - 2026-03-30

### Added

- Initial release of the Plex-style Kodi Web Interface
- Dark theme inspired by Plex media player UI
- Sidebar navigation with Home, Movies, TV Shows, Music, Search, and Settings
- **Home** — Recently added movies, episodes, and albums shelves
- **Movies** — Grid browse with poster art, detail view with cast, play button
- **TV Shows** — Grid browse with drill-down: Show → Seasons → Episodes
- **Music** — Artist grid with album drill-down
- **Search** — Real-time search across movies, TV shows, and artists
- **Settings** — System information display, library scan triggers
- **Now Playing** bar with transport controls (play/pause, stop, prev/next)
- Seek slider and volume control with mute toggle
- Responsive design for desktop, tablet, and mobile
- Kodi JSON-RPC API wrapper (`kodi.js`) covering Player, VideoLibrary, AudioLibrary, Application, Input, and System namespaces
- Watched badge indicators and progress bars on TV show cards
- Poster placeholder fallback for missing artwork
- Mobile hamburger menu for sidebar toggle
