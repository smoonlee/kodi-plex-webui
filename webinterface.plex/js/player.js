/**
 * Plex-style Kodi Web Interface — Player Controls & Polling
 */
(function (app) {
  "use strict";

  const {
    state,
    dom,
    kodi,
    t,
    escapeHtml,
    escapeAttr,
    showToast,
    getArtwork,
    formatTime,
    pad,
  } = app;

  // ─── Player Controls ─────────────────────────────────────────────────
  function bindPlayerControls() {
    document
      .querySelector("#btn-play-pause")
      .addEventListener("click", async () => {
        if (state.activePlayerId !== null) {
          await kodi.playPause(state.activePlayerId);
        }
      });

    document.querySelector("#btn-stop").addEventListener("click", async () => {
      if (state.activePlayerId !== null) {
        await kodi.stop(state.activePlayerId);
      }
    });

    document.querySelector("#btn-next").addEventListener("click", async () => {
      if (state.activePlayerId !== null) {
        await kodi.goNext(state.activePlayerId);
      }
    });

    document.querySelector("#btn-prev").addEventListener("click", async () => {
      if (state.activePlayerId !== null) {
        await kodi.goPrevious(state.activePlayerId);
      }
    });

    document
      .querySelector("#btn-shuffle")
      .addEventListener("click", async () => {
        if (state.activePlayerId !== null) {
          await kodi.setShuffle(state.activePlayerId, "toggle");
          pollPlayer();
        }
      });

    document
      .querySelector("#btn-repeat")
      .addEventListener("click", async () => {
        if (state.activePlayerId !== null) {
          await kodi.setRepeat(state.activePlayerId, "cycle");
          pollPlayer();
        }
      });

    dom.progressBar.addEventListener("click", async (e) => {
      if (state.activePlayerId === null) return;
      const rect = dom.progressBar.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      await kodi.seek(state.activePlayerId, pct);
    });

    dom.volumeSlider.addEventListener("input", async () => {
      await kodi.setVolume(parseInt(dom.volumeSlider.value, 10));
    });
  }

  async function loadVolume() {
    try {
      const props = await kodi.getVolume();
      dom.volumeSlider.value = props.volume;
    } catch {
      /* ignore */
    }
  }

  function startPlayerPolling() {
    if (state.playerPollInterval) clearInterval(state.playerPollInterval);
    const interval = state.wsActive ? 10000 : 2000;
    state.playerPollInterval = setInterval(pollPlayer, interval);
    pollPlayer();
  }

  async function pollPlayer() {
    if (!state.connected) return;

    try {
      const players = await kodi.getActivePlayers();
      if (players.length === 0) {
        state.activePlayerId = null;
        dom.playerBar.classList.add("hidden");
        dom.nowPlayingSection.classList.add("hidden");
        return;
      }

      const player = players[0];
      state.activePlayerId = player.playerid;
      dom.playerBar.classList.remove("hidden");

      const [props, itemResult] = await Promise.all([
        kodi.getPlayerProperties(player.playerid),
        kodi.getPlayerItem(player.playerid),
      ]);

      const item = itemResult.item;

      // Update player bar
      const thumb = item.art
        ? getArtwork(item.art, "thumb") || getArtwork(item.art, "poster")
        : "";
      dom.playerThumb.src = thumb;
      dom.playerTitle.textContent = item.title || "";
      dom.playerSubtitle.textContent = item.showtitle
        ? `${item.showtitle} · S${pad(item.season)}E${pad(item.episode)}`
        : Array.isArray(item.artist)
          ? item.artist.join(", ")
          : "";

      dom.playerTime.textContent = formatTime(props.time);
      dom.playerDuration.textContent = formatTime(props.totaltime);
      dom.progressFill.style.width = `${props.percentage}%`;

      // Play/pause icon
      if (props.speed > 0) {
        dom.iconPlay.classList.add("hidden");
        dom.iconPause.classList.remove("hidden");
      } else {
        dom.iconPlay.classList.remove("hidden");
        dom.iconPause.classList.add("hidden");
      }

      // Shuffle state
      const shuffleBtn = document.querySelector("#btn-shuffle");
      if (shuffleBtn) {
        shuffleBtn.classList.toggle("active", !!props.shuffled);
      }

      // Repeat state
      const repeatBtn = document.querySelector("#btn-repeat");
      const repeatBadge = document.querySelector("#repeat-badge");
      if (repeatBtn) {
        const isRepeat = props.repeat && props.repeat !== "off";
        repeatBtn.classList.toggle("active", isRepeat);
        if (repeatBadge) {
          if (props.repeat === "one") {
            repeatBadge.textContent = "1";
            repeatBadge.classList.remove("hidden");
          } else {
            repeatBadge.classList.add("hidden");
          }
        }
      }

      // Now playing section on home
      if (state.currentView === "home") {
        dom.nowPlayingSection.classList.remove("hidden");
        updateNowPlaying(item, props, player, thumb);
      }
    } catch {
      // Ignore polling errors
    }
  }

  // ─── Now Playing (in-place DOM updates) ────────────────────────────────
  let npCurrentItemId = null;

  function buildNowPlayingScaffold() {
    dom.nowPlayingBar.innerHTML = `
      <div class="now-playing-card">
        <div class="np-thumb-wrap">
          <img src="" alt="" class="np-thumb" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="np-thumb-fallback">
            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="#808080" d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
          </div>
          <span class="np-type-badge"></span>
        </div>
        <div class="np-info">
          <div class="np-title"></div>
          <div class="np-subtitle"></div>
          <div class="np-time"></div>
        </div>
        <div class="np-controls">
          <button class="np-playpause">
            <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        <div class="np-progress">
          <div class="np-progress-fill"></div>
        </div>
      </div>
    `;
    const ppBtn = dom.nowPlayingBar.querySelector(".np-playpause");
    ppBtn.addEventListener("click", () => {
      if (state.activePlayerId !== null) kodi.playPause(state.activePlayerId);
    });
  }

  function updateNowPlaying(item, props, player, thumb) {
    const card = dom.nowPlayingBar.querySelector(".now-playing-card");
    if (!card) {
      buildNowPlayingScaffold();
    }

    // Determine if item changed (need to update thumb/title/badge)
    const itemId = item.id || item.title || "";
    const itemChanged = itemId !== npCurrentItemId;
    npCurrentItemId = itemId;

    if (itemChanged) {
      const thumbEl = dom.nowPlayingBar.querySelector(".np-thumb");
      const fallback = dom.nowPlayingBar.querySelector(".np-thumb-fallback");
      if (thumb) {
        thumbEl.src = thumb;
        thumbEl.style.display = "";
        fallback.style.display = "none";
      } else {
        thumbEl.style.display = "none";
        fallback.style.display = "flex";
      }

      const typeLabel =
        item.type === "channel"
          ? t("liveTV")
          : item.type === "movie"
            ? t("movie")
            : item.type === "episode"
              ? t("tvShow")
              : item.type === "song"
                ? t("music")
                : "";
      dom.nowPlayingBar.querySelector(".np-type-badge").textContent = typeLabel;
      dom.nowPlayingBar.querySelector(".np-title").textContent =
        item.title || "";

      const subtitle = item.showtitle
        ? `${item.showtitle} · S${pad(item.season)}E${pad(item.episode)}`
        : Array.isArray(item.artist) && item.artist.length
          ? item.artist.join(", ")
          : item.channelname || "";
      dom.nowPlayingBar.querySelector(".np-subtitle").textContent = subtitle;
    }

    // Always update time/progress (changes every poll)
    const timeStr = formatTime(props.time);
    const durationStr = formatTime(props.totaltime);
    const isLive =
      player.type === "picture" ||
      (props.totaltime &&
        props.totaltime.hours === 0 &&
        props.totaltime.minutes === 0 &&
        props.totaltime.seconds === 0);

    let clockStr = "";
    if (!isLive && props.time && props.totaltime) {
      const elapsedSec =
        (props.time.hours || 0) * 3600 +
        (props.time.minutes || 0) * 60 +
        (props.time.seconds || 0);
      const totalSec =
        (props.totaltime.hours || 0) * 3600 +
        (props.totaltime.minutes || 0) * 60 +
        (props.totaltime.seconds || 0);
      if (totalSec > 0) {
        const now = Date.now();
        const startMs = now - elapsedSec * 1000;
        const endMs = startMs + totalSec * 1000;
        const fmt = (ms) =>
          new Date(ms).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        clockStr = ` · ${fmt(startMs)} – ${fmt(endMs)}`;
      }
    }

    const timeEl = dom.nowPlayingBar.querySelector(".np-time");
    timeEl.textContent = isLive
      ? "LIVE"
      : `${timeStr} / ${durationStr}${clockStr}`;

    dom.nowPlayingBar.querySelector(".np-progress-fill").style.width =
      `${props.percentage}%`;

    // Update play/pause icon
    const ppBtn = dom.nowPlayingBar.querySelector(".np-playpause");
    const pauseSvg =
      '<svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    const playSvg =
      '<svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
    const wantPause = props.speed > 0;
    const currentlyPause = ppBtn.innerHTML.includes("M6 19h4V5H6");
    if (wantPause !== currentlyPause) {
      ppBtn.innerHTML = wantPause ? pauseSvg : playSvg;
    }
  }

  // ─── Queue / Up Next Panel ───────────────────────────────────────────
  const queueOverlay = document.getElementById("queue-overlay");
  const queuePanel = document.getElementById("queue-panel");
  const queueItems = document.getElementById("queue-items");
  const queueClose = document.getElementById("queue-close");
  const btnQueue = document.getElementById("btn-queue");

  function bindQueuePanel() {
    if (btnQueue) {
      btnQueue.addEventListener("click", () => {
        openQueue();
      });
    }
    if (queueClose) {
      queueClose.addEventListener("click", closeQueue);
    }
    if (queueOverlay) {
      queueOverlay.addEventListener("click", closeQueue);
    }
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        queuePanel &&
        !queuePanel.classList.contains("hidden")
      ) {
        closeQueue();
      }
    });
  }

  async function openQueue() {
    if (!queuePanel || !queueOverlay) return;
    queueOverlay.classList.remove("hidden");
    queuePanel.classList.remove("hidden");
    queueClose.focus();
    await loadQueue();
  }

  function closeQueue() {
    if (queuePanel) queuePanel.classList.add("hidden");
    if (queueOverlay) queueOverlay.classList.add("hidden");
    if (btnQueue) btnQueue.focus();
  }

  async function loadQueue() {
    if (!queueItems) return;
    queueItems.innerHTML = '<div class="spinner"></div>';

    try {
      const playlists = await kodi.getPlaylists();
      let items = [];
      let playlistId = 0;

      // Find the active playlist matching the active player
      if (state.activePlayerId !== null) {
        const match = playlists.find(
          (pl) => pl.playlistid === state.activePlayerId,
        );
        if (match) playlistId = match.playlistid;
      }

      const result = await kodi.getPlaylistItems(playlistId);
      items = result.items || [];

      if (items.length === 0) {
        queueItems.innerHTML = '<p class="empty-message">Queue is empty</p>';
        return;
      }

      // Get current position
      let currentPos = -1;
      if (state.activePlayerId !== null) {
        try {
          const props = await kodi.request("Player.GetProperties", {
            playerid: state.activePlayerId,
            properties: ["position"],
          });
          currentPos = props.position;
        } catch {
          /* ignore */
        }
      }

      queueItems.innerHTML = items
        .map((item, i) => {
          const title = item.title || item.label || "Unknown";
          const subtitle = item.artist
            ? Array.isArray(item.artist)
              ? item.artist.join(", ")
              : item.artist
            : item.showtitle
              ? `${item.showtitle} · S${app.pad(item.season)}E${app.pad(item.episode)}`
              : "";
          const thumb = item.art
            ? app.getArtwork(item.art, "thumb") ||
              app.getArtwork(item.art, "poster")
            : "";
          const isCurrent = i === currentPos;
          return `
            <div class="queue-item${isCurrent ? " queue-item-current" : ""}" data-position="${i}" data-playlistid="${playlistId}">
              <span class="queue-position">${i + 1}</span>
              ${thumb ? `<img class="queue-thumb" src="${app.escapeAttr(thumb)}" alt="" loading="lazy">` : '<div class="queue-thumb-placeholder"></div>'}
              <div class="queue-item-info">
                <div class="queue-item-title">${app.escapeHtml(title)}</div>
                ${subtitle ? `<div class="queue-item-subtitle">${app.escapeHtml(subtitle)}</div>` : ""}
              </div>
              ${!isCurrent ? `<button class="queue-remove-btn" data-position="${i}" data-playlistid="${playlistId}" title="Remove">✕</button>` : ""}
            </div>
          `;
        })
        .join("");

      // Click to jump to position
      queueItems.querySelectorAll(".queue-item").forEach((el) => {
        el.addEventListener("click", () => {
          const pos = parseInt(el.dataset.position, 10);
          const plId = parseInt(el.dataset.playlistid, 10);
          kodi.playPlaylistPosition(plId, pos);
          closeQueue();
        });
      });

      // Remove button
      queueItems.querySelectorAll(".queue-remove-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const pos = parseInt(btn.dataset.position, 10);
          const plId = parseInt(btn.dataset.playlistid, 10);
          await kodi.removeFromPlaylist(plId, pos);
          loadQueue();
        });
      });
    } catch (err) {
      console.error("Failed to load queue:", err);
      queueItems.innerHTML =
        '<p class="empty-message">Unable to load queue</p>';
    }
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.bindPlayerControls = bindPlayerControls;
  app.loadVolume = loadVolume;
  app.startPlayerPolling = startPlayerPolling;
  app.pollPlayer = pollPlayer;
  app.bindQueuePanel = bindQueuePanel;
})(window.KodiApp);
