/**
 * Plex-style Kodi Web Interface — WebSocket Integration
 */
(function (app) {
  "use strict";

  const { state, dom, kodi, showToast } = app;

  let wsBound = false;

  function initWebSocket() {
    const wsEnabled = localStorage.getItem("wsEnabled") !== "false";
    if (!wsEnabled) return;

    kodi.connectWebSocket();
    bindWebSocketEvents();
  }

  function bindWebSocketEvents() {
    if (wsBound) return;
    wsBound = true;
    kodi.on("Transport.OnWebSocketOpen", () => {
      state.wsActive = true;
      updateWsStatusDisplay();
      app.startPlayerPolling();
    });

    kodi.on("Transport.OnWebSocketClose", () => {
      state.wsActive = false;
      updateWsStatusDisplay();
      app.startPlayerPolling();
    });

    kodi.on("Player.OnPlay", () => {
      app.pollPlayer();
    });

    kodi.on("Player.OnPause", () => {
      app.pollPlayer();
    });

    kodi.on("Player.OnStop", () => {
      state.activePlayerId = null;
      dom.playerBar.classList.add("hidden");
      dom.nowPlayingSection.classList.add("hidden");
    });

    kodi.on("Player.OnSeek", () => {
      app.pollPlayer();
    });

    kodi.on("Player.OnSpeedChanged", () => {
      app.pollPlayer();
    });

    kodi.on("Application.OnVolumeChanged", (params) => {
      if (params && params.data) {
        dom.volumeSlider.value = params.data.volume;
      }
    });

    kodi.on("VideoLibrary.OnScanFinished", () => {
      showToast("Video library scan complete");
      state.movies = [];
      state.tvshows = [];
      if (state.currentView === "home") app.loadHome();
      if (state.currentView === "movies") app.loadMovies();
      if (state.currentView === "tvshows") app.loadTVShows();
    });

    kodi.on("AudioLibrary.OnScanFinished", () => {
      showToast("Audio library scan complete");
      if (state.currentView === "home") app.loadHome();
      if (state.currentView === "music") app.loadMusic();
    });

    kodi.on("VideoLibrary.OnUpdate", () => {
      state.movies = [];
      state.tvshows = [];
      if (state.currentView === "home") app.loadHome();
    });

    kodi.on("AudioLibrary.OnUpdate", () => {
      if (state.currentView === "home") app.loadHome();
    });
  }

  function updateWsStatusDisplay() {
    if (!dom.wsStatus) return;
    if (state.wsActive) {
      dom.wsStatus.textContent = "Connected";
      dom.wsStatus.classList.add("connected");
      dom.wsStatus.classList.remove("disconnected");
    } else {
      dom.wsStatus.textContent =
        localStorage.getItem("wsEnabled") === "false"
          ? "Disabled"
          : "Disconnected";
      dom.wsStatus.classList.add("disconnected");
      dom.wsStatus.classList.remove("connected");
    }
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.initWebSocket = initWebSocket;
  app.bindWebSocketEvents = bindWebSocketEvents;
  app.updateWsStatusDisplay = updateWsStatusDisplay;
})(window.KodiApp);
