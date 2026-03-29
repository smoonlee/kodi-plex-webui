/**
 * Plex-style Kodi Web Interface — Boot Orchestrator
 *
 * Modules (loaded before this file):
 *   state.js     → Config, state, i18n, DOM refs, utilities
 *   views.js     → Navigation, home, library views, cards
 *   detail.js    → Movie / TV show / album detail views
 *   player.js    → Player controls & polling
 *   search.js    → Search
 *   livetv.js    → Live TV, channels, EPG
 *   ratings.js   → OMDb external ratings
 *   websocket.js → WebSocket real-time events
 *   settings.js  → Settings panel
 *   playlists.js → Playlist support
 *   genres.js    → Genre / tag browsing
 *   photos.js    → Photo library & lightbox
 *   shortcuts.js → Keyboard shortcuts
 */
(function (app) {
  "use strict";

  const { state, dom, kodi, showToast } = app;

  async function init() {
    app.bindNavigation();
    app.bindPlayerControls();
    app.bindSearch();
    app.bindScrollButtons();
    app.bindSettings();
    app.bindKeyboardShortcuts();
    app.bindPhotos();
    app.bindPlaylists();
    app.bindGenres();
    app.bindQueuePanel();
    await connect();
  }

  async function connect() {
    try {
      await kodi.ping();
      state.connected = true;
      dom.connectionStatus.classList.remove("disconnected");
      dom.connectionStatus.classList.add("connected");
      dom.connectionStatus.title = "Connected to Kodi";
      app.loadHome();
      app.startPlayerPolling();
      app.loadVolume();
      app.initWebSocket();
      // Load OMDb key from addon settings (overrides empty localStorage)
      loadAddonSettings();
    } catch {
      state.connected = false;
      dom.connectionStatus.classList.remove("connected");
      dom.connectionStatus.classList.add("disconnected");
      dom.connectionStatus.title = "Disconnected — is Kodi running?";
      dom.homeLoading.innerHTML = `
        <div class="error-message">
          <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#E5A00D" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          <h2>Cannot connect to Kodi</h2>
          <p>Make sure Kodi is running and the web server is enabled.<br>
          Settings → Services → Control → Allow remote control via HTTP</p>
          <button class="btn-primary" id="btn-retry">Retry</button>
        </div>
      `;
      const retryBtn = dom.homeLoading.querySelector("#btn-retry");
      if (retryBtn) retryBtn.addEventListener("click", () => location.reload());
      setTimeout(connect, 10000);
    }
  }

  async function loadAddonSettings() {
    try {
      const addonKey = await kodi.getAddonSettingVFS("omdb_api_key");
      if (addonKey && (!app.OMDB_API_KEY || app.OMDB_API_KEY !== addonKey)) {
        app.OMDB_API_KEY = addonKey;
        localStorage.setItem("omdbApiKey", addonKey);
        if (dom.settingOmdbKey) dom.settingOmdbKey.value = addonKey;
      }
    } catch {
      // Addon settings not available, localStorage key is fine
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window.KodiApp);
