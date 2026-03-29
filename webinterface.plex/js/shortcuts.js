/**
 * Plex-style Kodi Web Interface — Keyboard Shortcuts
 */
(function (app) {
  "use strict";

  const { state, dom, kodi } = app;

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (state.activePlayerId !== null) {
            kodi.playPause(state.activePlayerId);
          }
          break;
        case "m":
        case "M":
          kodi.request("Application.SetMute", { mute: "toggle" });
          break;
        case "f":
        case "F":
          e.preventDefault();
          dom.searchInput.focus();
          break;
        case "ArrowRight":
          if (state.activePlayerId !== null) {
            e.preventDefault();
            kodi.request("Player.Seek", {
              playerid: state.activePlayerId,
              value: { seconds: 30 },
            });
          }
          break;
        case "ArrowLeft":
          if (state.activePlayerId !== null) {
            e.preventDefault();
            kodi.request("Player.Seek", {
              playerid: state.activePlayerId,
              value: { seconds: -10 },
            });
          }
          break;
        case "ArrowUp":
          if (state.activePlayerId !== null) {
            e.preventDefault();
            const vol = Math.min(100, parseInt(dom.volumeSlider.value, 10) + 5);
            dom.volumeSlider.value = vol;
            kodi.setVolume(vol);
          }
          break;
        case "ArrowDown":
          if (state.activePlayerId !== null) {
            e.preventDefault();
            const vol = Math.max(0, parseInt(dom.volumeSlider.value, 10) - 5);
            dom.volumeSlider.value = vol;
            kodi.setVolume(vol);
          }
          break;
        case "n":
        case "N":
          if (state.activePlayerId !== null) kodi.goNext(state.activePlayerId);
          break;
        case "p":
        case "P":
          if (state.activePlayerId !== null)
            kodi.goPrevious(state.activePlayerId);
          break;
        case "s":
        case "S":
          if (state.activePlayerId !== null) kodi.stop(state.activePlayerId);
          break;
        case "1":
          app.navigateTo("home");
          break;
        case "2":
          app.navigateTo("movies");
          break;
        case "3":
          app.navigateTo("tvshows");
          break;
        case "4":
          app.navigateTo("livetv");
          break;
        case "5":
          app.navigateTo("music");
          break;
        case "6":
          app.navigateTo("playlists");
          break;
        case "7":
          app.navigateTo("genres");
          break;
        case "8":
          app.navigateTo("photos");
          break;
        case "Escape":
          if (!dom.photoLightbox.classList.contains("hidden")) {
            app.closeLightbox();
          } else if (!dom.settingsPanel.classList.contains("hidden")) {
            app.closeSettings();
          }
          break;
      }
    });
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.bindKeyboardShortcuts = bindKeyboardShortcuts;
})(window.KodiApp);
