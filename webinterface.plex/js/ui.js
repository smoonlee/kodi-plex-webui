/**
 * UI rendering helpers — cards, shelves, images, OMDB badges.
 */
import { $, state } from "./state.js";
import { escapeHtml } from "./helpers.js";

// ── Image helpers ──────────────────────────────────────────────────────

export function posterPlaceholder(title) {
  const letter = escapeHtml((title || "?")[0].toUpperCase());
  return `<div class="poster-placeholder">${letter}</div>`;
}

export function posterImg(url, title) {
  if (!url) return posterPlaceholder(title);
  const src = Kodi.imageUrl(url);
  const fallback = escapeHtml((title || "?")[0].toUpperCase());
  return `<img src="${src}" alt="${escapeHtml(title || "")}" loading="lazy" data-fallback="${fallback}">`;
}

export function applyBackgrounds(root) {
  root.querySelectorAll("[data-bg]").forEach((el) => {
    const url = el.dataset.bg;
    if (/^(\/image\/|https?:\/\/)/.test(url)) {
      el.style.backgroundImage = 'url("' + url.replace(/["\\]/g, "") + '")';
    }
    el.removeAttribute("data-bg");
  });
}

export function getPoster(item) {
  if (item.art) {
    if (item.art.poster) return item.art.poster;
    if (item.art["season.poster"]) return item.art["season.poster"];
    if (item.art["tvshow.poster"]) return item.art["tvshow.poster"];
  }
  return item.thumbnail || "";
}

export function getFanart(item) {
  if (item.art && item.art.fanart) return item.art.fanart;
  return item.fanart || "";
}

// ── Card template ──────────────────────────────────────────────────────

export function renderCard({
  action,
  id,
  thumbnail,
  title,
  meta,
  extraAttrs,
  variant,
  badge,
  progress,
  mediaType,
  watchlisted,
}) {
  const cls = ["card"];
  if (variant) cls.push(variant);

  const posterCls =
    variant === "card-wide"
      ? "card-poster card-poster-wide"
      : variant === "card-round"
        ? "card-poster card-poster-round"
        : "card-poster";

  let attrs = `tabindex="0" role="button" data-action="${action}" data-id="${id}"`;
  if (extraAttrs) attrs += " " + extraAttrs;

  const watchlistButton = mediaType
    ? `<button type="button" class="card-watchlist${watchlisted ? " is-active" : ""}" data-action="toggle-watchlist" data-id="${id}" data-media-type="${mediaType}" data-title="${escapeHtml(title)}" data-add-label="☆" data-remove-label="★" aria-label="${watchlisted ? "Remove from watchlist" : "Add to watchlist"}" aria-pressed="${watchlisted ? "true" : "false"}">${watchlisted ? "★" : "☆"}</button>`
    : "";

  return `
    <div class="${cls.join(" ")}" ${attrs} aria-label="${escapeHtml(title)}">
      ${watchlistButton}
      <div class="${posterCls}">${posterImg(thumbnail, title)}</div>
      <div class="card-info">
        <div class="card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        ${meta != null ? `<div class="card-meta">${meta}</div>` : ""}
      </div>
      ${badge || ""}
      ${progress ? `<div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>` : ""}
    </div>`;
}

// ── Skeleton loading ───────────────────────────────────────────────────

export function skeletonCards(count) {
  count = count || 12;
  let html = '<div class="grid">';
  for (let i = 0; i < count; i++) {
    html +=
      '<div class="skeleton-card"><div class="skeleton-poster"></div>' +
      '<div class="skeleton-info"><div class="skeleton-line"></div>' +
      '<div class="skeleton-line skeleton-line--short"></div></div></div>';
  }
  return html + "</div>";
}

// ── Shelf scroll arrows ────────────────────────────────────────────────

export function initShelves(root) {
  root.querySelectorAll(".shelf").forEach((shelf) => {
    const row = shelf.querySelector(".shelf-row");
    if (!row) return;

    const left = document.createElement("button");
    left.className = "shelf-arrow shelf-arrow--left";
    left.setAttribute("aria-label", "Scroll left");
    left.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
    left.addEventListener("click", (e) => {
      e.stopPropagation();
      row.scrollBy({ left: -300, behavior: "smooth" });
    });

    const right = document.createElement("button");
    right.className = "shelf-arrow shelf-arrow--right";
    right.setAttribute("aria-label", "Scroll right");
    right.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
    right.addEventListener("click", (e) => {
      e.stopPropagation();
      row.scrollBy({ left: 300, behavior: "smooth" });
    });

    shelf.appendChild(left);
    shelf.appendChild(right);

    let _touchStartX = 0;
    row.addEventListener(
      "touchstart",
      (e) => {
        _touchStartX = e.touches[0].clientX;
      },
      { passive: true },
    );
    row.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - _touchStartX;
        if (Math.abs(dx) > 50) {
          row.scrollBy({ left: dx > 0 ? -200 : 200, behavior: "smooth" });
        }
      },
      { passive: true },
    );
  });
}

// ── OMDB rating badges ─────────────────────────────────────────────────

export function renderOmdbRatings(ratings, title) {
  if (!ratings || (!ratings.imdb && !ratings.rt && !ratings.meta)) return "";

  const encodedTitle = encodeURIComponent(title || "");
  let html = '<div class="omdb-ratings">';
  if (ratings.imdb) {
    const href = ratings.imdbUrl ? escapeHtml(ratings.imdbUrl) : "#";
    html += `<a class="omdb-badge omdb-badge--imdb" href="${href}" target="_blank" rel="noopener noreferrer"><span class="omdb-badge-icon">⭐</span> IMDb ${escapeHtml(ratings.imdb)}</a>`;
  }
  if (ratings.rt) {
    const rtUrl = title
      ? `https://www.rottentomatoes.com/search?search=${encodedTitle}`
      : "#";
    html += `<a class="omdb-badge omdb-badge--rt" href="${rtUrl}" target="_blank" rel="noopener noreferrer"><span class="omdb-badge-icon">🍅</span> ${escapeHtml(ratings.rt)}</a>`;
  }
  if (ratings.meta) {
    const metaUrl = title
      ? `https://www.metacritic.com/search/${encodedTitle}/`
      : "#";
    html += `<a class="omdb-badge omdb-badge--meta" href="${metaUrl}" target="_blank" rel="noopener noreferrer"><span class="omdb-badge-icon">Ⓜ</span> ${escapeHtml(ratings.meta)}</a>`;
  }
  html += "</div>";

  if (ratings.awards) {
    html += `<div class="omdb-extra">🏆 ${escapeHtml(ratings.awards)}</div>`;
  }
  if (ratings.boxOffice) {
    html += `<div class="omdb-extra">💰 Box Office: ${escapeHtml(ratings.boxOffice)}</div>`;
  }
  if (ratings.imdbUrl) {
    html += `<div class="omdb-extra"><a href="${escapeHtml(ratings.imdbUrl)}" target="_blank" rel="noopener noreferrer">View on IMDb →</a></div>`;
  }

  return html;
}

export async function injectOmdbData(
  gen,
  containerSelector,
  imdbId,
  title,
  year,
  type,
) {
  if (!OMDB.hasApiKey()) return;
  try {
    const data = await OMDB.lookup(imdbId, title, year, type);
    if (gen !== state.navGeneration) return;
    const container = $(containerSelector);
    if (!container) return;
    const ratings = OMDB.extractRatings(data);
    const html = renderOmdbRatings(ratings, title);
    if (html) container.innerHTML = html;
  } catch {
    // OMDB is supplementary — fail silently
  }
}
