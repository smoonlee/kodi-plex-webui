/**
 * Plex-style Kodi Web Interface — Navigation, Home, Library Views
 */
(function (app) {
  "use strict";

  const {
    $,
    state,
    dom,
    kodi,
    escapeHtml,
    escapeAttr,
    showToast,
    getArtwork,
    formatRuntime,
    pad,
  } = app;

  // ─── Navigation ──────────────────────────────────────────────────────
  function bindNavigation() {
    dom.navLinks().forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        navigateTo(view, true);
        if (dom.navLinksContainer) {
          dom.navLinksContainer.classList.remove("open");
        }
      });
    });

    if (dom.btnHamburger) {
      dom.btnHamburger.addEventListener("click", () => {
        dom.navLinksContainer.classList.toggle("open");
      });
    }

    // Handle browser back/forward buttons
    window.addEventListener("popstate", (e) => {
      const view = (e.state && e.state.view) || "home";
      navigateTo(view, false);
    });

    // Set initial history state
    const initialView = window.location.hash.replace("#", "") || "home";
    history.replaceState({ view: initialView }, "", `#${initialView}`);
    if (initialView !== "home") {
      navigateTo(initialView, false);
    }
  }

  function navigateTo(view, pushHistory) {
    if (pushHistory !== false) {
      history.pushState({ view }, "", `#${view}`);
    }
    dom.navLinks().forEach((l) => {
      l.classList.remove("active");
      l.removeAttribute("aria-current");
    });
    const activeLink = document.querySelector(`.nav-link[data-view="${view}"]`);
    if (activeLink) {
      activeLink.classList.add("active");
      activeLink.setAttribute("aria-current", "page");
    }

    dom.views().forEach((v) => v.classList.remove("active"));
    const targetView = $(`#view-${view}`);
    if (targetView) targetView.classList.add("active");

    // Move focus to the view heading for keyboard/remote users
    const heading = targetView && targetView.querySelector("h1, .hub-title");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }

    state.currentView = view;

    switch (view) {
      case "home":
        loadHome();
        break;
      case "movies":
        loadMovies();
        break;
      case "tvshows":
        loadTVShows();
        break;
      case "music":
        loadMusic();
        break;
      case "livetv":
        app.loadLiveTV();
        break;
      case "playlists":
        app.loadPlaylists();
        break;
      case "genres":
        app.loadGenres();
        break;
      case "photos":
        app.loadPhotos();
        break;
    }
  }

  // ─── Home View ───────────────────────────────────────────────────────
  let lastHomeLoad = 0;

  async function loadHome() {
    if (!state.connected) return;

    // Skip re-fetch if loaded within last 30 seconds
    const now = Date.now();
    if (
      now - lastHomeLoad < 30000 &&
      dom.homeContent &&
      !dom.homeContent.classList.contains("hidden")
    ) {
      return;
    }

    dom.homeLoading.classList.remove("hidden");
    dom.homeContent.classList.add("hidden");

    try {
      const [movies, episodes, music, inProgressMovies, inProgressEpisodes] =
        await Promise.all([
          kodi.getRecentMovies().catch(() => ({ movies: [] })),
          kodi.getRecentEpisodes().catch(() => ({ episodes: [] })),
          kodi.getRecentAlbums().catch(() => ({ albums: [] })),
          kodi.getInProgressMovies().catch(() => ({ movies: [] })),
          kodi.getInProgressEpisodes().catch(() => ({ episodes: [] })),
        ]);

      // Continue Watching — merge movies + episodes, sort by lastplayed
      const cwItems = [
        ...(inProgressMovies.movies || []).map((m) => ({
          item: m,
          type: "movie",
        })),
        ...(inProgressEpisodes.episodes || []).map((e) => ({
          item: e,
          type: "episode",
        })),
      ].sort((a, b) =>
        (b.item.lastplayed || "").localeCompare(a.item.lastplayed || ""),
      );

      if (cwItems.length > 0) {
        dom.continueWatching.innerHTML = "";
        cwItems.forEach(({ item, type }) => {
          dom.continueWatching.appendChild(createCard(item, type, true));
        });
        dom.continueWatchingSection.classList.remove("hidden");
      } else {
        dom.continueWatchingSection.classList.add("hidden");
      }

      renderHubRow(dom.recentMovies, movies.movies || [], "movie");
      renderHubRow(dom.recentEpisodes, episodes.episodes || [], "episode");
      renderHubRow(dom.recentMusic, music.albums || [], "album");

      toggleSection("recent-movies-section", movies.movies);
      toggleSection("recent-episodes-section", episodes.episodes);
      toggleSection("recent-music-section", music.albums);

      dom.homeLoading.classList.add("hidden");
      dom.homeContent.classList.remove("hidden");
      lastHomeLoad = Date.now();
    } catch (err) {
      console.error("Failed to load home:", err);
      showToast("Failed to load library data");
    }
  }

  function toggleSection(sectionId, items) {
    const section = $(`#${sectionId}`);
    if (!items || items.length === 0) {
      section.classList.add("hidden");
    } else {
      section.classList.remove("hidden");
    }
  }

  // ─── Hub Row Rendering ───────────────────────────────────────────────
  function renderHubRow(container, items, type) {
    container.innerHTML = "";
    items.forEach((item) => {
      container.appendChild(createCard(item, type));
    });
  }

  function createCard(item, type, showResume) {
    const card = document.createElement("div");
    card.className = "media-card";
    card.dataset.type = type;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    let posterUrl = "";
    let title = "";
    let subtitle = "";
    let id = 0;

    switch (type) {
      case "movie":
        posterUrl = getArtwork(item.art, "poster");
        title = item.title;
        subtitle = item.year ? String(item.year) : "";
        id = item.movieid;
        card.dataset.id = id;
        break;
      case "episode":
        posterUrl = getArtwork(item.art, "thumb");
        title = item.title;
        subtitle = `${item.showtitle} · S${pad(item.season)}E${pad(item.episode)}`;
        id = item.episodeid;
        card.dataset.id = id;
        card.dataset.tvshowid = item.tvshowid;
        card.classList.add("episode-card");
        break;
      case "tvshow":
        posterUrl = getArtwork(item.art, "poster");
        title = item.title;
        subtitle = item.year ? String(item.year) : "";
        if (item.episode) subtitle += ` · ${item.episode} episodes`;
        id = item.tvshowid;
        card.dataset.id = id;
        break;
      case "album":
        posterUrl = getArtwork(item.art, "thumb");
        title = item.title;
        subtitle = Array.isArray(item.artist)
          ? item.artist.join(", ")
          : item.artist || "";
        id = item.albumid;
        card.dataset.id = id;
        break;
    }

    card.setAttribute(
      "aria-label",
      `${type}: ${title}${subtitle ? " — " + subtitle : ""}`,
    );

    const imgFallback = type === "episode" ? "landscape" : "poster";

    // Resume progress bar for Continue Watching cards
    let resumeBarHtml = "";
    if (
      showResume &&
      item.resume &&
      item.resume.position > 0 &&
      item.resume.total > 0
    ) {
      const pct = Math.min(
        100,
        Math.round((item.resume.position / item.resume.total) * 100),
      );
      resumeBarHtml = `<div class="card-resume-bar"><div class="card-resume-fill" style="width:${pct}%"></div></div>`;
    }

    card.innerHTML = `
      <div class="card-poster ${type === "episode" ? "card-poster-landscape" : ""}">
        <img src="${escapeAttr(posterUrl)}" alt="${escapeAttr(title)}" loading="lazy"
             onerror="this.src='img/placeholder-${imgFallback}.svg'">
        <div class="card-overlay">
          <button class="play-btn" title="Play">
            <svg viewBox="0 0 24 24" width="32" height="32"><path fill="#fff" d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        ${item.playcount > 0 ? '<div class="watched-badge">✓</div>' : ""}
        ${resumeBarHtml}
      </div>
      <div class="card-info">
        <div class="card-title" title="${escapeAttr(title)}">${escapeHtml(title)}</div>
        <div class="card-subtitle">${escapeHtml(subtitle)}</div>
      </div>
    `;

    const playBtn = card.querySelector(".play-btn");
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      app.playItem(type, item);
    });

    card.addEventListener("click", () => {
      app.showDetail(type, item);
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        app.showDetail(type, item);
      } else if (e.key === " ") {
        e.preventDefault();
        app.playItem(type, item);
      }
    });

    return card;
  }

  // ─── Sort Helper ───────────────────────────────────────────────────
  function sortItems(items, method, descending) {
    return [...items].sort((a, b) => {
      let va = a[method],
        vb = b[method];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return descending ? 1 : -1;
      if (va > vb) return descending ? -1 : 1;
      return 0;
    });
  }

  // ─── Sort Persistence ──────────────────────────────────────────────
  const sortDesc = { movies: false, tvshows: false, music: false };
  const activeGenre = { movies: null, tvshows: null };

  function saveSortPrefs(key) {
    const ids = {
      movies: "movie-sort",
      tvshows: "tvshow-sort",
      music: "music-sort",
    };
    const sel = $("#" + ids[key] || {});
    if (sel) localStorage.setItem("sort-" + key + "-method", sel.value);
    localStorage.setItem("sort-" + key + "-desc", sortDesc[key] ? "1" : "0");
  }

  function restoreSortPrefs(key) {
    const ids = {
      movies: "movie-sort",
      tvshows: "tvshow-sort",
      music: "music-sort",
    };
    const sel = $("#" + ids[key]);
    const method = localStorage.getItem("sort-" + key + "-method");
    if (sel && method) sel.value = method;
    const desc = localStorage.getItem("sort-" + key + "-desc");
    if (desc !== null) sortDesc[key] = desc === "1";
    // Sync the direction button visual
    const btn =
      sel &&
      sel.closest(".library-controls") &&
      sel.closest(".library-controls").querySelector(".sort-dir-btn");
    if (btn) {
      btn.classList.toggle("desc", sortDesc[key]);
      btn.title = sortDesc[key] ? "Descending" : "Ascending";
      btn.setAttribute(
        "aria-label",
        sortDesc[key] ? "Sort descending" : "Sort ascending",
      );
    }
  }

  // ─── Genre Chip Helpers ──────────────────────────────────────────────
  function extractGenres(items) {
    const genreSet = new Set();
    items.forEach((item) => {
      const g = item.genre;
      if (Array.isArray(g)) g.forEach((name) => genreSet.add(name));
      else if (typeof g === "string" && g) genreSet.add(g);
    });
    return [...genreSet].sort();
  }

  function renderGenreChips(container, genres, key) {
    container.innerHTML = "";
    if (genres.length === 0) return;

    const allChip = document.createElement("button");
    allChip.className =
      "genre-filter-chip" + (activeGenre[key] === null ? " active" : "");
    allChip.textContent = "All";
    allChip.addEventListener("click", () => {
      activeGenre[key] = null;
      if (key === "movies") loadMovies();
      else loadTVShows();
    });
    container.appendChild(allChip);

    genres.forEach((genre) => {
      const chip = document.createElement("button");
      chip.className =
        "genre-filter-chip" + (activeGenre[key] === genre ? " active" : "");
      chip.textContent = genre;
      chip.addEventListener("click", () => {
        activeGenre[key] = genre;
        if (key === "movies") loadMovies();
        else loadTVShows();
      });
      container.appendChild(chip);
    });
  }

  function filterByGenre(items, genre) {
    if (!genre) return items;
    return items.filter((item) => {
      const g = item.genre;
      if (Array.isArray(g)) return g.includes(genre);
      return g === genre;
    });
  }

  function filterByWatched(items, filter) {
    if (!filter || filter === "all") return items;
    if (filter === "watched") return items.filter((i) => i.playcount > 0);
    return items.filter((i) => !i.playcount);
  }

  // ─── Movies View ─────────────────────────────────────────────────────
  async function loadMovies(forceRefresh) {
    if (!state.connected) return;

    if (forceRefresh || state.movies.length === 0) {
      restoreSortPrefs("movies");
      try {
        const result = await kodi.getMovies();
        state.movies = result.movies || [];
      } catch (err) {
        console.error("Failed to load movies:", err);
        showToast("Failed to load movies");
        return;
      }
    }

    // Genre chips
    const genres = extractGenres(state.movies);
    renderGenreChips(dom.moviesGenreChips, genres, "movies");

    const filtered = filterByGenre(state.movies, activeGenre.movies);
    const watchedFilter = ($("#movie-watched-filter") || {}).value || "all";
    const filteredByWatch = filterByWatched(filtered, watchedFilter);
    const sortMethod = ($("#movie-sort") || {}).value || "title";
    const isDesc =
      sortDesc.movies || sortMethod === "rating" || sortMethod === "dateadded";
    const sorted = sortItems(filteredByWatch, sortMethod, isDesc);

    // Item count & empty state
    dom.moviesCount.textContent = "(" + state.movies.length + ")";
    dom.moviesGrid.innerHTML = "";
    if (sorted.length === 0) {
      dom.moviesEmpty.classList.remove("hidden");
    } else {
      dom.moviesEmpty.classList.add("hidden");
      sorted.forEach((movie) => {
        dom.moviesGrid.appendChild(createCard(movie, "movie"));
      });
    }
  }

  // Sort change handler
  document.addEventListener("change", (e) => {
    if (e.target.id === "movie-sort") {
      saveSortPrefs("movies");
      loadMovies();
    }
    if (e.target.id === "tvshow-sort") {
      saveSortPrefs("tvshows");
      loadTVShows();
    }
    if (e.target.id === "music-sort") {
      saveSortPrefs("music");
      loadMusic();
    }
    if (e.target.id === "movie-watched-filter") {
      loadMovies();
    }
    if (e.target.id === "tvshow-watched-filter") {
      loadTVShows();
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".sort-dir-btn");
    if (!btn) return;
    const controls = btn.closest(".library-controls");
    if (!controls) return;
    const select = controls.querySelector(".sort-select");
    if (!select) return;

    let key;
    if (select.id === "movie-sort") key = "movies";
    else if (select.id === "tvshow-sort") key = "tvshows";
    else if (select.id === "music-sort") key = "music";
    else return;

    sortDesc[key] = !sortDesc[key];
    btn.classList.toggle("desc", sortDesc[key]);
    btn.title = sortDesc[key] ? "Descending" : "Ascending";
    btn.setAttribute(
      "aria-label",
      sortDesc[key] ? "Sort descending" : "Sort ascending",
    );

    saveSortPrefs(key);
    if (key === "movies") loadMovies();
    else if (key === "tvshows") loadTVShows();
    else if (key === "music") loadMusic();
  });

  // Hub title navigation links
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a.hub-title[data-nav]");
    if (!link) return;
    e.preventDefault();
    navigateTo(link.dataset.nav, true);
  });

  // ─── TV Shows View ───────────────────────────────────────────────────
  async function loadTVShows(forceRefresh) {
    if (!state.connected) return;

    if (forceRefresh || state.tvshows.length === 0) {
      restoreSortPrefs("tvshows");
      try {
        const result = await kodi.getTVShows();
        state.tvshows = result.tvshows || [];
      } catch (err) {
        console.error("Failed to load TV shows:", err);
        showToast("Failed to load TV shows");
        return;
      }
    }

    // Genre chips
    const genres = extractGenres(state.tvshows);
    renderGenreChips(dom.tvshowsGenreChips, genres, "tvshows");

    const filtered = filterByGenre(state.tvshows, activeGenre.tvshows);
    const watchedFilter = ($("#tvshow-watched-filter") || {}).value || "all";
    const filteredByWatch = filterByWatched(filtered, watchedFilter);
    const sortMethod = ($("#tvshow-sort") || {}).value || "title";
    const isDesc = sortDesc.tvshows || sortMethod === "rating";
    const sorted = sortItems(filteredByWatch, sortMethod, isDesc);

    // Item count & empty state
    dom.tvshowsCount.textContent = "(" + state.tvshows.length + ")";
    dom.tvshowsGrid.innerHTML = "";
    if (sorted.length === 0) {
      dom.tvshowsEmpty.classList.remove("hidden");
    } else {
      dom.tvshowsEmpty.classList.add("hidden");
      sorted.forEach((show) => {
        dom.tvshowsGrid.appendChild(createCard(show, "tvshow"));
      });
    }
  }

  // ─── Music View ──────────────────────────────────────────────────────
  let musicAlbums = [];

  async function loadMusic(forceRefresh) {
    if (!state.connected) return;

    if (forceRefresh || musicAlbums.length === 0) {
      restoreSortPrefs("music");
      try {
        const result = await kodi.getAlbums();
        musicAlbums = result.albums || [];
      } catch (err) {
        console.error("Failed to load music:", err);
        showToast("Failed to load music");
        return;
      }
    }

    const sortMethod = ($("#music-sort") || {}).value || "title";
    const isDesc = sortDesc.music || sortMethod === "dateadded";
    const sorted = sortItems(musicAlbums, sortMethod, isDesc);

    // Item count & empty state
    dom.musicCount.textContent = "(" + musicAlbums.length + ")";
    dom.musicGrid.innerHTML = "";
    if (sorted.length === 0) {
      dom.musicEmpty.classList.remove("hidden");
    } else {
      dom.musicEmpty.classList.add("hidden");
      sorted.forEach((album) => {
        dom.musicGrid.appendChild(createCard(album, "album"));
      });
    }
  }

  // ─── Scroll Buttons ──────────────────────────────────────────────────
  function bindScrollButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".scroll-btn");
      if (!btn) return;
      const row = btn.parentElement.querySelector(".hub-cards");
      if (!row) return;
      const scrollAmount = row.clientWidth * 0.8;
      if (btn.classList.contains("scroll-left")) {
        row.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        row.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    });
  }

  // ─── Library Refresh Buttons ───────────────────────────────────────
  document.addEventListener("click", (e) => {
    if (e.target.closest("#btn-refresh-movies")) {
      state.movies = [];
      loadMovies(true);
    }
    if (e.target.closest("#btn-refresh-tvshows")) {
      state.tvshows = [];
      loadTVShows(true);
    }
    if (e.target.closest("#btn-refresh-music")) {
      loadMusic(true);
    }
  });

  // ─── Exports ─────────────────────────────────────────────────────────
  app.bindNavigation = bindNavigation;
  app.navigateTo = navigateTo;
  app.loadHome = loadHome;
  app.loadMovies = loadMovies;
  app.loadTVShows = loadTVShows;
  app.loadMusic = loadMusic;
  app.createCard = createCard;
  app.bindScrollButtons = bindScrollButtons;
})(window.KodiApp);
