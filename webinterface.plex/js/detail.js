/**
 * Plex-style Kodi Web Interface — Detail Views (Movie, TV Show, Album)
 */
(function (app) {
  "use strict";

  const {
    $,
    state,
    dom,
    kodi,
    t,
    escapeHtml,
    escapeAttr,
    showToast,
    getArtwork,
    formatTime,
    formatRuntime,
    pad,
    extractImdbId,
  } = app;

  // ─── Detail View ─────────────────────────────────────────────────────
  async function showDetail(type, item) {
    if (type === "album") {
      showAlbumDetail(item);
      return;
    }
    if (type === "episode") {
      if (item.tvshowid) {
        try {
          const result = await kodi.getTVShowDetails(item.tvshowid);
          showDetail("tvshow", result.tvshowdetails);
        } catch {
          /* ignore */
        }
      }
      return;
    }

    dom.views().forEach((v) => v.classList.remove("active"));
    $("#view-detail").classList.add("active");
    dom.navLinks().forEach((l) => l.classList.remove("active"));

    const fanart = getArtwork(item.art, "fanart");

    dom.detailBackdrop.style.backgroundImage = fanart
      ? `url('${fanart}')`
      : "none";

    if (type === "movie") {
      if (!item.uniqueid && item.movieid) {
        try {
          const result = await kodi.getMovieDetails(item.movieid);
          item = result.moviedetails;
        } catch {
          /* use partial data */
        }
      }
      renderMovieDetail(item);
    } else if (type === "tvshow") {
      if (!item.uniqueid && item.tvshowid) {
        try {
          const result = await kodi.getTVShowDetails(item.tvshowid);
          item = result.tvshowdetails;
        } catch {
          /* use partial data */
        }
      }
      renderTVShowDetail(item);
    }
  }

  function renderMovieDetail(movie) {
    const poster = getArtwork(movie.art, "poster");
    const genres = Array.isArray(movie.genre)
      ? movie.genre.join(", ")
      : movie.genre || "";
    const directors = Array.isArray(movie.director)
      ? movie.director.join(", ")
      : movie.director || "";
    const studios = Array.isArray(movie.studio)
      ? movie.studio.join(", ")
      : movie.studio || "";
    const runtime = movie.runtime ? formatRuntime(movie.runtime) : "";
    const rating =
      movie.rating != null && movie.rating !== ""
        ? Number(movie.rating).toFixed(1)
        : "";
    const votes = movie.votes ? Number(movie.votes).toLocaleString() : "";
    const imdbId = extractImdbId(movie);
    const hasTrailer = movie.trailer && movie.trailer.length > 0;

    dom.detailContent.innerHTML = `
      <button class="btn-back" id="btn-back">← ${t("back")}</button>
      <div class="detail-layout">
        <div class="detail-poster">
          <img src="${escapeAttr(poster)}" alt="${escapeAttr(movie.title)}"
               onerror="this.src='img/placeholder-poster.svg'">
        </div>
        <div class="detail-info">
          <h1 class="detail-title">${escapeHtml(movie.title)}</h1>
          <div class="detail-meta">
            ${movie.year ? `<span>${movie.year}</span>` : ""}
            ${runtime ? `<span>${runtime}</span>` : ""}
            ${movie.mpaa ? `<span class="mpaa-badge">${escapeHtml(movie.mpaa)}</span>` : ""}
          </div>

          ${
            rating
              ? `
          <div class="ratings-row">
            ${
              imdbId
                ? `
            <a href="https://www.imdb.com/title/${escapeAttr(imdbId)}/" target="_blank" rel="noopener noreferrer" class="rating-link imdb-rating">
              <span class="imdb-badge">IMDb</span>
              <span class="rating-value">${rating}</span>
              ${votes ? `<span class="rating-votes">(${votes} votes)</span>` : ""}
            </a>
            `
                : `
            <span class="rating-badge-lg">★ ${rating}</span>
            ${votes ? `<span class="rating-votes">(${votes} votes)</span>` : ""}
            `
            }
          </div>
          `
              : ""
          }

          <div id="external-ratings" class="external-ratings-container"></div>

          ${movie.tagline ? `<p class="detail-tagline">${escapeHtml(movie.tagline)}</p>` : ""}
          <p class="detail-plot">${escapeHtml(movie.plot || "")}</p>
          <div class="detail-extras">
            ${genres ? `<div class="detail-row"><span class="label">${t("genre")}</span><span>${escapeHtml(genres)}</span></div>` : ""}
            ${directors ? `<div class="detail-row"><span class="label">${t("director")}</span><span>${escapeHtml(directors)}</span></div>` : ""}
            ${studios ? `<div class="detail-row"><span class="label">${t("studio")}</span><span>${escapeHtml(studios)}</span></div>` : ""}
          </div>

          ${renderCast(movie.cast)}

          <div class="detail-actions">
            <button class="btn-primary btn-play-detail" data-type="movie" data-id="${movie.movieid}">
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
              ${t("play")}
            </button>
            ${
              hasTrailer
                ? `
            <div class="trailer-wrapper">
              <button class="btn-secondary btn-trailer" data-trailer="${escapeAttr(movie.trailer)}">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
                ${t("trailer")} ▾
              </button>
              <div class="trailer-popover hidden">
                <button class="trailer-option" data-target="kodi">
                  <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
                  Play on Kodi
                </button>
                <button class="trailer-option" data-target="browser">
                  <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                  Watch in Browser
                </button>
              </div>
            </div>
            `
                : ""
            }
          </div>

          ${renderExternalLinks(imdbId)}

        </div>
      </div>
    `;

    bindDetailActions(dom.detailContent, movie, "movie");
    app.fetchExternalRatings(imdbId, movie.title, movie.year);
  }

  async function renderTVShowDetail(show) {
    const poster = getArtwork(show.art, "poster");
    const genres = Array.isArray(show.genre)
      ? show.genre.join(", ")
      : show.genre || "";
    const rating =
      show.rating != null && show.rating !== ""
        ? Number(show.rating).toFixed(1)
        : "";

    const imdbId = extractImdbId(show);
    const studios = Array.isArray(show.studio)
      ? show.studio.join(", ")
      : show.studio || "";
    const votes = show.votes ? Number(show.votes).toLocaleString() : "";
    const status = show.status || "";
    const premiered = show.premiered || "";
    const seasonCount = show.season || "";
    const watchedEps = show.watchedepisodes || 0;
    const totalEps = show.episode || 0;
    const watchProgress =
      totalEps > 0 ? Math.round((watchedEps / totalEps) * 100) : 0;

    dom.detailContent.innerHTML = `
      <button class="btn-back" id="btn-back">← ${t("back")}</button>
      <div class="detail-layout">
        <div class="detail-poster">
          <img src="${escapeAttr(poster)}" alt="${escapeAttr(show.title)}"
               onerror="this.src='img/placeholder-poster.svg'">
        </div>
        <div class="detail-info">
          <h1 class="detail-title">${escapeHtml(show.title)}</h1>
          <div class="detail-meta">
            ${show.year ? `<span>${show.year}</span>` : ""}
            ${seasonCount ? `<span>${seasonCount} ${t("seasons")}</span>` : ""}
            ${totalEps ? `<span>${totalEps} ${t("episodes")}</span>` : ""}
            ${show.mpaa ? `<span class="mpaa-badge">${escapeHtml(show.mpaa)}</span>` : ""}
            ${status ? `<span class="status-badge status-${status.toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(status)}</span>` : ""}
          </div>

          ${
            rating
              ? `
          <div class="ratings-row">
            ${
              imdbId
                ? `
            <a href="https://www.imdb.com/title/${escapeAttr(imdbId)}/" target="_blank" rel="noopener noreferrer" class="rating-link imdb-rating">
              <span class="imdb-badge">IMDb</span>
              <span class="rating-value">${rating}</span>
              ${votes ? `<span class="rating-votes">(${votes} votes)</span>` : ""}
            </a>
            `
                : `
            <span class="rating-badge-lg">★ ${rating}</span>
            ${votes ? `<span class="rating-votes">(${votes} votes)</span>` : ""}
            `
            }
          </div>
          `
              : ""
          }

          <div id="external-ratings" class="external-ratings-container"></div>

          ${
            totalEps > 0
              ? `
          <div class="watch-progress">
            <div class="watch-progress-bar">
              <div class="watch-progress-fill" style="width: ${watchProgress}%"></div>
            </div>
            <span class="watch-progress-text">${watchedEps} / ${totalEps} ${t("watched")}</span>
          </div>
          `
              : ""
          }

          <p class="detail-plot">${escapeHtml(show.plot || "")}</p>
          <div class="detail-extras">
            ${genres ? `<div class="detail-row"><span class="label">${t("genre")}</span><span>${escapeHtml(genres)}</span></div>` : ""}
            ${studios ? `<div class="detail-row"><span class="label">${t("studio")}</span><span>${escapeHtml(studios)}</span></div>` : ""}
            ${premiered ? `<div class="detail-row"><span class="label">${t("premiered")}</span><span>${escapeHtml(premiered)}</span></div>` : ""}
          </div>
          ${renderCast(show.cast)}
          ${renderExternalLinks(imdbId)}

          <div id="seasons-container" class="seasons-container">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    bindDetailActions(dom.detailContent, show, "tvshow");
    app.fetchExternalRatings(imdbId, show.title, show.year);

    try {
      const result = await kodi.getSeasons(show.tvshowid);
      const seasons = result.seasons || [];
      renderSeasons(show.tvshowid, seasons);
    } catch {
      /* ignore */
    }
  }

  // ─── Album Detail View ──────────────────────────────────────────────
  async function showAlbumDetail(item) {
    dom.views().forEach((v) => v.classList.remove("active"));
    $("#view-detail").classList.add("active");
    dom.navLinks().forEach((l) => l.classList.remove("active"));

    let album = item;
    if (item.albumid) {
      try {
        const result = await kodi.getAlbumDetails(item.albumid);
        album = result.albumdetails || item;
      } catch {
        /* use partial data */
      }
    }

    const cover =
      getArtwork(album.art, "thumb") || getArtwork(album.art, "poster");
    const fanart = getArtwork(album.art, "fanart");
    const artists = Array.isArray(album.artist)
      ? album.artist.join(", ")
      : album.artist || "";
    const genres = Array.isArray(album.genre)
      ? album.genre.join(", ")
      : album.genre || "";

    dom.detailBackdrop.style.backgroundImage = fanart
      ? `url('${fanart}')`
      : "none";

    dom.detailContent.innerHTML = `
      <button class="btn-back" id="btn-back">← ${t("back")}</button>
      <div class="detail-layout">
        <div class="detail-poster">
          <img src="${escapeAttr(cover)}" alt="${escapeAttr(album.title)}"
               onerror="this.src='img/placeholder-poster.svg'">
        </div>
        <div class="detail-info">
          <h1 class="detail-title">${escapeHtml(album.title)}</h1>
          <div class="detail-meta">
            ${artists ? `<span>${escapeHtml(artists)}</span>` : ""}
            ${album.year ? `<span>${album.year}</span>` : ""}
          </div>
          ${album.description ? `<p class="detail-plot">${escapeHtml(album.description)}</p>` : ""}
          <div class="detail-extras">
            ${genres ? `<div class="detail-row"><span class="label">${t("genre")}</span><span>${escapeHtml(genres)}</span></div>` : ""}
            ${album.albumlabel ? `<div class="detail-row"><span class="label">${t("label")}</span><span>${escapeHtml(album.albumlabel)}</span></div>` : ""}
            ${Array.isArray(album.style) && album.style.length ? `<div class="detail-row"><span class="label">${t("style")}</span><span>${escapeHtml(album.style.join(", "))}</span></div>` : ""}
          </div>
          <div class="detail-actions">
            <button class="btn-primary btn-play-album" data-albumid="${album.albumid}">
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
              ${t("playAll")}
            </button>
          </div>
          <div id="album-tracks" class="album-tracks-container">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;

    const backBtn = dom.detailContent.querySelector("#btn-back");
    if (backBtn) {
      backBtn.addEventListener("click", () => app.navigateTo("music"));
    }

    const playAlbumBtn = dom.detailContent.querySelector(".btn-play-album");
    if (playAlbumBtn) {
      playAlbumBtn.addEventListener("click", async () => {
        await kodi.playAlbum(album.albumid);
        showToast(`${t("playing")}: ${album.title}`);
      });
    }

    try {
      const result = await kodi.getSongs(album.albumid);
      const songs = result.songs || [];
      renderAlbumTracks(songs, album);
    } catch {
      const container = $("#album-tracks");
      if (container)
        container.innerHTML = '<p class="error-text">Failed to load tracks</p>';
    }
  }

  function renderAlbumTracks(songs, album) {
    const container = $("#album-tracks");
    if (!container) return;

    if (songs.length === 0) {
      container.innerHTML = '<p class="empty-message">No tracks found</p>';
      return;
    }

    const totalDuration = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
    container.innerHTML = `
      <h3>${t("tracks")} <span class="track-count">${songs.length} tracks · ${formatRuntime(totalDuration)}</span></h3>
      <div class="tracks-list">
        ${songs
          .map(
            (song, index) => `
          <div class="track-item" data-songid="${song.songid}" data-index="${index}">
            <div class="track-number">${song.track || index + 1}</div>
            <div class="track-info">
              <div class="track-title">${escapeHtml(song.title)}</div>
              ${Array.isArray(song.artist) && song.artist.join(", ") !== (Array.isArray(album.artist) ? album.artist.join(", ") : "") ? `<div class="track-artist">${escapeHtml(song.artist.join(", "))}</div>` : ""}
            </div>
            <div class="track-duration">${song.duration ? formatRuntime(song.duration) : ""}</div>
            <button class="track-play-btn" data-songid="${song.songid}" title="${t("play")}">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    container.querySelectorAll(".track-play-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = parseInt(btn.dataset.songid, 10);
        kodi.playSong(songId);
        showToast(
          `${t("playing")}: ${songs.find((s) => s.songid === songId)?.title || ""}`,
        );
      });
    });

    container.querySelectorAll(".track-item").forEach((row) => {
      row.addEventListener("click", () => {
        const songId = parseInt(row.dataset.songid, 10);
        kodi.playSong(songId);
        showToast(
          `${t("playing")}: ${songs.find((s) => s.songid === songId)?.title || ""}`,
        );
      });
    });
  }

  // ─── Seasons & Episodes ──────────────────────────────────────────────
  async function renderSeasons(tvshowId, seasons) {
    const container = $("#seasons-container");
    if (!container) return;

    container.innerHTML = seasons
      .map(
        (s) => `
      <div class="season-row" data-season="${s.season}">
        <h3 class="season-title">
          ${s.season === 0 ? t("specials") : `${t("season")} ${s.season}`}
          <span class="season-count">${s.episode} ${t("episodes")}</span>
        </h3>
        <div class="episodes-list" id="episodes-s${s.season}"></div>
      </div>
    `,
      )
      .join("");

    if (seasons.length > 0) {
      await loadEpisodes(tvshowId, seasons[0].season);
    }

    container.querySelectorAll(".season-title").forEach((title) => {
      title.addEventListener("click", () => {
        const season = parseInt(title.parentElement.dataset.season, 10);
        loadEpisodes(tvshowId, season);
      });
    });
  }

  async function loadEpisodes(tvshowId, season) {
    const list = $(`#episodes-s${season}`);
    if (!list || list.dataset.loaded) return;

    list.innerHTML = '<div class="spinner small"></div>';

    try {
      const result = await kodi.getEpisodes(tvshowId, season);
      const episodes = result.episodes || [];

      list.innerHTML = episodes
        .map((ep) => {
          const thumb = getArtwork(ep.art, "thumb");
          return `
          <div class="episode-item" data-episodeid="${ep.episodeid}">
            <div class="episode-thumb">
              <img src="${escapeAttr(thumb)}" alt="" loading="lazy"
                   onerror="this.src='img/placeholder-landscape.svg'">
              <button class="play-btn-sm" data-episodeid="${ep.episodeid}" title="Play">
                <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#fff" d="M8 5v14l11-7z"/></svg>
              </button>
            </div>
            <div class="episode-info">
              <div class="episode-number">E${pad(ep.episode)}</div>
              <div class="episode-title">${escapeHtml(ep.title)}</div>
              <div class="episode-meta">
                ${ep.firstaired ? `<span>${ep.firstaired}</span>` : ""}
                ${ep.runtime ? `<span>${formatRuntime(ep.runtime)}</span>` : ""}
              </div>
              ${ep.plot ? `<div class="episode-plot">${escapeHtml(ep.plot)}</div>` : ""}
            </div>
          </div>
        `;
        })
        .join("");

      list.dataset.loaded = "true";

      list.querySelectorAll(".play-btn-sm").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const epId = parseInt(btn.dataset.episodeid, 10);
          kodi.playEpisode(epId);
          showToast("Playing episode...");
        });
      });
    } catch {
      list.innerHTML = '<p class="error-text">Failed to load episodes</p>';
    }
  }

  // ─── Cast & External Links ───────────────────────────────────────────
  function renderCast(cast) {
    if (!cast || cast.length === 0) return "";
    const top = cast.slice(0, 12);
    return `
      <div class="cast-section">
        <h3>${t("castAndCrew")}</h3>
        <div class="cast-list">
          ${top
            .map(
              (c) => `
            <a class="cast-item" href="https://www.imdb.com/find/?q=${encodeURIComponent(c.name)}&s=nm&exact=true" target="_blank" rel="noopener noreferrer">
              <div class="cast-thumb">
                ${c.thumbnail ? `<img src="${escapeAttr(kodi.getImageUrl(c.thumbnail))}" alt="${escapeAttr(c.name)}" loading="lazy">` : '<div class="cast-placeholder"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="#555" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>'}
              </div>
              <div class="cast-name" title="${escapeAttr(c.name)}">${escapeHtml(c.name)}</div>
              ${c.role ? `<div class="cast-role" title="${escapeAttr(c.role)}">${escapeHtml(c.role)}</div>` : ""}
            </a>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderExternalLinks(imdbId) {
    if (!imdbId) return "";
    return `
      <div class="external-links">
        <h3>${t("externalLinks")}</h3>
        <div class="links-row">
          <a href="https://www.imdb.com/title/${escapeAttr(imdbId)}/" target="_blank" rel="noopener noreferrer" class="ext-link">
            <span class="imdb-badge">IMDb</span>
            Page
          </a>
          <a href="https://www.imdb.com/title/${escapeAttr(imdbId)}/videogallery" target="_blank" rel="noopener noreferrer" class="ext-link">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
            Videos &amp; Trailers
          </a>
          <a href="https://www.imdb.com/title/${escapeAttr(imdbId)}/trivia" target="_blank" rel="noopener noreferrer" class="ext-link">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/></svg>
            Trivia &amp; BTS
          </a>
          <a href="https://www.imdb.com/title/${escapeAttr(imdbId)}/parentalguide" target="_blank" rel="noopener noreferrer" class="ext-link">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
            Parental Guide
          </a>
        </div>
      </div>
    `;
  }

  // ─── Detail Actions ──────────────────────────────────────────────────
  function bindDetailActions(container, item, type) {
    const backBtn = container.querySelector("#btn-back");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        // Use browser history so the user returns to wherever they came from
        // (home, library, search, etc.) instead of always landing on the library
        if (window.history.length > 1) {
          window.history.back();
        } else if (type === "movie") app.navigateTo("movies");
        else if (type === "tvshow") app.navigateTo("tvshows");
        else app.navigateTo("home");
      });
    }

    const playBtn = container.querySelector(".btn-play-detail");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        playItem(type, item);
      });
    }

    const trailerBtn = container.querySelector(".btn-trailer");
    if (trailerBtn) {
      const popover = container.querySelector(".trailer-popover");

      trailerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        popover.classList.toggle("hidden");
      });

      // Close popover on any outside click — scoped to this detail view's lifetime
      const closePopover = () => {
        if (popover && !popover.classList.contains("hidden")) {
          popover.classList.add("hidden");
        }
      };
      document.addEventListener("click", closePopover);
      // Clean up when detail view is replaced (back button destroys container)
      const observer = new MutationObserver(() => {
        if (!container.isConnected) {
          document.removeEventListener("click", closePopover);
          observer.disconnect();
        }
      });
      observer.observe(container.parentNode, { childList: true });

      popover.addEventListener("click", (e) => {
        const option = e.target.closest(".trailer-option");
        if (!option) return;
        e.stopPropagation();
        popover.classList.add("hidden");

        const trailerUrl = trailerBtn.dataset.trailer;
        if (!trailerUrl) return;

        if (option.dataset.target === "browser") {
          const ytMatch = trailerUrl.match(
            /(?:videoid=|video_id=|youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/,
          );
          if (ytMatch) {
            window.open(
              `https://www.youtube.com/watch?v=${ytMatch[1]}`,
              "_blank",
              "noopener,noreferrer",
            );
          } else {
            window.open(trailerUrl, "_blank", "noopener,noreferrer");
          }
          showToast("Opening trailer in browser...");
        } else {
          kodi.playFile(trailerUrl);
          showToast("Playing trailer on Kodi...");
        }
      });
    }
  }

  // ─── Playback ────────────────────────────────────────────────────────
  async function playItem(type, item) {
    try {
      switch (type) {
        case "movie":
          await kodi.playMovie(item.movieid);
          showToast(`Playing: ${item.title}`);
          break;
        case "episode":
          await kodi.playEpisode(item.episodeid);
          showToast(`Playing: ${item.title}`);
          break;
        case "album":
          {
            const songs = await kodi.getSongs(item.albumid);
            if (songs.songs && songs.songs.length > 0) {
              await kodi.playSong(songs.songs[0].songid);
              showToast(`Playing: ${item.title}`);
            }
          }
          break;
      }
    } catch (err) {
      console.error("Playback error:", err);
      showToast("Failed to start playback");
    }
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.showDetail = showDetail;
  app.playItem = playItem;
})(window.KodiApp);
