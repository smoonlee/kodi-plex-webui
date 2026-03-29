# Plex Web Interface for Kodi (OSMC)

A modern, responsive web interface addon for Kodi that emulates the Plex look and feel. Browse your movie, TV show, and music library from any browser on your network.

![Kodi](https://img.shields.io/badge/Kodi-19%2B-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Plex-inspired dark theme** with gold accent colors
- **Home hub** with recently added movies, TV shows, and music
- **Full library browsing** — movies, TV shows (with seasons/episodes), music albums
- **Playback controls** — play, pause, stop, next, previous, seek, volume
- **Now playing bar** with real-time progress updates
- **Search** across your entire library
- **Sorting** by title, year, rating, or date added
- **Detail views** with plot, cast, ratings, and artwork (fanart/posters)
- **Responsive design** — works on desktop, tablet, and mobile
- **Zero dependencies** — pure vanilla HTML/CSS/JS, no build step

## Prerequisites

1. **Kodi 19 (Matrix)** or later running on OSMC (or any Kodi install)
2. **Web server enabled** in Kodi:
   - Go to `Settings → Services → Control`
   - Enable **"Allow remote control via HTTP"**
   - Note the **port** (default: `8080`)
   - Optionally set a username/password

## Installation

### Option 1: Install from zip (recommended)

1. **Build the zip package:**

   **Windows (PowerShell):**

   ```powershell
   .\build.ps1
   ```

   **Linux/macOS:**

   ```bash
   bash build.sh
   ```

   This creates `dist/webinterface.plex.zip`.

2. **Copy the zip to your OSMC device:**

   ```bash
   scp dist/webinterface.plex.zip osmc@<device-ip>:~/
   ```

3. **Install in Kodi:**
   - `Settings → Add-ons → Install from zip file`
   - Navigate to and select `webinterface.plex.zip`

4. **Activate the web interface:**
   - `Settings → Services → Control → Web interface`
   - Select **"Plex Web Interface"**

### Option 2: Manual install

Copy the `webinterface.plex` folder directly into the Kodi addons directory:

```bash
# OSMC (Raspberry Pi)
scp -r webinterface.plex osmc@<device-ip>:~/.kodi/addons/

# Linux
cp -r webinterface.plex ~/.kodi/addons/

# Windows
# Copy to %APPDATA%\Kodi\addons\

# macOS
# Copy to ~/Library/Application Support/Kodi/addons/
```

Then activate it in `Settings → Services → Control → Web interface`.

## Usage

Once installed and activated, open your browser and navigate to:

```
http://<kodi-ip>:8080
```

Replace `<kodi-ip>` with your Kodi/OSMC device's IP address and `8080` with your configured port.

## Project Structure

```
webinterface.plex/
├── addon.xml              # Kodi addon metadata
├── icon.png               # Addon icon
├── index.html             # Main entry point
├── css/
│   └── style.css          # Plex-inspired theme
├── js/
│   ├── kodi-api.js        # Kodi JSON-RPC API client
│   └── app.js             # Application logic & UI
└── img/
    ├── logo.svg           # Navigation logo
    ├── placeholder-poster.svg
    └── placeholder-landscape.svg
```

## How It Works

The web interface communicates with Kodi's built-in **JSON-RPC API** over HTTP. When served as a web interface addon, both the HTML files and the API share the same origin, so no CORS configuration is needed.

Key API methods used:

- `VideoLibrary.GetMovies` / `GetTVShows` / `GetRecentlyAdded*`
- `AudioLibrary.GetAlbums` / `GetRecentlyAddedAlbums`
- `Player.Open` / `PlayPause` / `Stop` / `Seek`
- `Application.SetVolume`

## Customization

Edit `css/style.css` to adjust the theme. Key CSS variables at the top of the file control colors, spacing, and typography:

```css
:root {
  --color-accent: #e5a00d; /* Plex gold — change for a different accent */
  --color-bg-primary: #1f1f1f; /* Main background */
  --color-bg-nav: #1a1a1a; /* Navigation bar */
  --card-width: 170px; /* Poster card width */
}
```

## Roadmap / Next Steps

- [x] Full album detail view with track listing
- [x] Playlist support
- [x] Genre filtering and tag browsing
- [x] Keyboard shortcuts
- [x] Image/photo library support
- [x] Addon settings page
- [x] WebSocket support for real-time updates
- [x] Mobile responsive design
- [x] Multi-language support

## License

MIT
