/**
 * Plex-style Kodi Web Interface — Search
 */
(function (app) {
  "use strict";

  const { $, state, dom, kodi, t, showToast } = app;

  function bindSearch() {
    dom.searchInput.addEventListener("input", () => {
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(() => {
        const query = dom.searchInput.value.trim();
        if (query.length >= 2) {
          performSearch(query);
        }
      }, 400);
    });

    dom.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        dom.searchInput.value = "";
        app.navigateTo("home");
      }
    });
  }

  async function performSearch(query) {
    if (!state.connected) return;

    dom.searchTitle.textContent = `${t("searchResults")}: "${query}"`;
    dom.searchResults.innerHTML = "";

    dom.views().forEach((v) => v.classList.remove("active"));
    $("#view-search").classList.add("active");
    dom.navLinks().forEach((l) => l.classList.remove("active"));

    try {
      const filter = { field: "title", operator: "contains", value: query };
      const searchLimits = { start: 0, end: 50 };
      const movieProps = [
        "title",
        "year",
        "genre",
        "rating",
        "runtime",
        "art",
        "file",
        "playcount",
        "dateadded",
        "tagline",
      ];
      const tvProps = [
        "title",
        "year",
        "genre",
        "rating",
        "art",
        "episode",
        "season",
        "watchedepisodes",
        "dateadded",
        "studio",
        "mpaa",
      ];
      const albumProps = [
        "title",
        "artist",
        "year",
        "art",
        "genre",
        "playcount",
        "dateadded",
      ];

      const [moviesResult, showsResult, albumsResult] = await Promise.all([
        kodi
          .request("VideoLibrary.GetMovies", {
            filter,
            properties: movieProps,
            sort: { method: "title", order: "ascending" },
            limits: searchLimits,
          })
          .catch(() => ({ movies: [] })),
        kodi
          .request("VideoLibrary.GetTVShows", {
            filter,
            properties: tvProps,
            sort: { method: "title", order: "ascending" },
            limits: searchLimits,
          })
          .catch(() => ({ tvshows: [] })),
        kodi
          .request("AudioLibrary.GetAlbums", {
            filter: { field: "album", operator: "contains", value: query },
            properties: albumProps,
            sort: { method: "title", order: "ascending" },
            limits: { start: 0, end: 20 },
          })
          .catch(() => ({ albums: [] })),
      ]);

      const movies = moviesResult.movies || [];
      const shows = showsResult.tvshows || [];
      const albums = albumsResult.albums || [];

      if (movies.length === 0 && shows.length === 0 && albums.length === 0) {
        dom.searchResults.innerHTML = `<p class="empty-message">${t("noResults")}</p>`;
      } else {
        appendSearchSection(t("movies"), movies, "movie");
        appendSearchSection(t("tvShows"), shows, "tvshow");
        appendSearchSection(t("music"), albums, "album");
      }
    } catch (err) {
      console.error("Search error:", err);
    }
  }

  function appendSearchSection(title, items, type) {
    if (items.length === 0) return;
    const header = document.createElement("div");
    header.className = "search-section-header";
    header.innerHTML = `<h2>${app.escapeHtml(title)} <span class="search-section-count">(${items.length})</span></h2>`;
    dom.searchResults.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "media-grid search-section-grid";
    items.forEach((item) => grid.appendChild(app.createCard(item, type)));
    dom.searchResults.appendChild(grid);
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.bindSearch = bindSearch;
  app.performSearch = performSearch;
})(window.KodiApp);
