/**
 * Movies view — grid, genre filters, detail, random pick data.
 */
import { $, CONFIG, state } from "../state.js";
import {
  escapeHtml,
  formatRuntime,
  stars,
  detailSkeleton,
} from "../helpers.js";
import {
  buildCollectionFacets,
  filterCollectionItems,
  mountIncrementalGrid,
  renderCollectionFilters,
  sortCollectionItems,
  updateCollectionSummary,
} from "../collections.js";
import { getMovieDetailsCached, getMoviesCached } from "../data.js";
import { isInWatchlist } from "../preferences.js";
import {
  renderCard,
  skeletonCards,
  getPoster,
  getFanart,
  posterImg,
  applyBackgrounds,
  injectOmdbData,
} from "../ui.js";

// ── Module state ───────────────────────────────────────────────────────

export let _movieCache = [];
let _cleanupMovieGrid = null;

// ── Helpers ────────────────────────────────────────────────────────────

function renderMovieCard(m) {
  const resumePct =
    m.resume && m.resume.total > 0
      ? Math.round((m.resume.position / m.resume.total) * 100)
      : 0;
  return renderCard({
    action: "show-movie",
    id: m.movieid,
    thumbnail: getPoster(m),
    title: m.title,
    meta: `${m.year || ""} ${m.rating ? "· " + stars(m.rating) : ""}`,
    badge: m.playcount > 0 ? '<div class="watched-badge">✓</div>' : "",
    progress: resumePct > 0 ? resumePct : 0,
    mediaType: "movie",
    watchlisted: isInWatchlist("movie", m.movieid),
  });
}

function renderMovieGrid(items) {
  _cleanupMovieGrid?.();
  _cleanupMovieGrid = mountIncrementalGrid(
    $("#movie-grid"),
    items,
    renderMovieCard,
    {
      batchSize: 24,
      emptyHtml:
        '<div class="empty-state"><p>No movies match your current filters.</p></div>',
    },
  );
}

// ── Load Movies ────────────────────────────────────────────────────────

export async function loadMovies() {
  const gen = state.navGeneration;
  const content = $("#content");
  content.innerHTML = skeletonCards();

  try {
    const data = await getMoviesCached();
    if (gen !== state.navGeneration) return;
    _movieCache = data.movies || [];
    const facets = buildCollectionFacets(_movieCache);

    let html = '<div class="page-header"><h1 class="page-title">Movies</h1>';
    html += '<div class="page-header-actions">';
    html +=
      '<button class="btn-icon" data-action="random-movie" title="Random Pick">🎲</button>';
    html += `<select id="sort-movies" class="group-select" aria-label="Sort movies">
      <option value="title-asc">Name A–Z</option>
      <option value="title-desc">Name Z–A</option>
      <option value="year-desc">Newest First</option>
      <option value="year-asc">Oldest First</option>
      <option value="rating-desc">Highest Rated</option>
    </select>`;
    html += "</div></div>";

    html += renderCollectionFilters({
      prefix: "movies",
      facets,
    });

    if (_movieCache.length) {
      html += '<div class="grid" id="movie-grid">';
      html += "</div>";
    } else {
      html +=
        '<div class="empty-state"><p>No movies found in your library.</p><div class="empty-actions"><button class="btn btn-secondary" data-action="scan-video">Scan Library</button></div></div>';
    }

    content.innerHTML = html;

    const sortSelect = $("#sort-movies");
    const genreSelect = $("#movies-genre");
    const yearSelect = $("#movies-year");
    const ratingSelect = $("#movies-rating");
    const statusSelect = $("#movies-status");
    const summary = $("#movies-summary");

    const applyFilters = () => {
      const filtered = filterCollectionItems(
        _movieCache,
        {
          genre: genreSelect?.value,
          year: yearSelect?.value,
          rating: ratingSelect?.value,
          status: statusSelect?.value,
        },
        "movie",
      );
      const sorted = sortCollectionItems(
        filtered,
        sortSelect?.value || "title-asc",
      );
      updateCollectionSummary(
        summary,
        sorted.length,
        _movieCache.length,
        "movies",
      );
      renderMovieGrid(sorted);
    };

    [sortSelect, genreSelect, yearSelect, ratingSelect, statusSelect].forEach(
      (control) => control?.addEventListener("change", applyFilters),
    );

    applyFilters();
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error loading movies: ${escapeHtml(err.message)}</p><div class="empty-actions"><button class="btn btn-primary" data-action="retry-view">Retry</button></div></div>`;
  }
}

// ── Movie Detail ───────────────────────────────────────────────────────

export async function showMovieDetail(movieid) {
  const gen = state.navGeneration;
  const content = $("#content");
  content.innerHTML = detailSkeleton();

  try {
    const { moviedetails: m } = await getMovieDetailsCached(movieid);
    if (gen !== state.navGeneration) return;

    const bgAttr = getFanart(m)
      ? `data-bg="${escapeHtml(Kodi.imageUrl(getFanart(m)))}"`
      : "";

    const hasResume = m.resume && m.resume.position > 0 && m.resume.total > 0;
    const resumeTime = hasResume
      ? formatRuntime(Math.round(m.resume.position))
      : "";

    let streamHtml = "";
    if (m.streamdetails) {
      const audios = m.streamdetails.audio || [];
      const subs = m.streamdetails.subtitle || [];
      const tags = [];
      const seenLangs = new Set();
      for (const a of audios) {
        const lang = (a.language || "").toUpperCase();
        if (lang && !seenLangs.has(lang)) {
          seenLangs.add(lang);
          tags.push(`<span class="stream-tag">🔊 ${escapeHtml(lang)}</span>`);
        }
      }
      const seenSubs = new Set();
      for (const s of subs) {
        const lang = (s.language || "").toUpperCase();
        if (lang && !seenSubs.has(lang)) {
          seenSubs.add(lang);
          tags.push(`<span class="stream-tag">💬 ${escapeHtml(lang)}</span>`);
        }
      }
      if (tags.length)
        streamHtml = `<div class="stream-tags">${tags.join("")}</div>`;
    }

    const watchlisted = isInWatchlist("movie", m.movieid);

    let html = `
      <div class="detail-hero" ${bgAttr}>
        <div class="detail-hero-overlay">
          <div class="detail-poster">${posterImg(getPoster(m), m.title)}</div>
          <div class="detail-info">
            <h1>${escapeHtml(m.title)}</h1>
            ${m.tagline ? `<p class="detail-tagline">${escapeHtml(m.tagline)}</p>` : ""}
            <div class="detail-meta">
              ${m.year ? `<span>${m.year}</span>` : ""}
              ${m.runtime ? `<span>${formatRuntime(m.runtime)}</span>` : ""}
              ${m.mpaa ? `<span>${escapeHtml(m.mpaa)}</span>` : ""}
              ${m.rating ? `<span>${stars(m.rating)}</span>` : ""}
            </div>
            <div class="detail-genres">${(m.genre || []).map((g) => `<span class="genre-tag">${escapeHtml(g)}</span>`).join(" ")}</div>
            <p class="detail-plot">${escapeHtml(m.plot || "")}</p>
            ${m.director ? `<p class="detail-director">Directed by ${escapeHtml((m.director || []).join(", "))}</p>` : ""}
            ${streamHtml}
            <div id="omdb-movie-ratings"></div>
            <div class="detail-actions">
              ${hasResume ? `<button class="btn btn-resume" data-action="play-movie" data-id="${m.movieid}">▶ Resume from ${resumeTime}</button><button class="btn btn-secondary" data-action="play-movie-beginning" data-id="${m.movieid}">Play from Start</button>` : `<button class="btn btn-primary" data-action="play-movie" data-id="${m.movieid}">▶ Play</button>`}
              <button class="btn btn-secondary watchlist-toggle${watchlisted ? " is-active" : ""}" data-action="toggle-watchlist" data-id="${m.movieid}" data-media-type="movie" data-title="${escapeHtml(m.title)}" data-add-label="☆ Add to Watchlist" data-remove-label="★ In Watchlist">${watchlisted ? "★ In Watchlist" : "☆ Add to Watchlist"}</button>
              <button class="btn btn-secondary" data-action="back">← Back</button>
            </div>
          </div>
        </div>
      </div>`;

    if (m.cast && m.cast.length) {
      html +=
        '<section class="shelf"><h2 class="shelf-title"><span>Cast</span></h2><div class="shelf-row">';
      for (const c of m.cast.slice(0, CONFIG.CAST_LIMIT)) {
        html += renderCard({
          action: "imdb-person",
          id: 0,
          thumbnail: c.thumbnail,
          title: c.name,
          meta: escapeHtml(c.role || ""),
          variant: "card-cast",
          extraAttrs: `data-name="${escapeHtml(c.name)}"`,
        });
      }
      html += "</div></section>";
    }

    content.innerHTML = html;
    applyBackgrounds(content);

    injectOmdbData(
      gen,
      "#omdb-movie-ratings",
      m.imdbnumber,
      m.title,
      m.year,
      "movie",
    );
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p><div class="empty-actions"><button class="btn btn-primary" data-action="retry-view">Retry</button></div></div>`;
  }
}
