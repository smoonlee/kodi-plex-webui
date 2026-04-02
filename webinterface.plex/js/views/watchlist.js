/**
 * Watchlist view — locally saved favourites resolved against Kodi libraries.
 */
import { $, state } from "../state.js";
import { escapeHtml } from "../helpers.js";
import { renderCard, skeletonCards, getPoster } from "../ui.js";
import { getAlbumsCached, getMoviesCached, getTVShowsCached } from "../data.js";
import { getWatchlist, isInWatchlist } from "../preferences.js";
import { mountIncrementalGrid } from "../collections.js";

let _cleanupGrid = null;

function createSectionMarkup(id, title, count) {
  return `
    <section class="watchlist-section">
      <div class="watchlist-section-header">
        <h2 class="shelf-title">${title}</h2>
        <span class="watchlist-section-count">${count}</span>
      </div>
      <div class="grid watchlist-grid" id="${id}"></div>
    </section>`;
}

export async function loadWatchlist() {
  const gen = state.navGeneration;
  const content = $("#content");
  content.innerHTML = skeletonCards();
  _cleanupGrid?.();

  const saved = getWatchlist();
  if (!saved.length) {
    content.innerHTML = `
      <div class="empty-state empty-state--feature">
        <div class="empty-icon">⭐</div>
        <h1 class="page-title">Your watchlist is empty</h1>
        <p>Save films, shows, and albums to build a personal queue across devices and sessions.</p>
        <div class="empty-actions">
          <button class="btn btn-primary" data-action="goto-movies">Browse movies</button>
          <button class="btn btn-secondary" data-action="goto-tvshows">Browse shows</button>
        </div>
      </div>`;
    return;
  }

  try {
    const [moviesData, showsData, albumsData] = await Promise.all([
      getMoviesCached(),
      getTVShowsCached(),
      getAlbumsCached(),
    ]);
    if (gen !== state.navGeneration) return;

    const movieMap = new Map(
      (moviesData.movies || []).map((item) => [item.movieid, item]),
    );
    const showMap = new Map(
      (showsData.tvshows || []).map((item) => [item.tvshowid, item]),
    );
    const albumMap = new Map(
      (albumsData.albums || []).map((item) => [item.albumid, item]),
    );

    const groups = {
      movies: [],
      shows: [],
      albums: [],
    };

    saved.forEach((entry) => {
      if (entry.type === "movie" && movieMap.has(entry.id)) {
        groups.movies.push(movieMap.get(entry.id));
      }
      if (entry.type === "tvshow" && showMap.has(entry.id)) {
        groups.shows.push(showMap.get(entry.id));
      }
      if (entry.type === "album" && albumMap.has(entry.id)) {
        groups.albums.push(albumMap.get(entry.id));
      }
    });

    const totalItems =
      groups.movies.length + groups.shows.length + groups.albums.length;

    let html = `
      <div class="page-header page-header--stacked">
        <div>
          <h1 class="page-title">Watchlist</h1>
          <p class="page-subtitle">A curated queue of what you want to watch or hear next.</p>
        </div>
        <div class="collection-summary-pill">${totalItems} saved item${totalItems === 1 ? "" : "s"}</div>
      </div>`;

    if (groups.movies.length) {
      html += createSectionMarkup(
        "watchlist-movies",
        "Movies",
        groups.movies.length,
      );
    }
    if (groups.shows.length) {
      html += createSectionMarkup(
        "watchlist-shows",
        "TV Shows",
        groups.shows.length,
      );
    }
    if (groups.albums.length) {
      html += createSectionMarkup(
        "watchlist-albums",
        "Albums",
        groups.albums.length,
      );
    }

    if (!totalItems) {
      html += `
        <div class="empty-state">
          <p>Your saved items are no longer available in Kodi. Rescan the library or add fresh favourites.</p>
        </div>`;
    }

    content.innerHTML = html;

    const cleanups = [];

    if (groups.movies.length) {
      cleanups.push(
        mountIncrementalGrid(
          $("#watchlist-movies"),
          groups.movies,
          (movie) =>
            renderCard({
              action: "show-movie",
              id: movie.movieid,
              thumbnail: getPoster(movie),
              title: movie.title,
              meta: movie.year || "",
              mediaType: "movie",
              watchlisted: isInWatchlist("movie", movie.movieid),
            }),
          { batchSize: 18 },
        ),
      );
    }

    if (groups.shows.length) {
      cleanups.push(
        mountIncrementalGrid(
          $("#watchlist-shows"),
          groups.shows,
          (show) =>
            renderCard({
              action: "show-tvshow",
              id: show.tvshowid,
              thumbnail: getPoster(show),
              title: show.title,
              meta: `${show.year || ""} · ${show.episode || 0} eps`,
              mediaType: "tvshow",
              watchlisted: isInWatchlist("tvshow", show.tvshowid),
            }),
          { batchSize: 18 },
        ),
      );
    }

    if (groups.albums.length) {
      cleanups.push(
        mountIncrementalGrid(
          $("#watchlist-albums"),
          groups.albums,
          (album) =>
            renderCard({
              action: "show-album",
              id: album.albumid,
              thumbnail: getPoster(album),
              title: album.title,
              meta: escapeHtml((album.artist || []).join(", ")),
              mediaType: "album",
              watchlisted: isInWatchlist("album", album.albumid),
            }),
          { batchSize: 18 },
        ),
      );
    }

    _cleanupGrid = () => cleanups.forEach((cleanup) => cleanup?.());
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Could not load your watchlist.</p>
        <p class="error-detail">${escapeHtml(err.message)}</p>
      </div>`;
  }
}
