/**
 * Plex-style Kodi Web Interface — Genre / Tag Browsing
 */
(function (app) {
  "use strict";

  const { dom, kodi, t, showToast } = app;

  function bindGenres() {
    if (dom.genreTypeSelect) {
      dom.genreTypeSelect.addEventListener("change", () => loadGenres());
    }
  }

  async function loadGenres() {
    if (!app.state.connected) return;
    const container = dom.genreChips;
    const results = dom.genreResults;
    if (!container || !results) return;

    container.innerHTML = "";
    results.innerHTML = "";
    const typeVal = dom.genreTypeSelect
      ? dom.genreTypeSelect.value
      : "movie-genre";
    const [category, mode] = typeVal.split("-");

    try {
      let items = [];
      if (mode === "genre") {
        const res = await kodi.getGenres(category);
        items = res.genres || [];
      } else {
        const res = await kodi.getTags(
          category === "tvshow" ? "tvshow" : "movie",
        );
        items = res.tags || [];
      }

      if (items.length === 0) {
        container.innerHTML = '<p class="empty-message">No items found</p>';
        return;
      }

      items.forEach((item) => {
        const chip = document.createElement("button");
        chip.className = "genre-chip";
        chip.textContent = item.title || item.label;
        chip.addEventListener("click", () => {
          container
            .querySelectorAll(".genre-chip")
            .forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          loadGenreResults(category, mode, item.title || item.label);
        });
        container.appendChild(chip);
      });
    } catch (err) {
      console.error("Failed to load genres/tags:", err);
      container.innerHTML = '<p class="empty-message">Failed to load</p>';
    }
  }

  async function loadGenreResults(category, mode, value) {
    const results = dom.genreResults;
    if (!results) return;
    results.innerHTML =
      '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
      let items = [];
      let type = "";

      if (mode === "genre") {
        if (category === "movie") {
          const res = await kodi.getMoviesByGenre(value);
          items = res.movies || [];
          type = "movie";
        } else if (category === "tvshow") {
          const res = await kodi.getTVShowsByGenre(value);
          items = res.tvshows || [];
          type = "tvshow";
        } else if (category === "music") {
          const res = await kodi.getAlbumsByGenre(value);
          items = res.albums || [];
          type = "album";
        }
      } else {
        if (category === "movie") {
          const res = await kodi.getMoviesByTag(value);
          items = res.movies || [];
          type = "movie";
        } else {
          const res = await kodi.getTVShowsByTag(value);
          items = res.tvshows || [];
          type = "tvshow";
        }
      }

      results.innerHTML = "";
      if (items.length === 0) {
        results.innerHTML = `<p class="empty-message">${t("noResults")}</p>`;
        return;
      }

      items.forEach((item) => {
        results.appendChild(app.createCard(item, type));
      });
    } catch (err) {
      console.error("Failed to load genre results:", err);
      results.innerHTML = '<p class="error-text">Failed to load results</p>';
    }
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.bindGenres = bindGenres;
  app.loadGenres = loadGenres;
})(window.KodiApp);
