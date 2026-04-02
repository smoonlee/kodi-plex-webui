/**
 * Home view — hero banner, continue watching, recent shelves.
 */
import { $, CONFIG, state } from "../state.js";
import { escapeHtml, episodeLabel } from "../helpers.js";
import {
  getInProgressEpisodesCached,
  getInProgressMoviesCached,
  getMoviesCached,
  getRecentAlbumsCached,
  getRecentEpisodesCached,
  getRecentMoviesCached,
  getTVShowsCached,
} from "../data.js";
import { getWatchlist, isInWatchlist } from "../preferences.js";
import {
  renderCard,
  skeletonCards,
  getFanart,
  getPoster,
  applyBackgrounds,
  initShelves,
} from "../ui.js";
import { getNowPlayingInfo } from "../player.js";

let _featuredTopMovies = [];
let _featuredIndex = 0;
let _featuredAnimating = false;
let _featuredAutoTimer = null;

const FEATURED_AUTO_SCROLL_MS = 6500;

function stopFeaturedAutoScroll() {
  if (_featuredAutoTimer) {
    clearInterval(_featuredAutoTimer);
    _featuredAutoTimer = null;
  }
}

function startFeaturedAutoScroll() {
  stopFeaturedAutoScroll();

  if (_featuredTopMovies.length <= 1) return;
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  _featuredAutoTimer = setInterval(() => {
    if (_featuredAnimating) return;
    if (!$("#featured-hero")) {
      stopFeaturedAutoScroll();
      return;
    }
    cycleFeaturedHero(1, true);
  }, FEATURED_AUTO_SCROLL_MS);
}

function bindFeaturedHeroAutoScroll() {
  const hero = $("#featured-hero");
  if (!hero) {
    stopFeaturedAutoScroll();
    return;
  }

  hero.addEventListener("mouseenter", stopFeaturedAutoScroll);
  hero.addEventListener("mouseleave", startFeaturedAutoScroll);
  hero.addEventListener("focusin", stopFeaturedAutoScroll);
  hero.addEventListener("focusout", (event) => {
    const next = event.relatedTarget;
    if (!next || !hero.contains(next)) {
      startFeaturedAutoScroll();
    }
  });

  startFeaturedAutoScroll();
}

function getTopFeaturedMovies(recentMovies, allMovies) {
  const source = allMovies?.length ? allMovies : recentMovies;
  if (!source?.length) return [];

  const deduped = [
    ...new Map(source.map((movie) => [movie.movieid, movie])).values(),
  ];

  return deduped
    .sort((a, b) => {
      const aUnwatched = a.playcount > 0 ? 0 : 1;
      const bUnwatched = b.playcount > 0 ? 0 : 1;
      if (aUnwatched !== bUnwatched) return bUnwatched - aUnwatched;

      const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;

      const yearDiff = Number(b.year || 0) - Number(a.year || 0);
      if (yearDiff !== 0) return yearDiff;

      return String(a.title || "").localeCompare(String(b.title || ""));
    })
    .slice(0, 5);
}

function featuredHeroMarkup(featuredMovie) {
  const featuredBg = getFanart(featuredMovie)
    ? `data-bg="${escapeHtml(Kodi.imageUrl(getFanart(featuredMovie)))}"`
    : "";
  const featuredWatchlisted = isInWatchlist("movie", featuredMovie.movieid);
  const dots = _featuredTopMovies
    .map(
      (movie, index) =>
        `<button class="featured-hero-dot${index === _featuredIndex ? " is-active" : ""}" data-action="featured-hero-jump" data-featured-index="${index}" aria-label="Show featured movie ${index + 1}: ${escapeHtml(movie.title)}" aria-current="${index === _featuredIndex ? "true" : "false"}"></button>`,
    )
    .join("");

  return `
    <section class="featured-hero" id="featured-hero" ${featuredBg}>
      <div class="featured-hero-overlay">
        <div class="featured-hero-copy">
          <div class="featured-hero-label" id="featured-hero-label">Featured Tonight · ${_featuredIndex + 1}/${_featuredTopMovies.length}</div>
          <h2 class="featured-hero-title" id="featured-hero-title">${escapeHtml(featuredMovie.title)}</h2>
          <p class="featured-hero-meta" id="featured-hero-meta">${featuredMovie.year || ""}${featuredMovie.genre?.length ? ` · ${escapeHtml(featuredMovie.genre.join(", "))}` : ""}</p>
          <p class="featured-hero-plot" id="featured-hero-plot">${escapeHtml(featuredMovie.plot || "A polished streaming-style home deserves a headline feature. Here we are.")}</p>
          <div class="featured-hero-actions" id="featured-hero-actions">
            <button class="btn btn-primary" data-action="play-movie" data-id="${featuredMovie.movieid}">▶ Play</button>
            <button class="btn btn-secondary" data-action="show-movie" data-id="${featuredMovie.movieid}">Details</button>
            <button class="btn btn-secondary watchlist-toggle${featuredWatchlisted ? " is-active" : ""}" data-action="toggle-watchlist" data-id="${featuredMovie.movieid}" data-media-type="movie" data-title="${escapeHtml(featuredMovie.title)}" data-add-label="☆ Add to Watchlist" data-remove-label="★ In Watchlist">${featuredWatchlisted ? "★ In Watchlist" : "☆ Add to Watchlist"}</button>
          </div>
          ${
            _featuredTopMovies.length > 1
              ? `<div class="featured-hero-nav" role="group" aria-label="Featured movies carousel controls">
              <button class="featured-hero-nav-btn" data-action="featured-hero-prev" aria-label="Previous featured movie">
                <span class="featured-hero-nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.5 5L7.5 12L14.5 19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </button>
              <div class="featured-hero-dots">${dots}</div>
              <button class="featured-hero-nav-btn" data-action="featured-hero-next" aria-label="Next featured movie">
                <span class="featured-hero-nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.5 5L16.5 12L9.5 19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </button>
            </div>`
              : ""
          }
        </div>
        <div class="featured-hero-art" id="featured-hero-art">${renderCard({
          action: "show-movie",
          id: featuredMovie.movieid,
          thumbnail: getPoster(featuredMovie),
          title: featuredMovie.title,
          meta: featuredMovie.year || "",
          mediaType: "movie",
          watchlisted: featuredWatchlisted,
        })}</div>
      </div>
    </section>`;
}

function renderFeaturedHeroInPlace(direction = 1) {
  if (!_featuredTopMovies.length) return;
  const root = $("#content");
  const hero = $("#featured-hero");
  if (!root || !hero) return;

  const featuredMovie = _featuredTopMovies[_featuredIndex];
  const safeBg = getFanart(featuredMovie)
    ? Kodi.imageUrl(getFanart(featuredMovie)).replace(/["\\]/g, "")
    : "";

  const updateContent = () => {
    const label = $("#featured-hero-label");
    const title = $("#featured-hero-title");
    const meta = $("#featured-hero-meta");
    const plot = $("#featured-hero-plot");
    const actions = $("#featured-hero-actions");
    const art = $("#featured-hero-art");

    const featuredWatchlisted = isInWatchlist("movie", featuredMovie.movieid);

    if (label) {
      label.textContent = `Featured Tonight · ${_featuredIndex + 1}/${_featuredTopMovies.length}`;
    }
    if (title) title.textContent = featuredMovie.title || "";
    if (meta) {
      meta.textContent = `${featuredMovie.year || ""}${featuredMovie.genre?.length ? ` · ${featuredMovie.genre.join(", ")}` : ""}`;
    }
    if (plot) {
      plot.textContent =
        featuredMovie.plot ||
        "A polished streaming-style home deserves a headline feature. Here we are.";
    }

    if (actions) {
      actions.innerHTML = `
        <button class="btn btn-primary" data-action="play-movie" data-id="${featuredMovie.movieid}">▶ Play</button>
        <button class="btn btn-secondary" data-action="show-movie" data-id="${featuredMovie.movieid}">Details</button>
        <button class="btn btn-secondary watchlist-toggle${featuredWatchlisted ? " is-active" : ""}" data-action="toggle-watchlist" data-id="${featuredMovie.movieid}" data-media-type="movie" data-title="${escapeHtml(featuredMovie.title)}" data-add-label="☆ Add to Watchlist" data-remove-label="★ In Watchlist">${featuredWatchlisted ? "★ In Watchlist" : "☆ Add to Watchlist"}</button>`;
    }

    if (art) {
      art.innerHTML = renderCard({
        action: "show-movie",
        id: featuredMovie.movieid,
        thumbnail: getPoster(featuredMovie),
        title: featuredMovie.title,
        meta: featuredMovie.year || "",
        mediaType: "movie",
        watchlisted: featuredWatchlisted,
      });
    }

    const dots = hero.querySelectorAll(".featured-hero-dot");
    dots.forEach((dot, index) => {
      const active = index === _featuredIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });

    hero.style.backgroundImage = safeBg ? `url("${safeBg}")` : "none";
  };

  if (_featuredAnimating) return;
  _featuredAnimating = true;

  hero.classList.remove(
    "is-slide-forward",
    "is-slide-backward",
    "is-transition-out",
    "is-transition-in",
    "is-fading",
  );
  hero.classList.add(direction >= 0 ? "is-slide-forward" : "is-slide-backward");
  hero.classList.add("is-fading");

  setTimeout(() => {
    try {
      updateContent();
    } finally {
      hero.classList.remove("is-fading");
      setTimeout(() => {
        hero.classList.remove("is-slide-forward", "is-slide-backward");
        _featuredAnimating = false;
      }, 260);
    }
  }, 150);
}

export function cycleFeaturedHero(step, fromAuto = false) {
  if (_featuredTopMovies.length <= 1) return;
  const length = _featuredTopMovies.length;
  _featuredIndex = (_featuredIndex + step + length) % length;
  renderFeaturedHeroInPlace(step);
  if (!fromAuto) {
    startFeaturedAutoScroll();
  }
}

export function jumpFeaturedHero(index) {
  if (!_featuredTopMovies.length) return;
  const safe = Number(index);
  if (!Number.isInteger(safe)) return;
  if (safe < 0 || safe >= _featuredTopMovies.length) return;
  const prevIndex = _featuredIndex;
  _featuredIndex = safe;
  renderFeaturedHeroInPlace(_featuredIndex >= prevIndex ? 1 : -1);
  startFeaturedAutoScroll();
}

export async function loadHome() {
  const gen = state.navGeneration;
  const content = $("#content");
  content.innerHTML = skeletonCards(CONFIG.HOME_ITEMS);

  try {
    const limits = { start: 0, end: CONFIG.HOME_ITEMS };
    const [
      movies,
      episodes,
      albums,
      inProgressMovies,
      inProgressEpisodes,
      nowPlayingData,
      allMovies,
      allShows,
    ] = await Promise.all([
      getRecentMoviesCached(limits).catch(() => ({ movies: [] })),
      getRecentEpisodesCached(limits).catch(() => ({ episodes: [] })),
      getRecentAlbumsCached(limits).catch(() => ({ albums: [] })),
      getInProgressMoviesCached(limits).catch(() => ({ movies: [] })),
      getInProgressEpisodesCached(limits).catch(() => ({ episodes: [] })),
      getNowPlayingInfo().catch(() => null),
      getMoviesCached().catch(() => ({ movies: [] })),
      getTVShowsCached().catch(() => ({ tvshows: [] })),
    ]);

    if (gen !== state.navGeneration) return;

    let html = "";
    const featuredTopMovies = !nowPlayingData
      ? getTopFeaturedMovies(movies.movies || [], allMovies.movies || [])
      : [];

    _featuredTopMovies = featuredTopMovies;
    if (_featuredIndex >= _featuredTopMovies.length) {
      _featuredIndex = 0;
    }

    const featuredMovie = featuredTopMovies[_featuredIndex] || null;

    // Now Playing hero banner
    if (nowPlayingData) {
      const np = nowPlayingData;
      const bgAttr = np.fanart
        ? `data-bg="${escapeHtml(Kodi.imageUrl(np.fanart))}"`
        : "";
      const thumbHtml = np.thumbnail
        ? `<img src="${Kodi.imageUrl(np.thumbnail)}" alt="" class="now-playing-hero-thumb">`
        : '<div class="now-playing-hero-thumb-placeholder">🎵</div>';
      const isPaused = np.speed === 0;

      html += `
        <section class="now-playing-hero" ${bgAttr}>
          <div class="now-playing-hero-overlay">
            <div class="now-playing-hero-thumb-wrap">${thumbHtml}</div>
            <div class="now-playing-hero-info">
              <div class="now-playing-hero-label">${np.isLiveTV ? "Live TV" : "Now Playing"}</div>
              <h2 class="now-playing-hero-title">${escapeHtml(np.title)}</h2>
              ${np.channelName ? `<p class="now-playing-hero-subtitle">📺 ${escapeHtml(np.channelName)}</p>` : ""}
              ${!np.channelName && np.subtitle ? `<p class="now-playing-hero-subtitle">${escapeHtml(np.subtitle)}</p>` : ""}
              <div class="now-playing-hero-meta">
                ${np.timeStr ? `<span>${np.timeStr}</span>` : ""}
                ${np.year ? `<span>${np.year}</span>` : ""}
                ${np.genres ? `<span>${escapeHtml(np.genres)}</span>` : ""}
              </div>
              <div class="now-playing-hero-progress">
                <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(np.percentage || 0)}%"></div></div>
                <span class="now-playing-hero-times">${np.currentTime} / ${np.totalTime}</span>
              </div>
              ${np.startTime && np.endTime ? `<div class="now-playing-hero-schedule">${np.startTime} – ${np.endTime}</div>` : ""}
              <div class="now-playing-hero-actions">
                <button class="btn btn-primary" data-action="np-playpause">${isPaused ? "▶ Resume" : "⏸ Pause"}</button>
                <button class="btn btn-secondary" data-action="np-stop">⏹ Stop</button>
                ${np.channelId ? `<button class="btn btn-secondary" data-action="show-channel-guide" data-id="${np.channelId}">📋 Guide</button>` : ""}
              </div>
            </div>
          </div>
        </section>`;
    } else if (featuredMovie) {
      html += featuredHeroMarkup(featuredMovie);
    } else {
      stopFeaturedAutoScroll();
    }

    html += '<h1 class="page-title">Home</h1>';

    // Continue Watching
    const cwItems = [];
    if (inProgressMovies.movies) {
      for (const m of inProgressMovies.movies) {
        const pct =
          m.resume && m.resume.total > 0
            ? Math.round((m.resume.position / m.resume.total) * 100)
            : 0;
        cwItems.push(
          renderCard({
            action: "play-movie",
            id: m.movieid,
            thumbnail: getPoster(m),
            title: m.title,
            meta: m.year || "",
            progress: pct,
            mediaType: "movie",
            watchlisted: isInWatchlist("movie", m.movieid),
          }),
        );
      }
    }
    if (inProgressEpisodes.episodes) {
      for (const e of inProgressEpisodes.episodes) {
        const label = episodeLabel(e.season, e.episode);
        const pct =
          e.resume && e.resume.total > 0
            ? Math.round((e.resume.position / e.resume.total) * 100)
            : 0;
        cwItems.push(
          renderCard({
            action: "play-episode",
            id: e.episodeid,
            thumbnail: e.art && e.art.thumb ? e.art.thumb : e.thumbnail,
            title: e.showtitle,
            meta: `${label} · ${escapeHtml(e.title)}`,
            variant: "card-wide",
            progress: pct,
          }),
        );
      }
    }
    if (cwItems.length) {
      html +=
        '<section class="shelf"><h2 class="shelf-title">Continue Watching</h2><div class="shelf-row">';
      html += cwItems.join("");
      html += "</div></section>";
    }

    const watchlistEntries = getWatchlist().slice(0, 10);
    if (watchlistEntries.length) {
      const movieMap = new Map(
        (allMovies.movies || []).map((item) => [item.movieid, item]),
      );
      const showMap = new Map(
        (allShows.tvshows || []).map((item) => [item.tvshowid, item]),
      );
      const watchlistCards = watchlistEntries
        .map((entry) => {
          if (entry.type === "movie" && movieMap.has(entry.id)) {
            const movie = movieMap.get(entry.id);
            return renderCard({
              action: "show-movie",
              id: movie.movieid,
              thumbnail: getPoster(movie),
              title: movie.title,
              meta: movie.year || "",
              mediaType: "movie",
              watchlisted: true,
            });
          }
          if (entry.type === "tvshow" && showMap.has(entry.id)) {
            const show = showMap.get(entry.id);
            return renderCard({
              action: "show-tvshow",
              id: show.tvshowid,
              thumbnail: getPoster(show),
              title: show.title,
              meta: `${show.year || ""} · ${show.episode || 0} eps`,
              mediaType: "tvshow",
              watchlisted: true,
            });
          }
          return "";
        })
        .filter(Boolean);

      if (watchlistCards.length) {
        html +=
          '<section class="shelf"><h2 class="shelf-title"><span>Your Watchlist</span><a class="shelf-see-all" data-action="goto-watchlist">Open Queue →</a></h2><div class="shelf-row">';
        html += watchlistCards.join("");
        html += "</div></section>";
      }
    }

    // Recently added movies
    if (movies.movies && movies.movies.length) {
      html +=
        '<section class="shelf"><h2 class="shelf-title"><span>Recently Added Movies</span><a class="shelf-see-all" data-action="goto-movies">See All \u2192</a></h2><div class="shelf-row">';
      for (const m of movies.movies) {
        html += renderCard({
          action: "show-movie",
          id: m.movieid,
          thumbnail: getPoster(m),
          title: m.title,
          meta: m.year || "",
          mediaType: "movie",
          watchlisted: isInWatchlist("movie", m.movieid),
        });
      }
      html += "</div></section>";
    }

    // Recently added episodes
    if (episodes.episodes && episodes.episodes.length) {
      html +=
        '<section class="shelf"><h2 class="shelf-title"><span>Recently Added Episodes</span><a class="shelf-see-all" data-action="goto-tvshows">See All \u2192</a></h2><div class="shelf-row">';
      for (const e of episodes.episodes) {
        const label = episodeLabel(e.season, e.episode);
        html += renderCard({
          action: "play-episode",
          id: e.episodeid,
          thumbnail: e.art && e.art.thumb ? e.art.thumb : e.thumbnail,
          title: e.showtitle,
          meta: `${label} · ${escapeHtml(e.title)}`,
          variant: "card-wide",
        });
      }
      html += "</div></section>";
    }

    // Recently added albums
    if (albums.albums && albums.albums.length) {
      html +=
        '<section class="shelf"><h2 class="shelf-title"><span>Recently Added Albums</span><a class="shelf-see-all" data-action="goto-music">See All \u2192</a></h2><div class="shelf-row">';
      for (const a of albums.albums) {
        html += renderCard({
          action: "play-album",
          id: a.albumid,
          thumbnail: getPoster(a),
          title: a.title,
          meta: escapeHtml((a.artist || []).join(", ")),
        });
      }
      html += "</div></section>";
    }

    if (!html.includes("shelf")) {
      html +=
        '<div class="empty-state"><div class="empty-icon">🎬</div><p>Your library is empty.</p><p>Add media sources in Kodi and scan your library.</p></div>';
    }

    content.innerHTML = html;
    applyBackgrounds(content);
    initShelves(content);

    if (!nowPlayingData && featuredMovie) {
      bindFeaturedHeroAutoScroll();
    } else {
      stopFeaturedAutoScroll();
    }
  } catch (err) {
    if (gen !== state.navGeneration) return;
    stopFeaturedAutoScroll();
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Could not connect to Kodi.</p><p class="error-detail">${escapeHtml(err.message)}</p><div class="empty-actions"><button class="btn btn-primary" data-action="retry-view">Retry</button></div></div>`;
  }
}
