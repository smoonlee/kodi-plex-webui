/**
 * Shared collection helpers for filtering, sorting, and incremental rendering.
 */
import { escapeHtml } from "./helpers.js";

const DEFAULT_BATCH_SIZE = 24;

export function buildCollectionFacets(items) {
  const genres = new Set();
  const years = new Set();

  items.forEach((item) => {
    (item.genre || []).forEach((genre) => genres.add(genre));
    if (item.year) years.add(Number(item.year));
  });

  return {
    genres: [...genres].sort((a, b) => a.localeCompare(b)),
    years: [...years].sort((a, b) => b - a),
    ratings: [9, 8, 7, 6, 5].filter((min) =>
      items.some((item) => Number(item.rating || 0) >= min),
    ),
  };
}

function getItemStatus(item, mediaType) {
  if (mediaType === "tvshow") {
    const total = Number(item.episode || 0);
    const watched = Number(item.watchedepisodes || 0);
    if (!total) return "all";
    if (watched <= 0) return "unwatched";
    if (watched >= total) return "watched";
    return "inprogress";
  }

  const playcount = Number(item.playcount || 0);
  const hasResume = item.resume && Number(item.resume.position || 0) > 0;

  if (hasResume) return "inprogress";
  return playcount > 0 ? "watched" : "unwatched";
}

export function filterCollectionItems(items, filters, mediaType) {
  return items.filter((item) => {
    if (filters.genre && !(item.genre || []).includes(filters.genre)) {
      return false;
    }

    if (filters.year && String(item.year || "") !== String(filters.year)) {
      return false;
    }

    if (filters.rating && Number(item.rating || 0) < Number(filters.rating)) {
      return false;
    }

    if (filters.status && filters.status !== "all") {
      return getItemStatus(item, mediaType) === filters.status;
    }

    return true;
  });
}

export function sortCollectionItems(items, sortValue, labelKey = "title") {
  const list = [...items];

  const compareText = (a, b) =>
    String(a || "").localeCompare(String(b || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });

  switch (sortValue) {
    case "title-desc":
    case "artist-desc":
      return list.sort((a, b) => compareText(b[labelKey], a[labelKey]));
    case "year-desc":
      return list.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
    case "year-asc":
      return list.sort((a, b) => Number(a.year || 0) - Number(b.year || 0));
    case "rating-desc":
      return list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    case "rating-asc":
      return list.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
    case "recent":
      return list;
    case "artist-asc":
    case "title-asc":
    default:
      return list.sort((a, b) => compareText(a[labelKey], b[labelKey]));
  }
}

export function renderCollectionFilters({ prefix, facets, showStatus = true }) {
  return `
    <section class="collection-toolbar" aria-label="Filter collection">
      <div class="collection-toolbar-group">
        <label class="toolbar-label" for="${prefix}-genre">Genre</label>
        <select id="${prefix}-genre" class="toolbar-select">
          <option value="">All genres</option>
          ${facets.genres
            .map(
              (genre) =>
                `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`,
            )
            .join("")}
        </select>
      </div>
      <div class="collection-toolbar-group">
        <label class="toolbar-label" for="${prefix}-year">Year</label>
        <select id="${prefix}-year" class="toolbar-select">
          <option value="">Any year</option>
          ${facets.years
            .map((year) => `<option value="${year}">${year}</option>`)
            .join("")}
        </select>
      </div>
      <div class="collection-toolbar-group">
        <label class="toolbar-label" for="${prefix}-rating">Rating</label>
        <select id="${prefix}-rating" class="toolbar-select">
          <option value="">Any rating</option>
          ${facets.ratings
            .map(
              (rating) => `<option value="${rating}">${rating}+ stars</option>`,
            )
            .join("")}
        </select>
      </div>
      ${
        showStatus
          ? `<div class="collection-toolbar-group">
        <label class="toolbar-label" for="${prefix}-status">Status</label>
        <select id="${prefix}-status" class="toolbar-select">
          <option value="all">All items</option>
          <option value="unwatched">Unwatched</option>
          <option value="inprogress">In progress</option>
          <option value="watched">Watched</option>
        </select>
      </div>`
          : ""
      }
      <div class="collection-toolbar-meta" id="${prefix}-summary"></div>
    </section>`;
}

export function updateCollectionSummary(target, shown, total, noun) {
  if (!target) return;
  const safeNoun = shown === 1 ? noun.replace(/s$/, "") : noun;
  target.textContent = `${shown} of ${total} ${safeNoun}`;
}

export function mountIncrementalGrid(
  container,
  items,
  renderItem,
  options = {},
) {
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const emptyHtml =
    options.emptyHtml ||
    '<div class="empty-state"><p>No items match your current filters.</p></div>';

  if (!container) return () => {};

  let observer = null;
  let renderedCount = 0;
  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = emptyHtml;
    return () => {};
  }

  const sentinel = document.createElement("div");
  sentinel.className = "grid-sentinel";

  const renderNextBatch = () => {
    const chunk = items.slice(renderedCount, renderedCount + batchSize);
    if (!chunk.length) return;
    sentinel.insertAdjacentHTML("beforebegin", chunk.map(renderItem).join(""));
    renderedCount += chunk.length;
    if (renderedCount >= items.length) {
      observer?.disconnect();
      sentinel.remove();
    }
  };

  container.appendChild(sentinel);
  renderNextBatch();

  if (renderedCount < items.length) {
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            renderNextBatch();
          }
        },
        { rootMargin: "500px 0px" },
      );
      observer.observe(sentinel);
    } else {
      while (renderedCount < items.length) {
        renderNextBatch();
      }
    }
  }

  return () => observer?.disconnect();
}
