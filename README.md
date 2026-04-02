# Kodi Plex Web UI

A modern, Plex-inspired web interface for [Kodi](https://kodi.tv). Browse your movies, TV shows, and music library with a dark-themed UI featuring sidebar navigation, full transport controls, and responsive design.

![License](https://img.shields.io/github/license/smoonlee/kodi-plex-webui)
![Release](https://img.shields.io/github/v/release/smoonlee/kodi-plex-webui)

## Features

- **Plex-style dark theme** — clean, modern interface inspired by the Plex media player
- **Home dashboard** — recently added movies, episodes, and albums at a glance
- **Featured hero carousel** — top home movies with premium slide transitions, refined controls, and quick play/details actions
- **Movie browser** — poster grid, detail view with cast, one-click play
- **TV Show browser** — drill down from shows → seasons → episodes
- **Music browser** — artist grid → album view
- **Search** — real-time debounced search across your entire library
- **Now Playing bar** — transport controls, seek slider, volume with mute
- **Toast notifications** — visual feedback for playback and library actions
- **Keyboard shortcuts** — Space (play/pause), M (mute), ← → (seek), Enter (activate)
- **Responsive** — works on desktop, tablet, and mobile with sidebar overlay
- **Accessible** — ARIA landmarks, focus-visible outlines, screen-reader labels
- **Zero dependencies** — pure HTML, CSS, and vanilla JavaScript

## Screenshots

> _Screenshots coming soon._

## Compatibility

| Kodi Version | Status      |
| ------------ | ----------- |
| 21 (Omega)   | ✅ Tested   |
| 20 (Nexus)   | ✅ Expected |
| 19 (Matrix)  | ⚠️ Untested |

Requires **HTTP control** enabled in Kodi. No authentication is needed when accessing from the same network. If Kodi is configured with a username/password, your browser will prompt for credentials automatically.

## Installation

### From GitHub Release

1. Download the latest `webinterface.plex-vX.X.X.zip` from [Releases](https://github.com/smoonlee/kodi-plex-webui/releases)
2. In Kodi, go to **Settings → System → Add-ons → Install from zip file**
3. Select the downloaded zip
4. Go to **Settings → Services → Control** and:
   - Enable **Allow remote control via HTTP**
   - Set **Web interface** to **Plex Web Interface**
5. Open `http://<kodi-ip>:8080` in your browser

### Manual Install

1. Clone or download this repository
2. Copy the `webinterface.plex` folder to your Kodi addons directory:
   - **Linux**: `~/.kodi/addons/`
   - **Windows**: `%APPDATA%\Kodi\addons\`
   - **macOS**: `~/Library/Application Support/Kodi/addons/`
3. Restart Kodi and enable the addon

## Configuration

The web interface works out of the box with no configuration. Kodi must have the following settings enabled:

- **Settings → Services → Control → Allow remote control via HTTP**: On
- **Port**: Default `8080` (configurable in Kodi)
- **Web interface**: Select **Plex Web Interface** from the dropdown

### Troubleshooting

| Problem                         | Solution                                                   |
| ------------------------------- | ---------------------------------------------------------- |
| Blank page / connection refused | Verify HTTP control is enabled and the port is correct     |
| No library content              | Ensure media sources are added and library is scanned      |
| Images not loading              | Check that Kodi's web server is accessible on your network |
| Playback won't start            | Confirm "Allow remote control via HTTP" is enabled         |

## Development

### Prerequisites

- A running Kodi instance with **HTTP control enabled** (Settings → Services → Control)
- PowerShell (for the build script)

### Build

```powershell
.\build.ps1
```

This creates a `dist/webinterface.plex-vX.X.X.zip` ready for installation.

### Project Structure

```text
webinterface.plex/
├── addon.xml          # Kodi addon metadata
├── index.html         # Entry point (ARIA landmarks, toast container)
├── css/
│   └── style.css      # Plex-inspired dark theme
└── js/
    ├── kodi.js        # Kodi JSON-RPC API wrapper
    └── app.js         # Main application logic (SPA routing, views, transport)
```

### Architecture

The app follows an **IIFE module pattern** with two modules:

- **`Kodi`** (`kodi.js`) — Low-level JSON-RPC wrapper. Exposes methods for Player, VideoLibrary, AudioLibrary, Application, Input, and System namespaces. All calls go through `sendRequest()` which handles the JSON-RPC envelope and error checking.
- **`App`** (`app.js`) — SPA shell with client-side routing via `navigate()`. Each view (home, movies, tvshows, music, search, settings) is an async function that fetches data and renders HTML. A `navGeneration` counter prevents stale responses from overwriting the current view. Polling is visibility-aware (paused when the browser tab is hidden).

### Keyboard Shortcuts

| Key   | Action                |
| ----- | --------------------- |
| Space | Play / Pause          |
| M     | Toggle mute           |
| ←     | Seek back 5%          |
| →     | Seek forward 5%       |
| Enter | Activate focused card |

## How It Works

The interface communicates with Kodi via its [JSON-RPC API](https://kodi.wiki/view/JSON-RPC_API) over HTTP. All library browsing, playback control, and search functionality uses standard Kodi RPC methods — no plugins or server-side code required. Images are proxied through Kodi's built-in `/image/` endpoint.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
