# Changelog

All notable changes to the Plex Web Interface for Kodi will be documented in this file.

## [1.8.0] - 2026-03-29

### Added

- **Search result sections** — search results grouped by Movies, TV Shows, and Music with section headers and item counts
- **Watched/Unwatched filter** — dropdown on Movies and TV Shows libraries to filter by All / Unwatched / Watched
- **Shuffle & Repeat controls** — toggle buttons in the player bar reflecting Kodi's shuffle/repeat state (off → all → one)
- **Queue / Up Next panel** — slide-out panel showing the current playback queue with click-to-jump and remove functionality
- **Library refresh buttons** — refresh icon in Movies, TV Shows, and Music library headers to re-fetch data in place
- `Player.SetShuffle` and `Player.SetRepeat` API methods added to kodi-api.js
- i18n strings for all new features across all 5 languages (en, de, fr, es, nl)

## [1.7.0] - 2026-03-29

### Added

- **Continue Watching** — hub row on the home view showing in-progress movies and episodes with resume progress bars, sorted by last played
- **Empty library states** — friendly empty-state messages with icons for Movies, TV Shows, and Music when libraries have no content
- **Sort persistence** — sort method and direction saved to localStorage and restored on revisit
- **Library item counts** — total counts displayed in library headers (e.g. "Movies (42)")
- **Genre filter chips** — filterable genre chip bar on Movies and TV Shows libraries
- **Context-aware back navigation** — detail view back button uses browser history instead of always returning to library
- `getInProgressMovies` and `getInProgressEpisodes` API methods for Continue Watching

## [1.6.0] - 2026-03-29

### Added

- **Skip-to-content link** for keyboard/screen reader users
- **Clickable hub titles** — hub row titles link to their respective library views
- **Sort direction toggle** — ascending/descending toggle buttons on all library sort controls
- Focus-visible styles on nav links, buttons, sort selects, and topbar buttons

### Fixed

- Arrow key shortcuts now gated behind `state.activePlayerId !== null` — prevents hijacking page scroll when nothing is playing
- Contrast bumped: `--color-text-secondary` to `#b3b3b3`, `--color-text-muted` to `#999999` (WCAG AA)
- Focus management on view navigation — heading receives focus for keyboard/remote users
- Scroll buttons baseline `opacity: 0.3` so they're always visible
- Toast notifications have `role="status"` and `aria-live="polite"` for screen readers
- Settings panel focus trap with `trapSettingsFocus()` — Tab/Shift+Tab cycles within panel
- `.btn-secondary` duplicate style fixed — settings scoped via `.settings-body .btn-secondary`

### Changed

- Progress bar thickness increased to 6px (was 4px)
- Volume slider track 6px with 14px thumb for easier interaction

## [1.5.0] - 2026-03-29

### Fixed

- `escapeAttr()` null guard — returns empty string for null/undefined input
- `--card-min-width` CSS variable mismatch corrected
- Trailer popover event listener leak — outside-click handler now properly cleaned up
- Zero-rating suppression — ratings of `0` no longer display misleadingly
- Client-side sort uses localeCompare-safe comparison
- Staleness guard on home view — skips re-fetch if loaded within 30 seconds
- Replaced inline `onclick` handlers with proper `addEventListener` calls
- `aria-current="page"` set on active nav link
- Volume slider has `aria-label="Volume"`

### Removed

- Dead/unused API methods cleaned from kodi-api.js
- Unused i18n public API exports removed

## [1.4.2] - 2026-03-29

### Added

- Real-world start/end times on Now Playing card (e.g. "18:30 – 20:05")
- OMDb API key now persists to Kodi addon settings (shared across all browsers/devices)
- On boot, reads `omdb_api_key` from addon settings XML via Kodi VFS

### Changed

- Library scan buttons now display side-by-side instead of stacked
- Addon version shown directly in settings About section

## [1.4.1] - 2026-03-29

### Changed

- Refactored monolithic app.js (2800+ lines) into 14 focused module files using a shared `window.KodiApp` namespace
- No build step required — modules load via ordered `<script>` tags
- Module files: state, views, detail, player, search, livetv, ratings, websocket, settings, playlists, genres, photos, shortcuts, app-boot

## [1.4.0] - 2026-03-29

### Added

- **Full album detail view** with track listing, artist/genre info, total duration, and play-all button
- **Playlist support** — view, play, and remove items from Kodi's active playlists (audio, video, pictures)
- **Genre filtering & tag browsing** — browse movies, TV shows, and music by genre; browse movies/TV by tag
- **Keyboard shortcuts** — Space (play/pause), Arrow keys (seek/volume), F (search), M (mute), N/P (next/prev), S (stop), 1-8 (views), Esc (close)
- **Image/photo library** — browse picture sources, navigate folders, lightbox viewer with prev/next navigation
- **Multi-language support** — English, Deutsch, Français, Español, Nederlands with language selector in settings
- Music library sort options (Title, Artist, Year, Date Added)
- Playlists nav link in top navigation
- Keyboard shortcuts reference in Settings panel
- Title-based OMDb fallback: fetches RT/Metacritic/IMDb ratings even when Kodi has no IMDb ID
- IMDb badge auto-added from OMDb data when Kodi's uniqueid lacks an imdb entry

### Fixed

- Now Playing card progress bar no longer has misleading left border accent line
- Ratings row: consistent font sizes and colours across IMDb, RT, and Metacritic badges

## [1.3.0] - 2026-03-29

### Added

- Official Kodi logo (from kodi.tv) used in topbar and as browser favicon
- Now Playing card redesigned: larger thumbnail with fallback, time/duration display, media type badge, play/pause button, subtitle for TV episodes and Live TV
- TV show detail view: always fetches full details (cast, ratings, premiered, status)
- WebSocket toggle and status moved inline next to label, description below

### Fixed

- Back button now has dark semi-transparent background with blur for visibility over any fanart
- Detail view guard changed from `!item.cast` to `!item.uniqueid` for more reliable full-detail fetch
- RT fresh/rotten score colours were swapped — corrected (green=fresh, red=rotten)
- Metacritic badge sized down to match inline rating row
- Metacritic link now goes to film page (`/movie/slug/`) instead of search
- Cast IMDb search uses `&exact=true` for better direct profile matches

## [1.2.3] - 2026-03-29

### Added

- Rotten Tomatoes badge links to RT film page, Metacritic badge links to Metacritic search
- RT and Metacritic ratings now display inline on the same row as IMDb score

### Fixed

- About section version now cache-busts addon.xml fetch and targets `<addon>` element specifically
- OMDb API key saves on typing (debounced 800ms) instead of requiring input blur
- OMDb key change now re-fetches critic ratings on current detail view immediately
- Addon settings API methods added for future server-side config storage

## [1.2.2] - 2026-03-29

### Added

- Cast members now link to their IMDb profile page
- Critic ratings (RT/Metacritic) shown next to IMDb score on both movie and TV show detail views

## [1.2.1] - 2026-03-29

### Fixed

- IMDb links now use `uniqueid.imdb` instead of `imdbnumber` to avoid TMDB ID mismatches (e.g. F1 linking to wrong film)
- OMDb API key input now saves on typing (debounced) instead of requiring blur, and re-fetches ratings immediately

### Improved

- TV show detail view: fetches full details (cast, IMDb, votes) like movies do
- TV show detail now shows season count, watch progress bar, premiered date, and show status badge (Continuing/Ended)
- Added `premiered`, `status`, `tag` properties to TV show detail API call

## [1.2.0] - 2026-03-29

### Added

- Movie Sets / Collections API methods (`getMovieSets`, `getMovieSetDetails`) for browsing movie collections
- System uptime display in Settings panel under Kodi section
- `System.Uptime` info label added to system properties fetch
- Kodi addon `resources/settings.xml` for server-side configuration (OMDb API key)

## [1.1.1] - 2026-03-29

### Fixed

- Movie detail view now fetches full details (cast, trailer, IMDb, votes) instead of using partial list data
- About section version now reads dynamically from addon.xml instead of being hardcoded
- Fixed `kodi.call()` references changed to `kodi.request()` (3 call sites in settings)

## [1.1.0] - 2026-03-29

### Added

- WebSocket support for real-time push notifications from Kodi (port 9090)
  - Auto-connects with HTTP fallback if WebSocket is unavailable
  - Event system (`kodi.on()`) for Player, Library, Volume, and Transport events
  - Instant UI response to play/pause/stop/seek/volume changes
  - Auto-refresh library views when scans finish
  - Toggle on/off in Settings with live connection status
  - Auto-reconnect with exponential backoff
- Settings panel (gear icon in topbar)
  - OMDb API key configuration with show/hide toggle
  - Accent colour picker (6 presets + custom)
  - Home row card size selector (Default/Compact/Large)
  - WebSocket toggle with status indicator
  - Library scan buttons (Video/Audio)
  - System info display (Kodi version)
  - About section with dynamic addon version
- Mobile responsive design overhaul
  - Hamburger menu at ≤576px with dropdown nav panel
  - Search input collapses to icon-only on small phones
  - Player bar height variable updated for wrapped layout
  - Detail view: reduced backdrop height, scaled title, wrapping action buttons
  - Episode items stack vertically at ≤480px
  - Settings panel goes full-width on small phones
  - Hub scroll arrows hidden on touch devices (native swipe)
  - Body scroll locked when EPG/settings panels are open
  - Cast and On Now strip scrollbars hidden consistently

### Changed

- Player polling reduced from 2s to 10s when WebSocket is active
- `OMDB_API_KEY` changed from `const` to `let` for runtime updates via settings

## [1.0.0] - 2026-03-29

### Added

- Initial MVP release
- Plex-inspired dark theme UI
- Home view with hub rows (Recent Movies, Recent Episodes, Recent Music, Now Playing)
- Movies library with grid view and sort controls
- TV Shows library with grid view, season/episode drill-down
- Music library with album grid
- Live TV support via TVHeadend (PVR)
  - Channel list with now/next EPG data and progress bars
  - Channel group filtering
  - EPG slide-out schedule panel
  - On Now horizontal strip
  - Channel playback and recording
- Movie detail view with poster, backdrop, metadata, genres, director, studio
- TV Show detail view with seasons and episode list
- Enhanced detail views with IMDb rating badges, vote counts, trailer button
- External links (IMDb page, Videos & Trailers, Trivia & BTS, Parental Guide)
- Cast section (up to 12 actors with avatar thumbnails)
- Rotten Tomatoes and Metacritic ratings via OMDb API
  - Async loading with localStorage caching
  - Colour-coded badges
- Player bar with play/pause, prev/next, seek, volume, progress
- Search across movies, TV shows, and music
- Kodi JSON-RPC API client (HTTP transport)
- Build scripts (PowerShell + Bash) with versioned zip output
- Changelog generator from git conventional commits
- GitHub Actions release workflow (triggers on version tags)
- Kodi-branded logo (blue K mark)
