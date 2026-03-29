/**
 * Plex-style Kodi Web Interface — Playlists
 */
(function (app) {
  "use strict";

  const {
    dom,
    kodi,
    t,
    escapeHtml,
    escapeAttr,
    showToast,
    getArtwork,
    formatRuntime,
    pad,
  } = app;

  function bindPlaylists() {
    if (dom.btnRefreshPlaylists) {
      dom.btnRefreshPlaylists.addEventListener("click", () => loadPlaylists());
    }
  }

  async function loadPlaylists() {
    if (!app.state.connected) return;
    const container = dom.playlistsContainer;
    if (!container) return;
    container.innerHTML =
      '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
      const playlists = await kodi.getPlaylists();
      if (!playlists || playlists.length === 0) {
        container.innerHTML =
          '<p class="empty-message">No active playlists</p>';
        return;
      }

      container.innerHTML = "";
      for (const pl of playlists) {
        const typeLabel =
          pl.type === "audio"
            ? "🎵 Audio"
            : pl.type === "video"
              ? "🎬 Video"
              : "📷 Pictures";
        try {
          const result = await kodi.getPlaylistItems(pl.playlistid);
          const items = result.items || [];

          const section = document.createElement("div");
          section.className = "playlist-section";
          section.innerHTML = `
            <h3 class="playlist-title">${typeLabel} Playlist <span class="playlist-count">(${items.length} items)</span></h3>
            ${items.length === 0 ? '<p class="empty-message">Empty playlist</p>' : ""}
          `;

          if (items.length > 0) {
            const list = document.createElement("div");
            list.className = "playlist-items";
            items.forEach((item, index) => {
              const thumb = item.art
                ? getArtwork(item.art, "thumb") ||
                  getArtwork(item.art, "poster")
                : "";
              const title = item.title || item.label || "Unknown";
              const subtitle = item.artist
                ? Array.isArray(item.artist)
                  ? item.artist.join(", ")
                  : item.artist
                : item.showtitle
                  ? `${item.showtitle} · S${pad(item.season)}E${pad(item.episode)}`
                  : "";
              const duration = item.duration
                ? formatRuntime(item.duration)
                : item.runtime
                  ? formatRuntime(item.runtime)
                  : "";

              const row = document.createElement("div");
              row.className = "playlist-item";
              row.innerHTML = `
                <div class="playlist-item-index">${index + 1}</div>
                <div class="playlist-item-thumb">
                  ${thumb ? `<img src="${escapeAttr(thumb)}" alt="" loading="lazy">` : '<div class="playlist-item-icon">♫</div>'}
                </div>
                <div class="playlist-item-info">
                  <div class="playlist-item-title">${escapeHtml(title)}</div>
                  ${subtitle ? `<div class="playlist-item-subtitle">${escapeHtml(subtitle)}</div>` : ""}
                </div>
                <div class="playlist-item-duration">${duration}</div>
                <button class="playlist-item-play" data-playlistid="${pl.playlistid}" data-position="${index}" title="${t("play")}">
                  <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                </button>
                <button class="playlist-item-remove" data-playlistid="${pl.playlistid}" data-position="${index}" title="Remove">
                  <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              `;

              row
                .querySelector(".playlist-item-play")
                .addEventListener("click", (e) => {
                  e.stopPropagation();
                  kodi.playPlaylistPosition(pl.playlistid, index);
                  showToast(`${t("playing")}: ${title}`);
                });

              row
                .querySelector(".playlist-item-remove")
                .addEventListener("click", async (e) => {
                  e.stopPropagation();
                  await kodi.removeFromPlaylist(pl.playlistid, index);
                  showToast("Removed from playlist");
                  loadPlaylists();
                });

              list.appendChild(row);
            });
            section.appendChild(list);
          }
          container.appendChild(section);
        } catch {
          // Skip playlists that fail to load
        }
      }
    } catch (err) {
      console.error("Failed to load playlists:", err);
      container.innerHTML =
        '<p class="empty-message">Failed to load playlists</p>';
    }
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.bindPlaylists = bindPlaylists;
  app.loadPlaylists = loadPlaylists;
})(window.KodiApp);
