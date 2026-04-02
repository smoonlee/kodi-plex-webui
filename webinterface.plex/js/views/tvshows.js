/**
 * TV Shows view — grid, seasons, episodes.
 */
import { $, state } from "../state.js";
import {
  escapeHtml,
  formatRuntime,
  stars,
  episodeLabel,
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
import {
  getEpisodesCached,
  getSeasonsCached,
  getTVShowDetailsCached,
  getTVShowsCached,
} from "../data.js";
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

let _tvshowCache = [];
let _cleanupTVGrid = null;

function renderTVShowCard(s) {
  const progress = s.episode
    ? Math.round((s.watchedepisodes / s.episode) * 100)
    : 0;
  return renderCard({
    action: "show-tvshow",
    id: s.tvshowid,
    thumbnail: getPoster(s),
    title: s.title,
    meta: `${s.year || ""} · ${s.episode || 0} eps`,
    progress: progress > 0 ? progress : 0,
    mediaType: "tvshow",
    watchlisted: isInWatchlist("tvshow", s.tvshowid),
  });
}

function renderTVShowGrid(items) {
  _cleanupTVGrid?.();
  _cleanupTVGrid = mountIncrementalGrid(
    $("#tvshow-grid"),
    items,
    renderTVShowCard,
    {
      batchSize: 24,
      emptyHtml:
        '<div class="empty-state"><p>No TV shows match your current filters.</p></div>',
    },
  );
}

// ── Load TV Shows ──────────────────────────────────────────────────────

export async function loadTVShows() {
  const gen = state.navGeneration;
  const content = $("#content");
  content.innerHTML = skeletonCards();

  try {
    const data = await getTVShowsCached();
    if (gen !== state.navGeneration) return;
    _tvshowCache = data.tvshows || [];
    const facets = buildCollectionFacets(_tvshowCache);

    let html = '<div class="page-header"><h1 class="page-title">TV Shows</h1>';
    html += `<select id="sort-tvshows" class="group-select" aria-label="Sort TV shows">
      <option value="title-asc">Name A–Z</option>
      <option value="title-desc">Name Z–A</option>
      <option value="year-desc">Newest First</option>
      <option value="year-asc">Oldest First</option>
      <option value="rating-desc">Highest Rated</option>
    </select></div>`;

    html += renderCollectionFilters({ prefix: "tvshows", facets });

    if (_tvshowCache.length) {
      html += '<div class="grid" id="tvshow-grid">';
      html += "</div>";
    } else {
      html +=
        '<div class="empty-state"><p>No TV shows found in your library.</p><div class="empty-actions"><button class="btn btn-secondary" data-action="scan-video">Scan Library</button></div></div>';
    }

    content.innerHTML = html;

    const sortSelect = $("#sort-tvshows");
    const genreSelect = $("#tvshows-genre");
    const yearSelect = $("#tvshows-year");
    const ratingSelect = $("#tvshows-rating");
    const statusSelect = $("#tvshows-status");
    const summary = $("#tvshows-summary");

    const applyFilters = () => {
      const filtered = filterCollectionItems(
        _tvshowCache,
        {
          genre: genreSelect?.value,
          year: yearSelect?.value,
          rating: ratingSelect?.value,
          status: statusSelect?.value,
        },
        "tvshow",
      );
      const sorted = sortCollectionItems(
        filtered,
        sortSelect?.value || "title-asc",
      );
      updateCollectionSummary(
        summary,
        sorted.length,
        _tvshowCache.length,
        "shows",
      );
      renderTVShowGrid(sorted);
    };

    [sortSelect, genreSelect, yearSelect, ratingSelect, statusSelect].forEach(
      (control) => control?.addEventListener("change", applyFilters),
    );

    applyFilters();
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error loading TV shows: ${escapeHtml(err.message)}</p><div class="empty-actions"><button class="btn btn-primary" data-action="retry-view">Retry</button></div></div>`;
  }
}

// ── TV Show Seasons ────────────────────────────────────────────────────

export async function showTVShowSeasons(tvshowid) {
  const gen = state.navGeneration;
  state.currentTVShow = tvshowid;
  const content = $("#content");
  content.innerHTML = detailSkeleton();

  try {
    const [showData, seasonData, episodeData] = await Promise.all([
      getTVShowDetailsCached(tvshowid),
      getSeasonsCached(tvshowid),
      getEpisodesCached(tvshowid),
    ]);
    if (gen !== state.navGeneration) return;

    const show = showData.tvshowdetails;
    const bgAttr = getFanart(show)
      ? `data-bg="${escapeHtml(Kodi.imageUrl(getFanart(show)))}"`
      : "";

    const allEps = episodeData.episodes || [];
    const nextUnwatched = allEps.find((e) => e.playcount === 0);

    const watchlisted = isInWatchlist("tvshow", show.tvshowid);

    let html = `
      <div class="detail-hero detail-hero-small" ${bgAttr}>
        <div class="detail-hero-overlay">
          <div class="detail-poster">${posterImg(getPoster(show), show.title)}</div>
          <div class="detail-info">
            <h1>${escapeHtml(show.title)}</h1>
            <div class="detail-meta">
              ${show.year ? `<span>${show.year}</span>` : ""}
              ${show.episode ? `<span>${show.episode} episodes</span>` : ""}
              ${show.rating ? `<span>${stars(show.rating)}</span>` : ""}
            </div>
            <p class="detail-plot">${escapeHtml(show.plot || "")}</p>
            <div id="omdb-show-ratings"></div>
            <div class="detail-actions">
              ${nextUnwatched ? `<button class="btn btn-primary" data-action="play-episode" data-id="${nextUnwatched.episodeid}">▶ Play ${episodeLabel(nextUnwatched.season, nextUnwatched.episode)}</button>` : ""}
              <button class="btn btn-secondary watchlist-toggle${watchlisted ? " is-active" : ""}" data-action="toggle-watchlist" data-id="${show.tvshowid}" data-media-type="tvshow" data-title="${escapeHtml(show.title)}" data-add-label="☆ Add to Watchlist" data-remove-label="★ In Watchlist">${watchlisted ? "★ In Watchlist" : "☆ Add to Watchlist"}</button>
              <button class="btn btn-secondary" data-action="back-tvshows">← Back</button>
            </div>
          </div>
        </div>
      </div>`;

    if (seasonData.seasons && seasonData.seasons.length) {
      html += '<div class="grid">';
      for (const s of seasonData.seasons) {
        const watched = s.watchedepisodes === s.episode && s.episode > 0;
        html += renderCard({
          action: "show-season",
          id: s.season,
          thumbnail: getPoster(s),
          title: "Season " + s.season,
          meta: `${s.episode} episodes`,
          extraAttrs: `data-tvshow="${tvshowid}" data-season="${s.season}"`,
          badge: watched ? '<div class="watched-badge">✓</div>' : "",
          progress: s.episode
            ? Math.round((s.watchedepisodes / s.episode) * 100)
            : 0,
        });
      }
      html += "</div>";
    }

    content.innerHTML = html;
    applyBackgrounds(content);

    injectOmdbData(
      gen,
      "#omdb-show-ratings",
      show.imdbnumber,
      show.title,
      show.year,
      "series",
    );
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p><div class="empty-actions"><button class="btn btn-primary" data-action="retry-view">Retry</button></div></div>`;
  }
}

// ── Season Episodes ────────────────────────────────────────────────────

export async function showSeasonEpisodes(tvshowid, season) {
  const gen = state.navGeneration;
  state.currentTVShow = tvshowid;
  state.currentSeason = season;
  const content = $("#content");
  content.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const data = await getEpisodesCached(tvshowid, season);
    if (gen !== state.navGeneration) return;

    let html = `
      <div class="detail-actions detail-back">
        <button class="btn btn-secondary" data-action="back-seasons" data-tvshow="${tvshowid}">← Back to Seasons</button>
      </div>
      <h1 class="page-title">Season ${season}</h1>`;

    if (data.episodes && data.episodes.length) {
      html += '<div class="episode-list">';
      for (const e of data.episodes) {
        const isWatched = e.playcount > 0;
        html += `
          <div class="episode-row" tabindex="0" role="button" data-action="play-episode" data-id="${e.episodeid}">
            <div class="episode-thumb">${posterImg(e.art && e.art.thumb ? e.art.thumb : e.thumbnail, e.title)}</div>
            <div class="episode-info">
              <div class="episode-number">E${String(e.episode).padStart(2, "0")}</div>
              <div class="episode-title">${escapeHtml(e.title)}</div>
              <div class="episode-meta">
                ${e.firstaired ? `<span>${escapeHtml(e.firstaired)}</span>` : ""}
                ${e.runtime ? `<span>${formatRuntime(e.runtime)}</span>` : ""}
                ${e.rating ? `<span>${stars(e.rating)}</span>` : ""}
              </div>
              <div class="episode-plot">${escapeHtml(e.plot || "")}</div>
            </div>
            ${isWatched ? '<div class="episode-watched">✓ Watched</div>' : '<div class="episode-unwatched" title="Unwatched"></div>'}
            <div class="episode-play" aria-hidden="true">▶</div>
          </div>`;
      }
      html += "</div>";
    }

    content.innerHTML = html;
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p></div>`;
  }
}
