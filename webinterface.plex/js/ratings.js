/**
 * Plex-style Kodi Web Interface — External Ratings (OMDb → RT, Metacritic, IMDb)
 */
(function (app) {
  "use strict";

  const { $, escapeHtml, escapeAttr } = app;

  const ratingsCache = {};

  async function fetchExternalRatings(imdbId, title, year) {
    if (!app.OMDB_API_KEY) return;
    if (!imdbId && !title) return;

    const cacheKey = imdbId || `${title}|${year || ""}`;
    const container = $("#external-ratings");
    if (!container) return;

    if (ratingsCache[cacheKey]) {
      renderExternalRatings(container, ratingsCache[cacheKey]);
      return;
    }

    container.innerHTML = `<div class="ratings-loading"><div class="spinner small"></div></div>`;

    try {
      let url;
      if (imdbId) {
        url = `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(app.OMDB_API_KEY)}`;
      } else {
        url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}${year ? `&y=${year}` : ""}&apikey=${encodeURIComponent(app.OMDB_API_KEY)}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("OMDb request failed");

      const data = await response.json();
      if (data.Response === "False") {
        container.innerHTML = "";
        return;
      }

      const ratings = {
        rt: null,
        metacritic: null,
        imdb: null,
        title: data.Title || "",
        imdbId: data.imdbID || imdbId || "",
      };

      if (Array.isArray(data.Ratings)) {
        data.Ratings.forEach((r) => {
          if (r.Source === "Rotten Tomatoes") {
            ratings.rt = { score: r.Value, fresh: parseInt(r.Value) >= 60 };
          }
          if (r.Source === "Metacritic") {
            ratings.metacritic = { score: r.Value };
          }
          if (r.Source === "Internet Movie Database") {
            ratings.imdb = { score: r.Value };
          }
        });
      }

      if (!ratings.metacritic && data.Metascore && data.Metascore !== "N/A") {
        ratings.metacritic = { score: `${data.Metascore}/100` };
      }

      ratingsCache[cacheKey] = ratings;
      renderExternalRatings(container, ratings);
    } catch (err) {
      console.warn("OMDb ratings fetch failed:", err);
      container.innerHTML = "";
    }
  }

  function renderExternalRatings(container, ratings) {
    const parts = [];

    const existingImdb = document.querySelector(".rating-link.imdb-rating");
    if (!existingImdb && ratings.imdb && ratings.imdbId) {
      parts.push(`
        <a class="rating-link imdb-rating" href="https://www.imdb.com/title/${escapeAttr(ratings.imdbId)}/" target="_blank" rel="noopener noreferrer">
          <span class="imdb-badge">IMDb</span>
          <span class="rating-value">${escapeHtml(ratings.imdb.score)}</span>
        </a>
      `);
    }

    if (ratings.rt) {
      const icon = ratings.rt.fresh ? "🍅" : "🤢";
      const cls = ratings.rt.fresh ? "rt-fresh" : "rt-rotten";
      const rtSlug = ratings.title
        ? ratings.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/_+$/, "")
        : "";
      const rtUrl = rtSlug
        ? `https://www.rottentomatoes.com/m/${rtSlug}`
        : `https://www.rottentomatoes.com/search?search=${encodeURIComponent(ratings.title)}`;
      parts.push(`
        <a class="rating-link ext-rating-inline ${cls}" href="${escapeAttr(rtUrl)}" target="_blank" rel="noopener noreferrer">
          <span class="ext-rating-icon">${icon}</span>
          <span class="ext-rating-score">${escapeHtml(ratings.rt.score)}</span>
        </a>
      `);
    }

    if (ratings.metacritic) {
      const score = parseInt(ratings.metacritic.score);
      const cls = score >= 61 ? "mc-good" : score >= 40 ? "mc-mixed" : "mc-bad";
      const mcSlug = ratings.title
        ? ratings.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/-+$/, "")
        : "";
      const mcUrl = mcSlug
        ? `https://www.metacritic.com/movie/${mcSlug}/`
        : `https://www.metacritic.com/search/${encodeURIComponent(ratings.title)}/`;
      parts.push(`
        <a class="rating-link ext-rating-inline ${cls}" href="${escapeAttr(mcUrl)}" target="_blank" rel="noopener noreferrer">
          <span class="mc-badge">${isNaN(score) ? "?" : score}</span>
          <span class="ext-rating-label">Metacritic</span>
          <span class="ext-rating-score">${escapeHtml(ratings.metacritic.score)}</span>
        </a>
      `);
    }

    if (parts.length === 0) {
      container.innerHTML = "";
      return;
    }

    const ratingsRow = document.querySelector(".ratings-row");
    if (ratingsRow) {
      container.remove();
      ratingsRow.insertAdjacentHTML("beforeend", parts.join(""));
    } else {
      container.innerHTML = `<div class="ratings-row">${parts.join("")}</div>`;
    }
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.fetchExternalRatings = fetchExternalRatings;
})(window.KodiApp);
