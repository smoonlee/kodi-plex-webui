/**
 * Search view — topbar-driven search across movies, TV, music, and live TV.
 */
import { $, CONFIG, state } from "../state.js";
import { escapeHtml } from "../helpers.js";
import { searchAllCached } from "../data.js";
import { addRecentSearch, getRecentSearches } from "../preferences.js";
import { renderCard, getPoster, initShelves } from "../ui.js";
import { navigate } from "../router.js";
import { currentChannelGroup } from "./livetv.js";

// ── Module state ───────────────────────────────────────────────────────

let _searchDebounce = null;
let _searchToken = 0;

function renderSearchLanding() {
  const recent = getRecentSearches();
  if (!recent.length) {
    return '<div class="empty-state"><p>Start typing to search your library.</p></div>';
  }

  return `
    <div class="search-landing">
      <div class="page-header page-header--stacked">
        <div>
          <h1 class="page-title">Search</h1>
          <p class="page-subtitle">Jump back into recent lookups or search the whole Kodi library in real time.</p>
        </div>
      </div>
      <div class="search-history-panel">
        <div class="search-history-header">
          <h2 class="shelf-title">Recent searches</h2>
          <button class="btn btn-secondary" data-action="clear-recent-searches">Clear</button>
        </div>
        <div class="search-history-chips">
          ${recent
            .map(
              (item) =>
                `<button class="search-history-chip" data-action="run-recent-search" data-query="${escapeHtml(item)}">${escapeHtml(item)}</button>`,
            )
            .join("")}
        </div>
      </div>
    </div>`;
}

// ── Load search results (called when navigating to #search) ────────────

export function loadSearchResults() {
  const input = $("#topbar-search-input");
  const query = input ? input.value.trim() : "";
  const content = $("#content");
  if (!query) {
    content.innerHTML = renderSearchLanding();
    return;
  }
  performSearch(query);
}

// ── Wire up topbar search input (called once at init) ──────────────────

export function initTopbarSearch() {
  const input = $("#topbar-search-input");
  const clearBtn = $("#topbar-search-clear");
  if (!input || !clearBtn) return;

  input.addEventListener("input", () => {
    clearBtn.hidden = !input.value;
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => {
      const q = input.value.trim();
      if (q) {
        if (state.currentView !== "search") {
          navigate("search");
        } else {
          performSearch(q);
        }
      } else if (state.currentView === "search") {
        $("#content").innerHTML = renderSearchLanding();
      }
    }, CONFIG.SEARCH_DEBOUNCE);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.hidden = true;
    if (state.currentView === "search") {
      $("#content").innerHTML = renderSearchLanding();
    }
    input.focus();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (input.value) {
        input.value = "";
        clearBtn.hidden = true;
        if (state.currentView === "search") {
          $("#content").innerHTML = renderSearchLanding();
        }
      } else {
        input.blur();
      }
    }
  });
}

// ── Perform search ─────────────────────────────────────────────────────

export async function performSearch(query) {
  const content = $("#content");
  if (!content) return;
  if (!query) {
    content.innerHTML = renderSearchLanding();
    return;
  }

  content.innerHTML = '<div class="loading-spinner"></div>';
  const token = ++_searchToken;

  try {
    const { movies, shows, artists, channelData } = await searchAllCached(
      query,
      currentChannelGroup,
    );

    // Check we're still on the search view
    if (state.currentView !== "search" || token !== _searchToken) return;

    addRecentSearch(query);

    let html = "";
    let totalResults = 0;

    if (movies.movies && movies.movies.length) {
      totalResults += movies.movies.length;
      html +=
        '<section class="shelf"><h2 class="shelf-title"><span>Movies</span></h2><div class="shelf-row">';
      for (const m of movies.movies) {
        html += renderCard({
          action: "show-movie",
          id: m.movieid,
          thumbnail: getPoster(m),
          title: m.title,
          meta: m.year || "",
        });
      }
      html += "</div></section>";
    }

    if (shows.tvshows && shows.tvshows.length) {
      totalResults += shows.tvshows.length;
      html +=
        '<section class="shelf"><h2 class="shelf-title"><span>TV Shows</span></h2><div class="shelf-row">';
      for (const s of shows.tvshows) {
        html += renderCard({
          action: "show-tvshow",
          id: s.tvshowid,
          thumbnail: getPoster(s),
          title: s.title,
          meta: s.year || "",
        });
      }
      html += "</div></section>";
    }

    if (artists.artists && artists.artists.length) {
      totalResults += artists.artists.length;
      html +=
        '<section class="shelf"><h2 class="shelf-title"><span>Artists</span></h2><div class="shelf-row">';
      for (const a of artists.artists) {
        html += renderCard({
          action: "show-artist",
          id: a.artistid,
          thumbnail: getPoster(a),
          title: a.artist,
          variant: "card-round",
        });
      }
      html += "</div></section>";
    }

    // Live TV channel matches
    const queryLower = query.toLowerCase();
    const matchedChannels = (channelData.channels || []).filter(
      (ch) => !ch.hidden && ch.label.toLowerCase().includes(queryLower),
    );
    if (matchedChannels.length) {
      totalResults += matchedChannels.length;
      html +=
        '<section class="shelf"><h2 class="shelf-title"><span>Live TV Channels</span></h2><div class="shelf-row">';
      for (const ch of matchedChannels) {
        const icon = ch.icon || ch.thumbnail || "";
        html += renderCard({
          action: "tune-channel",
          id: ch.channelid,
          thumbnail: icon,
          title: ch.label,
          meta: ch.broadcastnow ? escapeHtml(ch.broadcastnow.title || "") : "",
        });
      }
      html += "</div></section>";
    }

    if (!html) {
      html = '<div class="empty-state"><p>No results found.</p></div>';
    } else {
      html =
        `<div class="page-header page-header--stacked"><div><h1 class="page-title">Search results</h1><p class="page-subtitle">${totalResults} result${totalResults === 1 ? "" : "s"} for “${escapeHtml(query)}”.</p></div></div>` +
        html;
    }

    content.innerHTML = html;
    initShelves(content);
  } catch (err) {
    if (state.currentView === "search" && token === _searchToken) {
      content.innerHTML = `<div class="empty-state"><p>Search error: ${escapeHtml(err.message)}</p></div>`;
    }
  }
}
